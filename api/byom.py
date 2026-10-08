"""BYOM (Bring Your Own Model) ingest — score, price and preview a foreign model.

`POST /api/models/<model_id>/forecasts` takes long-format rows in the same
vocabulary as `data/forecast_history.csv` (city, datetime, temperature,
rainfall, wind_speed) and answers with what the engine actually thinks of the
model: its error against observed actuals, the weight inverse-RMSE weighting
would hand it, and what including it does to the blend's own error.

Rows are staged in `data/byom/<model_id>.csv` instead of being appended to
`data/forecast_history.csv`. The production chain is strict — `ai/preprocessing.py`
asserts every (city, model) group is gap-free hourly and that the forecast and
actual (city, datetime) pair sets match exactly, and `ai/align.py` asserts the
pivot has no NaN — and a foreign model that posted partial coverage (the normal
case) fails all three. Staging keeps the shipped blend reproducible; promoting a
model once it clears full coverage is a file move into `data/raw_forecasts/`
plus an entry in the ingest list.

ponytail: no auth and no rate limit on the write path — ceiling is a row-capped
open demo endpoint. Add a signed token and a per-key quota before it is exposed
beyond the demo.
"""
import os
import re

import numpy as np
import pandas as pd

from ai.blending import renormalize_blend
from ai.model_registry import BUILT_IN_MODELS, RENAME_MAP

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
STAGE_DIR = os.path.join(DATA_DIR, "byom")

MODEL_ID_RE = re.compile(r"^[a-z0-9_]{2,24}$")
RESERVED_IDS = {"byom", "auto", "all", "seamless"}
VARIABLES = ("temperature", "rainfall", "wind_speed")
ROW_CAP = 5000
# One day of hourly overlap. Below this the RMSE is mostly noise, so the model
# is accepted (rows are kept) but left unscored rather than mis-ranked.
MIN_ROWS_PER_VARIABLE = 24
EPSILON = 1e-6  # matches ai/weights.py
PREVIEW_ROWS = 6
STAMP = "%Y-%m-%dT%H:%M"


class IngestError(ValueError):
    """A payload or model_id the endpoint refuses."""


def validate_model_id(model_id: str) -> str:
    """Reject traversal, collisions and anything outside the id alphabet."""
    candidate = (model_id or "").strip()
    if not MODEL_ID_RE.match(candidate):
        raise IngestError(
            "model_id must match [a-z0-9_]{2,24} (lowercase, no path separators)"
        )
    if candidate in RESERVED_IDS:
        raise IngestError(f"model_id '{candidate}' is reserved")
    if candidate in BUILT_IN_MODELS or candidate in RENAME_MAP:
        raise IngestError(f"model_id '{candidate}' collides with a built-in model")
    return candidate


def _known_cities() -> set[str]:
    path = os.path.join(DATA_DIR, "cities.csv")
    if not os.path.exists(path):
        raise IngestError("data/cities.csv is missing — cannot validate cities")
    return set(pd.read_csv(path)["city"].astype(str))


def validate_rows(rows) -> pd.DataFrame:
    """Coerce a posted row list into the canonical staged shape.

    Every rejection is collected as a message so a caller fixes the whole
    payload in one pass rather than one row per request.
    """
    if not isinstance(rows, list) or not rows:
        raise IngestError("body must be a non-empty list of rows")
    if len(rows) > ROW_CAP:
        raise IngestError(f"row cap is {ROW_CAP}; payload has {len(rows)}")

    cities = _known_cities()
    records = {}
    for index, row in enumerate(rows):
        where = f"row {index}"
        if not isinstance(row, dict):
            raise IngestError(f"{where}: expected an object")

        city = str(row.get("city", "")).strip()
        if city not in cities:
            raise IngestError(f"{where}: unknown city '{city}'")

        raw_time = row.get("datetime")
        try:
            stamp = pd.Timestamp(raw_time).strftime(STAMP)
        except (ValueError, TypeError):
            raise IngestError(f"{where}: datetime '{raw_time}' is not ISO-8601")

        record = {"city": city, "datetime": stamp}
        for variable in VARIABLES:
            value = row.get(variable)
            if value is None or isinstance(value, bool):
                raise IngestError(f"{where}: {variable} is required")
            try:
                number = float(value)
            except (TypeError, ValueError):
                raise IngestError(f"{where}: {variable} '{value}' is not a number")
            if not np.isfinite(number):
                raise IngestError(f"{where}: {variable} must be finite")
            record[variable] = number

        if not -10 <= record["temperature"] <= 55:
            raise IngestError(f"{where}: temperature outside [-10, 55]")
        if record["rainfall"] < 0 or record["wind_speed"] < 0:
            raise IngestError(f"{where}: rainfall and wind_speed must be >= 0")

        # Last write wins inside a payload, so a caller can correct itself.
        records[(city, stamp)] = record

    return pd.DataFrame(list(records.values()), columns=["city", "datetime", *VARIABLES])


