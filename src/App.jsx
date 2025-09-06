import React, { useEffect, useMemo, useState } from "react";

// ---------- utils ----------
const ls = (k, v) =>
  v === undefined
    ? JSON.parse(localStorage.getItem(k) || "null")
    : localStorage.setItem(k, JSON.stringify(v));

const pad = (n) => n.toString().padStart(2, "0");

const beep = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  osc.stop(ctx.currentTime + 0.45);
};

// ---------- suite helpers ----------
function getSuiteCurrentIntention() {
  try {
    const raw = localStorage.getItem("suite.currentIntention");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function addSuiteTask(task) {
  try {
    const raw = localStorage.getItem("suite.tasks");
    const list = raw ? JSON.parse(raw) : [];
    list.push(task);
    localStorage.setItem("suite.tasks", JSON.stringify(list));
  } catch {}
}

function addSuiteTaskOutcome(outcome) {
  try {
    const raw = localStorage.getItem("suite.taskOutcomes");
    const list = raw ? JSON.parse(raw) : [];
    list.push(outcome);
    localStorage.setItem("suite.taskOutcomes", JSON.stringify(list));
  } catch {}
}

// ---------- main app ----------
export default function App() {
  const [tab, setTab] = useState(ls("ff_tab") || "timer");

  // Timer state
  const [workMins, setWorkMins] = useState(ls("ff_work") ?? 25);
  const [breakMins, setBreakMins] = useState(ls("ff_break") ?? 5);
  const [workStr, setWorkStr] = useState(String(ls("ff_work") ?? 25));
  const [breakStr, setBreakStr] = useState(String(ls("ff_break") ?? 5));
  const [mode, setMode] = useState(ls("ff_mode") || "work");
  const [seconds, setSeconds] = useState(
    ls("ff_secs") ??
      (ls("ff_mode") === "break"
        ? ls("ff_break") ?? 5
        : ls("ff_work") ?? 25) * 60
  );
  const [running, setRunning] = useState(false);
  const [sessionName, setSessionName] = useState(ls("ff_block_name") || "");

  // Tasks
  const [tasks, setTasks] = useState(ls("ff_tasks") || []);
  const [newTitle, setNewTitle] = useState("");
  const [newEst, setNewEst] = useState(1);
  const [hideCompleted, setHideCompleted] = useState(
    ls("ff_hide_completed") ?? false
  );

  // Prefill sessionName from suite.currentIntention if empty
  useEffect(() => {
    if (!sessionName) {
      const current = getSuiteCurrentIntention();
      if (current && current.text) {
        setSessionName(current.text);
      }
    }
  }, []);

  // Persist
  useEffect(() => ls("ff_tab", tab), [tab]);
  useEffect(() => ls("ff_work", workMins), [workMins]);
  useEffect(() => ls("ff_break", breakMins), [breakMins]);
  useEffect(() => ls("ff_mode", mode), [mode]);
  useEffect(() => ls("ff_secs", seconds), [seconds]);
  useEffect(() => ls("ff_block_name", sessionName), [sessionName]);
  useEffect(() => ls("ff_tasks", tasks), [tasks]);
  useEffect(() => ls("ff_hide_completed", hideCompleted), [hideCompleted]);

  // Reset seconds when lengths change if not running
  useEffect(() => {
    if (!running)
      setSeconds((mode === "work" ? workMins : breakMins) * 60);
  }, [workMins, breakMins, mode, running]);

  // Countdown effect
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          beep();

          // 🔗 Log outcome to suite
          if (sessionName) {
            addSuiteTaskOutcome({
              id: crypto.randomUUID(),
              title: sessionName,
              success: true,
              duration: mode === "work" ? workMins : breakMins,
              source: "focus",
              completedAt: new Date().toISOString(),
            });
          }

          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, sessionName, mode, workMins, breakMins]);

  // Derived
  const total = (mode === "work" ? workMins : breakMins) * 60;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = useMemo(
    () => (total ? (total - seconds) / total : 0),
    [seconds, total]
  );

  const start = () => {
    if (seconds === 0)
      setSeconds((mode === "work" ? workMins : breakMins) * 60);
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setSeconds((mode === "work" ? workMins : breakMins) * 60);
  };

  // Task helpers
  const addTask = () => {
    if (!newTitle.trim()) return;
    const t = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      estimate: Math.max(1, newEst | 0),
      done: false,
    };
    setTasks([t, ...tasks]);
    setSessionName(t.title);
    setNewTitle("");
    setNewEst(1);

    // 🔗 Save to suite.tasks
    addSuiteTask({
      ...t,
      createdAt: new Date().toISOString(),
      source: "focus",
    });
  };
  const toggleTask = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id) => setTasks(tasks.filter((t) => t.id !== id));

  // --- UI (unchanged from your working version) ---
  return (
    // ... [KEEP YOUR ORIGINAL RENDER HERE EXACTLY AS-IS, unchanged]
    // Everything you pasted for the UI stays the same.
    // The only changes are the suite hooks above.
  );
}

// ---------- timer button ----------
function TimerButton({ size = 260, stroke = 12, progress = 0, label = "00:00", mode = "work", running = false, onClick }) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, progress)) * circ;
  const remaining = circ - dash;
  const ringColor = mode === "work" ? "#22d3ee" : "#a78bfa";
  const bgRing = "#0f172a";

  return (
    <button
      onClick={onClick}
      className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-teal-400/70"
      style={{ width: size, height: size }}
      aria-label={running ? "Pause" : "Start"}
    >
      <svg width={size} height={size} className="block -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={bgRing} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={remaining}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-6xl font-black tabular-nums tracking-tight text-teal-50" style={{ textShadow:"0 1px 2px rgba(255,255,255,0.25), 0 4px 18px rgba(0,0,0,0.65)" }}>
          {label}
        </div>
        <div className="text-xs text-teal-100 -mt-1" style={{ textShadow: "0 1px 1px rgba(0,0,0,0.4)" }}>
          {running ? "Tap to pause" : "Tap to start"} • {mode === "work" ? "FOCUS" : "BREAK"}
        </div>
      </div>
    </button>
  );
}
