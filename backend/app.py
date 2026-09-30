from pathlib import Path

from flask import Flask, jsonify, request, render_template, send_file
from flask_cors import CORS

from backend.database import (
    get_latest_telemetry,
    get_recent_telemetry,
    get_recent_anomalies,
)
from backend.csv_export import export_telemetry_to_csv


BASE_DIR = Path(__file__).resolve().parent.parent

app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "dashboard" / "templates"),
    static_folder=str(BASE_DIR / "dashboard" / "static"),
)

CORS(app)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "Remote Telemetry Monitoring Backend",
    }), 200


@app.route("/api/latest", methods=["GET"])
def latest():
    telemetry = get_latest_telemetry()

    if telemetry is None:
        return jsonify({
            "message": "No telemetry data available"
        }), 404

    return jsonify(telemetry), 200


@app.route("/api/telemetry", methods=["GET"])
def telemetry():
    limit = request.args.get("limit", default=40, type=int)
    limit = max(1, min(limit, 500))

    rows = get_recent_telemetry(limit)

    return jsonify({
        "count": len(rows),
        "telemetry": rows,
    }), 200


@app.route("/api/anomalies", methods=["GET"])
def anomalies():
    limit = request.args.get("limit", default=25, type=int)
    limit = max(1, min(limit, 500))

    rows = get_recent_anomalies(limit)

    return jsonify({
        "count": len(rows),
        "anomalies": rows,
    }), 200


@app.route("/api/export", methods=["GET"])
def export_data():
    sensor = request.args.get("sensor", default="all")
    start = request.args.get("start")
    end = request.args.get("end")

    try:
        file_path = export_telemetry_to_csv(
            sensor=sensor,
            start=start,
            end=end,
        )

        return send_file(
            file_path,
            as_attachment=True,
            download_name=file_path.name,
            mimetype="text/csv",
        )

    except ValueError as exc:
        return jsonify({
            "error": str(exc)
        }), 400


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
    )