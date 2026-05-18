# SYRO - Smart Yield Response orchestrator

SYRO (Smart Yield Response Orchestrator) is a multi-agent crisis management and incident reporting system designed for rapid electrical grid response in Pakistan. It leverages real-time semantic analysis, weather data, and grid simulations to verify citizen reports and coordinate emergency efforts.

---

## 🏗️ Architecture Overview

SYRO follows a **Full-Stack (Express + React)** architecture to ensure security and performance:

- **Frontend (React + Tailwind CSS):** A mobile-optimized terminal interface providing high-speed visibility into the agent orchestration process. It handles user reports, real-time logging, and incident history.
- **Backend (Express + Node.js):** Acts as a secure proxy and compute layer. It manages sensitive integrations with the Gemini AI API and Twilio SMS Gateway, keeping secret keys server-side.
- **Database (Firebase Firestore):** Persists incident history across user sessions, allowing for longitudinal analysis of regional grid health.
- **Auth (Firebase Authentication):** Google-based secure login for verified field agents and administrative personnel.

---

## 🤖 Multi-Agent System (The Swarm)

The core logic resides in the `SYRO Orchestrator`, which manages a swarm of specialized virtual agents:

1.  **📡 Input Agent:** Receives the raw report (English/Urdu) and handles initial cleanup and tokenization.
2.  **🔍 Detector Agent:** The "Verification Pillar." It checks regional weather sensors (via Open-Meteo) and correlates reports with Pakistani grid statuses (PNGMS simulation).
3.  **🧠 Analysis Agent:** The decision-maker. It evaluates confidence scores by comparing social feeds, sensor data, and semantic urgency.
4.  **📋 Planner Agent:** Generates specific emergency response plans based on the feeder and crew assets assigned to the detected zone.
5.  **⚡ Simulator Agent:** Executes the "Final Action," which includes updating the virtual grid state and triggering external communication (Twilio).
6.  **📁 LoggerAgent:** Ensures every step of the orchestration is immutably recorded for post-incident audits.

---

## 🔌 API Integrations

### 🧠 Real AI (Google Gemini 1.5 Flash)
Unlike standard chatbots, SYRO uses Gemini for **Semantic GIS Extraction**. It parses natural language reports like *"bijli ka khamba jal raha hai lahore g-10"* to extract city, severity, and incident type as structured JSON for the orchestrator to act upon.

### 🌡️ Real-World Weather (Open-Meteo API)
The system fetches live weather data for Pakistani coordinates (Lahore, Karachi, Islamabad, etc.) to determine if environmental factors (storms, lightning) validate reported transformer failures.

### 📱 Emergency SMS (Twilio API)
Upon verification of a high-severity crisis, the **Simulator Agent** triggers a real SMS dispatch via the Twilio Gateway to alert verified field crews with the incident location and feeder ID.

### 📦 PNMGS (Mock Grid Simulation)
A comprehensive mock of the Pakistan Nationwide Grid System is used to simulate sensor spikes and regional asset availability, providing a realistic operational environment without requiring direct LESCO/KE/IESCO infrastructure access.

---

## 🛠️ Tech Stack

- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS (Modern Brutalist/Terminal Theme)
- **Backend:** Express (Custom Server)
- **Database:** Firebase Firestore
- **AI:** Google Generative AI (Gemini)
- **Communication:** Twilio Messaging API
- **Maps/Weather:** Open-Meteo (Geocoding-based)

---

## 🚀 How it Works

1.  **Report Submission:** A citizen describes a crisis in English or Urdu.
2.  **Secure Proxy Analysis:** The report is sent to the Express server, which uses Gemini to pull out structured data.
3.  **Sensor Cross-Check:** The orchestrator checks live weather and simulated grid sensors.
4.  **Confidence Grading:** If the AI extraction, weather, and grid sensors align, confidence exceeds 90%.
5.  **Response Deployment:** A SMS is sent to the crew, and the incident is saved to the Firestore database.
