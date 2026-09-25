import random


class IMUSimulator:

    def __init__(self):
        # Initial values
        self.accel_x = 0.0
        self.accel_y = 0.0
        self.accel_z = 9.81

        self.gyro_x = 0.0
        self.gyro_y = 0.0
        self.gyro_z = 0.0

    def generate(self):

        # Simulate small natural variations
        self.accel_x += random.uniform(-0.1, 0.1)
        self.accel_y += random.uniform(-0.1, 0.1)
        self.accel_z += random.uniform(-0.1, 0.1)

        self.gyro_x += random.uniform(-0.02, 0.02)
        self.gyro_y += random.uniform(-0.02, 0.02)
        self.gyro_z += random.uniform(-0.02, 0.02)

        return {
            "accel_x": round(self.accel_x, 3),
            "accel_y": round(self.accel_y, 3),
            "accel_z": round(self.accel_z, 3),

            "gyro_x": round(self.gyro_x, 3),
            "gyro_y": round(self.gyro_y, 3),
            "gyro_z": round(self.gyro_z, 3)
        }