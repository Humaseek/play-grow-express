import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Enforce English/LTR UI (prevents legacy RTL styles from affecting layout)
if (typeof document !== "undefined") {
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
