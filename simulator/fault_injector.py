import random
import time


class FaultInjector:

    def __init__(self):
        self.active_faults = []
        self.next_fault_time = time.time() + random.randint(20, 40)
        self.fault_end_time = None

    def update(self):

        current_time = time.time()

        # Start a new fault
        if not self.active_faults and current_time >= self.next_fault_time:

            fault_count = random.choice([1, 1, 2])

            possible_faults = [
                "high_temperature",
                "high_pressure",
                "high_acceleration",
                "temperature_failure",
                "pressure_failure",
                "imu_failure"
            ]

            self.active_faults = random.sample(
                possible_faults,
                fault_count
            )

            self.fault_end_time = current_time + 5

            print("\n*** FAULT INJECTED ***")
            print("Faults:", self.active_faults)

        # End fault
        if self.active_faults and current_time >= self.fault_end_time:

            print("\n*** FAULT CLEARED ***")

            self.active_faults = []

            self.next_fault_time = (
                current_time + random.randint(20, 40)
            )

        return self.active_faults