"""Small contract checks for the public API's operational values."""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import app  # noqa: E402
from api import cache_manager  # noqa: E402


def test_rpi_uses_current_metadata_timestamp():
    client = app.test_client()
    metadata = client.get("/api/metadata").get_json()
    rpi = client.get("/api/rpi?city=Kanpur").get_json()
    assert rpi["updatedAt"] == metadata["last_updated"]
    assert rpi["updatedAt"] != "2026-09-26T18:30:00"


def test_cache_freshness_reads_named_datetime_column(tmp_path, monkeypatch):
    today = date.today().strftime("%Y-%m-%d")
    forecast = tmp_path / "blended_forecast.csv"
    forecast.write_text(
        "city,description,datetime\n"
        f'Kanpur,"comma, in city",{today} 00:00:00\n'
    )
    metadata = tmp_path / "metadata.json"
    metadata.write_text(json.dumps({"last_updated": f"{today}T05:00:00"}))
    monkeypatch.setattr(cache_manager, "BLENDED_CSV", forecast)
    monkeypatch.setattr(cache_manager, "METADATA_JSON", metadata)
    assert cache_manager.is_cache_fresh() is True


def test_cache_is_stale_when_csv_predates_today(tmp_path, monkeypatch):
    stale_day = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
    forecast = tmp_path / "blended_forecast.csv"
    forecast.write_text(
        "city,description,datetime\n"
        f"Kanpur,stale,{stale_day} 00:00:00\n"
    )
    metadata = tmp_path / "metadata.json"
    metadata.write_text(json.dumps({"last_updated": f"{stale_day}T05:00:00"}))
    monkeypatch.setattr(cache_manager, "BLENDED_CSV", forecast)
    monkeypatch.setattr(cache_manager, "METADATA_JSON", metadata)
    assert cache_manager.is_cache_fresh() is False
