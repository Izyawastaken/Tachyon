import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { UpdateButton } from "./components/UpdateButton";
import "./App.css";

export function App() {
  const [currentVersion, setCurrentVersion] = useState("0.0.1");

  useEffect(() => {
    getVersion()
      .then((ver) => setCurrentVersion(ver))
      .catch(() => {
        // Fallback when previewing outside Tauri
      });
  }, []);

  return (
    <>
      <div className="window-drag-region" data-tauri-drag-region>
        <span className="window-title">Tachyon</span>
      </div>

      <main className="app-container">
        <header className="app-header">
          <div className="brand-badge">
            <span className="brand-pulse" />
            <span>Tachyon Engine</span>
          </div>
          <h1 className="app-title">Tachyon</h1>
          <p className="app-subtitle">
            Next-generation desktop application workspace. Fast, native, and always updated.
          </p>
        </header>

        <section className="app-content">
          {/* Metadata Overview */}
          <div className="meta-grid">
            <div className="meta-card">
              <span className="meta-label">Installed Version</span>
              <span className="meta-value">v{currentVersion}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Update Channel</span>
              <span className="meta-value">GitHub Releases</span>
            </div>
          </div>

          {/* Reusable Update Component */}
          <UpdateButton variant="card" autoCheck={false} />
        </section>

        <footer className="app-footer">
          <span>Tachyon • Built with Tauri v2 + React</span>
        </footer>
      </main>
    </>
  );
}

export default App;
