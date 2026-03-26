import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700", "bg-rose-100 text-rose-700",
];
function getColor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const COMMON_TIMES = ["Breakfast", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "Dinner", "8:00 PM", "Bedtime"];

function groupMedsByTime(medications) {
  const map = {};
  for (const med of medications) {
    if (med.status !== "Active") continue;
    const times = med.scheduled_times?.length ? med.scheduled_times : ["Unscheduled"];
    for (const t of times) {
      if (!map[t]) map[t] = [];
      map[t].push(med);
    }
  }
  // Sort by common time order
  return Object.entries(map).sort(([a], [b]) => {
    const ai = COMMON_TIMES.indexOf(a), bi = COMMON_TIMES.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function isMissedWindow(timeLabel) {
  const TIME_HOURS = {
    "7:00 AM": 7, "Breakfast": 8, "8:00 AM": 8, "9:00 AM": 9,
    "10:00 AM": 10, "12:00 PM": 12, "2:00 PM": 14, "4:00 PM": 16,
    "Dinner": 18, "8:00 PM": 20, "9:00 PM": 21, "Bedtime": 21,
  };
  const windowHour = TIME_HOURS[timeLabel];
  if (windowHour == null) return false;
  return new Date().getHours() >= windowHour + 1;
}

function ClientMARCard({ client, meds, time, date, logs, onOpen }) {
  const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();
  const colorClass = getColor(client.id);
  const program = client.service_enrollments?.[0]?.service_type || null;

  // Determine missed status: scheduled meds with no log entry for today's time window
  const scheduledMeds = meds.filter(m => !m.is_prn);
  const missedCount = scheduledMeds.filter(m => {
    if (!isMissedWindow(time)) return false;
    return !logs.some(l => l.medication_id === m.id && l.date === date);
  }).length;
  const hasMissed = missedCount > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full flex items-center gap-4 bg-white border rounded-xl p-4 hover:shadow-md transition-all text-left group",
        hasMissed ? "border-red-300 hover:border-red-400" : "border-gray-200 hover:border-primary/40"
      )}
    >
      {/* Photo */}
      <div className="flex-shrink-0 relative">
        {client.photo_url ? (
          <img src={client.photo_url} alt={initials} className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className={cn("w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold", colorClass)}>
            {initials}
          </div>
        )}
        {hasMissed && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {missedCount}
          </span>
        )}
      </div>

      {/* Name / program */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-gray-900 text-sm">{client.first_name} {client.last_name}</p>
          {hasMissed && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
              {missedCount} Missed
            </span>
          )}
        </div>
        {program && <p className="text-xs text-gray-500 mt-0.5">{program}</p>}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {meds.map(m => (
            <span key={m.id} className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              m.is_controlled ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-gray-600"
            )}>
              {m.medication_name}
              {m.is_controlled && <span className="ml-1 font-bold">C2</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Med count badge */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center shadow",
          hasMissed ? "bg-red-500" : "bg-primary"
        )}>
          <span className="text-xl font-bold text-white">{meds.length}</span>
        </div>
        <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">{time}</span>
      </div>

      <ChevronRight className={cn("w-4 h-4 transition-colors flex-shrink-0", hasMissed ? "text-red-300 group-hover:text-red-500" : "text-gray-300 group-hover:text-primary")} />
    </button>
  );
}

