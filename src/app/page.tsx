"use client";

import { useEffect, useState } from "react";
import { initializeFirestore, getAll, getMostRecent } from "@/database/firebase";

export default function Home() {
  const [temperature, setTemperature] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [isRaining, setIsRaining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNight, setIsNight] = useState(false);

  // Function to toggle isRaining state
  const toggleIsRaining = () => {
    console.log("Toggling isRaining state...");
    setIsRaining((prev) => (prev === "Yes" ? "No" : "Yes"));
  };

  // Function to toggle isNight state
  const toggleIsNight = () => {
    console.log("Toggling isNight state...");
    setIsNight((prev) => !prev);
  };

  // Function to determine prediction based on pressure
  const getPrediction = (pressure: string | null): string => {
    if (!pressure || pressure === "N/A") return "Unable to determine.";
    const pressureValue = parseFloat(pressure); // Convert pressure to a number
    if (pressureValue < 1000) return "Stormy/Bad Weather Likely";
    if (pressureValue >= 1000 && pressureValue <= 1020)
      return "Mixed or Changing Weather";
    if (pressureValue > 1020) return "Clear/Fair Weather Likely";
    return "Unable to determine.";
  };

  // Function to fetch weather data
  const fetchWeather = async () => {
    console.log("Fetching weather data...");
    try {
      
      //Initialize Firestore database access
      const db = initializeFirestore();

      //Get the most recent data entry
      //TODO hook this into something
      getMostRecent(db);

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
      const raining = data.properties.periods[0].shortForecast.includes("Rain")
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
        } else {
          console.log("Error: Invalid hour or raining status.");
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
  };

  // useEffect to fetch weather data on mount and every 10 seconds
  useEffect(() => {
    fetchWeather(); // Initial fetch
    const interval = setInterval(fetchWeather, 15000); // Fetch every 10 seconds
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
          <div className="bg-gray-100 bg-opacity-80 rounded-lg shadow-lg p-8 text-center max-w-sm border-blue-500 border-4 dark:text-black">
            <h2 className="text-xl font-bold mb-4 dark:text-black">
              Current Weather
            </h2>
            <div className="text-lg mb-2 dark:text-black">
              <strong>Temperature:</strong>{" "}
              <span>{loading ? "Loading..." : temperature}</span>
            </div>
            <div className="text-lg mb-2 dark:text-black">
              <strong>Pressure:</strong>{" "}
              <span>{loading ? "Loading..." : pressure}</span>
            </div>
            <div className="text-lg mb-2 dark:text-black">
              <strong>Actively Raining:</strong>{" "}
              <span>{loading ? "Loading..." : isRaining}</span>
            </div>
            <div className="text-lg dark:text-black">
              <strong>Prediction:</strong>{" "}
              <span>{loading ? "Loading..." : getPrediction(pressure)}</span>
            </div>
          </div>
        </div>

        {/* Toggle Switch for Development */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-purple-500 border-4">
          <label className="flex items-center space-x-2 dark:text-black">
            <input
              type="checkbox"
              checked={isRaining === "Yes"}
              onChange={toggleIsRaining} // Call the toggleIsRaining function
            />
            <span>Toggle Raining</span>
          </label>
        </div>

        {/* Toggle Switch for Development */}
        <div className="absolute bottom-20 right-4 bg-white bg-opacity-80 p-2 rounded shadow-md border-purple-500 border-4">
          <label className="flex items-center space-x-2 dark:text-black">
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
