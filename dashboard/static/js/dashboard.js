/* ==========================================================================
   Remote Telemetry Monitoring — Dashboard Logic
   --------------------------------------------------------------------------
   Uses the real Flask backend.
   Data flow:

   MQTT -> Subscriber -> Anomaly Detector -> SQLite
                                      |
                                      v
                                Flask REST API
                                      |
                                      v
                                 Dashboard

   No mock telemetry is generated in the browser.
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------------
     CONFIGURATION
     ------------------------------------------------------------------------ */

  const CONFIG = {
    apiBaseUrl: "/api",
    historyLimit: 40,
    alertLimit: 25,
    updateIntervalMs: 2000
  };

  const store = {
    latest: null,
    history: [],
    anomalies: [],
    charts: {}
  };


  /* ------------------------------------------------------------------------
     HELPERS
     ------------------------------------------------------------------------ */

  function $(selector) {
    return document.querySelector(selector);
  }


  function formatNumber(value, decimals = 2) {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isFinite(Number(value))
    ) {
      return "--";
    }

    return Number(value).toFixed(decimals);
  }


  function formatTime(timestamp, includeDate = false) {
    if (!timestamp) {
      return "--";
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    if (includeDate) {
      return date.toLocaleString();
    }

    return date.toLocaleTimeString();
  }


  function capitalizeStatus(status) {
    if (!status) {
      return "--";
    }

    return String(status)
      .split("_")
      .map(
        part =>
          part.charAt(0).toUpperCase() +
          part.slice(1).toLowerCase()
      )
      .join(" ");
  }


  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  /* ------------------------------------------------------------------------
     CONNECTION STATUS
     ------------------------------------------------------------------------ */

  function setConnectionState(state) {
    const connection = $("#connectionStatus");

    if (!connection) {
      return;
    }

    connection.dataset.state = state;

    const text = connection.querySelector(".status-text");

    if (text) {
      text.textContent =
        state === "online" ? "ONLINE" : "OFFLINE";
    }
  }


  /* ------------------------------------------------------------------------
     STATUS BADGES
     ------------------------------------------------------------------------ */

  function setStatusBadge(element, status) {
    if (!element) {
      return;
    }

    const normalized = String(status || "unknown").toLowerCase();

    element.dataset.status = normalized;
    element.textContent = capitalizeStatus(normalized);
  }


  function getStatus(frame) {
    return {
      temperature:
        frame.temperature_status ||
        (frame.temperature == null
          ? "sensor_failure"
          : "normal"),

      pressure:
        frame.pressure_status ||
        (frame.pressure == null
          ? "sensor_failure"
          : "normal"),

      imu:
        frame.imu_status ||
        (
          frame.accel_x == null ||
          frame.accel_y == null ||
          frame.accel_z == null
            ? "sensor_failure"
            : "normal"
        )
    };
  }


  /* ------------------------------------------------------------------------
     IMU CALCULATIONS
     ------------------------------------------------------------------------ */

  function calculateImuMagnitude(frame) {
    const x = Number(frame.accel_x);
    const y = Number(frame.accel_y);
    const z = Number(frame.accel_z);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return null;
    }

    return Math.sqrt(
      x * x +
      y * y +
      z * z
    );
  }


  /* ------------------------------------------------------------------------
     STATISTICS
     ------------------------------------------------------------------------ */

  function calculateStats(values) {
    const validValues = values
      .map(Number)
      .filter(Number.isFinite);

    if (validValues.length === 0) {
      return {
        min: null,
        max: null,
        avg: null
      };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    const avg =
      validValues.reduce(
        (sum, value) => sum + value,
        0
      ) / validValues.length;

    return {
      min,
      max,
      avg
    };
  }


  /* ------------------------------------------------------------------------
     TREND
     ------------------------------------------------------------------------ */

  function updateTrend(element, values) {
    if (!element) {
      return;
    }

    const valid = values
      .map(Number)
      .filter(Number.isFinite);

    if (valid.length < 2) {
      element.dataset.direction = "flat";
      element.textContent = "—";
      return;
    }

    const previous = valid[valid.length - 2];
    const current = valid[valid.length - 1];

    const difference = current - previous;

    if (Math.abs(difference) < 0.001) {
      element.dataset.direction = "flat";
      element.textContent = "—";
    } else if (difference > 0) {
      element.dataset.direction = "up";
      element.textContent = "▲";
    } else {
      element.dataset.direction = "down";
      element.textContent = "▼";
    }
  }


  /* ------------------------------------------------------------------------
     LIVE VALUES
     ------------------------------------------------------------------------ */

  function renderLiveValues(frame, history) {
    const status = getStatus(frame);

    /* ---------------- Temperature ---------------- */

    const temperatureValues =
      history.map(item => item.temperature);

    const temperatureStats =
      calculateStats(temperatureValues);

    const tempCurrent =
      $("#tempCurrentValue");

    const tempBig =
      $("#tempBigValue");

    const tempMin =
      $("#tempMin");

    const tempMax =
      $("#tempMax");

    const tempAvg =
      $("#tempAvg");

    if (tempCurrent) {
      tempCurrent.textContent =
        formatNumber(frame.temperature, 1);
    }

    if (tempBig) {
      tempBig.textContent =
        formatNumber(frame.temperature, 1);
    }

    if (tempMin) {
      tempMin.textContent =
        temperatureStats.min == null
          ? "--"
          : `${formatNumber(temperatureStats.min, 1)} °C`;
    }

    if (tempMax) {
      tempMax.textContent =
        temperatureStats.max == null
          ? "--"
          : `${formatNumber(temperatureStats.max, 1)} °C`;
    }

    if (tempAvg) {
      tempAvg.textContent =
        temperatureStats.avg == null
          ? "--"
          : `${formatNumber(temperatureStats.avg, 1)} °C`;
    }

    setStatusBadge(
      $("#tempStatusBadge"),
      status.temperature
    );

    const temperatureSummaryBadge =
      document.querySelector(
        '[data-sensor="temperature"] .summary-card-head .status-badge'
      );

    setStatusBadge(
      temperatureSummaryBadge,
      status.temperature
    );

    updateTrend(
      $("#tempTrend"),
      temperatureValues
    );


    /* ---------------- Pressure ---------------- */

    const pressureValues =
      history.map(item => item.pressure);

    const pressureStats =
      calculateStats(pressureValues);

    const pressureCurrent =
      $("#pressureCurrentValue");

    const pressureBig =
      $("#pressureBigValue");

    if (pressureCurrent) {
      pressureCurrent.textContent =
        formatNumber(frame.pressure, 1);
    }

    if (pressureBig) {
      pressureBig.textContent =
        formatNumber(frame.pressure, 1);
    }

    if ($("#pressureMin")) {
      $("#pressureMin").textContent =
        pressureStats.min == null
          ? "--"
          : `${formatNumber(pressureStats.min, 1)} hPa`;
    }

    if ($("#pressureMax")) {
      $("#pressureMax").textContent =
        pressureStats.max == null
          ? "--"
          : `${formatNumber(pressureStats.max, 1)} hPa`;
    }

    if ($("#pressureAvg")) {
      $("#pressureAvg").textContent =
        pressureStats.avg == null
          ? "--"
          : `${formatNumber(pressureStats.avg, 1)} hPa`;
    }

    setStatusBadge(
      $("#pressureStatusBadge"),
      status.pressure
    );

    const pressureSummaryBadge =
      document.querySelector(
        '[data-sensor="pressure"] .summary-card-head .status-badge'
      );

    setStatusBadge(
      pressureSummaryBadge,
      status.pressure
    );

    updateTrend(
      $("#pressureTrend"),
      pressureValues
    );


    /* ---------------- IMU ---------------- */

    const imuMagnitude =
      calculateImuMagnitude(frame);

    const imuHistory =
      history
        .map(calculateImuMagnitude)
        .filter(Number.isFinite);

    if ($("#imuCurrentValue")) {
      $("#imuCurrentValue").textContent =
        formatNumber(imuMagnitude, 2);
    }

    if ($("#imuRmsValue")) {
      $("#imuRmsValue").textContent =
        formatNumber(imuMagnitude, 2);
    }

    if ($("#accelX")) {
      $("#accelX").textContent =
        frame.accel_x == null
          ? "--"
          : `${formatNumber(frame.accel_x)} m/s²`;
    }

    if ($("#accelY")) {
      $("#accelY").textContent =
        frame.accel_y == null
          ? "--"
          : `${formatNumber(frame.accel_y)} m/s²`;
    }

    if ($("#accelZ")) {
      $("#accelZ").textContent =
        frame.accel_z == null
          ? "--"
          : `${formatNumber(frame.accel_z)} m/s²`;
    }

    if ($("#gyroX")) {
      $("#gyroX").textContent =
        frame.gyro_x == null
          ? "--"
          : `${formatNumber(frame.gyro_x)} °/s`;
    }

    if ($("#gyroY")) {
      $("#gyroY").textContent =
        frame.gyro_y == null
          ? "--"
          : `${formatNumber(frame.gyro_y)} °/s`;
    }

    if ($("#gyroZ")) {
      $("#gyroZ").textContent =
        frame.gyro_z == null
          ? "--"
          : `${formatNumber(frame.gyro_z)} °/s`;
    }

    setStatusBadge(
      $("#imuStatusBadge"),
      status.imu
    );

    const imuSummaryBadge =
      document.querySelector(
        '[data-sensor="imu"] .summary-card-head .status-badge'
      );

    setStatusBadge(
      imuSummaryBadge,
      status.imu
    );

    updateTrend(
      $("#imuTrend"),
      imuHistory
    );


    /* ---------------- Timestamp ---------------- */

    if ($("#lastUpdated")) {
      $("#lastUpdated").textContent =
        formatTime(frame.timestamp, true);
    }
  }


  /* ------------------------------------------------------------------------
     CHARTS
     ------------------------------------------------------------------------ */

  function createChart(
    canvasId,
    label,
    borderColor,
    unit
  ) {
    const canvas =
      document.getElementById(canvasId);

    if (
      !canvas ||
      typeof Chart === "undefined"
    ) {
      return null;
    }

    return new Chart(
      canvas.getContext("2d"),
      {
        type: "line",

        data: {
          labels: [],

          datasets: [
            {
              label,
              data: [],

              borderColor,
              backgroundColor:
                "rgba(37, 99, 235, 0.08)",

              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25,
              fill: false
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,

          interaction: {
            mode: "index",
            intersect: false
          },

          plugins: {
            legend: {
              display: false
            },

            tooltip: {
              callbacks: {
                label(context) {
                  return `${context.parsed.y} ${unit}`;
                }
              }
            }
          },

          scales: {
            x: {
              ticks: {
                maxTicksLimit: 6
              },

              grid: {
                display: false
              }
            },

            y: {
              ticks: {
                maxTicksLimit: 6
              },

              grid: {
                color: "#eef1f5"
              }
            }
          }
        }
      }
    );
  }


  function createImuChart() {
    const canvas =
      document.getElementById("imuChart");

    if (
      !canvas ||
      typeof Chart === "undefined"
    ) {
      return null;
    }

    return new Chart(
      canvas.getContext("2d"),
      {
        type: "line",

        data: {
          labels: [],

          datasets: [
            {
              label: "X",
              data: [],
              borderColor: "#2563eb",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },

            {
              label: "Y",
              data: [],
              borderColor: "#7c3aed",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            },

            {
              label: "Z",
              data: [],
              borderColor: "#0891b2",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.25
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,

          interaction: {
            mode: "index",
            intersect: false
          },

          plugins: {
            legend: {
              display: true
            }
          },

          scales: {
            x: {
              ticks: {
                maxTicksLimit: 6
              },

              grid: {
                display: false
              }
            },

            y: {
              title: {
                display: true,
                text: "m/s²"
              },

              grid: {
                color: "#eef1f5"
              }
            }
          }
        }
      }
    );
  }


  function initCharts() {
    store.charts.temperature =
      createChart(
        "temperatureChart",
        "Temperature",
        "#2563eb",
        "°C"
      );

    store.charts.pressure =
      createChart(
        "pressureChart",
        "Pressure",
        "#7c3aed",
        "hPa"
      );

    store.charts.imu =
      createImuChart();
  }


  function updateCharts(history) {
    const labels =
      history.map(
        item => formatTime(item.timestamp)
      );

    const temperatureValues =
      history.map(
        item => item.temperature ?? null
      );

    const pressureValues =
      history.map(
        item => item.pressure ?? null
      );

    const accelX =
      history.map(
        item => item.accel_x ?? null
      );

    const accelY =
      history.map(
        item => item.accel_y ?? null
      );

    const accelZ =
      history.map(
        item => item.accel_z ?? null
      );


    /* Temperature chart */

    if (store.charts.temperature) {

      const chart =
        store.charts.temperature;

      chart.data.labels = labels;

      chart.data.datasets[0].data =
        temperatureValues;

      chart.update("none");
    }


    /* Pressure chart */

    if (store.charts.pressure) {

      const chart =
        store.charts.pressure;

      chart.data.labels = labels;

      chart.data.datasets[0].data =
        pressureValues;

      chart.update("none");
    }


    /* IMU chart */

    if (store.charts.imu) {

      const chart =
        store.charts.imu;

      chart.data.labels = labels;

      chart.data.datasets[0].data =
        accelX;

      chart.data.datasets[1].data =
        accelY;

      chart.data.datasets[2].data =
        accelZ;

      chart.update("none");
    }
  }


  /* ------------------------------------------------------------------------
     ALERT TABLE
     ------------------------------------------------------------------------ */

  function findTelemetryForAlert(alert) {
    if (!alert || !alert.timestamp) {
      return null;
    }

    return (
      store.history.find(
        row => row.timestamp === alert.timestamp
      ) ||
      null
    );
  }


  function getAlertDisplayData(alert) {
    const sensor =
      String(alert.sensor || "").toLowerCase();

    const telemetry =
      findTelemetryForAlert(alert);

    let value = "--";
    let threshold = "--";
    let message = "Abnormal telemetry detected";


    if (sensor === "temperature") {

      value =
        telemetry?.temperature != null
          ? `${formatNumber(telemetry.temperature, 1)} °C`
          : "--";

      threshold =
        alert.status === "CRITICAL"
          ? "> 60 °C"
          : "> 55 °C";

      message =
        alert.status === "CRITICAL"
          ? "Temperature exceeded critical limit"
          : "Temperature exceeded warning limit";
    }


    else if (sensor === "pressure") {

      value =
        telemetry?.pressure != null
          ? `${formatNumber(telemetry.pressure, 1)} hPa`
          : "--";

      threshold =
        alert.status === "CRITICAL"
          ? "> 1050 hPa"
          : "> 1040 hPa";

      message =
        alert.status === "CRITICAL"
          ? "Pressure exceeded critical limit"
          : "Pressure exceeded warning limit";
    }


    else if (sensor === "imu") {

      const magnitude =
        telemetry
          ? calculateImuMagnitude(telemetry)
          : null;

      value =
        magnitude != null
          ? `${formatNumber(magnitude, 2)} m/s²`
          : "--";

      threshold =
        alert.status === "CRITICAL"
          ? "> 15 m/s²"
          : "> 12 m/s²";

      message =
        alert.status === "CRITICAL"
          ? "IMU acceleration exceeded critical limit"
          : "IMU acceleration exceeded warning limit";
    }


    return {
      value,
      threshold,
      message
    };
  }


  function renderAlerts(anomalies) {
    const tableBody =
      $("#alertsTableBody");

    if (!tableBody) {
      return;
    }

    const rows =
      anomalies.slice(0, CONFIG.alertLimit);

    if (rows.length === 0) {

      tableBody.innerHTML = `
        <tr class="alerts-empty-row">
          <td colspan="7">
            No alerts recorded yet.
          </td>
        </tr>
      `;

      if ($("#alertCount")) {
        $("#alertCount").textContent =
          "0 detected";
      }

      return;
    }


    tableBody.innerHTML =
      rows.map(alert => {

        const severity =
          String(
            alert.status || "info"
          ).toLowerCase();

        const sensorName =
          capitalizeStatus(alert.sensor);

        const details =
          getAlertDisplayData(alert);

        return `
          <tr>
            <td>
              ${escapeHtml(
                formatTime(alert.timestamp, true)
              )}
            </td>

            <td>
              ${escapeHtml(sensorName)}
            </td>

            <td>
              ${escapeHtml(details.value)}
            </td>

            <td>
              ${escapeHtml(details.threshold)}
            </td>

            <td>
              <span
                class="severity-pill"
                data-severity="${escapeHtml(severity)}"
              >
                ${escapeHtml(
                  capitalizeStatus(severity)
                )}
              </span>
            </td>

            <td>
              <span
                class="row-status"
                data-active="true"
              >
                Detected
              </span>
            </td>

            <td>
              ${escapeHtml(details.message)}
            </td>
          </tr>
        `;
      }).join("");


    if ($("#alertCount")) {
      $("#alertCount").textContent =
        `${rows.length} detected`;
    }
  }


  /* ------------------------------------------------------------------------
     API
     ------------------------------------------------------------------------ */

  async function fetchJson(endpoint) {
    const response =
      await fetch(
        `${CONFIG.apiBaseUrl}${endpoint}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return response.json();
  }


  async function refreshDashboard() {

    try {

      const [
        latest,
        telemetryResponse,
        anomalyResponse
      ] = await Promise.all([
        fetchJson("/latest"),

        fetchJson(
          `/telemetry?limit=${CONFIG.historyLimit}`
        ),

        fetchJson(
          `/anomalies?limit=${CONFIG.alertLimit}`
        )
      ]);


      store.latest = latest;


      /*
       * Backend returns newest first.
       * Reverse it so the chart runs oldest -> newest.
       */

      store.history =
        (
          telemetryResponse.telemetry ||
          []
        )
          .slice()
          .reverse();


      store.anomalies =
        anomalyResponse.anomalies ||
        [];


      /* Render dashboard */

      renderLiveValues(
        latest,
        store.history
      );

      updateCharts(
        store.history
      );

      renderAlerts(
        store.anomalies
      );


      setConnectionState("online");

    }

    catch (error) {

      console.error(
        "Dashboard refresh failed:",
        error
      );

      setConnectionState("offline");
    }
  }


  /* ------------------------------------------------------------------------
     CSV EXPORT
     ------------------------------------------------------------------------ */

  async function exportTelemetry(
    sensor,
    start,
    end
  ) {

    /*
     * Current backend exports the telemetry table.
     *
     * sensor/start/end are included as query parameters so the frontend
     * is ready for filtering when you add server-side filtering later.
     */

    const params =
      new URLSearchParams();

    params.set(
      "sensor",
      sensor
    );

    if (start) {
      params.set("start", start);
    }

    if (end) {
      params.set("end", end);
    }


    const response =
      await fetch(
        `${CONFIG.apiBaseUrl}/export?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      let message =
        `Export failed: HTTP ${response.status}`;

      try {

        const result =
          await response.json();

        if (result.error) {
          message =
            result.error;
        }

      } catch (_) {
        // Keep the original error.
      }

      throw new Error(message);
    }


    const blob =
      await response.blob();

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "telemetry_export.csv";

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  }


  function bindExportForm() {

    const form =
      $("#exportForm");

    if (!form) {
      return;
    }

    const button =
      $("#exportButton");

    const status =
      $("#exportStatus");


    form.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const sensor =
          $("#exportSensor")?.value ||
          "all";

        const start =
          $("#exportStart")?.value ||
          "";

        const end =
          $("#exportEnd")?.value ||
          "";


        if (button) {
          button.disabled = true;
        }

        if (status) {
          status.dataset.state = "";
          status.textContent =
            "Preparing export…";
        }


        try {

          await exportTelemetry(
            sensor,
            start,
            end
          );


          if (status) {
            status.dataset.state =
              "success";

            status.textContent =
              "Export complete.";
          }

        }

        catch (error) {

          console.error(
            "CSV export failed:",
            error
          );

          if (status) {
            status.dataset.state =
              "error";

            status.textContent =
              error.message;
          }

        }

        finally {

          if (button) {
            button.disabled = false;
          }
        }
      }
    );
  }


  /* ------------------------------------------------------------------------
     INITIALIZATION
     ------------------------------------------------------------------------ */

  function init() {

    initCharts();

    bindExportForm();

    setConnectionState("offline");

    refreshDashboard();


    window.setInterval(
      refreshDashboard,
      CONFIG.updateIntervalMs
    );
  }


  document.addEventListener(
    "DOMContentLoaded",
    init
  );

})();