import { useEffect, useState } from "react";
import { Circle, RefreshCw } from "lucide-react";
import { getHealth } from "../services/api";

function StatusRow({ label, good, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[11px]">
      <span>{label}</span>
      <b
        className={`inline-flex items-center gap-1.5 font-medium capitalize ${
          good ? "text-leaf-500" : "text-sand"
        }`}
      >
        <Circle size={8} fill="currentColor" aria-hidden="true" />
        {children}
      </b>
    </div>
  );
}

export default function ConnectionStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setLoading(true);
    getHealth(controller.signal)
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active)
          setStatus({
            api: "unavailable",
            database: "unknown",
            message:
              "Cannot reach the API. Start Django and check your API URL.",
          });
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return (
    <section
      className="relative mb-10 mt-1 grid gap-6 overflow-hidden rounded-[2rem] bg-linear-to-br from-leaf-900 via-leaf-800 to-leaf-600 p-7 text-white shadow-lift md:mb-16 md:grid-cols-2 md:items-center md:gap-[60px] md:p-12"
      id="connection"
      aria-labelledby="connection-title"
    >
      <div>
        <div className="absolute -right-16 -top-16 size-[260px] rounded-full bg-lime/15 blur-3xl" />
        <span className="eyebrow text-lime">SYSTEM CONNECTION</span>
        <h2
          id="connection-title"
          className="mb-3.5 mt-3 text-[30px] tracking-[-1px] text-white sm:text-[38px]"
        >
          A fresh start, connected.
        </h2>
        <p className="max-w-[380px] text-sm text-white/70">
          This live check connects your React interface to Django and queries
          PostgreSQL.
        </p>
      </div>
      <div
        className="relative rounded-2xl border border-white/20 bg-white p-5 text-ink shadow-lift md:px-7 md:py-6"
        aria-live="polite"
      >
        <StatusRow label="React frontend" good>
          Running
        </StatusRow>
        <StatusRow label="Django REST API" good={status?.api === "online"}>
          {loading ? "Checking…" : status?.api}
        </StatusRow>
        <StatusRow
          label="PostgreSQL database"
          good={status?.database === "connected"}
        >
          {loading ? "Checking…" : status?.database}
        </StatusRow>
        <p className="my-3 text-[11px] text-[#7c8873]">
          {loading ? "Checking the connection…" : status?.message}
        </p>
        <button
          className="text-btn"
          disabled={loading}
          onClick={() => setAttempt(attempt + 1)}
        >
          Check connection again <RefreshCw size={12} />
        </button>
      </div>
    </section>
  );
}
