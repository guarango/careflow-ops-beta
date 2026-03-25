import React, { useState } from "react";
import { Search, ChevronRight, Phone, MapPin, FileText, Target, Pill } from "lucide-react";
import { cn } from "@/lib/utils";

const CLIENTS = [
  {
    id: "c1", name: "Michael Anderson", initials: "MA", color: "bg-blue-500",
    dob: "1985-06-14", diagnosis: "Autism Spectrum Disorder, Level 2",
    address: "123 Oak Street, Salt Lake City, UT 84101",
    guardian: "Sandra Anderson", guardianPhone: "(801) 555-0142",
    services: ["Personal Care — T2031", "Community Support — T2041"],
    goals: ["Community Navigation", "Meal Preparation", "Greeting Initiation"],
    meds: [{ name: "Risperidone 0.5mg", time: "8:00 AM", route: "Oral" }],
    emergencyProtocol: "If client becomes dysregulated, offer sensory tool and provide quiet space. Do not physically prompt. Notify supervisor if escalation exceeds 10 minutes.",
    schedule: "Mon · Wed · Fri",
  },
  {
    id: "c2", name: "Lisa Torres", initials: "LT", color: "bg-teal-500",
    dob: "1990-03-22", diagnosis: "Intellectual Disability, Mild",
    address: "88 Elm Avenue, Murray, UT 84107",
    guardian: "Maria Torres", guardianPhone: "(801) 555-0199",
    services: ["Day Program Support — T2021"],
    goals: ["Independent Toileting", "Social Communication"],
    meds: [],
    emergencyProtocol: "Client responds well to verbal reassurance. In case of fall, assess for injury before moving. Call 911 if injury suspected.",
    schedule: "Mon · Thu",
  },
  {
    id: "c3", name: "David Park", initials: "DP", color: "bg-purple-500",
    dob: "1978-11-08", diagnosis: "Down Syndrome",
    address: "42 Cedar Lane, West Valley City, UT 84120",
    guardian: "James Park", guardianPhone: "(801) 555-0175",
    services: ["Residential Habilitation — T2016"],
    goals: ["Household Tasks", "Money Management"],
    meds: [{ name: "Levothyroxine 50mcg", time: "7:00 AM", route: "Oral" }],
    emergencyProtocol: "Client has cardiac history. If complaining of chest pain, call 911 immediately and notify supervisor. Do not attempt to transport to hospital independently.",
    schedule: "Tue · Fri",
  },
];

const TABS = ["Profile", "Goals", "Meds", "Emergency"];

function ClientDetail({ client, onBack }) {
  const [tab, setTab] = useState("Profile");
  const age = Math.floor((new Date() - new Date(client.dob)) / (365.25 * 24 * 3600 * 1000));

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className={cn("px-4 pt-10 pb-6", client.color)}>
        <button onClick={onBack} className="text-white/80 text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {client.initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{client.name}</h1>
            <p className="text-white/80 text-sm">{age} yrs · {client.diagnosis}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("flex-1 py-3 text-xs font-semibold transition-colors",
              tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {tab === "Profile" && (
          <div className="space-y-4">
            <InfoRow icon={MapPin} label="Address" value={client.address} />
            <InfoRow icon={Phone} label="Guardian" value={`${client.guardian} — ${client.guardianPhone}`} />
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Active Services</p>
              {client.services.map((s, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 mb-2">
                  <p className="text-sm font-medium">{s}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wide">Schedule</p>
              <div className="bg-card border border-border rounded-xl px-4 py-3">
                <p className="text-sm">{client.schedule}</p>
              </div>
            </div>
          </div>
        )}
        {tab === "Goals" && (
          <div className="space-y-3">
            {client.goals.map((g, i) => (
              <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <Target className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <p className="text-sm font-medium">{g}</p>
              </div>
            ))}
          </div>
        )}
        {tab === "Meds" && (
          <div>
            {client.meds.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No active medications</p>
            ) : (
              client.meds.map((m, i) => (
                <div key={i} className="bg-card border border-border rounded-xl px-4 py-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4 text-blue-500" />
                    <p className="font-semibold text-sm">{m.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.time} · {m.route}</p>
                </div>
              ))
            )}
          </div>
        )}
        {tab === "Emergency" && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-700 font-bold text-sm mb-2">⚠️ Emergency Protocol</p>
              <p className="text-red-700 text-sm leading-relaxed">{client.emergencyProtocol}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function MobileClients({ isSupervisor }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  if (selected) return <ClientDetail client={selected} onBack={() => setSelected(null)} />;

  const filtered = CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <h1 className="text-xl font-bold text-foreground mb-4">{isSupervisor ? "My Team's Clients" : "My Clients"}</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filtered.map((client) => (
          <button
            key={client.id}
            onClick={() => setSelected(client)}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-4 active:bg-muted transition-colors text-left"
          >
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0", client.color)}>
              {client.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{client.name}</p>
              <p className="text-xs text-muted-foreground truncate">{client.diagnosis}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{client.schedule}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}