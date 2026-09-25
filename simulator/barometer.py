import random


class BarometerSimulator:

    def __init__(self):
        self.pressure = 1013.25

    def generate(self):

        # Small pressure variation
        self.pressure += random.uniform(-0.5, 0.5)

        # Approximate altitude for simulation
        altitude = 44330 * (
            1 - (self.pressure / 1013.25) ** 0.1903
        )

        return {
            "pressure": round(self.pressure, 2),
            "altitude": round(altitude, 2)
        }