def stage_rows(model_id: str, incoming: pd.DataFrame) -> pd.DataFrame:
    """Upsert on (city, datetime) into the model's staged file.

    Re-POSTing a window replaces those rows and leaves the rest alone, so a
    caller can grow coverage in pieces without double-counting.
    """
    os.makedirs(STAGE_DIR, exist_ok=True)
    path = os.path.join(STAGE_DIR, f"{model_id}.csv")

    frames = [incoming]
    if os.path.exists(path):
        frames.append(pd.read_csv(path))
    merged = pd.concat(frames, ignore_index=True)
    merged = merged.drop_duplicates(subset=["city", "datetime"], keep="first")
    merged = merged.sort_values(["city", "datetime"]).reset_index(drop=True)
    merged.to_csv(path, index=False)
    return merged


def _actuals() -> pd.DataFrame:
    path = os.path.join(DATA_DIR, "actual_history.csv")
    if not os.path.exists(path):
        raise IngestError("data/actual_history.csv is missing — nothing to verify against")
    frame = pd.read_csv(path)
    frame["datetime"] = pd.to_datetime(frame["datetime"]).dt.strftime(STAMP)
    return frame


def _existing_skill() -> pd.DataFrame | None:
    path = os.path.join(OUTPUTS_DIR, "skill_scores.csv")
    if not os.path.exists(path):
        return None
    return pd.read_csv(path)


def _weights_table() -> pd.DataFrame | None:
    path = os.path.join(OUTPUTS_DIR, "model_weights.csv")
    if not os.path.exists(path):
        return None
    return pd.read_csv(path)


def measure(staged: pd.DataFrame):
    """Error against observed actuals, per variable.

    Mirrors `ai/skill.py`'s metrics exactly (rmse, mae, bias, n) so a BYOM score
    is comparable to the numbers the leaderboard already shows.
    """
    actuals = _actuals()[["city", "datetime", "actual_temperature", "actual_rainfall", "actual_wind"]]
    joined = staged.merge(actuals, on=["city", "datetime"], how="inner")
    matched = len(joined)
    total_actuals = len(actuals)

    scores: dict[str, dict] = {}
    for variable in VARIABLES:
        error = joined[f"actual_{variable if variable != 'wind_speed' else 'wind'}"] - joined[variable]
        error = error.dropna()
        count = int(error.size)
        if count < MIN_ROWS_PER_VARIABLE:
            continue
        scores[variable] = {
            "rmse": round(float(np.sqrt((error ** 2).mean())), 4),
            "mae": round(float(np.abs(error).mean()), 4),
            "bias": round(float(error.mean()), 4),
            "n": count,
        }
    return scores, matched, total_actuals


