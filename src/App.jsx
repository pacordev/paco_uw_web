import { useState } from "react";
import QuoteConsole from "./components/QuoteConsole";
import AdminPage from "./components/AdminPage";

export default function App() {
  const [view, setView] = useState("console"); // "console" | "admin"
  // Real quote_id, reported up from QuoteConsole once POST /quotes resolves - null until
  // then (products/quote still loading, or a product hasn't been picked yet).
  const [activeQuoteId, setActiveQuoteId] = useState(null);

  return (
    <div className="shell">
      <div className="topbar">
        <div className="wordmark">
          <span className="mark">◆</span>
          <span className="name">Paco's Binder</span>
          <span className="tag">quote console</span>
        </div>
        {view === "console" && (
          <div className="session-chip">
            <span className="dot"></span>
            <span>myins.quote</span>
            <span className="sep">/</span>
            <b>{activeQuoteId ? `#${activeQuoteId}` : "—"}</b>
          </div>
        )}
        <div className="nav-tabs">
          <button className={view === "console" ? "on" : ""} onClick={() => setView("console")}>Quote console</button>
          <button className={view === "admin" ? "on" : ""} onClick={() => setView("admin")}>Admin</button>
        </div>
      </div>

      {view === "console" ? <QuoteConsole onQuoteChange={setActiveQuoteId} /> : <AdminPage />}
    </div>
  );
}
