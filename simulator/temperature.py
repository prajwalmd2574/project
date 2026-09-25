import random


class TemperatureSimulator:

    def __init__(self):
        self.temperature = 25.0

    def generate(self):

        # Small gradual temperature variation
        self.temperature += random.uniform(-0.3, 0.3)

        return round(self.temperature, 2)