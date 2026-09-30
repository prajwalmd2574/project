import subprocess
import sys
import time
import webbrowser


processes = []

WINDOW = subprocess.CREATE_NEW_CONSOLE


def start_service(name, module_name):
    print(f"Starting {name}...")

    process = subprocess.Popen(
        [
            sys.executable,
            "-m",
            module_name
        ],
        creationflags=WINDOW
    )

    processes.append((name, process))

    return process


def stop_all():

    print("\nStopping services...")

    for name, process in processes:

        if process.poll() is None:

            print(f"Stopping {name}...")

            process.terminate()

    print("Services stopped.")


def main():

    try:

        # -----------------------------------------
        # Start MQTT Subscriber
        # -----------------------------------------
        start_service(
            "MQTT Subscriber",
            "mqtt.subscriber"
        )

        time.sleep(2)


        # -----------------------------------------
        # Start Flask Backend
        # -----------------------------------------
        start_service(
            "Flask Backend",
            "backend.app"
        )

        time.sleep(3)


        # -----------------------------------------
        # Start MQTT Publisher
        # -----------------------------------------
        start_service(
            "MQTT Publisher",
            "mqtt.publisher"
        )

        time.sleep(2)


        print("")
        print("======================================")
        print(" Remote Telemetry Monitoring Started")
        print("======================================")
        print("")
        print("Subscriber → separate terminal")
        print("Backend    → separate terminal")
        print("Publisher  → separate terminal")
        print("")
        print("Dashboard:")
        print("http://127.0.0.1:5000/")
        print("")
        print("Press Ctrl+C here to stop all services.")
        print("======================================")


        # Open dashboard automatically
        webbrowser.open(
            "http://127.0.0.1:5000/"
        )


        # Keep launcher alive
        while True:

            # Check services
            for name, process in processes:

                if process.poll() is not None:

                    print(
                        f"{name} stopped "
                        f"(exit code {process.returncode})"
                    )

            time.sleep(2)


    except KeyboardInterrupt:

        print("\nCtrl+C received.")

    finally:

        stop_all()


if __name__ == "__main__":
    main()