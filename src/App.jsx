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
  osc.frequency.value = 880; // A5 tone
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
  osc.stop(ctx.currentTime + 0.45);
};

// ---------- main app ----------
export default function App() {
  const [tab, setTab] = useState(ls("ff_tab") || "timer");

  // Timer state
  const [workMins, setWorkMins] = useState(ls("ff_work") ?? 25);
  const [breakMins, setBreakMins] = useState(ls("ff_break") ?? 5);
  const [workStr, setWorkStr] = useState(String(ls("ff_work") ?? 25));
  const [breakStr, setBreakStr] = useState(String(ls("ff_break") ?? 5));
  const [mode, setMode] = useState(ls("ff_mode") || "work"); // work | break
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

  // Countdown effect — stop + beep at 0
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          setRunning(false);
          beep();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

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
  };
  const toggleTask = (id) =>
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const removeTask = (id) => setTasks(tasks.filter((t) => t.id !== id));

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-900 via-teal-950 to-sky-950 text-teal-50 p-4">
      <div className="mx-auto w-full max-w-md">
        <header className="text-center mb-3">
          <h1 className="text-2xl font-bold tracking-tight">Focus Forge</h1>
          <p className="text-teal-200/80 text-sm">
            Mobile-first Pomodoro + Quick Tasks
          </p>
        </header>

        {/* Tabs */}
        <div className="grid grid-cols-2 rounded-xl overflow-hidden mb-3 bg-teal-800/40">
          <button
            className={`py-2 text-sm ${
              tab === "timer" ? "bg-teal-700/70 font-semibold" : ""
            }`}
            onClick={() => setTab("timer")}
          >
            Timer
          </button>
          <button
            className={`py-2 text-sm ${
              tab === "tasks" ? "bg-teal-700/70 font-semibold" : ""
            }`}
            onClick={() => setTab("tasks")}
          >
            Tasks
          </button>
        </div>

        {tab === "timer" && (
          <div className="rounded-2xl p-4 bg-teal-900/60 border border-teal-800/70 shadow-xl">
            {/* Timer circle */}
            <div className="flex flex-col items-center">
              <TimerButton
                size={260}
                stroke={12}
                progress={progress}
                label={`${pad(minutes)}:${pad(secs)}`}
                mode={mode}
                running={running}
                onClick={() => (running ? pause() : start())}
              />

              {/* Session name */}
              <label
                htmlFor="sessionName"
                className="mt-4 block text-teal-100 text-sm mb-1"
              >
                Session name (shown in logs)
              </label>
              <input
                id="sessionName"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Draft report section"
                className="w-full rounded-lg bg-teal-900/70 border border-teal-700 px-3 py-2 text-teal-50 placeholder:text-teal-200 caret-teal-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />

              {/* Work/Break inputs */}
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <div>
                  <label
                    htmlFor="workm"
                    className="block text-teal-100 text-sm mb-1"
                  >
                    Work (minutes)
                  </label>
                  <input
                    id="workm"
                    type="number"
                    value={workStr}
                    onChange={(e) => setWorkStr(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(workStr, 10);
                      const v =
                        Number.isFinite(n) && n >= 1 && n <= 180 ? n : 25;
                      setWorkMins(v);
                      setWorkStr(String(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-full rounded-lg bg-teal-900/70 border border-teal-700 px-2 py-2 text-teal-50 placeholder:text-teal-200 caret-teal-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="breakm"
                    className="block text-teal-100 text-sm mb-1"
                  >
                    Break (minutes)
                  </label>
                  <input
                    id="breakm"
                    type="number"
                    value={breakStr}
                    onChange={(e) => setBreakStr(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(breakStr, 10);
                      const v =
                        Number.isFinite(n) && n >= 1 && n <= 60 ? n : 5;
                      setBreakMins(v);
                      setBreakStr(String(v));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className="w-full rounded-lg bg-teal-900/70 border border-teal-700 px-2 py-2 text-teal-50 placeholder:text-teal-200 caret-teal-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Mode slider */}
              <div className="col-span-2 rounded-2xl bg-teal-800/30 border border-teal-700/50 p-1 flex mt-4">
                <button
                  className={`flex-1 px-4 py-2 rounded-xl transition ${
                    mode === "work"
                      ? "bg-teal-700 text-teal-50 shadow"
                      : "text-teal-200 hover:bg-teal-800/40"
                  }`}
                  onClick={() => {
                    setRunning(false);
                    setMode("work");
                    setSeconds(workMins * 60);
                  }}
                >
                  Work
                </button>
                <button
                  className={`flex-1 px-4 py-2 rounded-xl transition ${
                    mode === "break"
                      ? "bg-teal-700 text-teal-50 shadow"
                      : "text-teal-200 hover:bg-teal-800/40"
                  }`}
                  onClick={() => {
                    setRunning(false);
                    setMode("break");
                    setSeconds(breakMins * 60);
                  }}
                >
                  Break
                </button>
              </div>

              {/* Reset */}
              <div className="flex gap-2 justify-center mt-3">
                <button
                  onClick={reset}
                  className="rounded-2xl px-4 py-2 bg-slate-900/80 text-teal-50 border border-slate-900"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick Tasks inside Timer */}
            <div className="mt-5 rounded-xl p-3 bg-teal-900/50 border border-teal-800/60">
              <div className="font-semibold mb-2">Quick Tasks</div>
              <div className="text-xs text-teal-200/80 mb-2">
                Task name + sessions. <strong>1 session = one work block</strong>.
              </div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-7">
                  <label htmlFor="taskName" className="block text-sm mb-1">
                    Task name
                  </label>
                  <input
                    id="taskName"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Write blog draft"
                    className="w-full rounded-lg bg-teal-900/70 border border-teal-700 px-3 py-2 text-teal-50 placeholder:text-teal-200 caret-teal-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="col-span-4">
                  <label htmlFor="sessions" className="block text-sm mb-1">
                    # of sessions (blocks)
                  </label>
                  <input
                    id="sessions"
                    type="number"
                    min={1}
                    value={newEst}
                    onChange={(e) => setNewEst(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg bg-teal-900/70 border border-teal-700 px-3 py-2 text-teal-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={addTask}
                    className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-600"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                  />{" "}
                  Hide completed
                </label>
                <button
                  onClick={() => setTasks(tasks.filter((t) => !t.done))}
                  className="text-sm px-3 py-2 rounded-xl bg-teal-800/40 border border-teal-700/60"
                >
                  Clear completed
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {(hideCompleted ? tasks.filter((t) => !t.done) : tasks).map(
                  (t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl bg-slate-900/40 border border-teal-800/60 p-2"
                    >
                      <button
                        onClick={() => toggleTask(t.id)}
                        className={`w-5 h-5 rounded-full border ${
                          t.done
                            ? "bg-emerald-400 border-emerald-400"
                            : "border-teal-300"
                        }`}
                      ></button>
                      <div className="flex-1">
                        <div
                          className={`font-medium ${
                            t.done
                              ? "line-through text-teal-200/70"
                              : "text-teal-50"
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="text-xs text-teal-200/80">
                          {t.estimate}{" "}
                          {t.estimate === 1 ? "session" : "sessions"}
                        </div>
                      </div>
                      <button
                        onClick={() => removeTask(t.id)}
                        className="text-sm px-2 py-1 rounded-lg bg-transparent hover:bg-teal-800/40"
                      >
                        ✕
                      </button>
                    </div>
                  )
                )}
                {tasks.length === 0 && (
                  <div className="text-sm text-teal-200/80">
                    No tasks yet — add one above.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "tasks" && (
          <div className="rounded-2xl p-4 bg-teal-900/60 border border-teal-800/70 shadow-xl">
            <div className="font-semibold mb-2">All Tasks</div>
            <div className="text-xs text-teal-200/80 mb-3">
              Tap the dot to mark done. Edit estimate by re-adding if needed.
            </div>
            {(tasks.length ? tasks : []).map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-slate-900/40 border border-teal-800/60 p-2 mb-2"
              >
                <button
                  onClick={() => toggleTask(t.id)}
                  className={`w-5 h-5 rounded-full border ${
                    t.done
                      ? "bg-emerald-400 border-emerald-400"
                      : "border-teal-300"
                  }`}
                ></button>
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      t.done
                        ? "line-through text-teal-200/70"
                        : "text-teal-50"
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="text-xs text-teal-200/80">
                    {t.estimate} {t.estimate === 1 ? "session" : "sessions"}
                  </div>
                </div>
                <button
                  onClick={() => removeTask(t.id)}
                  className="text-sm px-2 py-1 rounded-lg bg-transparent hover:bg-teal-800/40"
                >
                  ✕
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-sm text-teal-200/80">
                No tasks yet — add one from Quick Tasks on the Timer tab.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- timer button ----------
function TimerButton({
  size = 260,
  stroke = 12,
  progress = 0,
  label = "00:00",
  mode = "work",
  running = false,
  onClick,
}) {
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgRing}
          strokeWidth={stroke}
          fill="none"
        />
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
        <div
          className="text-6xl font-black tabular-nums tracking-tight text-teal-50"
          style={{
            textShadow:
              "0 1px 2px rgba(255,255,255,0.25), 0 4px 18px rgba(0,0,0,0.65)",
          }}
        >
          {label}
        </div>
        <div
          className="text-xs text-teal-100 -mt-1"
          style={{ textShadow: "0 1px 1px rgba(0,0,0,0.4)" }}
        >
          {running ? "Tap to pause" : "Tap to start"} •{" "}
          {mode === "work" ? "FOCUS" : "BREAK"}
        </div>
      </div>
    </button>
  );
}
