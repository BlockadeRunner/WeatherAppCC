//////////////////////////////////////////////
//     Cloud Computing Final Project:        //
//        Storm-Sync Weather App             //
//                                           //
//   File: page.tsx                          //
//   Author: Dillon Buyrng                   //
//   Co-Author: Alex Longo                   //
//   Date: 4/25/2025                         //
//   Description: This file contains the     //
//   Firebase Firestore database code.       //
//   It includes functions to initialize     //
//   the database, get all weather data,     //
//   get the most recent weather data,       //
//   and update the prediction for the hour. //
///////////////////////////////////////////////

// Import the necessary Firebase modules
import { initializeApp } from "firebase/app";
import {
  collection,
  query,
  orderBy,
  limit,
  getFirestore,
  getDocs,
  Firestore,
  QueryDocumentSnapshot,
  doc,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

// Define the WeatherData interface
export interface WeatherData {
  Temperature: number;
  Pressure: number;
  "Wetness Value": number;
  Time: {
    seconds: number;
    nanoseconds: number;
  };
}

// Initialize Firebase
export function initializeFirestore() {
  const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: "weatherapp-d290b.firebaseapp.com",
    projectId: "weatherapp-d290b",
    storageBucket: "weatherapp-d290b.firebasestorage.app",
    messagingSenderId: "288127310448",
    appId: "1:288127310448:web:8dc7c82c0d366c137c72b5",
    measurementId: "G-GVRMDYTY97",
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  return db;
}

// // Function to get all weather data from Firestore
// export async function getAll(db: Firestore): Promise<WeatherData[]> {
//   //console.log("Getting all data");
//   const querySnapshot = await getDocs(
//     query(collection(db, "WeatherData"), orderBy("Time", "desc"))
//   );

//   const data: WeatherData[] = [];
//   querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
//     data.push(doc.data() as WeatherData); // Cast each document's data to WeatherData
//   });

//   return data; // Return the array of data
// }

export async function getAll(db: Firestore): Promise<WeatherData[]> {
  const now = Timestamp.now();
  const oneHourMillis = 3600000; // 1 hour in milliseconds

  const data: WeatherData[] = [];

  for (let i = 0; i < 3; i++) {
    const startOfHour = new Timestamp(
      Math.floor((now.toMillis() - (i + 1) * oneHourMillis) / 1000),
      0
    );
    const endOfHour = new Timestamp(
      Math.floor((now.toMillis() - i * oneHourMillis) / 1000),
      0
    );

    const q = query(
      collection(db, "WeatherData"),
      orderBy("Time", "desc"),
      limit(2),
      where("Time", ">=", startOfHour),
      where("Time", "<", endOfHour)
    );

    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc: QueryDocumentSnapshot) => {
      data.push(doc.data() as WeatherData);
    });
  }

  return data;
}

// Function to get the most recent weather data from Firestore
export async function getMostRecent(
  db: Firestore
): Promise<WeatherData | null> {
  //console.log("Getting most recent data");
  const q = query(
    collection(db, "WeatherData"),
    orderBy("Time", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return doc.data() as WeatherData; // Cast the document's data to WeatherData
  } else {
    console.log("No data found");
    return null; // Return null if no documents are found
  }
}

// Function to get the most recent prediction from Firestore
export async function getPredictionForHour(): Promise<string> {
  const db = initializeFirestore();
  const q = query(
    collection(db, "Predictions"),
    orderBy("timestamp", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    const prediction = data.prediction || null;
    const timestamp = data.timestamp;

    if (timestamp && prediction) {
      const now = Timestamp.now();
      const oneHourAgo = now.toMillis() - 3600000; // 1 hour in milliseconds

      if (timestamp.toMillis() >= oneHourAgo) {
        return prediction;
      }
    }
  }
  return "update_needed";
}

// Function to update the prediction for the hour in Firestore
export async function updatePredictionForHour(
  timestamp: Timestamp,
  prediction: string
): Promise<void> {
  const db = initializeFirestore();
  const docRef = doc(db, "Predictions", timestamp.toMillis().toString());
  await setDoc(docRef, { prediction, timestamp }, { merge: true });
}
