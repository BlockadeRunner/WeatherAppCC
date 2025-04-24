// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { collection, query, orderBy, 
    limit, getFirestore, doc, getDocs } from 'firebase/firestore';

// Initialize Firebase
export function initializeFirestore() {
    const firebaseConfig = {
        apiKey: "AIzaSyAMpajee-iNhov0LzFGgQEGWh92tRM0obM",
        authDomain: "weatherapp-d290b.firebaseapp.com",
        projectId: "weatherapp-d290b",
        storageBucket: "weatherapp-d290b.firebasestorage.app",
        messagingSenderId: "288127310448",
        appId: "1:288127310448:web:8dc7c82c0d366c137c72b5",
        measurementId: "G-GVRMDYTY97"
      };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return db;
}

export async function getAll(db: any) {
    console.log("Getting all data")
    const querySnapshot = await getDocs(collection(db, "WeatherData"), orderBy("Time", "desc"));
    querySnapshot.forEach((doc: any) => {
    console.log(doc.id, " => ", doc.data());
});
}

export async function getMostRecent(db: any) {
    console.log("Getting most recent data");
    const q = query(collection(db, "WeatherData"), orderBy("Time", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    const doc = querySnapshot.docs[0];
    console.log(doc.data());
    //console.log(typeof(doc.data()));
}