import React, { useState, useRef } from "react";
import { ChevronLeft, Plus, Minus, CheckCircle2, XCircle, Timer, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/hooks/useOffline";

const GOALS = [
  { id: "g1", name: "Community Navigation — Bus Route #12", method: "trials", trend: "+8% last 4 sessions" },
  { id: "g2", name: "Meal Preparation — Breakfast", method: "steps", steps: ["Get bowl", "Pour cereal", "Add milk", "Return items"], trend: "Stable" },
  { id: "g3", name: "Greeting Initiation", method: "frequency", trend: "3.2 avg / session" },
  { id: "g4", name: "Independent Toileting", method: "yesno", trend: "Improving" },
];

function FrequencyCounter({ value, onChange }) {
  return (
    <div className="flex items-center justify-center gap-6 py-4">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center active:scale-90 transition-transform">
        <Minus className="w-6 h-6 text-red-600" />
      </button>
      <span className="text-5xl font-bold text-foreground w-16 text-center">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center active:scale-90 transition-transform">
        <Plus className="w-6 h-6 text-green-600" />
      </button>
    </div>
  );
}

function TrialRecorder({ trials, onToggle, onAdd }) {
  const pct = trials.length > 0 ? Math.round((trials.filter(Boolean).length / trials.length) * 100) : 0;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {trials.map((correct, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all active:scale-90",
              correct ? "bg-green-500 border-green-600 text-white" : "bg-red-100 border-red-300 text-red-600")}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={onAdd} className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center active:scale-90 transition-transform">
          <Plus className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <p className="text-2xl font-bold text-foreground">{pct}% correct <span className="text-sm font-normal text-muted-foreground">({trials.filter(Boolean).length}/{trials.length} trials)</span></p>
    </div>
  );
}

function StepChecker({ steps, completed, onToggle }) {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <button
          key={i}
          onClick={() => onToggle(i)}
          className={cn("w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-95",
            completed[i] ? "border-green-500 bg-green-50" : "border-border bg-card")}
        >
          {completed[i]
            ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground flex-shrink-0" />}
          <span className={cn("text-sm font-medium", completed[i] ? "text-green-700" : "text-foreground")}>{step}</span>
        </button>
      ))}
    </div>
  );
}

function YesNo({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      {[true, false].map((v) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={cn("py-8 rounded-2xl border-2 flex flex-col items-center gap-2 font-bold text-lg transition-all active:scale-95",
            value === v
              ? v ? "bg-green-500 border-green-600 text-white" : "bg-red-500 border-red-600 text-white"
              : "border-border bg-card text-foreground")}
        >
          {v ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
          {v ? "Yes" : "No"}
        </button>
      ))}
    </div>
  );
}

export default function MobileGoalData({ client, onClose }) {
  const [goalIdx, setGoalIdx] = useState(0);
  const [data, setData] = useState({});
  const [saved, setSaved] = useState({});
  const { enqueueAction, isOnline } = useOffline();

  const goal = GOALS[goalIdx];

  function updateData(val) {
    setData((prev) => ({ ...prev, [goal.id]: val }));
  }

  function saveGoal() {
    enqueueAction({
      type: "create",
      entity: "ClientGoal",
      data: {
        goal_id: goal.id,
        goal_name: goal.name,
        data_value: data[goal.id],
        collected_at: new Date().toISOString(),
        client_name: client?.client || "Client",
      },
    });
    setSaved((prev) => ({ ...prev, [goal.id]: true }));
    if (goalIdx < GOALS.length - 1) setGoalIdx((i) => i + 1);
    else onClose();
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Goal Data Collection</p>
          <p className="text-sm font-semibold">{client?.client || "Client"}</p>
        </div>
        <span className="text-xs text-muted-foreground">{goalIdx + 1} / {GOALS.length}</span>
      </div>

      {/* Goal tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        {GOALS.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setGoalIdx(i)}
            className={cn("flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              i === goalIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
          >
            {saved[g.id] && <CheckCircle2 className="w-3 h-3" />}
            Goal {i + 1}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto">
        <h2 className="text-base font-bold text-foreground mb-1">{goal.name}</h2>
        <p className="text-xs text-muted-foreground mb-1">Recent trend: {goal.trend}</p>
        <div className="h-px bg-border my-4" />

        {goal.method === "frequency" && (
          <FrequencyCounter
            value={data[goal.id] ?? 0}
            onChange={updateData}
          />
        )}
        {goal.method === "trials" && (
          <TrialRecorder
            trials={data[goal.id] ?? []}
            onToggle={(i) => {
              const arr = [...(data[goal.id] ?? [])];
              arr[i] = !arr[i];
              updateData(arr);
            }}
            onAdd={() => updateData([...(data[goal.id] ?? []), false])}
          />
        )}
        {goal.method === "steps" && (
          <StepChecker
            steps={goal.steps}
            completed={data[goal.id] ?? []}
            onToggle={(i) => {
              const arr = [...(data[goal.id] ?? new Array(goal.steps.length).fill(false))];
              arr[i] = !arr[i];
              updateData(arr);
            }}
          />
        )}
        {goal.method === "yesno" && (
          <YesNo value={data[goal.id]} onChange={updateData} />
        )}

        {/* Photo button */}
        <button className="mt-6 w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-sm text-muted-foreground active:scale-95 transition-transform">
          <Camera className="w-4 h-4" />
          Attach Photo Documentation
        </button>
      </div>

      <div className="px-4 pb-6 pt-3 border-t border-border bg-card">
        <button
          onClick={saveGoal}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-semibold text-sm active:scale-95 transition-transform"
        >
          {goalIdx < GOALS.length - 1 ? "Save & Next Goal" : "Save & Finish"}
        </button>
        {!isOnline && <p className="text-[10px] text-amber-600 text-center mt-2">Offline — will sync when connected</p>}
      </div>
    </div>
  );
}