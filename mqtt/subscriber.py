# import paho.mqtt.client as mqtt

# BROKER = "localhost"
# PORT = 1883
# TOPIC = "telemetry/test"


# def on_connect(client, userdata, flags, rc):
#     if rc == 0:
#         print("MQTT Subscriber connected")
#         client.subscribe(TOPIC)
#         print("Subscribed to:", TOPIC)
#     else:
#         print("Connection failed")


# def on_message(client, userdata, msg):

#     print("\nMessage received")
#     print("Topic:", msg.topic)
#     print("Data:", msg.payload.decode())


# client = mqtt.Client()

# client.on_connect = on_connect
# client.on_message = on_message

# client.connect(BROKER, PORT, 60)

# print("Waiting for messages...")

# client.loop_forever()

# import json
# import paho.mqtt.client as mqtt

# BROKER = "localhost"
# PORT = 1883
# TOPIC = "telemetry/all"


# def on_connect(client, userdata, flags, rc):
#     if rc == 0:
#         print("MQTT Subscriber connected")
#         client.subscribe(TOPIC)
#         print("Subscribed to:", TOPIC)
#     else:
#         print("Connection failed with code:", rc)


# def on_message(client, userdata, msg):

#     try:
#         sensor_data = json.loads(msg.payload.decode())

#         print("\nMessage received")
#         print("Topic:", msg.topic)
#         print(json.dumps(sensor_data, indent=4))
#         print("-" * 60)

#     except json.JSONDecodeError:
#         print("Invalid JSON received")


# client = mqtt.Client()

# client.on_connect = on_connect
# client.on_message = on_message

# client.connect(BROKER, PORT, 60)

# print("Waiting for telemetry...")

# client.loop_forever()


# second time changes before connecting to db this code  

# import json
# import paho.mqtt.client as mqtt

# from backend.anomaly_detector import AnomalyDetector


# BROKER = "localhost"
# PORT = 1883
# TOPIC = "telemetry/all"

# # Create anomaly detector
# detector = AnomalyDetector()


# def on_connect(client, userdata, flags, rc):

#     if rc == 0:
#         print("MQTT Subscriber connected")
#         client.subscribe(TOPIC)
#         print("Subscribed to:", TOPIC)

#     else:
#         print("Connection failed with code:", rc)


# def on_message(client, userdata, msg):

#     try:

#         # Convert MQTT payload into Python dictionary
#         sensor_data = json.loads(msg.payload.decode())

#         print("\nTelemetry received:")
#         print(json.dumps(sensor_data, indent=4))

#         # -------------------------------------------
#         # Run anomaly detection
#         # -------------------------------------------

#         result = detector.analyze(sensor_data)

#         print("\nAnomaly Detection Result:")
#         print(json.dumps(result, indent=4))

#         print("-" * 60)

#     except json.JSONDecodeError:
#         print("Invalid JSON received")

#     except Exception as e:
#         print("Processing error:", e)


# client = mqtt.Client()

# client.on_connect = on_connect
# client.on_message = on_message

# client.connect(BROKER, PORT, 60)

# print("Waiting for telemetry...")

# client.loop_forever()

# after connecting to db code 

import json

import paho.mqtt.client as mqtt

from backend.anomaly_detector import AnomalyDetector
from database.database import Database


BROKER = "localhost"
PORT = 1883
TOPIC = "telemetry/all"


# Create objects once
detector = AnomalyDetector()
db = Database()


def on_connect(client, userdata, flags, rc):

    if rc == 0:
        print("MQTT Subscriber connected")
        client.subscribe(TOPIC)
        print("Subscribed to:", TOPIC)

    else:
        print("Connection failed with code:", rc)


def on_message(client, userdata, msg):

    try:

        # Convert MQTT JSON message to Python dictionary
        sensor_data = json.loads(msg.payload.decode())

        # -----------------------------------------
        # Anomaly detection
        # -----------------------------------------
        result = detector.analyze(sensor_data)

        # -----------------------------------------
        # Store telemetry in database
        # -----------------------------------------
        db.insert_telemetry(
            sensor_data,
            result
        )

        # -----------------------------------------
        # Store abnormal events
        # -----------------------------------------
        db.insert_anomaly_events(
            sensor_data["timestamp"],
            result
        )

        # -----------------------------------------
        # Display result
        # -----------------------------------------
        print("\nTelemetry received:")
        print(json.dumps(sensor_data, indent=4))

        print("\nAnomaly Detection:")
        print(json.dumps(result, indent=4))

        print("Database: telemetry saved")

        print("-" * 60)

    except json.JSONDecodeError:
        print("Invalid JSON received")

    except Exception as e:
        print("Processing error:", e)


client = mqtt.Client()

client.on_connect = on_connect
client.on_message = on_message

client.connect(BROKER, PORT, 60)

print("Waiting for telemetry...")

try:

    client.loop_forever()

except KeyboardInterrupt:

    print("\nSubscriber stopped.")

finally:

    db.close()
    client.disconnect()