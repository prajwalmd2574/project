import time
from fault_injector import FaultInjector

fault_injector = FaultInjector()

while True:
    faults = fault_injector.update()

    print("Active faults:", faults)

    time.sleep(1)