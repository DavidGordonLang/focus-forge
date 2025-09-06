import React, { useState, useEffect, useRef } from "react";
import "./index.css";

// Simple helpers for localStorage suite keys
function getSuiteCurrentIntention() {
  try {
    const raw = localStorage.getItem("suite.currentIntention");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function addSuiteTaskOutcome(outcome) {
  try {
    const raw = localStorage.getItem("suite.taskOutcomes");
    const list = raw ? JSON.parse(raw) : [];
    list.push(outcome);
    localStorage.setItem("suite.taskOutcomes", JSON.stringify(list));
  } catch (err) {
    console.error("Failed to write suite.taskOutcomes", err);
  }
}

function addSuiteTask(task) {
  try {
    const raw = localStorage.getItem("suite.tasks");
    const list = raw ? JSON.parse(raw) : [];
    list.push(task);
    localStorage.setItem("suite.tasks", JSON.stringify(list));
  } catch (err) {
    console.error("Failed to write suite.tasks", err);
  }
}

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [mode, setMode] = useState("work"); // "work" or "break"
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState("");

  const timerRef = useRef(null);

  // Prefill from suite.currentIntention if available
  useEffect(() => {
    const current = getSuiteCurrentIntention();
    if (current && current.text) {
      setTaskInput(current.text);
    }
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (isRunning && timeLeft === 0) {
      handleCompleteTask();
    }
    return () => clearTimeout(timerRef.current);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60);
  };

  const switchMode = () => {
    setIsRunning(false);
    const newMode = mode === "work" ? "break" : "work";
    setMode(newMode);
    setTimeLeft(newMode === "work" ? 25 * 60 : 5 * 60);
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    const newTask = { id: Date.now(), title: taskInput.trim(), completed: false };
    setTasks((prev) => [...prev, newTask]);
    setTaskInput("");

    // 🔗 Save to suite.tasks
    addSuiteTask({
      id: newTask.id,
      title: newTask.title,
      source: "focus",
      createdAt: new Date().toISOString(),
    });
  };

  const handleCompleteTask = () => {
    setIsRunning(false);

    if (tasks.length > 0) {
      const [current, ...rest] = tasks;
      const completed = { ...current, completed: true };
      setTasks(rest);

      // 🔗 Save outcome to suite.taskOutcomes
      addSuiteTaskOutcome({
        id: completed.id,
        title: completed.title,
        success: true,
        duration: mode === "work" ? 25 : 5,
        source: "focus",
        completedAt: new Date().toISOString(),
      });
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
        <div className="controls">
          <button className="btn" onClick={toggleTimer}>
            {isRunning ? "Pause" : "Start"}
          </button>
          <button className="btn" onClick={resetTimer}>Reset</button>
          <button className="btn" onClick={switchMode}>
            Switch to {mode === "work" ? "Break" : "Work"}
          </button>
        </div>
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
