import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Plus, Trash2, Upload, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { JOB_TITLES, APP_ACCESS_OPTIONS } from "@/lib/jobTitles";

const EMPTY_ROW = { first_name: "", last_name: "", email: "", phone: "", job_title: "", app_access: "" };

const ACCESS_ALIASES = { dsp: "dsp", manager: "manager", admin: "admin" };

function matchJobTitle(value) {
  const v = String(value || "").trim().toLowerCase();
  return JOB_TITLES.find((t) => t.toLowerCase() === v) || "";
}

function matchAccess(value) {
  return ACCESS_ALIASES[String(value || "").trim().toLowerCase()] || "";
}

/**
 * Step 7 — Invite Staff. Every row goes through the same invite function the
 * Users tab uses, so each person gets a Pending StaffMember AND an invite email.
 * A row without a job title or app access is rejected instead of guessed.
 */
export default function WizardStep7Staff({ data, onNext, onBack }) {
  const { toast } = useToast();
  const [invites, setInvites] = useState([{ ...EMPTY_ROW }]);
  const [sending, setSending] = useState(false);
  const [rejected, setRejected] = useState([]);

  const addRow = () => setInvites((p) => [...p, { ...EMPTY_ROW }]);
  const removeRow = (i) => setInvites((p) => p.filter((_, idx) => idx !== i));
  const updateRow = (i, key, val) =>
    setInvites((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const handleCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file }); // stored privately
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: signed_url,
      json_schema: {
        type: "object",
        properties: {
          staff: {
            type: "array",
            items: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                job_title: { type: "string" },
                app_access: { type: "string" },
              },
            },
          },
        },
      },
    });
    if (result.status === "success" && result.output?.staff?.length) {
      const rows = result.output.staff.map((row) => ({
        first_name: row.first_name || "",
        last_name: row.last_name || "",
        email: String(row.email || "").trim(),
        phone: String(row.phone || "").trim(),
        job_title: matchJobTitle(row.job_title),
        app_access: matchAccess(row.app_access),
      }));
      setInvites(rows);
      toast({ title: `${rows.length} staff loaded from CSV` });
    } else {
      toast({ title: "Could not read that file", description: result.details || "Check the columns and try again.", variant: "destructive" });
    }
  };

  const sendInvites = async () => {
    const rows = invites.filter((r) => r.email || r.first_name || r.last_name);
    const bad = [];
    const valid = [];
    rows.forEach((row) => {
      const missing = [];
      if (!String(row.email || "").includes("@")) missing.push("email");
      if (!row.job_title) missing.push("job title");
      if (!row.app_access) missing.push("app access");
      if (missing.length) bad.push(`${row.email || `${row.first_name} ${row.last_name}`.trim() || "Row"}: missing ${missing.join(", ")}`);
      else valid.push(row);
    });

    setRejected(bad);
    if (bad.length) {
      toast({ title: `${bad.length} row(s) rejected`, description: "Add the missing job title, app access or email and send again.", variant: "destructive" });
      if (!valid.length) return;
    }
    if (!valid.length) return;

    const failures = [];
    setSending(true);
    for (const row of valid) {
      try {
        const res = await base44.functions.invoke("manageUsers", {
          action: "invite",
          first_name: row.first_name || row.email.split("@")[0],
          last_name: row.last_name || "-",
          email: row.email,
          phone: row.phone || "—",
          job_title: row.job_title,
          app_access: row.app_access,
          hr_bundle: false,
          billing_bundle: false,
          client_ids: [],
          house_ids: [],
          signature_template_ids: [],
        });
        if (res.data?.error) failures.push(`${row.email}: ${res.data.error}`);
      } catch (err) {
        failures.push(`${row.email}: ${err.message}`);
      }
    }
    setSending(false);

    if (failures.length) {
      setRejected(failures);
      toast({ title: `${failures.length} invite(s) failed`, description: failures[0], variant: "destructive" });
    }
    const sent = valid.length - failures.length;
    if (sent > 0) toast({ title: `${sent} invitation(s) sent` });
    if (!failures.length) onNext({ staff_invited: sent });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Invite Staff</h2>
      <p className="text-muted-foreground mb-6">
        Add your team. Each person is saved as Pending and emailed a sign-in invitation. The CSV needs job title and app access columns.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm cursor-pointer hover:bg-muted/50 transition-colors">
          <Upload className="w-4 h-4" /> Import from CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        </label>
        <span className="text-xs text-muted-foreground">or enter manually below</span>
      </div>

      {rejected.length > 0 && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
          <p className="text-sm font-medium flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="w-4 h-4" />Rows that were not invited
          </p>
          <ul className="mt-1 space-y-0.5">
            {rejected.map((msg, i) => (
              <li key={i} className="text-xs text-muted-foreground">{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
          <div className="col-span-2">First name</div>
          <div className="col-span-2">Last name</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-1">Job title</div>
          <div className="col-span-1">Access</div>
          <div className="col-span-1" />
        </div>
        {invites.map((inv, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-12 gap-2 items-center">
            <div className="md:col-span-2"><Input placeholder="Jane" value={inv.first_name} onChange={(e) => updateRow(i, "first_name", e.target.value)} /></div>
            <div className="md:col-span-2"><Input placeholder="Doe" value={inv.last_name} onChange={(e) => updateRow(i, "last_name", e.target.value)} /></div>
            <div className="col-span-2 md:col-span-3"><Input type="email" placeholder="jane@agency.com" value={inv.email} onChange={(e) => updateRow(i, "email", e.target.value)} /></div>
            <div className="col-span-2 md:col-span-2"><Input placeholder="(555) 555-5555" value={inv.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} /></div>
            <div className="md:col-span-1">
              <Select value={inv.job_title} onValueChange={(v) => updateRow(i, "job_title", v)}>
                <SelectTrigger className="text-xs px-2"><SelectValue placeholder="Title" /></SelectTrigger>
                <SelectContent>{JOB_TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Select value={inv.app_access} onValueChange={(v) => updateRow(i, "app_access", v)}>
                <SelectTrigger className="text-xs px-2"><SelectValue placeholder="Access" /></SelectTrigger>
                <SelectContent>
                  {APP_ACCESS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label.split(" — ")[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex justify-center">
              {invites.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addRow} className="gap-2 mt-2"><Plus className="w-4 h-4" /> Add Row</Button>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onNext({ staff_invited: 0 })}>Skip for now</Button>
          <Button onClick={sendInvites} disabled={sending || !invites.some((i) => i.email)} className="gap-2">
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Invites & Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}