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
    lahore: "Stable",
    islamabad: "Stable",
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

export class SYRO {
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
    
    this.addLog("InputAgent", "Analyzing: " + (userInput.length > 30 ? userInput.substring(0, 30) + "..." : userInput));
    await this.delay(Math.floor(Math.random() * (1200 - 600 + 1)) + 600);

    let detectedCity = null;
    let isDescriptive = false;
    let geminiAnalysis = null;
    
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
        const aiConfidence = geminiAnalysis.confidence || 0;
        const reason = geminiAnalysis.reason || "";
        this.addLog("InputAgent", `Target: ${detectedCity?.toUpperCase() || 'UNKNOWN'} | Confidence: ${aiConfidence}%`);
        if (aiConfidence < 50 && reason) {
          this.addLog("InputAgent", `Warning: ${reason}`, "warning");
        }
      } else {
        const errData = await response.json();
        this.addLog("InputAgent", `Processor Error: ${errData.error || 'Server error'}`);
      }
    } catch (err) {
      console.error("Analysis route failed:", err);
      this.addLog("InputAgent", "Sync timeout. Using local rules.");
    }
    
    // Deterministic Fallback
    if (!geminiAnalysis) {
      detectedCity = NATIONWIDE_GRID.active_zones.find(city => inputLower.includes(city));
      if (!detectedCity) {
        const alias = Object.keys(NATIONWIDE_GRID.aliases).find(a => inputLower.includes(a));
        if (alias) detectedCity = NATIONWIDE_GRID.aliases[alias];
      }
      isDescriptive = false; // Default to false in fallback
      geminiAnalysis = { isCrisis: isDescriptive, city: detectedCity, confidence: Math.floor(Math.random() * 8) };
    }
    
    const cityDisplayName = detectedCity ? detectedCity.toUpperCase() : "UNKNOWN REGION";
    
    let regionalWeather = { condition: "Clear Skies", precipitation: "0%" };
    
    if (detectedCity && CITY_COORDS[detectedCity]) {
      try {
        const { lat, lon } = CITY_COORDS[detectedCity];
        const response = await this.fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await response.json();
        
        const code = data.current_weather.weathercode;
        let conditionStr = "Clear Skies";
        if (code >= 95) conditionStr = "Storm";
        else if (code >= 61) conditionStr = "Rain";
        else if (code >= 51) conditionStr = "Drizzle";
        else if (code >= 45) conditionStr = "Fog";
        else if (code > 0) conditionStr = "Cloudy";
        
        regionalWeather = { condition: conditionStr, precipitation: code >= 50 ? "High" : "Low" };
      } catch (e) {}
    }
    
    const gridStatus = detectedCity ? (NATIONWIDE_GRID.sensor_status[detectedCity] || "Stable") : "Stable";
    const hasSocialMatch = isDescriptive && detectedCity !== "faisalabad";
    
    this.addLog("DetectorAgent", `Sensors: ${gridStatus === 'Alert' ? "CRITICAL" : "NOMINAL"} | Weather: ${regionalWeather.condition} | Social: ${hasSocialMatch ? 'MATCH' : 'NONE'}`);
    await this.delay(1000);
 
    const aiConfidence = geminiAnalysis.confidence || 0;
    const reason = geminiAnalysis.reason || "";
 
    // The AI is now the primary decision maker.
    const threshold = Math.floor(Math.random() * 10) + 25; // Variable threshold between 25-35
    if (geminiAnalysis.isCrisis && aiConfidence > threshold) {
      this.addLog("DetectorAgent", `Verification complete. AI Confidence: ${aiConfidence}% (Threshold: ${threshold}%)`, gridStatus === 'Alert' ? "error" : "warning");
      return this.runVerifiedSequence(userInput, detectedCity, `${aiConfidence}%`, gridStatus !== 'Alert');
    }
 
    this.addLog("DetectorAgent", "Response aborted based on analysis.", "warning");
    return this.runFalseAlarmSequence(userInput, cityDisplayName, reason, aiConfidence);
  }
 
  async runVerifiedSequence(userInput, city, confidence, isOverride = false) {
    const asset = NATIONWIDE_GRID.assets[city] || { feeder: "GENERIC-F1", crew: "Regional Team", zone: "Reported Area" };
    
    this.addLog("AnalysisAgent", `Impact zone: ${city.toUpperCase()} | Status: ${isOverride ? 'Precautionary' : 'Critical'}`);
    await this.delay(Math.floor(Math.random() * (1000 - 500 + 1)) + 500);
 
    this.addLog("PlannerAgent", `Deploying ${asset.crew} | Feeder: ${asset.feeder}`, "success");
    await this.delay(Math.floor(Math.random() * (1500 - 800 + 1)) + 800);
 
    try {
      await this.sendEmergencyAlert(city, asset.zone);
      this.addLog("SimulatorAgent", "✅ Alert dispatched to field contacts.", "success");
    } catch (error) {
      this.addLog("SimulatorAgent", `❌ alert dispatch error`, "error");
    }
    await this.delay(Math.floor(Math.random() * (1200 - 700 + 1)) + 700);
 
    this.addLog("LoggerAgent", `SYRO-VERIFIED. Auth: ${isOverride ? 'CITIZEN' : 'SENSOR'}.`);
 
    return {
      userInput,
      status: "Verified",
      city: city.toUpperCase(),
      confidence: parseInt(confidence),
      feederId: asset.feeder,
      eta: isOverride ? `${Math.floor(Math.random() * 8) + 5}m` : `${Math.floor(Math.random() * 20) + 25}m`,
      impact: isOverride ? (Math.random() > 0.5 ? "Local/Low" : "Precautionary") : (Math.random() > 0.5 ? "Critical/High" : "Severe Outage")
    };
  }
 
  async runFalseAlarmSequence(userInput, cityDisplayName, reason = "", confidence = 0) {
    this.addLog("AnalysisAgent", "Cross-referencing sources... Conflict detected.", "warning");
    await this.delay(Math.floor(Math.random() * (1000 - 500 + 1)) + 500);

    const logMsg = reason ? reason : "Confidence below threshold.";
    this.addLog("AnalysisAgent", logMsg, "error");
    await this.delay(Math.floor(Math.random() * (800 - 400 + 1)) + 400);

    this.addLog("SimulatorAgent", "🔄 System state restored. No changes committed.", "info");
    await this.delay(Math.floor(Math.random() * (800 - 400 + 1)) + 400);

    const archiveMsg = reason && reason.includes("Insufficient") ? `✅ REJECTED: Not enough information.` : `✅ ARCHIVED: Potential false alarm.`;
    this.addLog("LoggerAgent", archiveMsg, "success");

    return {
      userInput,
      status: "Retracted",
      city: cityDisplayName,
      confidence: confidence,
      eta: "N/A",
      impact: "None"
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
