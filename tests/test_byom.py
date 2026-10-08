"""BYOM ingest: validation at the trust boundary, upsert semantics, sparse staging."""
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api import byom  # noqa: E402
from app import app  # noqa: E402

BASE = Path(__file__).resolve().parent.parent


@pytest.fixture(autouse=True)
def staged_dir(tmp_path, monkeypatch):
    """Keep every test's staged model out of data/byom/."""
    monkeypatch.setattr(byom, "STAGE_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
def client():
    app.config.update(TESTING=True)
    return app.test_client()


@pytest.fixture
def payload():
    """Three cities of hourly rows that overlap observed actuals."""
    actuals = pd.read_csv(BASE / "data" / "actual_history.csv")
    rows = []
    for city in actuals["city"].unique()[:3]:
        window = actuals[actuals["city"] == city].head(48)
        for _, row in window.iterrows():
            rows.append(
                {
                    "city": row["city"],
                    "datetime": row["datetime"],
                    "temperature": round(float(row["actual_temperature"]) + 0.4, 2),
                    "rainfall": round(float(row["actual_rainfall"]), 2),
                    "wind_speed": round(float(row["actual_wind"]) + 0.3, 2),
                }
            )
    return rows


def test_accepts_covered_model_and_prices_it(client, payload):
    response = client.post("/api/models/my_model_v1/forecasts", json=payload)
    assert response.status_code == 201
    body = response.get_json()

    assert body["status"] == "accepted"
    assert body["rows"] == len(payload)
    assert body["cities"] == 3
    assert body["coverage"]["matched_actuals"] > 0

    for variable in ("temperature", "rainfall", "wind_speed"):
        score = body["scores"][variable]
        assert score["n"] == 144
        assert score["rmse"] >= 0
        assert 0.0 <= score["skill"] <= 100.0
        assert 0.0 < body["weight"][variable] < 1.0

    # Blend preview recomputes both ways over the rows the model covers.
    preview = body["blend_preview"]
    assert len(preview) == 3
    assert preview[0]["blend_rmse"] is not None
    assert preview[0]["sample"]


def test_rejects_path_traversal_before_any_io():
    for bad in ("../../app.py", "../secrets", "My_Model", "a", "a" * 25, "byom"):
        with pytest.raises(byom.IngestError):
            byom.validate_model_id(bad)


def test_traversal_in_the_url_never_reaches_the_handler(client, payload):
    # Werkzeug's string converter refuses the slashes outright, so the request
    # 404s before validate_model_id would have to catch it.
    response = client.post("/api/models/..%2F..%2Fapp.py/forecasts", json=payload)
    assert response.status_code == 404


def test_rejects_builtin_collision(client, payload):
    response = client.post("/api/models/ecmwf/forecasts", json=payload)
    assert response.status_code == 400
    assert "built-in" in response.get_json()["error"]


def test_rejects_unknown_city(client, payload):
    payload[0]["city"] = "Atlantis"
    response = client.post("/api/models/my_model_v1/forecasts", json=payload)
    assert response.status_code == 400
    assert "unknown city" in response.get_json()["error"]


def test_rejects_non_finite_and_non_numeric(client, payload):
    payload[0]["temperature"] = "warm"
    assert client.post("/api/models/my_model_v1/forecasts", json=payload).status_code == 400

    payload[0]["temperature"] = float("nan")
    response = client.post("/api/models/my_model_v1/forecasts", json=payload)
    assert response.status_code == 400
    assert "finite" in response.get_json()["error"]


def test_rejects_over_the_row_cap(client, payload):
    response = client.post("/api/models/my_model_v1/forecasts", json=payload * 40)
    assert response.status_code == 400
    assert "row cap" in response.get_json()["error"]


def test_rejects_empty_body(client):
    assert client.post("/api/models/my_model_v1/forecasts", json={}).status_code == 400


def test_reposting_upserts_instead_of_duplicating(client, payload):
    first = client.post("/api/models/my_model_v1/forecasts", json=payload).get_json()
    second = client.post("/api/models/my_model_v1/forecasts", json=payload).get_json()
    assert second["stored_rows"] == first["stored_rows"]

    # A wider window grows coverage without rewriting the overlap.
    extra = payload[:24] + [{**payload[0], "datetime": "2026-07-29T00:00"}]
    third = client.post("/api/models/my_model_v1/forecasts", json=extra).get_json()
    assert third["stored_rows"] == first["stored_rows"] + 1


def test_list_staged_reports_models_and_limits(client, payload):
    assert client.get("/api/models/byom").get_json()["models"] == []

    client.post("/api/models/my_model_v1/forecasts", json=payload)
    body = client.get("/api/models/byom").get_json()

    entry = next(m for m in body["models"] if m["model"] == "my_model_v1")
    assert entry["rows"] == len(payload)
    assert entry["cities"] == 3
    assert entry["scoreable"] is True

    assert body["limits"]["row_cap"] == 5000
    assert body["limits"]["min_rows_per_variable"] == 24
    assert "ecmwf" in body["limits"]["built_in_models"]

    window = body["limits"]["verification_window"]
    assert window["from"] and window["to"]


def test_out_of_window_post_blames_the_window_not_a_missing_file(client):
    """An unscored post must not claim outputs/skill_scores.csv is absent.

    The old guard short-circuited on `not scores` and returned the missing-file
    message, which sent a caller looking for a file that is present and readable.
    """
    rows = [
        {
            "city": "Kanpur",
            "datetime": f"2027-01-01T{hour:02d}:00",
            "temperature": 30.0,
            "rainfall": 0.0,
            "wind_speed": 5.0,
        }
        for hour in range(24)
    ]
    response = client.post("/api/models/future_test/forecasts", json=rows)
    assert response.status_code == 201
    body = response.get_json()

    assert body["status"] == "staged"
    assert body["coverage"]["matched_actuals"] == 0
    assert body["scores"] is None
    assert not any("skill_scores.csv is missing" in note for note in body["notes"])
    assert any("verification window" in note for note in body["notes"])


def test_sparse_model_is_staged_but_not_scored(client, payload):
    response = client.post("/api/models/thin_model/forecasts", json=payload[:6])
    assert response.status_code == 201
    body = response.get_json()
    assert body["status"] == "staged"
    assert body["scores"] is None
    assert body["weight"] is None
    assert body["stored_rows"] == 6
    assert any("matched to observed actuals" in note for note in body["notes"])
