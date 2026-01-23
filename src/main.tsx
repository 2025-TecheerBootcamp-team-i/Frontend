import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { PlayerProvider } from "./player/PlayerContext";
import { reportWebVitals } from "./utils/reportWebVitals";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <PlayerProvider>
      <App />
      </PlayerProvider>
    </BrowserRouter>
  </StrictMode>
);

// Report Web Vitals for performance monitoring
reportWebVitals();
