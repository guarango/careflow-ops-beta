import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, Plus, CheckCircle2, XCircle, MinusCircle, Minus } from "lucide-react";
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

// Status indicator cell
function DayCell({ status, initials }) {
  if (!status) return <span className="text-gray-300 text-xs">—</span>;
  if (status === "completed") return (
    <span title="Completed" className="flex items-center justify-center">
      {initials
        ? <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-0.5">{initials}</span>
        : <CheckCircle2 className="w-4 h-4 text-green-500" />}
    </span>
  );
  if (status === "missed") return <XCircle className="w-4 h-4 text-red-500 mx-auto" />;
  if (status === "incomplete") return <MinusCircle className="w-4 h-4 text-yellow-400 mx-auto" />;
  return <Minus className="w-3 h-3 text-gray-300 mx-auto" />;
}

export default function MARGoalsSummary({ client, goals = [], goalLogs = [] }) {
  const [displayDate, setDisplayDate] = useState(new Date());
  const year = displayDate.getFullYear();
  const month = displayDate.getMonth();
  const daysInMonth = getDaysInMonth(displayDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthLabel = format(displayDate, "MMMM yyyy");

  // Build a map: goalId -> { day -> { status, initials } }
  function getGoalDayMap(goalId) {
    const map = {};
    for (const log of goalLogs) {
      if (log.goal_id !== goalId) continue;
      try {
        const d = new Date(log.date + "T12:00:00");
        if (d.getFullYear() === year && d.getMonth() === month) {
          map[d.getDate()] = {
            status: log.status === "Completed" ? "completed"
              : log.status === "Missed" ? "missed"
              : log.status === "Incomplete" ? "incomplete"
              : "dash",
            initials: log.staff_initials || null,
          };
        }
      } catch {}
    }
    return map;
  }

  function calcProficiency(goalId) {
    const map = getGoalDayMap(goalId);
    const entries = Object.values(map);
    if (!entries.length) return null;
    const completed = entries.filter(e => e.status === "completed").length;
    return Math.round((completed / entries.length) * 100);
  }

  return (
    <div className="bg-gray-50 min-h-full -m-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {client.first_name} {client.last_name}
          </h2>
          {client.date_of_birth && (
            <p className="text-sm text-gray-500">DOB: {client.date_of_birth}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month navigator */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 px-2 border-gray-200" onClick={() => setDisplayDate(d => subMonths(d, 1))}>‹</Button>
            <Select
              value={`${year}-${String(month + 1).padStart(2, "0")}`}
              onValueChange={v => {
                const [y, m] = v.split("-").map(Number);
                setDisplayDate(new Date(y, m - 1, 1));
              }}
            >
              <SelectTrigger className="h-7 text-xs border-gray-200 w-36">
                <SelectValue>{monthLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const d = subMonths(new Date(), 12 - i);
                  return (
                    <SelectItem key={i} value={format(d, "yyyy-MM")}>
                      {format(d, "MMMM yyyy")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-7 px-2 border-gray-200" onClick={() => setDisplayDate(d => addMonths(d, 1))}>›</Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200 h-7" onClick={() => {}}>
            <Plus className="w-3 h-3" /> Create Historical PRN
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200 h-7" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs border-gray-200 h-7">
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Grid */}
      {goals.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No goals on file for this client.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: `${160 + daysInMonth * 36 + 72}px` }}>
              <thead>
                {/* Month header */}
                <tr>
                  <th className="bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-gray-500 font-semibold text-xs" style={{ minWidth: 160 }}>
                    Goal / Step
                  </th>
                  <th
                    colSpan={daysInMonth}
                    className="bg-blue-600 text-white text-center py-2 text-sm font-bold border-b border-blue-700"
                  >
                    {monthLabel}
                  </th>
                  <th className="bg-gray-50 border-b border-l border-gray-200 px-2 py-2 text-center text-gray-500 font-semibold" style={{ width: 72 }}>
                    Proficiency
                  </th>
                </tr>
                {/* Day number headers */}
                <tr className="bg-gray-50">
                  <th className="border-b border-r border-gray-200 px-3 py-1.5" />
                  {days.map(d => (
                    <th key={d} className="border-b border-gray-200 text-center py-1.5 font-semibold text-gray-600" style={{ minWidth: 32 }}>
                      {d}
                    </th>
                  ))}
                  <th className="border-b border-l border-gray-200" />
                </tr>
              </thead>
              <tbody>
                {goals.map((goal, gi) => {
                  const dayMap = getGoalDayMap(goal.id);
                  const proficiency = calcProficiency(goal.id);
                  const steps = goal.steps || [];

                  return (
                    <React.Fragment key={goal.id}>
                      {/* Goal row */}
                      <tr className={cn("border-b border-gray-100", gi % 2 === 0 ? "bg-white" : "bg-gray-50/60")}>
                        <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-800" style={{ minWidth: 160 }}>
                          <p className="font-bold text-gray-800 leading-tight">{goal.goal_name || goal.title || "Unnamed Goal"}</p>
                          {goal.category && <p className="text-[10px] text-gray-400 mt-0.5">{goal.category}</p>}
                          {goal.start_date && <p className="text-[10px] text-gray-400">Start: {goal.start_date}</p>}
                        </td>
                        {days.map(d => (
                          <td key={d} className="border-r border-gray-100 text-center py-2 px-0.5">
                            <DayCell status={dayMap[d]?.status} initials={dayMap[d]?.initials} />
                          </td>
                        ))}
                        <td className="border-l border-gray-200 text-center px-2 py-2">
                          {proficiency !== null ? (
                            <span className={cn(
                              "text-xs font-bold",
                              proficiency >= 80 ? "text-green-600" : proficiency >= 50 ? "text-amber-500" : "text-red-500"
                            )}>
                              {proficiency}%
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Sub-step rows */}
                      {steps.map((step, si) => (
                        <tr key={`${goal.id}-step-${si}`} className={cn("border-b border-gray-100", gi % 2 === 0 ? "bg-white" : "bg-gray-50/60")}>
                          <td className="border-r border-gray-200 px-3 py-1.5 pl-7" style={{ minWidth: 160 }}>
                            <span className="text-gray-500 text-[10px]">↳ {step.description || step.name || `Step ${si + 1}`}</span>
                          </td>
                          {days.map(d => (
                            <td key={d} className="border-r border-gray-100 text-center py-1.5 px-0.5">
                              <Minus className="w-2.5 h-2.5 text-gray-200 mx-auto" />
                            </td>
                          ))}
                          <td className="border-l border-gray-200 text-center px-2" />
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <span className="font-semibold text-gray-600 mr-1">Legend:</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Completed</span>
        <span className="flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-500" /> Missed</span>
        <span className="flex items-center gap-1.5"><MinusCircle className="w-4 h-4 text-yellow-400" /> Incomplete</span>
        <span className="flex items-center gap-1.5"><Minus className="w-3 h-3 text-gray-300" /> Not Scheduled / Discontinued</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded px-1">CW</span> Staff Initials (Completed)
        </span>
      </div>
    </div>
  );
}