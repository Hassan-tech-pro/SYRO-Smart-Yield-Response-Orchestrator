/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
// @ts-ignore
import { SYROOrchestrator } from "./agents/orchestrator";
// @ts-ignore
import { auth, db, googleProvider, signInWithPopup, signOut, collection, addDoc, getDocs, query, orderBy } from "./config/firebase";
import { onAuthStateChanged } from "firebase/auth";

const PRESETS = [
  "transformer blast in lahore near main boulevard",
  "transformer set on fire in millat chowk faisalabad",
  "bijli ka khamba jal raha hai islamabad g-10",
  "lightning struck pole in karachi clifton"
];

const AI = {
  InputAgent: "📡", DetectorAgent: "🔍", AnalysisAgent: "🧠",
  PlannerAgent: "📋", SimulatorAgent: "⚡", LoggerAgent: "📁"
};

const AC = {
  InputAgent: "#60a5fa", DetectorAgent: "#f59e0b", AnalysisAgent: "#a78bfa",
  PlannerAgent: "#34d399", SimulatorAgent: "#fb923c", LoggerAgent: "var(--text-muted)"
};

const TC = { info: "#60a5fa", warning: "#f59e0b", error: "#f87171", success: "#34d399" };

export default function App() {
  const [page, setPage] = useState("home");
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [activeAgents, setActiveAgents] = useState(new Set());
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  
  // New Settings: Light Mode, Vibration
  const [settings, setSettings] = useState({ lightMode: false, vibration: true });
  
  // Auth state
  const [user, setUser] = useState<any>(null);

  const logsEnd = useRef<HTMLDivElement>(null);
  const orchestrator = useRef<any>(null);
  if (!orchestrator.current) {
    orchestrator.current = new SYROOrchestrator((entry: any) => {
      setLogs(prev => [...prev, entry]);
      setActiveAgents(prev => new Set([...prev, entry.agent]));
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load history from Firestore
        try {
          const q = query(collection(db, `users/${currentUser.uid}/history`), orderBy("timestamp", "desc"));
          const snapshot = await getDocs(q);
          const loadedHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setHistory(loadedHistory);
        } catch (error) {
          console.error("Error loading history:", error);
        }
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.lightMode ? 'light' : 'dark');
  }, [settings.lightMode]);

  useEffect(() => { logsEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const run = async (text?: string) => {
    const queryStr = (text || input).trim();
    if (!queryStr || running) return;
    
    setRunning(true); 
    setLogs([]); 
    setResult(null); 
    setActiveAgents(new Set());
    
    try {
      const res = await orchestrator.current.processCrisis(queryStr);
      setResult(res);
      
      const newIncident = { ...res, timestamp: Date.now(), time: new Date().toLocaleString() };
      
      // Save to local state
      setHistory(p => [{...newIncident, id: Date.now().toString()}, ...p]);
      
      // Vibrate
      if (settings.vibration && navigator.vibrate) {
        if (res.status === "Verified") navigator.vibrate([200, 100, 200]); // SOS pattern
        else navigator.vibrate(100); // Short bump
      }

      // Save to Firebase if authenticated
      if (user) {
        try {
          await addDoc(collection(db, `users/${user.uid}/history`), newIncident);
        } catch (error) {
          console.error("Error saving incident:", error);
        }
      }
    } catch (err) {
      console.error("Orchestrator failed:", err);
      setLogs(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        agent: "System",
        message: "SYRO Execution Error: " + (err instanceof Error ? err.message : String(err)),
        type: "error",
        id: "err-" + Math.random()
      }]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ height: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative", boxShadow: settings.lightMode ? "0 0 100px rgba(0,0,0,0.1)" : "0 0 100px rgba(0,0,0,0.5)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: var(--border); }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: translateY(0) } }
        .si { animation: slideIn 0.25s ease; }
        textarea:focus, input:focus { outline: none; border-color: #3b82f6 !important; }
        .nb:hover { background: var(--border) !important; }
        .rb:hover { background: #2563eb !important; }
        .hc:hover { background: var(--border) !important; }
        .back:hover { background: var(--border) !important; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "13px 18px", background: "var(--surface)", borderBottom: `1px solid var(--border)`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#60a5fa,#1d4ed8)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "0.06em", color: "var(--text)" }}>SYRO</div>
            <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.12em" }}>SMART YIELD RESPONSE</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", animation: running ? "pulse 1.5s infinite" : "none" }} />
          <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "'Space Grotesk',sans-serif" }}>{running ? "ACTIVE" : "STANDBY"}</span>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {page === "home" && <Home input={input} setInput={setInput} logs={logs} result={result} running={running} activeAgents={activeAgents} history={history} run={run} logsEnd={logsEnd} />}
        {page === "history" && <History history={history} selected={selected} setSelected={setSelected} />}
        {page === "settings" && <Settings settings={settings} setSettings={setSettings} user={user} />}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "var(--surface)", borderTop: `1px solid var(--border)`, display: "flex", zIndex: 10 }}>
        {[["home", "🏠", "HOME"], ["history", "📋", "HISTORY"], ["settings", "⚙️", "SETTINGS"]].map(([id, icon, label]) => (
          <button key={id} onClick={() => setPage(id)} style={{ flex: 1, padding: "12px 0 10px", background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: page === id ? "#3b82f6" : "var(--text-dim)", transition: "color 0.2s" }}>
            <span style={{ fontSize: 18 }}>{icon}</span>
            <span style={{ fontSize: 9, letterSpacing: "0.1em", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Home({ input, setInput, logs, result, running, activeAgents, history, run, logsEnd }: any) {
  const stats = { total: history.length, verified: history.filter((h: any) => h.status === "Verified").length, retracted: history.filter((h: any) => h.status === "Retracted").length };
  const sec: React.CSSProperties = { padding: "14px 16px" };
  const label: React.CSSProperties = { fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 10 };
  const card: React.CSSProperties = { background: "var(--surface)", border: `1px solid var(--border)`, borderRadius: 10, padding: "12px 14px", marginBottom: 10 };
  
  return (
    <>
      <div style={{ ...sec, paddingBottom: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 2 }}>
          {[["TOTAL", stats.total, "#60a5fa"], ["VERIFIED", stats.verified, "#f87171"], ["RETRACTED", stats.retracted, "#34d399"]].map(([l, v, c]) => (
            <div key={l as string} style={{ background: "var(--surface)", border: `1px solid var(--border)`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c as string, fontFamily: "'Space Grotesk',sans-serif" }}>{v}</div>
              <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={sec}>
        <div style={label}>▸ INCIDENT REPORT TERMINAL</div>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} placeholder="Describe crisis in Urdu or English..." rows={3}
          style={{ width: "100%", background: "var(--bg)", border: `1px solid var(--border)`, borderRadius: 7, color: "var(--text)", fontSize: 12, padding: "10px 12px", resize: "none", fontFamily: "inherit", lineHeight: 1.6, display: "block" }} />
        <button onClick={() => run()} disabled={running || !input.trim()} className="rb"
          style={{ width: "100%", background: running || !input.trim() ? "var(--border)" : "#1d4ed8", border: "none", borderRadius: 7, color: running || !input.trim() ? "var(--text-dim)" : "#fff", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13, padding: "11px", cursor: running || !input.trim() ? "not-allowed" : "pointer", letterSpacing: "0.05em", marginTop: 10, transition: "background 0.2s" }}>
          {running ? "⟳  AGENTS SYNCING..." : "▶  ORCHESTRATE SYRO"}
        </button>
      </div>

      <div style={sec}>
        <div style={label}>▸ SCENARIO PRESETS</div>
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => { setInput(p); run(p); }} disabled={running} className="nb"
            style={{ width: "100%", textAlign: "left", background: "var(--bg)", border: `1px solid var(--border)`, borderRadius: 6, color: "var(--text-muted)", fontSize: 11, padding: "8px 10px", cursor: "pointer", fontFamily: "inherit", marginBottom: 6, lineHeight: 1.4, transition: "background 0.2s" }}>
            <span style={{ color: "#3b82f6", marginRight: 6 }}>#{i + 1}</span>{p}
          </button>
        ))}
      </div>

      <div style={sec}>
        <div style={label}>▸ AGENT PIPELINE</div>
        <div style={card}>
          {Object.keys(AI).map((agent, i) => {
            // @ts-ignore
            const active = activeAgents.has(agent);
            return (
              <div key={agent} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? `1px solid var(--border)` : "none" }}>
                <span style={{ fontSize: 14 }}>{(AI as any)[agent]}</span>
                <div style={{ flex: 1, fontSize: 11, color: active ? (AC as any)[agent] : "var(--text-dim)", transition: "color 0.3s", fontWeight: active ? 500 : 400 }}>{agent.replace("Agent", "")}</div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? (AC as any)[agent] : "var(--border)", transition: "background 0.3s", animation: active && running ? "pulse 1.5s infinite" : "none" }} />
              </div>
            );
          })}
        </div>
      </div>

      {result && (
        <div style={sec}>
          <div style={label}>▸ SYRO ASSESSMENT</div>
          <div style={{ ...card, border: `1px solid ${result.status === "Verified" ? "#7f1d1d" : "#14532d"}`, background: result.status === "Verified" ? "rgba(220,38,38,0.1)" : "rgba(34,197,94,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: result.status === "Verified" ? "#f87171" : "#34d399", fontFamily: "'Space Grotesk',sans-serif" }}>{result.status === "Verified" ? "⚠ CRISIS VERIFIED" : "✓ ALERT RETRACTED"}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{result.city}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: result.confidence > 50 ? "#f87171" : "#34d399", fontFamily: "'Space Grotesk',sans-serif" }}>{result.confidence}%</div>
                <div style={{ fontSize: 9, color: "var(--text-dim)" }}>CONFIDENCE</div>
              </div>
            </div>
            <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 10 }}>
              <div style={{ height: "100%", width: `${result.confidence}%`, background: result.confidence > 50 ? "#ef4444" : "#34d399", borderRadius: 2 }} />
            </div>
            {result.status === "Verified" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "var(--surface)", borderRadius: 6, padding: "8px 10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em" }}>FEEDER ISOLATED</div>
                  <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>{result.feederId}</div>
                </div>
                <div style={{ background: "var(--surface)", borderRadius: 6, padding: "8px 10px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.1em" }}>RESTORATION ETA</div>
                  <div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{result.eta}</div>
                </div>
              </div>
            )}
            <div style={{ fontSize: 10, color: result.status === "Verified" ? "#ef4444" : "#34d399", padding: "6px 8px", borderRadius: 5, background: result.status === "Verified" ? "rgba(220,38,38,0.15)" : "rgba(34,197,94,0.15)" }}>
              {result.status === "Verified" ? "✓ Twilio SMS dispatched · Field crew deployed · Grid updated" : "⚠ Alert retracted · State rolled back · Region NOMINAL"}
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div style={sec}>
          <div style={label}>▸ Processing ({logs.length})</div>
          <div style={card}>
            {logs.slice(-6).map((log: any) => (
              <div key={log.id} className="si" style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 11, lineHeight: 1.5 }}>
                <div style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 52, flexShrink: 0, paddingTop: 2 }}>{log.timestamp}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: (AC as any)[log.agent] + "22", color: (AC as any)[log.agent], fontWeight: 600, marginRight: 5 }}>{log.agent.replace("Agent", "")}</span>
                  <span style={{ color: (TC as any)[log.type] || "var(--text-muted)" }}>{log.message}</span>
                </div>
              </div>
            ))}
            {running && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>▌ processing...</div>}
            <div ref={logsEnd} />
          </div>
        </div>
      )}
    </>
  );
}

