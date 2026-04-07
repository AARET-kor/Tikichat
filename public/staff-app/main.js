import { App } from "./App.js";
import { createRoot, html } from "./lib.js";

const container = document.getElementById("root");
createRoot(container).render(html`<${App} />`);
