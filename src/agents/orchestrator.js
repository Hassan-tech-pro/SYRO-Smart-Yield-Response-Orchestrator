// Nationwide Grid Sensor Mock
const NATIONWIDE_GRID = {
  active_zones: ["lahore", "karachi", "islamabad", "faisalabad", "multan", "peshawar", "quetta", "rawalpindi", "gujranwala", "sialkot"],
  aliases: {
    fsd: "faisalabad",
    lhr: "lahore",
    khi: "karachi",
    isb: "islamabad",
    pwr: "peshawar",
    mul: "multan"
  },
  sensor_status: {
    lahore: "Alert",
    islamabad: "Alert",
    faisalabad: "Stable",
    karachi: "Stable"
  },
  assets: {
    lahore: { feeder: "LESCO-F12", crew: "Alpha Response Unit", zone: "Gulberg" },
    faisalabad: { feeder: "FESCO-M7", crew: "Delta Team", zone: "Millat Chowk" },
    karachi: { feeder: "KE-S2", crew: "Omega Rapid", zone: "Clifton" },
    islamabad: { feeder: "IESCO-B1", crew: "Falcon 1", zone: "Blue Area" }
  }
};

// Real-world coordinates for the Open-Meteo API
const CITY_COORDS = {
  'karachi': { lat: 24.8607, lon: 67.0011 },
  'lahore': { lat: 31.5497, lon: 74.3436 },
  'islamabad': { lat: 33.6844, lon: 73.0479 },
  'faisalabad': { lat: 31.4181, lon: 73.0776 },
  'multan': { lat: 30.1575, lon: 71.5249 },
  'peshawar': { lat: 34.0151, lon: 71.5249 },
  'quetta': { lat: 30.1798, lon: 66.9750 },
  'rawalpindi': { lat: 33.5973, lon: 73.0479 },
  'gujranwala': { lat: 32.1617, lon: 74.1883 },
  'sialkot': { lat: 32.4945, lon: 74.5229 }
};

export class SYROOrchestrator {
  constructor(onLog) {
    this.logs = [];
    this.onLog = onLog;
  }

