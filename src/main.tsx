import { createRoot } from "react-dom/client";
import { WebApp } from "./web/WebApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(<WebApp />);
