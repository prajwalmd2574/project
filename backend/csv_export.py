import csv
import sqlite3
from datetime import datetime
from pathlib import Path


DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "database"
    / "telemetry.db"
)

EXPORT_DIR = (
    Path(__file__).resolve().parent.parent
    / "logs"
)


EXPORT_COLUMNS = {
    "all": [
        "id", "timestamp",
        "temperature",
        "pressure", "altitude",
        "accel_x", "accel_y", "accel_z",
        "gyro_x", "gyro_y", "gyro_z",
        "temperature_status",
        "pressure_status",
        "imu_status",
    ],
    "temperature": [
        "id", "timestamp",
        "temperature", "temperature_status",
    ],
    "pressure": [
        "id", "timestamp",
        "pressure", "altitude", "pressure_status",
    ],
    "imu": [
        "id", "timestamp",
        "accel_x", "accel_y", "accel_z",
        "gyro_x", "gyro_y", "gyro_z",
        "imu_status",
    ],
}


def _normalize_datetime(value, is_end=False):
    if not value:
        return None

    value = value.strip()

    try:
        parsed = datetime.fromisoformat(value)

        # datetime-local inputs from the browser normally have
        # minute precision. For the end bound, include the whole minute.
        if is_end and parsed.second == 0 and parsed.microsecond == 0:
            parsed = parsed.replace(second=59, microsecond=999999)

        return parsed.isoformat()

    except ValueError as exc:
        raise ValueError(f"Invalid date/time value: {value}") from exc


def export_telemetry_to_csv(sensor="all", start=None, end=None):
    sensor = sensor.lower()

    if sensor not in EXPORT_COLUMNS:
        raise ValueError(
            "Invalid sensor filter. Use all, temperature, pressure, or imu."
        )

    start_value = _normalize_datetime(start, is_end=False)
    end_value = _normalize_datetime(end, is_end=True)

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"telemetry_{sensor}_{timestamp}.csv"
    export_path = EXPORT_DIR / filename

    columns = EXPORT_COLUMNS[sensor]

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row

    try:
        query = "SELECT " + ", ".join(columns) + " FROM telemetry"
        conditions = []
        parameters = []

        if start_value:
            conditions.append("timestamp >= ?")
            parameters.append(start_value)

        if end_value:
            conditions.append("timestamp <= ?")
            parameters.append(end_value)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY id ASC"

        rows = connection.execute(query, parameters).fetchall()

        if not rows:
            raise ValueError("No telemetry data matches the selected filters.")

        with open(
            export_path,
            "w",
            newline="",
            encoding="utf-8",
        ) as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(columns)

            for row in rows:
                writer.writerow([row[column] for column in columns])

        return export_path

    finally:
        connection.close()
