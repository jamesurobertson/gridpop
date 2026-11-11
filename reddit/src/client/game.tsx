import "./styles.css";
import "@/index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Game } from "./GameView";

// Reddit opens the game in a frame of its own, and keys go to the page around it until the frame has
// focus, so take it as soon as the game opens (and whenever it's shown again).
function takeFocus() {
  window.focus();
  document.body.tabIndex = -1;
  document.body.style.outline = "none";
  document.body.focus({ preventScroll: true });
}
takeFocus();
window.addEventListener("load", takeFocus);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") takeFocus();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>
);