function History({ history, selected, setSelected }: any) {
  const sec: React.CSSProperties = { padding: "14px 16px" };
  const label: React.CSSProperties = { fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 10 };
  const badge = (c: string): React.CSSProperties => ({ fontSize: 9, padding: "2px 7px", borderRadius: 3, background: c + "22", color: c, fontWeight: 600, letterSpacing: "0.08em" });

  if (selected) return (
    <div style={sec}>
      <button onClick={() => setSelected(null)} className="back"
        style={{ background: "transparent", border: `1px solid var(--border)`, borderRadius: 6, color: "#60a5fa", fontSize: 12, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", marginBottom: 14, transition: "background 0.2s" }}>
        ← BACK
      </button>
      <div style={label}>▸ INCIDENT DETAIL</div>
      <div style={{ background: selected.status === "Verified" ? "rgba(220,38,38,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${selected.status === "Verified" ? "#7f1d1d" : "#14532d"}`, borderRadius: 10, padding: "14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: selected.status === "Verified" ? "#f87171" : "#34d399", fontFamily: "'Space Grotesk',sans-serif" }}>{selected.status === "Verified" ? "⚠ CRISIS VERIFIED" : "✓ ALERT RETRACTED"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{selected.city}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: selected.confidence > 50 ? "#f87171" : "#34d399", fontFamily: "'Space Grotesk',sans-serif" }}>{selected.confidence}%</div>
            <div style={{ fontSize: 9, color: "var(--text-dim)" }}>CONFIDENCE</div>
          </div>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 12 }}>
          <div style={{ height: "100%", width: `${selected.confidence}%`, background: selected.confidence > 50 ? "#ef4444" : "#34d399", borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 10px", background: "var(--surface)", borderRadius: 6, marginBottom: 10, lineHeight: 1.6, border: "1px solid var(--border)" }}>"{selected.userInput}"</div>
        {selected.status === "Verified" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div style={{ background: "var(--surface)", borderRadius: 6, padding: "8px 10px", border: "1px solid var(--border)" }}><div style={{ fontSize: 9, color: "var(--text-dim)" }}>FEEDER ISOLATED</div><div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>{selected.feederId}</div></div>
            <div style={{ background: "var(--surface)", borderRadius: 6, padding: "8px 10px", border: "1px solid var(--border)" }}><div style={{ fontSize: 9, color: "var(--text-dim)" }}>RESTORATION ETA</div><div style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{selected.eta}</div></div>
          </div>
        )}
        <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{selected.time}</div>
      </div>
    </div>
  );

  return (
    <div style={sec}>
      <div style={label}>▸ INCIDENT HISTORY ({history.length})</div>
      {history.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 12 }}>No incidents recorded yet</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>Submit a report on the Home tab</div>
        </div>
      )}
      {history.map((incident: any) => (
        <div key={incident.id} className="hc si" onClick={() => setSelected(incident)}
          style={{ background: "var(--surface)", border: `1px solid var(--border)`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.2s" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={badge(incident.status === "Verified" ? "#f87171" : "#34d399")}>{incident.status === "Verified" ? "⚠ VERIFIED" : "✓ RETRACTED"}</span>
              <span style={badge("#60a5fa")}>{incident.city}</span>
              <span style={badge("#a78bfa")}>{incident.confidence}%</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{incident.userInput}</div>
            <div style={{ fontSize: 9, color: "var(--text-dim)" }}>{incident.time}</div>
          </div>
          <span style={{ fontSize: 18, color: "var(--text-dim)", marginLeft: 10, flexShrink: 0 }}>›</span>
        </div>
      ))}
    </div>
  );
}

function Settings({ settings, setSettings, user }: any) {
  const sec: React.CSSProperties = { padding: "14px 16px" };
  const label: React.CSSProperties = { fontSize: 9, color: "var(--text-dim)", letterSpacing: "0.18em", marginBottom: 10 };
  const card: React.CSSProperties = { background: "var(--surface)", border: `1px solid var(--border)`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid var(--border)` };
  const lastRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" };
  const toggle = (on: boolean): React.CSSProperties => ({ width: 38, height: 20, borderRadius: 10, background: on ? "#1d4ed8" : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 });
  const dot = (on: boolean): React.CSSProperties => ({ position: "absolute", top: 3, left: on ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" });
  const t = (k: string) => setSettings((p: any) => ({ ...p, [k]: !p[k] }));

  const handleAuth = async () => {
    if (user) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error("Login failed:", err);
      }
    }
  };

  return (
    <div style={sec}>
      <div style={label}>▸ ACCOUNT CONFIGURATION</div>
      <div style={card}>
        <div style={lastRow}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "var(--text)", fontWeight: "bold" }}>{user ? user.displayName || "Authorized Field Agent" : "Guest Mode"}</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{user ? user.email : "Sign in to sync history to cloud"}</div>
          </div>
          <button onClick={handleAuth} style={{ background: user ? "var(--border)" : "#1d4ed8", color: user ? "var(--text)" : "#fff", border: "none", padding: "6px 12px", borderRadius: 5, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: "bold" }}>
            {user ? "Sign Out" : "Google Sign-In"}
          </button>
        </div>
      </div>

      <div style={label}>▸ PREFERENCES</div>
      <div style={card}>
        {[["lightMode", "☀️ Light Mode", "Switch to high-contrast light theme"], ["vibration", "📳 Haptic Feedback", "Vibrate device on assessment results"]].map(([k, l, sub], i, arr) => (
          <div key={k} style={i < arr.length - 1 ? row : lastRow}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text)" }}>{l}</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{sub}</div>
            </div>
            <button style={toggle(settings[k as keyof typeof settings] as boolean)} onClick={() => t(k)}>
              <div style={dot(settings[k as keyof typeof settings] as boolean)} />
            </button>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.12em", marginBottom: 10 }}>SYRO SYSTEM INFO</div>
        {[["Version", "SYRO v2.0"], ["Build", "Hackathon Edition"], ["Cloud Sync", user ? "Firebase Active" : "Local Only"], ["Agents", "6 Swarm Units"]].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11 }}>
            <span style={{ color: "var(--text-dim)" }}>{k}</span>
            <span style={{ color: "var(--text-muted)" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

