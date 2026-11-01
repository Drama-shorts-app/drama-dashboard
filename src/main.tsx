import "@fontsource-variable/geist";
import "@fontsource-variable/fraunces";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../tokens.css";
import "./app.css";
import App from "./App";

const root = document.getElementById("root");

if (!root) throw new Error("The dashboard root element is missing.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
