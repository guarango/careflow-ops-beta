// Shared utilities for the Schedule module

export const SERVICE_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-700", border: "border-l-blue-500", hex: "#3b82f6" },
  { bg: "bg-purple-500", light: "bg-purple-50", text: "text-purple-700", border: "border-l-purple-500", hex: "#a855f7" },
  { bg: "bg-green-500", light: "bg-green-50", text: "text-green-700", border: "border-l-green-500", hex: "#22c55e" },
  { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-700", border: "border-l-orange-500", hex: "#f97316" },
  { bg: "bg-teal-500", light: "bg-teal-50", text: "text-teal-700", border: "border-l-teal-500", hex: "#14b8a6" },
  { bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-700", border: "border-l-rose-500", hex: "#f43f5e" },
  { bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-700", border: "border-l-amber-500", hex: "#f59e0b" },
  { bg: "bg-indigo-500", light: "bg-indigo-50", text: "text-indigo-700", border: "border-l-indigo-500", hex: "#6366f1" },
];

export function getServiceColor(serviceType, serviceCodes = []) {
  if (!serviceType) return SERVICE_COLORS[0];
  // Build a consistent index from all known service types
  const allTypes = [...new Set(serviceCodes.map(sc => sc.service_type).filter(Boolean))];
  const idx = allTypes.indexOf(serviceType);
  return SERVICE_COLORS[Math.abs(idx >= 0 ? idx : serviceType.charCodeAt(0)) % SERVICE_COLORS.length];
}

export function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function calcHours(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((timeToMinutes(end) - timeToMinutes(start)) / 60 * 100) / 100);
}

export function detectConflicts(shifts) {
  // Returns a set of shift IDs that have conflicts
  const conflictIds = new Set();
  const byStaff = {};
  shifts.forEach(s => {
    if (!s.staff_id || !s.date || !s.start_time) return;
    const key = `${s.staff_id}_${s.date}`;
    if (!byStaff[key]) byStaff[key] = [];
    byStaff[key].push(s);
  });
  Object.values(byStaff).forEach(group => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const aStart = timeToMinutes(a.start_time), aEnd = timeToMinutes(a.end_time || "23:59");
        const bStart = timeToMinutes(b.start_time), bEnd = timeToMinutes(b.end_time || "23:59");
        if (aStart < bEnd && aEnd > bStart) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
  });
  return conflictIds;
}

export function formatTimeRange(start, end) {
  if (!start) return "—";
  const fmt = (t) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}