export type ActivityStatus = "pending" | "success" | "error";

export type ActivityItem = {
  id: string;
  action: string;
  detail: string;
  status: ActivityStatus;
  timestamp: string;
};

const KEY = "alyswap_activity";

function readItems(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ActivityItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(items: ActivityItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 30)));
  window.dispatchEvent(new Event("alyswap:activity-updated"));
}

export function addActivity(action: string, detail: string, status: ActivityStatus) {
  const item: ActivityItem = {
    id: crypto.randomUUID(),
    action,
    detail,
    status,
    timestamp: new Date().toISOString()
  };
  const items = readItems();
  writeItems([item, ...items]);
}

export function listActivity(): ActivityItem[] {
  return readItems();
}
