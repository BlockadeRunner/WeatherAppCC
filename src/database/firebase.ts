// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  collection,
  query,
  orderBy,
  limit,
  getFirestore,
  doc,
  getDocs,
} from "firebase/firestore";

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

export async function getAll(db: any) {
  console.log("Getting all data");
  const querySnapshot = await getDocs(
    query(collection(db, "WeatherData"), orderBy("Time", "desc"))
  );

  const data: any[] = [];
  querySnapshot.forEach((doc: any) => {
    data.push(doc.data()); // Collect each document's data into the array
  });

  return data; // Return the array of data
}

export async function getMostRecent(db: any) {
  console.log("Getting most recent data");
  const q = query(
    collection(db, "WeatherData"),
    orderBy("Time", "desc"),
    limit(1)
  );
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return doc.data(); // Return the data of the most recent document
  } else {
    console.log("No data found");
    return null; // Return null if no documents are found
  }
}
