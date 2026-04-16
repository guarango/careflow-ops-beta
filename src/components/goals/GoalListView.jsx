import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, isValid } from "date-fns";

const DOMAIN_COLORS = {
  "Communication": "bg-blue-100 text-blue-700 border-blue-200",
  "Activities of Daily Living": "bg-green-100 text-green-700 border-green-200",
  "Community Integration": "bg-teal-100 text-teal-700 border-teal-200",
  "Social Skills": "bg-purple-100 text-purple-700 border-purple-200",
  "Vocational/Employment": "bg-orange-100 text-orange-700 border-orange-200",
  "Health & Wellness": "bg-pink-100 text-pink-700 border-pink-200",
  "Behavioral Support": "bg-red-100 text-red-700 border-red-200",
  "Self-Advocacy": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Mobility & Motor Skills": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Leisure & Recreation": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Other": "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_COLORS = {
  "Active": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mastered": "bg-sky-100 text-sky-700 border-sky-200",
  "Discontinued": "bg-gray-100 text-gray-600 border-gray-200",
  "On Hold": "bg-amber-100 text-amber-700 border-amber-200",
};

const PRIORITY_DOT = { High: "bg-red-500", Medium: "bg-amber-400", Low: "bg-slate-300" };

function hasAlerts(goal) {
  const entries = goal.progress_entries || [];
  if (goal.status !== "Active") return false;
  if (entries.length === 0) return true;
  const last = entries[entries.length - 1]?.date;
  if (last) {
    const d = parseISO(last);
    if (isValid(d) && differenceInDays(new Date(), d) >= 14) return true;
  }
  if (goal.target_date) {
    const d = parseISO(goal.target_date);
    if (isValid(d) && differenceInDays(d, new Date()) <= 30) return true;
  }
  return false;
}

export default function GoalListView({ goals, clients, onSelectClient, onSelectGoal, onEdit }) {
  const getClient = (clientId) => clients.find(c => c.id === clientId);

  if (goals.length === 0) return null;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[200px]">Client</TableHead>
            <TableHead>Goal</TableHead>
            <TableHead className="w-[140px]">Domain</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[120px]">Last Entry</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {goals.map(goal => {
            const client = getClient(goal.client_id);
            const alertCount = hasAlerts(goal) ? 1 : 0;
            const entries = goal.progress_entries || [];
            const lastEntry = entries[entries.length - 1];

            return (
              <TableRow 
                key={goal.id} 
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => {
                  if (client) onSelectClient(client);
                  onSelectGoal(goal);
                }}
              >
                <TableCell className="font-medium">
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (client) onSelectClient(client); }}
                    className="text-left hover:text-primary transition-colors"
                  >
                    {goal.client_name || (client ? `${client.first_name} ${client.last_name}` : "Unknown")}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{goal.goal_title}</span>
                    {alertCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] py-0 h-5 border ${DOMAIN_COLORS[goal.domain] || DOMAIN_COLORS.Other}`}>
                    {goal.domain}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] py-0 h-5 border ${STATUS_COLORS[goal.status] || ""}`}>
                    {goal.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", PRIORITY_DOT[goal.priority] || "bg-slate-300")} />
                    <span className="text-sm text-muted-foreground">{goal.priority}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {lastEntry ? (
                    <span className="text-xs text-muted-foreground">{lastEntry.date}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-7 px-2" 
                      onClick={e => { e.stopPropagation(); onEdit(goal); }}
                    >
                      Edit
                    </Button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}