export default function MARScheduledView({ clients, medications, logs = [], date, onOpenDetail }) {
  const [sortBy, setSortBy] = useState("name");
  const [viewBy, setViewBy] = useState("time");

  // Group all meds by time, then by client within each time
  const allByTime = groupMedsByTime(medications);

  const today = date || format(new Date(), "yyyy-MM-dd");
  const displayDate = format(new Date(today + "T12:00:00"), "EEEE, MMMM d, yyyy");

  return (
    <div className="bg-gray-50 min-h-full -m-6 p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Select value={viewBy} onValueChange={setViewBy}>
            <SelectTrigger className="w-32 h-8 text-xs border-gray-200">
              <SelectValue placeholder="View By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="client">Client</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-8 text-xs border-gray-200">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="room">Room/Program</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-400 hidden sm:block">|</span>
          <span className="text-xs font-medium text-gray-600 hidden sm:block">{displayDate}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* View: by Time */}
      {viewBy === "time" && (
        allByTime.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">No active medications scheduled.</div>
        ) : (
          <div className="space-y-6">
            {allByTime.map(([time, meds]) => {
              const clientMap = {};
              for (const med of meds) {
                if (!clientMap[med.client_id]) clientMap[med.client_id] = [];
                clientMap[med.client_id].push(med);
              }
              const clientEntries = Object.entries(clientMap).sort(([aId], [bId]) => {
                const ac = clients.find(c => c.id === aId);
                const bc = clients.find(c => c.id === bId);
                if (!ac || !bc) return 0;
                if (sortBy === "room") {
                  const ap = ac.service_enrollments?.[0]?.service_type || "";
                  const bp = bc.service_enrollments?.[0]?.service_type || "";
                  return ap.localeCompare(bp) || `${ac.first_name} ${ac.last_name}`.localeCompare(`${bc.first_name} ${bc.last_name}`);
                }
                return `${ac.first_name} ${ac.last_name}`.localeCompare(`${bc.first_name} ${bc.last_name}`);
              });

              return (
                <div key={time}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary text-primary-foreground text-sm font-bold px-4 py-1.5 rounded-lg shadow-sm">{time}</div>
                    <div className="text-xs text-gray-400 font-medium">{displayDate}</div>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">{clientEntries.length} client{clientEntries.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clientEntries.map(([clientId, clientMeds]) => {
                      const client = clients.find(c => c.id === clientId);
                      if (!client) return null;
                      return (
                        <ClientMARCard
                          key={clientId}
                          client={client}
                          meds={clientMeds}
                          time={time}
                          date={today}
                          logs={logs}
                          onOpen={() => onOpenDetail({ client, time, meds: clientMeds, date: today })}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* View: by Client */}
      {viewBy === "client" && (() => {
        // Build per-client list of all their active meds (grouped)
        const clientMedMap = {};
        for (const med of medications) {
          if (med.status !== "Active") continue;
          if (!clientMedMap[med.client_id]) clientMedMap[med.client_id] = [];
          clientMedMap[med.client_id].push(med);
        }

        const clientEntries = Object.entries(clientMedMap).sort(([aId], [bId]) => {
          const ac = clients.find(c => c.id === aId);
          const bc = clients.find(c => c.id === bId);
          if (!ac || !bc) return 0;
          if (sortBy === "room") {
            const ap = ac.service_enrollments?.[0]?.service_type || "";
            const bp = bc.service_enrollments?.[0]?.service_type || "";
            return ap.localeCompare(bp) || `${ac.first_name} ${ac.last_name}`.localeCompare(`${bc.first_name} ${bc.last_name}`);
          }
          return `${ac.first_name} ${ac.last_name}`.localeCompare(`${bc.first_name} ${bc.last_name}`);
        });

        if (clientEntries.length === 0) {
          return <div className="py-16 text-center text-gray-400 text-sm">No active medications scheduled.</div>;
        }

        return (
          <div className="space-y-6">
            {clientEntries.map(([clientId, clientMeds]) => {
              const client = clients.find(c => c.id === clientId);
              if (!client) return null;
              const initials = `${client.first_name?.[0] || ""}${client.last_name?.[0] || ""}`.toUpperCase();
              const colorClass = getColor(client.id);
              const program = client.service_enrollments?.[0]?.service_type || null;

              // Group this client's meds by scheduled time
              const timeMap = {};
              for (const med of clientMeds) {
                const times = med.scheduled_times?.length ? med.scheduled_times : ["Unscheduled"];
                for (const t of times) {
                  if (!timeMap[t]) timeMap[t] = [];
                  timeMap[t].push(med);
                }
              }
              const timesOrdered = Object.entries(timeMap).sort(([a], [b]) => {
                const ai = COMMON_TIMES.indexOf(a), bi = COMMON_TIMES.indexOf(b);
                if (ai === -1 && bi === -1) return a.localeCompare(b);
                if (ai === -1) return 1; if (bi === -1) return -1;
                return ai - bi;
              });

              return (
                <div key={clientId} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Client header */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
                    {client.photo_url ? (
                      <img src={client.photo_url} alt={initials} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0", colorClass)}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{client.first_name} {client.last_name}</p>
                      {program && <p className="text-xs text-gray-500">{program}</p>}
                    </div>
                    <div className="ml-auto text-xs text-gray-400 font-medium">{clientMeds.length} med{clientMeds.length !== 1 ? "s" : ""}</div>
                  </div>

                  {/* Time sub-rows */}
                  <div className="divide-y divide-gray-100">
                    {timesOrdered.map(([time, timeMeds]) => {
                      const hasMissed = isMissedWindow(time) && timeMeds.some(m => !logs.some(l => l.medication_id === m.id && l.date === today));
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => onOpenDetail({ client, time, meds: timeMeds, date: today })}
                          className={cn(
                            "w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors text-left group",
                            hasMissed && "bg-red-50 hover:bg-red-50"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-semibold w-24 flex-shrink-0",
                            hasMissed ? "text-red-600" : "text-primary"
                          )}>{time}</span>
                          <div className="flex flex-wrap gap-1 flex-1">
                            {timeMeds.map(m => (
                              <span key={m.id} className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                m.is_controlled ? "bg-red-100 text-red-700 border border-red-200" : "bg-gray-100 text-gray-600"
                              )}>
                                {m.medication_name}{m.is_controlled && <span className="ml-1 font-bold">C2</span>}
                              </span>
                            ))}
                            {hasMissed && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded uppercase">Missed</span>
                            )}
                          </div>
                          <ChevronRight className={cn("w-4 h-4 flex-shrink-0", hasMissed ? "text-red-300 group-hover:text-red-500" : "text-gray-300 group-hover:text-primary")} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}