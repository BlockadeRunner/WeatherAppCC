"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [temperature, setTemperature] = useState<string | null>(null);
  const [pressure, setPressure] = useState<string | null>(null);
  const [isRaining, setIsRaining] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch(
          "https://api.weather.gov/gridpoints/AKQ/37,57/forecast"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }
        const data = await response.json();

        // Extract temperature
        const temp = data.properties.periods[0].temperature;
        setTemperature(`${temp}°F`);

        // Extract pressure (example: replace with actual field from API)
        const pressureValue =
          data.properties.periods[0].detailedForecast.includes("pressure")
            ? "1013 hPa" // Replace with actual pressure field
            : "N/A";
        setPressure(pressureValue);

        // Extract actively raining (example: replace with actual field from API)
        const raining = data.properties.periods[0].shortForecast.includes(
          "Rain"
        )
          ? "Yes"
          : "No";
        setIsRaining(raining);
        setIsRaining("No");
      } catch (error) {
        console.error("Error fetching weather data:", error);
        setTemperature("N/A");
        setPressure("N/A");
        setIsRaining("N/A");
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
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
              isRaining === "Yes" ? "storm.gif" : "sunny.gif"
            }')`,
            backgroundSize: "contain",
            backgroundRepeat: "repeat",
            backgroundPosition: "top left",
          }}
        ></div>

        {/* Weather Info Box */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-gray-300 bg-opacity-80 rounded-lg shadow-lg p-8 text-center max-w-sm">
            <h2 className="text-xl font-bold mb-4">Current Weather</h2>
            <div className="text-lg mb-2">
              <strong>Temperature:</strong>{" "}
              <span>{loading ? "Loading..." : temperature}</span>
            </div>
            <div className="text-lg mb-2">
              <strong>Pressure:</strong>{" "}
              <span>{loading ? "Loading..." : pressure}</span>
            </div>
            <div className="text-lg mb-2">
              <strong>Actively Raining:</strong>{" "}
              <span>{loading ? "Loading..." : isRaining}</span>
            </div>
            <div className="text-lg">
              <strong>Prediction:</strong> <span>Rain stopping soon.</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
