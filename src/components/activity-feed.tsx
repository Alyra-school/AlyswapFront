"use client";

import { useEffect, useState } from "react";
import { listActivity, type ActivityItem } from "@/lib/activity";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString();
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const load = () => setItems(listActivity());
    load();
    window.addEventListener("alyswap:activity-updated", load);
    return () => window.removeEventListener("alyswap:activity-updated", load);
  }, []);

  const compactItems = items.filter((item) => {
    if (item.status !== "pending") return true;
    return !items.some(
      (next) =>
        next.id !== item.id &&
        next.action === item.action &&
        next.detail === item.detail &&
        (next.status === "success" || next.status === "error")
    );
  });

  return (
    <article className="card">
      <h2>Activité</h2>
      {compactItems.length === 0 ? <p className="muted">Aucune action pour le moment.</p> : null}
      <div className="stack">
        {compactItems.slice(0, 5).map((item) => (
          <div key={item.id} className="activity-row">
            <div>
              <p className="kv"><strong>{item.action}</strong> - {item.detail}</p>
              <p className="muted">{formatTime(item.timestamp)}</p>
            </div>
            <span className={`status ${item.status === "success" ? "success" : item.status === "error" ? "error" : ""}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
