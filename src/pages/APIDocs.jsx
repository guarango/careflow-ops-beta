import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Code, ChevronDown, ChevronRight, Key, Zap } from "lucide-react";

const ENDPOINTS = [
  {
    domain: "Clients",
    color: "bg-blue-500/10 text-blue-400",
    routes: [
      { method: "GET", path: "/api/v1/clients", desc: "List all clients", params: ["limit", "offset", "status"] },
      { method: "GET", path: "/api/v1/clients/:id", desc: "Get a single client by ID", params: ["id"] },
      { method: "POST", path: "/api/v1/clients", desc: "Create a new client", params: ["first_name", "last_name", "date_of_birth"] },
      { method: "PUT", path: "/api/v1/clients/:id", desc: "Update client record", params: ["id", "...fields"] },
    ]
  },
  {
    domain: "Staff",
    color: "bg-green-500/10 text-green-400",
    routes: [
      { method: "GET", path: "/api/v1/staff", desc: "List all staff members", params: ["limit", "offset", "status", "role"] },
      { method: "GET", path: "/api/v1/staff/:id", desc: "Get staff member by ID", params: ["id"] },
      { method: "POST", path: "/api/v1/staff", desc: "Create staff record", params: ["first_name", "last_name", "role"] },
      { method: "PUT", path: "/api/v1/staff/:id", desc: "Update staff record", params: ["id", "...fields"] },
    ]
  },
  {
    domain: "Timecards",
    color: "bg-yellow-500/10 text-yellow-400",
    routes: [
      { method: "GET", path: "/api/v1/timecards", desc: "List timecards", params: ["staff_id", "date_from", "date_to", "status"] },
      { method: "POST", path: "/api/v1/timecards", desc: "Submit a timecard", params: ["staff_id", "date", "clock_in", "clock_out"] },
      { method: "PUT", path: "/api/v1/timecards/:id", desc: "Update timecard status", params: ["id", "status"] },
    ]
  },
  {
    domain: "EVV Records",
    color: "bg-purple-500/10 text-purple-400",
    routes: [
      { method: "GET", path: "/api/v1/evv", desc: "List EVV submissions", params: ["date_from", "date_to", "status"] },
      { method: "POST", path: "/api/v1/evv", desc: "Create EVV record", params: ["staff_id", "client_id", "date", "clock_in", "clock_out"] },
      { method: "GET", path: "/api/v1/evv/:id", desc: "Get EVV record detail", params: ["id"] },
    ]
  },
  {
    domain: "Billing/Claims",
    color: "bg-orange-500/10 text-orange-400",
    routes: [
      { method: "GET", path: "/api/v1/billing", desc: "List billing records", params: ["client_id", "date_from", "date_to", "status"] },
      { method: "POST", path: "/api/v1/billing", desc: "Create billing record", params: ["client_id", "service_type", "date", "hours", "rate"] },
      { method: "PUT", path: "/api/v1/billing/:id", desc: "Update claim status", params: ["id", "status", "claim_number"] },
    ]
  },
  {
    domain: "Incidents",
    color: "bg-red-500/10 text-red-400",
    routes: [
      { method: "GET", path: "/api/v1/incidents", desc: "List incident reports", params: ["client_id", "severity", "status"] },
      { method: "POST", path: "/api/v1/incidents", desc: "Create incident report", params: ["client_id", "date", "type", "severity", "description"] },
    ]
  },
  {
    domain: "Session Notes",
    color: "bg-teal-500/10 text-teal-400",
    routes: [
      { method: "GET", path: "/api/v1/session-notes", desc: "List session notes", params: ["client_id", "staff_id", "date_from", "date_to"] },
      { method: "POST", path: "/api/v1/session-notes", desc: "Create session note", params: ["client_id", "staff_id", "date", "service_type"] },
      { method: "PUT", path: "/api/v1/session-notes/:id", desc: "Update note status", params: ["id", "status"] },
    ]
  },
];

const METHOD_COLORS = {
  GET: "bg-blue-500/20 text-blue-400",
  POST: "bg-green-500/20 text-green-400",
  PUT: "bg-yellow-500/20 text-yellow-400",
  DELETE: "bg-red-500/20 text-red-400",
  PATCH: "bg-purple-500/20 text-purple-400",
};

const WEBHOOKS = [
  { event: "timecard.submitted", desc: "Fired when a staff member submits a timecard for approval" },
  { event: "incident.created", desc: "Fired when a new incident report is created" },
  { event: "evv.rejected", desc: "Fired when an EVV submission is rejected by the aggregator" },
  { event: "certification.expiring", desc: "Fired 30 days before a staff certification expires" },
  { event: "billing.denied", desc: "Fired when a billing claim is denied by the payer" },
  { event: "client.created", desc: "Fired when a new client is added to the system" },
];

export default function APIDocs() {
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Code className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
            <p className="text-sm text-muted-foreground">REST API v1 — CareOps Pro Platform</p>
          </div>
        </div>
      </div>

      {/* Auth section */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Authentication</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">All API requests require an API key scoped to your agency tenant. Include it in the request header:</p>
        <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto">
{`Authorization: Bearer your_agency_api_key
Content-Type: application/json`}
        </pre>
        <p className="text-xs text-muted-foreground mt-3">API keys are available in <strong>Agency Settings → API & Webhooks</strong>. Rate limit: 1,000 requests/hour per key.</p>
      </div>

      {/* Base URL */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <p className="text-xs text-muted-foreground mb-1">Base URL</p>
        <pre className="text-sm font-mono text-primary">https://api.careops.com</pre>
      </div>

      {/* Endpoints */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Endpoints</h2>
      <div className="space-y-3 mb-8">
        {ENDPOINTS.map((domain) => (
          <div key={domain.domain} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(domain.domain)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${domain.color}`}>{domain.domain}</span>
              <span className="text-sm text-muted-foreground">{domain.routes.length} endpoints</span>
              <span className="ml-auto">
                {expanded[domain.domain] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </span>
            </button>
            {expanded[domain.domain] && (
              <div className="border-t border-border divide-y divide-border">
                {domain.routes.map((route, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${METHOD_COLORS[route.method]}`}>{route.method}</span>
                      <code className="text-sm font-mono text-foreground">{route.path}</code>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{route.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {route.params.map(p => (
                        <span key={p} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Webhooks */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-chart-4" />
        <h2 className="text-lg font-semibold text-foreground">Webhooks</h2>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <p className="text-sm text-muted-foreground mb-4">Register webhook URLs in <strong>Agency Settings → API & Webhooks</strong>. We'll POST a JSON payload to your URL for each event.</p>
        <div className="space-y-2">
          {WEBHOOKS.map((w) => (
            <div key={w.event} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0">{w.event}</code>
              <p className="text-sm text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Example response */}
      <div className="bg-card border border-border rounded-xl p-5 mb-8">
        <h3 className="font-semibold text-foreground mb-3 text-sm">Example Response</h3>
        <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "id": "clnt_abc123",
      "first_name": "John",
      "last_name": "Doe",
      "status": "Active",
      "created_date": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}`}
        </pre>
      </div>
    </div>
  );
}