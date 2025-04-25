import firebase_admin
from firebase_admin import credentials, firestore
import serial
import time

ser = serial.Serial(
    port='/dev/ttyACM0',
    baudrate=9600,
)

cred = credentials.Certificate('./weatherapp-d290b-firebase-adminsdk-fbsvc-607ca2c76b.json')

from datetime import datetime

firebase_admin.initialize_app(cred)
db = firestore.client()
weatherdata_ref = db.collection('WeatherData')

#Example input string, change to actual input method
input_string = "temperature: 69.420, pressure: 420.69, wetness: 1"

while(True):
    time.sleep(10)
    string=str(ser.readline())
    e = string.split("'")
    input_string = e[1][:-4]

    data = { "temperature": 0.0, "pressure": 0.0, "wetness": 0.0 }

    split_list = []

    #Split the string on commas then colons
    for metric in input_string.split(", "):
        split_list += metric.split(": ")

    #use the first string as a dictionary key, then set the following 
    #number as its value
    i = 0
    while i < len(split_list):
        data[split_list[i]] = float(split_list[i + 1])
        i = i + 2

    print(data)

    #Upload the data to the database
    weatherdata_ref.add({
        'Temperature': data["temperature"],
        'Pressure': data["pressure"],
        'Wetness Value': data["wetness"],
        'Time': firestore.SERVER_TIMESTAMP
    })
