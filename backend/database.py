import sqlite3
from pathlib import Path


DB_PATH = (
    Path(__file__).resolve().parent.parent
    / "database"
    / "telemetry.db"
)


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def get_latest_telemetry():
    connection = get_connection()
    try:
        row = connection.execute("""
            SELECT *
            FROM telemetry
            ORDER BY id DESC
            LIMIT 1
        """).fetchone()

        return dict(row) if row is not None else None
    finally:
        connection.close()


def get_recent_telemetry(limit=40):
    connection = get_connection()
    try:
        rows = connection.execute("""
            SELECT *
            FROM telemetry
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        return [dict(row) for row in rows]
    finally:
        connection.close()


def get_recent_anomalies(limit=25):
    connection = get_connection()
    try:
        rows = connection.execute("""
            SELECT
                a.id,
                a.timestamp,
                a.sensor,
                a.status,
                t.temperature,
                t.pressure,
                t.accel_x,
                t.accel_y,
                t.accel_z
            FROM anomaly_events AS a
            LEFT JOIN telemetry AS t
                ON t.timestamp = a.timestamp
            ORDER BY a.id DESC
            LIMIT ?
        """, (limit,)).fetchall()

        results = []

        for row in rows:
            item = dict(row)
            sensor = str(item["sensor"]).lower()
            status = str(item["status"]).lower()

            if sensor == "temperature":
                value = item["temperature"]
                unit = "°C"
                sensor_label = "Temperature"
                threshold = 60 if status == "critical" else 55
                threshold_text = f">{threshold}°C"
            elif sensor == "pressure":
                value = item["pressure"]
                unit = "hPa"
                sensor_label = "Barometer"
                threshold = 1050 if status == "critical" else 1040
                threshold_text = f">{threshold} hPa"
            else:
                values = [
                    item.get("accel_x"),
                    item.get("accel_y"),
                    item.get("accel_z"),
                ]
                if all(v is not None for v in values):
                    value = (sum(float(v) ** 2 for v in values)) ** 0.5
                else:
                    value = None

                unit = "m/s²"
                sensor_label = "IMU"
                threshold = 15 if status == "critical" else 12
                threshold_text = f">{threshold} m/s²"

            if status == "sensor_failure":
                display_value = "No data"
                threshold_text = "Sensor unavailable"
                message = f"{sensor_label} sensor is not responding."
            else:
                display_value = (
                    f"{float(value):.2f} {unit}"
                    if value is not None
                    else "No data"
                )

                if status == "critical":
                    message = f"{sensor_label} exceeded the critical limit."
                else:
                    message = f"{sensor_label} crossed the warning threshold."

            results.append({
                "id": item["id"],
                "timestamp": item["timestamp"],
                "sensor": item["sensor"],
                "sensor_label": sensor_label,
                "status": item["status"],
                "display_value": display_value,
                "threshold_text": threshold_text,
                "message": message,
            })

        return results
    finally:
        connection.close()
