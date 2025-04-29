/////////////////////////////////////////////
//     Cloud Computing Final Project:      //
//        Storm-Sync Weather App           //
//                                         //
//   File: page.tsx                        //
//   Author: Alex Longo                    //
//   Date: 4/25/2025                       //
//   Description: This file contains the   //
//   main component for the Storm-Sync     //
//   Weather App. It fetches weather data  //
//   from a hardware device and uses AI    //
//   to generate predictions based on the  //
//   data. The app displays the current    //
//   weather conditions and the AI's       //
//   prediction. It also includes a toggle //
//   switch for development purposes to    //
//  simulate different weather conditions. //
/////////////////////////////////////////////

"use client";

// import necessary libraries and components
import { useEffect, useState, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import {
  initializeFirestore,
  getAll,
  getMostRecent,
  WeatherData,
  getPredictionForHour,
  updatePredictionForHour,
} from "@/database/firebase";
import { Timestamp } from "firebase/firestore";

// pull the API key from environment variables (NOTE: MAJOR SECURITY RISK! WOULD NOT DO THIS IN PRODUCTION!)
const gem_key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Define the GoogleGenAI instance with the API key
const ai = new GoogleGenAI({
  apiKey: gem_key,
});

// Export and define the main webpage component
export default function Home() {
  // Local state variables to manage weather data and loading state
  const [temperature, setTemperature] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [isRaining, setIsRaining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [showPastWeather, setShowPastWeather] = useState(false);
  const [pastWeatherData, setPastWeatherData] = useState<WeatherData[]>([]);
  const [cachedWeatherData, setCachedWeatherData] = useState<WeatherData[]>([]);
  const cachedWeatherDataRef = useRef<WeatherData[]>(cachedWeatherData); // Create a ref

  // Helper function to check if cached data contains current-hour entries
  function hasCurrentHourData(data: WeatherData[]): boolean {
    const currentHour = new Date().getHours();
    //console.log("OOOOOOOOOOO Current hour:", currentHour); // Log the current hour for debugging

    //console.log("OOOOOOOOOOO Cached data:", data); // Log the cached data for debugging
    for (let i = 0; i < data.length; i++) {
      const entryHour = new Date(data[i].Time.seconds * 1000).getHours();
      //console.log(` OOOOO Entry ${i} hour:`, entryHour); // Log the entry hour for debugging

      if (entryHour === currentHour) {
        return true; // Return true as soon as a match is found
      }
    }

    return false; // Return false if no match is found after looping through all entries
  }

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

  // Function to toggle showPastWeather state
  function toggleShowPastWeather(): void {
    setShowPastWeather((prev) => !prev);
    if (!showPastWeather) {
      fetchPastWeatherData(); // Fetch data when toggling on
    }
  }

  // Function to fetch past weather data
  async function fetchPastWeatherData(): Promise<void> {
    try {
      const db = initializeFirestore();
      const allData = await getAll(db);
      const recentData = allData.slice(0, 6); // Get the most recent 6 entries
      setPastWeatherData(recentData);
    } catch (error) {
      console.error("Error fetching past weather data:", error);
    }
  }

  // Function to fetch or generate a prediction based on weather data
  async function fetchOrGeneratePrediction(
    all_data: WeatherData[]
  ): Promise<void> {
    try {
      // Check if a prediction exists for the current hour
      const predictionStatus = await getPredictionForHour();

      // Prediction status handling
      if (predictionStatus !== "update_needed") {
        // If a valid prediction exists, use it
        console.log("Using existing prediction:", predictionStatus);
        setPrediction(predictionStatus); // Use the existing prediction
      } else {
        // If no valid prediction exists, generate a new one
        console.log("No valid prediction found. Generating a new one...");

        // Process weather data for AI input
        const previous_data = await processWeatherData(all_data);
        console.log("Processed weather data for AI:", previous_data);

        // Generate a new prediction using AI
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash-lite",
          contents:
            "In the style of a weather reporter, provide a one sentence weather prediction on what kind of weather is likely based on the following data from the past few hours:" +
            previous_data,
        });

        // Check if the response is valid
        const newPrediction = response.text ?? "Error generating AI content.";
        setPrediction(newPrediction); // Update the state with the new prediction

        // Update the database with the new prediction
        const timestamp = new Date(); // Use the current timestamp
        await updatePredictionForHour(
          Timestamp.fromDate(timestamp),
          newPrediction
        );
        console.log("New prediction saved to the database:", newPrediction);
      }
    } catch (error) {
      console.error("Error fetching or generating prediction:", error);
      setPrediction("Error generating prediction.");
    }
  }

  // Function to process weather data from past 3 hours and format it into a string for the AI model
  async function processWeatherData(all_data: WeatherData[]): Promise<string> {
    // Sort the data by time (most recent first)
    all_data.sort((a, b) => b.Time.seconds - a.Time.seconds);

    // Group data by hour
    const groupedByHour: Record<number, WeatherData[]> = {};
    const currentTime = new Date();
    all_data.forEach((entry) => {
      const entryDate = new Date(entry.Time.seconds * 1000); // Convert Firestore Timestamp to Date
      const hourDifference = Math.floor(
        (currentTime.getTime() - entryDate.getTime()) / (1000 * 60 * 60)
      );
      if (hourDifference < 3) {
        // Only consider data from the past 3 hours
        if (!groupedByHour[hourDifference]) {
          groupedByHour[hourDifference] = [];
        }
        groupedByHour[hourDifference].push(entry);
      }
    });

    // Select two instances per hour
    const selectedInstances: WeatherData[] = [];
    for (let hour = 0; hour < 3; hour++) {
      if (groupedByHour[hour]) {
        selectedInstances.push(...groupedByHour[hour].slice(0, 2)); // Take up to 2 instances per hour
      }
    }

    // Check if there are fewer than 6 instances
    if (selectedInstances.length < 6) {
      console.warn(
        `Insufficient data from the last 3 hours. Falling back to the most recent 6 instances.`
      );
      selectedInstances.length = 0; // Clear the array
      selectedInstances.push(...all_data.slice(0, 6)); // Take the most recent 6 instances
    }

    // Format the data into a string
    const formattedData = selectedInstances
      .map((entry) => {
        const temperatureF = (entry.Temperature * 9) / 5 + 32; // Convert °C to °F
        const pressure = entry.Pressure;
        const wetness = entry["Wetness Value"] < 500 ? "Yes" : "No";
        const time = new Date(entry.Time.seconds * 1000).toLocaleTimeString(
          [],
          { hour: "2-digit", minute: "2-digit" }
        );
        return `[Temperature: ${temperatureF.toFixed(
          1
        )}°F, Pressure: ${pressure} mb, Raining: ${wetness}, Time: ${time}]`;
      })
      .join(" ");

    return formattedData;
  }

  // Function to fetch weather data
  async function fetchWeather(): Promise<void> {
    console.log("Fetching weather data...");

    // Track hardware fetch success
    let successfulFetch: boolean = false; // Flag to track if the fetch was successful
    try {
      // Initialize Firestore database access
      const db = initializeFirestore();

      // Check if cachedWeatherData contains current-hour data
      let all_data = cachedWeatherDataRef.current;
      //console.log("ALL DATA:", all_data); // Log the cached data for debugging

      if (!hasCurrentHourData(all_data)) {
        console.log(
          "Cached data does not contain current-hour entries. Fetching from Firestore..."
        );
        all_data = await getAll(db); // Fetch all data from Firestore
        //console.log("-------------Fetched all data from Firestore:", all_data); // Log the fetched data for debugging
        setCachedWeatherData(all_data); // Update the cached data
        //console.log("Cached weather data updated:", all_data); // Log the updated cached data for debugging
      } else {
        console.log("Using cached weather data.");
      }

      // Fetch the most recent data from Firestore
      const recent_data = await getMostRecent(db);

      // Accessing the values
      if (recent_data) {
        const pressure = recent_data.Pressure; // Pressure in mb
        const temperature = ((recent_data.Temperature * 9) / 5 + 32).toFixed(2); // Temperature in °C converted to °F
        const wetnessValue = recent_data["Wetness Value"]; // above 500 dry, below 500 wet
        const time = new Date(recent_data.Time.seconds * 1000); // Convert Firestore Timestamp to Date
        const hours = time.getHours(); // Returns the hour (0-23)

        // Update the state with the fetched data
        setTemperature(`${temperature}°F`); // Set temperature state
        setPressure(`${pressure} mb`); // Set pressure state
        setIsRaining(wetnessValue < 500 ? "Yes" : "No"); // Set isRaining state based on wetness value
        const raining = wetnessValue < 500 ? "Yes" : "No"; // Set raining variable based on wetness value

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

        // Fetch or generate prediction
        await fetchOrGeneratePrediction(all_data); // Call the AI prediction function with the processed data
      } else {
        console.error("Error: recent_data is null.");
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
        const temp = data.properties.periods[0].temperature.toFixed(2);
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
    const interval = setInterval(fetchWeather, 60000); // Fetch every 60 seconds
    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  // Keep the ref updated whenever the state changes
  useEffect(() => {
    cachedWeatherDataRef.current = cachedWeatherData;
  }, [cachedWeatherData]);

  // Main webpage rendering
  return (
    <main className="flex flex-col h-screen w-screen">
      {/* Header Bar */}
      <div className="flex flex-row w-full h-[20%] md:h-[20%] lg:h-[20%] items-center justify-center bg-gradient-to-r from-yellow-500 via-blue-500 to-gray-500 px-4">
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
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            marginTop: showPastWeather ? "100px" : "0", // Adjust margin when showPastWeather is true
          }}
        >
          <div className="bg-white bg-opacity-80 rounded-lg shadow-lg p-8 text-center max-w-xl border-blue-500 border-4 dark:text-black drop-shadow-[0_0_5px_rgba(0,0,255,0.8)]">
            {showPastWeather ? (
              <>
                <h2 className="text-xl font-bold font-mono mb-4 text-blue-600">
                  Past Weather Data
                </h2>
                {pastWeatherData.length > 0 ? (
                  <div className="flex flex-row justify-between">
                    {/* First Column */}
                    <ul className="text-left text-blue-600 font-mono w-1/2 pr-4">
                      {pastWeatherData.slice(0, 3).map((entry, index) => (
                        <li key={index} className="mb-2">
                          <strong>Time:</strong>{" "}
                          {new Date(
                            entry.Time.seconds * 1000
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          <br />
                          <strong>Temperature:</strong>{" "}
                          {((entry.Temperature * 9) / 5 + 32).toFixed(1)}°F{" "}
                          <br />
                          <strong>Pressure:</strong> {entry.Pressure} mb <br />
                          <strong>Raining:</strong>{" "}
                          {entry["Wetness Value"] < 500 ? "Yes" : "No"}
                        </li>
                      ))}
                    </ul>
                    {/* Second Column */}
                    <ul className="text-left text-blue-600 font-mono w-1/2 pl-4">
                      {pastWeatherData.slice(3, 6).map((entry, index) => (
                        <li key={index} className="mb-2">
                          <strong>Time:</strong>{" "}
                          {new Date(
                            entry.Time.seconds * 1000
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          <br />
                          <strong>Temperature:</strong>{" "}
                          {((entry.Temperature * 9) / 5 + 32).toFixed(1)}°F{" "}
                          <br />
                          <strong>Pressure:</strong> {entry.Pressure} mb <br />
                          <strong>Raining:</strong>{" "}
                          {entry["Wetness Value"] < 500 ? "Yes" : "No"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-blue-600">Loading past weather data...</p>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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

        {/* Toggle Switch for Development: Raining */}
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

        {/* Toggle Switch for Development: Night*/}
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

        {/* Toggle Switch for Development: Past Weather */}
        <div className="absolute bottom-25 left-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-purple-500 border-4 font-mono text-purple-600 text-sm md:text-base lg:text-base drop-shadow-[0_0_5px_rgba(128,0,128,0.8)]">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showPastWeather}
              onChange={toggleShowPastWeather} // Call the toggleShowPastWeather function
            />
            <span>Toggle Past Weather</span>
          </label>
        </div>
      </div>
    </main>
  );
}
