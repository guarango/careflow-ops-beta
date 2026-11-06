import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Paperclip, Loader2, Award } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PrivateFileLink from "@/components/shared/PrivateFileLink";

const COMMON = ["CPR/First Aid", "Medication Administration", "CPI / Crisis Prevention", "Mandatory Reporter", "Driver's License"];

function statusClass(status) {
  if (status === "Verified") return "border-accent/30 bg-accent/10 text-accent";
  if (status === "Rejected") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-chart-4/30 bg-chart-4/10 text-chart-4";
}

/** Upload certification evidence — it always lands as Pending verification. */
export default function ProfileCertificationsCard({ staff, onAdd }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", issue_date: "", expiry_date: "" });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const certs = staff?.certifications || [];

  const submit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name the certification", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      let doc_url = "";
      if (file) {
        const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
        doc_url = uploaded.file_uri;
      }
      await onAdd({
        name: form.name.trim(),
        issue_date: form.issue_date,
        expiry_date: form.expiry_date,
        doc_url,
        doc_name: file?.name || "",
      });
      toast({ title: "Sent for verification", description: "Your HR team or Manager will review it." });
      setForm({ name: "", issue_date: "", expiry_date: "" });
      setFile(null);
      setOpen(false);
    } catch (error) {
      toast({ title: "Could not upload", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Certifications</CardTitle>
          <CardDescription>Upload evidence (CPR, First Aid, and others). It goes to Pending verification.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {certs.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Award className="w-4 h-4" />No certifications on file yet.
          </div>
        ) : (
          certs.map((cert, i) => (
            <div key={`${cert.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{cert.name}</p>
                <p className="text-xs text-muted-foreground">
                  {cert.expiry_date ? `Expires ${cert.expiry_date}` : cert.issue_date ? `Issued ${cert.issue_date}` : "No dates"}
                  {cert.doc_url ? " · " : ""}
                  <PrivateFileLink fileUri={cert.doc_url} label="Evidence" />
                </p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${statusClass(cert.verification_status || "Verified")}`}>
                {cert.verification_status || "Verified"}
              </Badge>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a certification</DialogTitle>
            <DialogDescription>Attach a photo or PDF of the certificate. HR verifies it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Certification</Label>
              <Input
                list="common-certs"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. CPR/First Aid"
              />
              <datalist id="common-certs">
                {COMMON.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Issued</Label>
                <Input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Evidence</Label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-3 py-2 hover:border-primary">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground truncate">{file?.name || "Choose a file"}</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit for verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}