def price_weights(scores: dict, staged: pd.DataFrame):
    """The weight inverse-RMSE weighting would give the model, per variable.

    Reuses `ai/weights.py`'s formula — inv = 1/(rmse + EPSILON), normalized
    inside each (city, variable) group — with the existing models' RMSE read
    from `outputs/skill_scores.csv`. Reported as the mean across the cities the
    model actually covers, which is the honest number for a partial model.
    """
    skill = _existing_skill()
    if skill is None:
        return None, ["outputs/skill_scores.csv is missing — weights not computed"]
    if not scores:
        # Nothing was scoreable, so there is no weight to price. Saying the skill
        # table is missing here blamed a file that is present and readable.
        return None, []

    weights: dict[str, float] = {}
    notes: list[str] = []
    covered = set(staged["city"])
    skill = skill[skill["city"].isin(covered)]

    for variable, metric in scores.items():
        per_city = []
        for city, group in skill[skill["variable"] == variable].groupby("city"):
            inv_existing = (1.0 / (group["rmse"] + EPSILON)).sum()
            inv_model = 1.0 / (metric["rmse"] + EPSILON)
            if inv_existing + inv_model > 0:
                per_city.append(inv_model / (inv_existing + inv_model))
        if per_city:
            weights[variable] = round(float(np.mean(per_city)), 6)

    if len(weights) < len(scores):
        notes.append("weight reported only for variables the model is scoreable on")
    return (weights or None), notes


def price_skill(scores: dict, staged: pd.DataFrame):
    """0-100 skill per variable, same min-max definition the confidence engine uses.

    Lower RMSE scores higher, normalised across the models present for that
    variable and city, then averaged over the cities the model covers.
    """
    skill = _existing_skill()
    if skill is None or not scores:
        return None

    covered = set(staged["city"])
    skill = skill[skill["city"].isin(covered)]
    out: dict[str, float] = {}

    for variable, metric in scores.items():
        per_city = []
        for _, group in skill[skill["variable"] == variable].groupby("city"):
            rmses = list(group["rmse"]) + [metric["rmse"]]
            low, high = min(rmses), max(rmses)
            score = 100.0 if high <= low else (high - metric["rmse"]) / (high - low) * 100.0
            per_city.append(score)
        if per_city:
            out[variable] = round(float(np.mean(per_city)), 2)
    return out or None


def blend_preview(staged: pd.DataFrame, weights: dict, model_id: str):
    """What the model costs or buys the blend, using the production blend math.

    Recomputed both ways over the rows the model covers, so the two RMSEs differ
    only by the model's presence. Returns None when the historical pairs the
    blend is fitted on are not on disk.
    """
    pairs_path = os.path.join(OUTPUTS_DIR, "interim", "pairs_blend.csv")
    table = _weights_table()
    if not pairs_path or not os.path.exists(pairs_path) or table is None or not weights:
        return None

    pairs = pd.read_csv(pairs_path, low_memory=False)
    pairs["datetime"] = pd.to_datetime(pairs["datetime"]).dt.strftime(STAMP)
    overlap = pairs.merge(staged, on=["city", "datetime"], how="inner")
    if overlap.empty:
        return None

    preview = []
    for variable, weight in weights.items():
        group = table[table["variable"] == variable].pivot(
            index="city", columns="model", values="weight"
        )
        group.columns = [f"w_{model}" for model in group.columns]
        frame = overlap.merge(group, on="city", how="left")

        built_in = [model for model in BUILT_IN_MODELS if f"{variable}_{model}" in frame.columns]
        values = {model: f"{variable}_{model}" for model in built_in}
        actual = frame[f"actual_{variable if variable != 'wind_speed' else 'wind'}"]

        without = renormalize_blend(frame, models=built_in, value_cols=values)["blend"]

        # A single weight per variable is what the response reports, so the
        # preview has to use the same number rather than a per-city weight the
        # caller cannot see.
        frame[f"w_{model_id}"] = weight
        with_model = renormalize_blend(
            frame,
            models=built_in + [model_id],
            value_cols={**values, model_id: variable},
        )["blend"]

        def rmse(series):
            error = (actual - series).dropna()
            return round(float(np.sqrt((error ** 2).mean())), 4) if error.size else None

        sample = [
            {
                "city": row["city"],
                "datetime": row["datetime"],
                "actual": round(float(row[f"actual_{variable if variable != 'wind_speed' else 'wind'}"]), 3),
                "model": round(float(row[variable]), 3),
                "blend_without": round(float(a), 3),
                "blend_with": round(float(b), 3),
            }
            for (_, row), a, b in zip(
                frame.head(PREVIEW_ROWS).iterrows(), without, with_model
            )
        ]

        preview.append(
            {
                "variable": variable,
                "weight": weight,
                "rows": int(len(frame)),
                "blend_rmse": rmse(without),
                "blend_rmse_with_model": rmse(with_model),
                "sample": sample,
            }
        )
    return preview or None


