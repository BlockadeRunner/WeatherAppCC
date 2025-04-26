# Storm-Sync Weather
### A modern, AI integrated and cloud-based solution for personal weather stations.


Visit our site: [weather-app-cc.vercel.app](https://weather-app-cc.vercel.app)

### How it works:
**Phase 1:** Personal weather station made up of a Raspberry Pi, Arduino, and several sensors collects weather data. The data being collected includes temperature, pressure, and rain-detection.  
  
**Phase 2:** The personal weather station uploads the data to a Google Cloud Firebase.  
  
**Phase 3:** Our front-end web application reads in the data from the cloud and maintains an updated information display for the user. It also generates an hourly weather prediction using Google's Gemini Flash 2.0 Model to analyze recent weather data. This prediction is also uploaded to the cloud and displayed on our website, providing addional insight to the user.  
