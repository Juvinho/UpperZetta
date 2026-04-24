import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { IdeProvider } from "./state/ideStore";
import "./styles/global.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IdeProvider>
      <App />
    </IdeProvider>
  </React.StrictMode>
);