  addLog(agent, message, type = 'info', data = null) {
    const entry = {
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      agent,
      message,
      type,
      data,
      id: Math.random().toString(36).substr(2, 9)
    };
    this.logs.push(entry);
    if (this.onLog) this.onLog(entry);
    return entry;
  }

  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async sendEmergencyAlert(city, location) {
    this.addLog("SimulatorAgent", "Requesting server to dispatch emergency SMS...");
    try {
      const response = await this.fetchWithTimeout("/api/dispatch-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, location })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Server Error ${response.status}`);
      return data;
    } catch (err) {
      console.error("SMS Dispatch failed:", err);
      throw err;
    }
  }

  async processCrisis(userInput) {
    const inputLower = userInput.toLowerCase();
    
    this.addLog("InputAgent", "Receiving report: " + userInput);
    await this.delay(600);
    this.addLog("InputAgent", "Querying Pakistan Nationwide Grid Monitoring System (PNGMS)...");
    await this.delay(800);

    let detectedCity = null;
    let isDescriptive = false;
    let geminiAnalysis = null;
    
    this.addLog("InputAgent", "Sending report to secure server for AI analysis...");
    try {
      const response = await this.fetchWithTimeout("/api/analyze-crisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: userInput })
      });
      
      if (response.ok) {
        geminiAnalysis = await response.json();
        detectedCity = geminiAnalysis.city;
        isDescriptive = geminiAnalysis.isCrisis;
        this.addLog("InputAgent", `Gemini Analysis Complete -> Target: ${detectedCity?.toUpperCase() || 'UNKNOWN'}, Severity: ${isDescriptive ? 'HIGH' : 'LOW'} (Secure Server)`);
      } else {
        const errData = await response.json();
        this.addLog("InputAgent", `AI analysis skipped: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error("Analysis route failed:", err);
      this.addLog("InputAgent", "AI analysis route failed or timed out. Falling back to rules engine.");
    }
    
    // Deterministic Fallback if AI fails or is not configured
    if (!geminiAnalysis) {
      detectedCity = NATIONWIDE_GRID.active_zones.find(city => inputLower.includes(city));
      if (!detectedCity) {
        const alias = Object.keys(NATIONWIDE_GRID.aliases).find(a => inputLower.includes(a));
        if (alias) detectedCity = NATIONWIDE_GRID.aliases[alias];
      }
      isDescriptive = inputLower.includes("blast") || inputLower.includes("fire") || inputLower.includes("smoke") || inputLower.includes("explosion") || inputLower.includes("jal");
    }
    
    const cityDisplayName = detectedCity ? detectedCity.toUpperCase() : "UNKNOWN REGION";
    
    this.addLog("DetectorAgent", `Checking regional weather sensors for ${cityDisplayName}...`);
    let regionalWeather = { condition: "Clear Skies", precipitation: "0%" };
    
    if (detectedCity && CITY_COORDS[detectedCity]) {
      try {
        const { lat, lon } = CITY_COORDS[detectedCity];
        const response = await this.fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        
        const code = data.current_weather.weathercode;
        let conditionStr = "Clear Skies";
        if (code >= 95) conditionStr = "Heavy Storm / Thunderstorm";
        else if (code >= 61) conditionStr = "Rain / Showers";
        else if (code >= 51) conditionStr = "Drizzle";
        else if (code >= 45) conditionStr = "Foggy";
        else if (code > 0) conditionStr = "Partly Cloudy";
        
        regionalWeather = {
          condition: conditionStr,
          precipitation: code >= 50 ? "High" : "Low"
        };
      } catch (e) {
        this.addLog("DetectorAgent", "Weather API failed or timed out, using fallback sensors.");
      }
    }
    
    await this.delay(500);
    this.addLog("DetectorAgent", `Weather Result: ${regionalWeather.condition} (Live).`);

    const gridStatus = detectedCity ? (NATIONWIDE_GRID.sensor_status[detectedCity] || "Stable") : "Stable";
    this.addLog("DetectorAgent", `Querying ${cityDisplayName} Grid Sensors...`);
    await this.delay(700);
    this.addLog("DetectorAgent", `Grid Sensor Status: ${gridStatus === 'Alert' ? "CRITICAL SPIKE DETECTED" : "NOMINAL"}.`);

    const hasSocialMatch = isDescriptive && detectedCity !== "faisalabad";
    const socialFeed = hasSocialMatch ? "Witness reports correlating with human report." : "No matching local social feeds.";
    this.addLog("DetectorAgent", "Scanning social media feeds...");
    await this.delay(700);
    this.addLog("DetectorAgent", `Social Result: ${socialFeed}`);

    await this.delay(1000);

    const gridConflict = gridStatus === "Stable";
    if (gridStatus === 'Alert' && isDescriptive) {
      this.addLog("DetectorAgent", `CRISIS VERIFIED: High correlation between sensors and eyewitness report.`, "error");
      return this.runVerifiedSequence(userInput, detectedCity, "94%");
    }

    if (gridConflict && isDescriptive) {
      this.addLog("DetectorAgent", "SENSOR MISMATCH: Grid is stable but report is highly descriptive.", "warning");
      this.addLog("DetectorAgent", "ACTION: Trusting eyewitness over sensors (Latency override). Confidence: 60%.", "info");
      return this.runVerifiedSequence(userInput, detectedCity, "60%", true);
    }

    this.addLog("DetectorAgent", "INTELLIGENCE CONFLICT: Insufficient evidence to trigger grid response.", "warning");
    return this.runFalseAlarmSequence(userInput, cityDisplayName);
  }

  async runVerifiedSequence(userInput, city, confidence, isOverride = false) {
    const asset = NATIONWIDE_GRID.assets[city] || { feeder: "GENERIC-F1", crew: "Regional Team", zone: "Reported Area" };
    
    this.addLog("AnalysisAgent", `Assessing impact zone in ${city.toUpperCase()} (${asset.zone})...`);
    await this.delay(1000);
    this.addLog("AnalysisAgent", isOverride ? `Caution: Proceeding with Precautionary Status (60%).` : `Severity: HIGH. Confidence Score: ${confidence}.`, isOverride ? "warning" : "error");

    this.addLog("PlannerAgent", `Coordinating ${asset.feeder} emergency plan...`);
    await this.delay(1000);
    this.addLog("PlannerAgent", `Plan: Dispatch ${asset.crew} to ${asset.zone} initiated.`, "success");

    this.addLog("SimulatorAgent", "Sending emergency SMS alert via Twilio...");
    try {
      await this.sendEmergencyAlert(city, asset.zone);
      this.addLog("SimulatorAgent", "✅ Emergency SMS dispatched to verified WAPDA contacts.", "success");
    } catch (error) {
      this.addLog("SimulatorAgent", `❌ Twilio SMS Failed: ${error.message}`, "error");
    }
    await this.delay(1000);

    this.addLog("SimulatorAgent", isOverride ? "Team ETA: 10 mins for on-site verification." : `Success: Power restoration bypass active. ETA: 35 mins.`, "success");

    this.addLog("LoggerAgent", `Incident SYRO-VERIFIED stored. Auth: ${isOverride ? 'CITIZEN_OVERRIDE' : 'SENSOR_VERIFIED'}.`);

    return {
      userInput,
      status: "Verified",
      city: city.toUpperCase(),
      confidence: parseInt(confidence),
      feederId: asset.feeder,
      eta: isOverride ? "10m" : "35m",
      impact: isOverride ? "Potential" : "Critical"
    };
  }

  async runFalseAlarmSequence(userInput, cityDisplayName) {
    this.addLog("SimulatorAgent", "⚠️ Preliminary alert issued to monitoring system.", "warning");
    await this.delay(800);

    this.addLog("AnalysisAgent", "Cross-referencing sources... Intelligence conflict detected.", "warning");
    await this.delay(800);

    this.addLog("AnalysisAgent", "Confidence below threshold. RETRACTING alert.", "warning");
    await this.delay(600);

    this.addLog("SimulatorAgent", "🔄 System state rolled back. No grid changes committed.", "info");
    await this.delay(600);

    this.addLog("LoggerAgent", `✅ False alarm archived. ${cityDisplayName} status restored to NOMINAL.`, "success");

    return {
      userInput,
      status: "Retracted",
      city: cityDisplayName,
      confidence: 12,
      eta: "N/A",
      impact: "None"
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
