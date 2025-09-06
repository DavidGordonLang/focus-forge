import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./suiteBus.js"; // <-- Suite Bridge

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