def list_staged() -> dict:
    """What has been posted, and how much of it is scoreable.

    Carries the limits alongside the models so the UI renders the policy it is
    actually enforced by rather than a copy of the numbers.
    """
    # The window a post has to land inside to be scored at all. Without it the
    # only feedback is a coverage number after the fact.
    window = {"from": None, "to": None}
    try:
        window = {"from": str(_actuals()["datetime"].min()), "to": str(_actuals()["datetime"].max())}
    except IngestError:
        pass

    models = []
    if os.path.isdir(STAGE_DIR):
        for name in sorted(os.listdir(STAGE_DIR)):
            if not name.endswith(".csv"):
                continue
            model_id = name[: -len(".csv")]
            try:
                staged = pd.read_csv(os.path.join(STAGE_DIR, name))
            except (OSError, pd.errors.ParserError):
                continue
            if staged.empty:
                continue
            try:
                actuals = _actuals()[["city", "datetime"]]
                matched = len(staged.merge(actuals, on=["city", "datetime"], how="inner"))
                total = len(actuals)
            except IngestError:
                matched, total = 0, 0
            models.append(
                {
                    "model": model_id,
                    "rows": len(staged),
                    "cities": int(staged["city"].nunique()),
                    "matched_actuals": matched,
                    "share_of_actuals": round(matched / total, 6) if total else 0.0,
                    "from": str(staged["datetime"].min()),
                    "to": str(staged["datetime"].max()),
                    # Whether the next POST would come back scored rather than staged.
                    "scoreable": matched >= MIN_ROWS_PER_VARIABLE,
                }
            )

    return {
        "models": models,
        "limits": {
            "model_id": MODEL_ID_RE.pattern,
            "reserved_ids": sorted(RESERVED_IDS),
            "row_cap": ROW_CAP,
            "min_rows_per_variable": MIN_ROWS_PER_VARIABLE,
            "variables": list(VARIABLES),
            "built_in_models": list(BUILT_IN_MODELS),
            "verification_window": window,
        },
    }


def ingest(model_id: str, payload) -> tuple[dict, int]:
    """Validate, stage, score. Returns (response_body, http_status)."""
    try:
        model = validate_model_id(model_id)
        if isinstance(payload, dict):
            rows = payload.get("rows", payload.get("forecasts"))
        else:
            rows = payload
        incoming = validate_rows(rows)
    except IngestError as exc:
        return {"error": str(exc)}, 400

    staged = stage_rows(model, incoming)
    scores, matched, total_actuals = measure(staged)
    weights, notes = price_weights(scores, staged)

    if scores:
        skill = price_skill(scores, staged) or {}
        for variable, metric in scores.items():
            if variable in skill:
                metric["skill"] = skill[variable]
        status = "accepted"
    else:
        status = "staged"
        notes.append(
            f"no variable reached {MIN_ROWS_PER_VARIABLE} rows matched to observed "
            "actuals, so nothing was scored"
        )
        if matched == 0:
            notes.append(
                "none of these hours fall inside the verification window "
                f"({_actuals()['datetime'].min()} → {_actuals()['datetime'].max()})"
            )

    return (
        {
            "status": status,
            "model": model,
            "rows": len(incoming),
            "stored_rows": len(staged),
            "cities": int(staged["city"].nunique()),
            "coverage": {
                "matched_actuals": matched,
                "share_of_actuals": round(matched / total_actuals, 4) if matched else 0.0,
            },
            "scores": scores or None,
            "weight": weights,
            "blend_preview": blend_preview(staged, weights, model) if weights else None,
            "notes": notes,
        },
        201,
    )
