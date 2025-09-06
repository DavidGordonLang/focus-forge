import React, { useState, useEffect, useRef } from "react";
import "./index.css";

// Utility to safely access the shared suite API
function useSuite() {
  const safe = typeof window !== "undefined" && window.SUITE ? window.SUITE : null;
  return safe;
}

export default function App() {
  const suite = useSuite();

  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // default 25min
  const [mode, setMode] = useState("work"); // "work" | "break"
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const timerRef = useRef(null);

  // Prefill from suite.currentIntention
  useEffect(() => {
    if (suite) {
      const current = suite.getCurrentIntention?.();
      if (current && current.text) {
        setTaskInput(current.text);
      }
    }
  }, [suite]);

  // Countdown effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      handleCompleteTask();
    }
    return () => clearTimeout(timerRef.current);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const switchMode = () => {
    setIsRunning(false);
    setMode((prev) => (prev === "work" ? "break" : "work"));
    setTimeLeft(mode === "work" ? 5 * 60 : 25 * 60);
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    const newTask = { id: Date.now(), title: taskInput.trim(), completed: false };
    setTasks((prev) => [...prev, newTask]);
    setTaskInput("");

    // 🔗 Save to suite.tasks
    if (suite) {
      suite.addTask({
        title: newTask.title,
        source: "focus",
      });
    }
  };

  const handleCompleteTask = () => {
    setIsRunning(false);

    if (tasks.length > 0) {
      const [current, ...rest] = tasks;
      const completed = { ...current, completed: true };
      setTasks(rest);

      // 🔗 Save outcome to suite.taskOutcomes
      if (suite) {
        suite.addTaskOutcome({
          title: completed.title,
          success: true,
          duration: mode === "work" ? 25 : 5,
          source: "focus",
        });
      }
    }
    resetTimer();
  };

  return (
    <div className="app-container">
      <h1 className="title">Focus Forge</h1>

      <div className="timer">
        <div className="time">
          {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
        <button className="btn" onClick={toggleTimer}>
          {isRunning ? "Pause" : "Start"}
        </button>
        <button className="btn" onClick={resetTimer}>Reset</button>
        <button className="btn" onClick={switchMode}>
          Switch to {mode === "work" ? "Break" : "Work"}
        </button>
      </div>

      <div className="tasks">
        <h2>Tasks</h2>
        <div className="task-input">
          <input
            type="text"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="Enter a task..."
          />
          <button className="btn" onClick={addTask}>Add</button>
        </div>

        <ul>
          {tasks.map((t) => (
            <li key={t.id} className={t.completed ? "completed" : ""}>
              {t.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
