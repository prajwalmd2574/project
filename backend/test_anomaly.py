from anomaly_detector import AnomalyDetector


detector = AnomalyDetector()

# # # for crucial message
# test_data = {
#     "temperature": 70.0,

#     "barometer": {
#         "pressure": 1200.0,
#         "altitude": 0
#     },

#     "imu": {
#         "accel_x": 20.0,
#         "accel_y": 0.0,
#         "accel_z": 9.8,
#         "gyro_x": 0.0,
#         "gyro_y": 0.0,
#         "gyro_z": 0.0
#     }
# }

# for the sensor failure
test_data = {
    "temperature": None,

    "barometer": None,

    "imu": None
}

# for normal condition
# test_data = {
#     "temperature": 25.0,

#     "barometer": {
#         "pressure": 1013.0,
#         "altitude": 0
#     },

#     "imu": {
#         "accel_x": 0.2,
#         "accel_y": 0.1,
#         "accel_z": 9.8,
#         "gyro_x": 0.0,
#         "gyro_y": 0.0,
#         "gyro_z": 0.0
#     }
# }


result = detector.analyze(test_data)

print(result)