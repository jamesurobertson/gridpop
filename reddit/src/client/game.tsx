import "./styles.css";
import "@/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./GameView";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>
);
