import { Shell } from "@/shell/Shell";
import "./App.css";

export function App() {
  return (
    <Shell>
      {/* Top window drag region for frameless desktop window */}
      <div className="window-drag-region" data-tauri-drag-region>
        <span className="window-title">Tachyon</span>
      </div>

      <div className="workspace-container">
        {/* Workspace canvas ready for routes & features */}
      </div>
    </Shell>
  );
}

export default App;
