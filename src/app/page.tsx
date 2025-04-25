"use client";

import { useEffect, useState } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  initializeFirestore,
  getAll,
  getMostRecent,
} from "@/database/firebase";

const gem_key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: gem_key,
});

export default function Home() {
  const [temperature, setTemperature] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [isRaining, setIsRaining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);

  // Function to toggle isRaining state
  function toggleIsRaining(): void {
    console.log("Toggling isRaining state...");
    setIsRaining((prev) => (prev === "Yes" ? "No" : "Yes"));
  }

  // Function to toggle isNight state
  function toggleIsNight(): void {
    console.log("Toggling isNight state...");
    setIsNight((prev) => !prev);
  }

  async function predictWithAI(previous_data: string): Promise<void> {
    // FAKE TEST DATA
    previous_data =
      "[Temperature: 75°F, Pressure: 1015.2 mb, Raining: No, Time: 14:00] [Temperature: 74°F, Pressure: 1010.3 mb, Raining: No, Time: 15:00] [Temperature: 72°F, Pressure: 1005.7 mb, Raining: No, Time: 16:00] [Temperature: 71°F, Pressure: 999.2 mb, Raining: No, Time: 17:00] [Temperature: 70°F, Pressure: 996.1 mb, Raining: No, Time: 17:00]";
    // END FAKE TEST DATA

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents:
          "Provide a one sentence weather prediction on whether clear weather, mixed weather, or a storm is likely based on the following data from the past 5 hours: " +
          previous_data,
      });
      const prediction = response.text ?? "Error generating AI content."; // Ensure a fallback string is used
      setPrediction(prediction); // Update the state with the prediction
    } catch (error) {
      console.error("Error generating AI content:", error);
      setPrediction("Error generating AI response."); // Update the state with an error message
    }
  }

  // Function to fetch weather data
  async function fetchWeather(): Promise<void> {
    console.log("Fetching weather data...");

    // MOVE THIS BELOW //////////////
    predictWithAI("INPUT DATA HERE");
    /////////////////////////////////

    // Track hardware fetch success
    let successfulFetch: boolean = false; // Flag to track if the fetch was successful
    try {
      // Initialize Firestore database access
      const db = initializeFirestore();

      // Fetch the most recent data from Firestore
      const testing_data = await getMostRecent(db);

      // Accessing the values
      if (testing_data) {
        const pressure = testing_data.Pressure; // Pressure in mb
        const temperature = (testing_data.Temperature * 9) / 5 + 32; // Temperature in °C converted to °F
        const time = testing_data.Time; // Firestore Timestamp object
        const wetnessValue = testing_data["Wetness Value"]; // 0 dry, 1000 wet

        // Convert the Firestore Timestamp to a JavaScript Date object
        const date = new Date(time.seconds * 1000); // Convert seconds to milliseconds
        const hours = date.getHours(); // Returns the hour (0-23)
        const minutes = date.getMinutes(); // Returns the minute (0-59)

        // console.log("Pressure:", pressure);
        // console.log("Temperature:", temperature);
        // console.log(`Hour: ${hours}, Minute: ${minutes}`);
        // console.log("Wetness Value:", wetnessValue);

        // Update the state with the fetched data
        setTemperature(`${temperature}°F`); // Set temperature state
        setPressure(`${pressure} mb`); // Set pressure state
        setIsRaining(wetnessValue > 100 ? "Yes" : "No"); // Set isRaining state based on wetness value
        let raining = wetnessValue > 100 ? "Yes" : "No"; // Set raining variable based on wetness value

        // Update background animations based on weather and time
        if (!isNaN(hours) && raining === "No") {
          if (hours >= 19 || hours < 7) {
            setIsNight(true); // Set isNight to true for 7 PM to 7 AM
          } else {
            setIsNight(false); // Set isNight to false for other times
          }
        } else if (!isNaN(hours) && raining === "Yes") {
          console.log("Raining is true, setting isNight to false.");
        } else {
          console.log("Error: Invalid hour or raining status from hardware.");
        }

        // Retrieved database data successfully
        successfulFetch = true; // Set the flag to true if fetch is successful
      } else {
        console.error("Error: testing_data is null.");
      }
    } catch (error) {
      console.error("Error fetching weather data from hardware:", error);
      setTemperature("N/A");
      setPressure("N/A");
      setIsRaining("N/A");
    } finally {
      setLoading(false); // Set loading to false after attempting to fetch data
    }

    // If hardware fetch was not successful, proceed to fetch from the National Weather Service API
    if (!successfulFetch) {
      try {
        const response = await fetch(
          "https://api.weather.gov/gridpoints/AKQ/73,68/forecast/hourly"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }
        const data = await response.json();

        // Extract temperature
        const temp = data.properties.periods[0].temperature;
        setTemperature(`${temp}°F`);

        // Extract pressure
        const pressureValue =
          data.properties.periods[0].detailedForecast.includes("pressure")
            ? "1016.50 mb" // Replace with actual pressure field
            : "1021.1 mb"; // Example value
        setPressure(pressureValue);

        // Extract actively raining
        const raining = data.properties.periods[0].shortForecast.includes(
          "Rain"
        )
          ? "Yes"
          : "No";
        setIsRaining(raining);

        // Extract current time
        const currentTime = data.properties.periods[0].startTime;
        if (currentTime.length > 12) {
          const hour = parseInt(currentTime.slice(11, 13), 10); // Extract and parse the hour as an integer

          if (!isNaN(hour) && raining === "No") {
            if (hour >= 19 || hour < 7) {
              setIsNight(true); // Set isNight to true for 7 PM to 7 AM
            } else {
              setIsNight(false); // Set isNight to false for other times
            }
          } else if (!isNaN(hour) && raining === "Yes") {
            console.log("Raining is true, setting isNight to false.");
          } else {
            console.log("Error: Invalid hour or raining status from hardware.");
          }
        } else {
          console.log("Error in currentTime format received from API");
        }
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setTemperature("N/A");
        setPressure("N/A");
        setIsRaining("N/A");
      } finally {
        setLoading(false);
      }
    }
  }

  // useEffect to fetch weather data on mount and every 15 seconds
  useEffect(() => {
    fetchWeather(); // Initial fetch
    const interval = setInterval(fetchWeather, 15000); // Fetch every 15 seconds
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  return (
    <main className="flex flex-col h-screen w-screen">
      {/* Header Bar */}
      <div className="flex flex-row w-full h-[20%] md:h-[20%] lg:h-[20%] items-center justify-center bg-gradient-to-r from-yellow-500 via-blue-500 to-gray-500">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-shadow-lg">
          Storm-Sync Weather
        </h1>
      </div>

      {/* background gifs */}
      <div className="flex flex-grow w-full">
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            backgroundImage: `url('/res/${
              isRaining === "Yes"
                ? "storm.gif"
                : isNight
                ? "night.gif"
                : "sunny.gif"
            }')`,
            backgroundSize: "contain",
            backgroundRepeat: "repeat",
            backgroundPosition: "top left",
          }}
        ></div>

        {/* Weather Info Box */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 rounded-lg shadow-lg p-8 text-center max-w-sm border-blue-500 border-4 dark:text-black drop-shadow-[0_0_5px_rgba(0,0,255,0.8)]">
            <h2 className="text-xl font-bold font-mono mb-4 text-blue-600">
              Current Weather
            </h2>
            <div className="text-lg mb-2 font-mono text-blue-600">
              <strong>Temperature:</strong>{" "}
              <span>{loading ? "Loading..." : temperature}</span>
            </div>
            <div className="text-lg mb-2 font-mono text-blue-600">
              <strong>Pressure:</strong>{" "}
              <span>{loading ? "Loading..." : pressure}</span>
            </div>
            <div className="text-lg mb-2 font-mono text-blue-600">
              <strong>Actively Raining:</strong>{" "}
              <span>{loading ? "Loading..." : isRaining}</span>
            </div>
            <div className="text-lg font-mono text-blue-600">
              <strong>AI-Powered Prediction:</strong>{" "}
              <span>{loading ? "Loading..." : prediction}</span>
            </div>
          </div>
        </div>

        {/* AI Disclosure */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-green-500 border-4 font-mono text-green-600 text-sm md:text-base lg:text-base drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">
          <label className="flex items-center space-x-2">
            <span>
              <strong>AI Content Powered by:</strong> Google&apos;s Gemini 2.0
              flash <br />
              <strong>Database Powered by:</strong> Google Cloud&apos;s Firebase
            </span>
          </label>
        </div>

        {/* Toggle Switch for Development */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-purple-500 border-4 font-mono text-purple-600 text-sm md:text-base lg:text-base drop-shadow-[0_0_5px_rgba(128,0,128,0.8)]">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isRaining === "Yes"}
              onChange={toggleIsRaining} // Call the toggleIsRaining function
            />
            <span>Toggle Raining</span>
          </label>
        </div>

        {/* Toggle Switch for Development */}
        <div className="absolute bottom-20 right-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-purple-500 border-4 font-mono text-purple-600 text-sm md:text-base lg:text-base drop-shadow-[0_0_5px_rgba(128,0,128,0.8)]">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isNight === true}
              onChange={toggleIsNight} // Call the toggleIsRaining function
            />
            <span>Toggle Night</span>
          </label>
        </div>
      </div>
    </main>
  );
}
