class AnomalyDetector:

    def __init__(self):

        # Temperature thresholds
        self.temperature_warning = 55
        self.temperature_critical = 60

        # Pressure thresholds
        self.pressure_warning = 1040
        self.pressure_critical = 1050

        # IMU acceleration thresholds
        self.acceleration_warning = 12
        self.acceleration_critical = 15

    def check_temperature(self, temperature):

        if temperature is None:
            return "SENSOR_FAILURE"

        if temperature > self.temperature_critical:
            return "CRITICAL"

        if temperature > self.temperature_warning:
            return "WARNING"

        return "NORMAL"

    def check_pressure(self, pressure):

        if pressure is None:
            return "SENSOR_FAILURE"

        if pressure > self.pressure_critical:
            return "CRITICAL"

        if pressure > self.pressure_warning:
            return "WARNING"

        return "NORMAL"

    def check_imu(self, imu):

        if imu is None:
            return "SENSOR_FAILURE"

        acceleration_values = [
            abs(imu["accel_x"]),
            abs(imu["accel_y"]),
            abs(imu["accel_z"])
        ]

        maximum_acceleration = max(acceleration_values)

        if maximum_acceleration > self.acceleration_critical:
            return "CRITICAL"

        if maximum_acceleration > self.acceleration_warning:
            return "WARNING"

        return "NORMAL"

    def analyze(self, data):

        temperature_status = self.check_temperature(
            data["temperature"]
        )

        if data["barometer"] is None:
            pressure_status = "SENSOR_FAILURE"
        else:
            pressure_status = self.check_pressure(
                data["barometer"]["pressure"]
            )

        imu_status = self.check_imu(
            data["imu"]
        )

        return {
            "temperature": temperature_status,
            "pressure": pressure_status,
            "imu": imu_status
        }