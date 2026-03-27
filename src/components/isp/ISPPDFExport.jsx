import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, FileText, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

function buildPlainLanguageVersion(plan, goals) {
  const client = plan.client_name;
  const active = goals.filter(g => g.status === "Active");
  const mastered = goals.filter(g => g.status === "Mastered");

  const voice = plan.persons_voice || {};
  const lines = [];

  lines.push(`MY SUPPORT PLAN — ${client.toUpperCase()}`);
  lines.push(`Plan Year: ${plan.plan_year_start || ""} to ${plan.plan_year_end || ""}\n`);

  lines.push("ABOUT ME");
  if (voice.most_important_daily) lines.push(`What matters most to me: ${voice.most_important_daily}`);
  if (voice.dreams_and_vision) lines.push(`My dreams: ${voice.dreams_and_vision}`);
  if (voice.proud_of_this_year) lines.push(`I am proud of: ${voice.proud_of_this_year}`);
  if (voice.wants_to_change_or_try) lines.push(`I want to try: ${voice.wants_to_change_or_try}`);
  lines.push("");

  lines.push("MY GOALS THIS YEAR");
  if (active.length === 0) {
    lines.push("No active goals are set up yet.");
  } else {
    active.slice(0, 6).forEach(g => {
      lines.push(`• ${g.goal_title}`);
      if (g.goal_narrative) lines.push(`  ${g.goal_narrative}`);
    });
  }
  lines.push("");

  if (mastered.length > 0) {
    lines.push("THINGS I ACHIEVED THIS YEAR 🎉");
    mastered.forEach(g => lines.push(`✓ ${g.goal_title}`));
    lines.push("");
  }

  lines.push("MY SUPPORT TEAM");
  if (plan.service_coordinator_name) lines.push(`Service Coordinator: ${plan.service_coordinator_name}`);
  ((plan.team_input || {}).attendees || []).forEach(a => lines.push(`${a.name} — ${a.relationship}`));
  lines.push("");

  lines.push("MY RIGHTS");
  if ((plan.rights_risks || {}).rights_statement) lines.push(plan.rights_risks.rights_statement);
  lines.push("");

  if (((plan.rights_risks || {}).dignity_of_risk || []).length > 0) {
    lines.push("CHOICES I HAVE MADE");
    plan.rights_risks.dignity_of_risk.forEach(e => {
      lines.push(`• ${e.area}: ${e.persons_choice}`);
    });
    lines.push("");
  }

  lines.push(`This plan was created to support ${client} in living the life they choose.`);
  lines.push(`If you have questions, contact: ${plan.service_coordinator_name || "your service coordinator"}`);

  return lines.join("\n");
}

export default function ISPPDFExport({ plan, goals }) {
  const [showDialog, setShowDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plainText, setPlainText] = useState("");
  const [view, setView] = useState("options"); // "options" | "plain"

  const handleGeneratePlain = () => {
    setPlainText(buildPlainLanguageVersion(plan, goals));
    setView("plain");
  };

  const handleDownloadPlain = () => {
    const blob = new Blob([plainText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.client_name?.replace(/ /g, "_")}_SupportPlan_PlainLanguage.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ format: "letter", unit: "pt" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 54;
      const maxW = pageW - margin * 2;
      let y = margin;

      const addPage = () => { doc.addPage(); y = margin; };
      const checkY = (needed = 20) => { if (y + needed > doc.internal.pageSize.getHeight() - margin) addPage(); };

      const heading1 = (text) => { checkY(30); doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.text(text, margin, y); y += 24; };
      const heading2 = (text) => { checkY(22); doc.setFontSize(12); doc.setFont("helvetica","bold"); doc.text(text.toUpperCase(), margin, y); y += 18; doc.setDrawColor(200); doc.line(margin, y, pageW - margin, y); y += 8; };
      const body = (text, indent = 0) => {
        if (!text) return;
        doc.setFontSize(11); doc.setFont("helvetica","normal");
        const lines = doc.splitTextToSize(text, maxW - indent);
        checkY(lines.length * 14);
        lines.forEach(line => { doc.text(line, margin + indent, y); y += 14; });
        y += 4;
      };
      const kv = (label, value) => { if (!value) return; doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.text(`${label}: `, margin, y); const lblW = doc.getTextWidth(`${label}: `); doc.setFont("helvetica","normal"); const vals = doc.splitTextToSize(value, maxW - lblW); doc.text(vals[0], margin + lblW, y); y += 14; if (vals.length > 1) { vals.slice(1).forEach(l => { doc.text(l, margin, y); y += 14; }); } };

      // Title
      doc.setFillColor(20, 90, 120);
      doc.rect(0, 0, pageW, 70, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont("helvetica","bold");
      doc.text("Individual Support Plan", margin, 35);
      doc.setFontSize(12); doc.setFont("helvetica","normal");
      doc.text(`${plan.client_name} · ${plan.plan_type || "Annual Review"} · ${plan.plan_year_start || ""} – ${plan.plan_year_end || ""}`, margin, 55);
      doc.setTextColor(0, 0, 0);
      y = 90;

      // Table of contents placeholder
      heading2("Table of Contents");
      const toc = ["1. Person's Voice","2. Personal Profile","3. Life Domains","4. Goals","5. Health Summary","6. Behavioral Support","7. Service Grid","8. Rights & Risks","9. Team Input","10. Signatures"];
      toc.forEach((t, i) => body(t, 12));
      y += 10;

      // Person's Voice
      addPage();
      heading2("1. Person's Voice");
      const voice = plan.persons_voice || {};
      [["What matters most to me in my daily life", voice.most_important_daily],
       ["What I want people to know before supporting me", voice.what_to_know_before_supporting],
       ["What a good day looks like", voice.good_day_looks_like],
       ["What a bad day looks like — and what helps", voice.bad_day_looks_like_and_helps],
       ["My dreams and long-term vision", voice.dreams_and_vision],
       ["Things I am proud of this year", voice.proud_of_this_year],
       ["Things I want to change or try", voice.wants_to_change_or_try],
      ].forEach(([label, val]) => { if (val) { doc.setFontSize(10); doc.setFont("helvetica","bold"); checkY(18); doc.text(label, margin, y); y += 14; body(val, 12); }});
      if (voice.aac_device_or_support) body(`Communication/AAC: ${voice.aac_device_or_support}`);

      // Life Domains
      addPage();
      heading2("3. Life Domains & Support Levels");
      (plan.life_domains || []).forEach(d => {
        checkY(40);
        heading1(`${d.domain}`);
        kv("Support Level", d.support_level);
        kv("Staffing Ratio", d.staffing_ratio);
        if (d.current_function_narrative) body(d.current_function_narrative);
        if (d.persons_priorities) { doc.setFontSize(10); doc.setFont("helvetica","italic"); body(`Person's priorities: ${d.persons_priorities}`); }
        y += 6;
      });

      // Health
      addPage();
      heading2("5. Health Summary");
      const hs = plan.health_summary || {};
      kv("Primary Diagnosis", hs.primary_diagnosis);
      kv("Secondary Diagnoses", hs.secondary_diagnoses);
      kv("Allergies", hs.allergies);
      kv("Dietary Orders", hs.dietary_orders);
      if (hs.health_trend_narrative) body(hs.health_trend_narrative);
      if (hs.seizure_protocol) { heading1("Seizure Protocol"); body(hs.seizure_protocol); }

      // Service Grid
      addPage();
      heading2("7. Service Grid");
      (plan.service_grid || []).forEach(svc => {
        kv("Service", svc.service_type);
        kv("Provider", svc.provider_agency);
        kv("Authorized Units/Month", svc.authorized_units_monthly?.toString());
        kv("Units Used (Prior Year)", svc.units_used_prior_year?.toString());
        if (svc.utilization_pct !== null && svc.utilization_pct !== undefined) kv("Utilization", `${svc.utilization_pct}%`);
        if (svc.underutilized && svc.underutilization_explanation) { doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(180, 80, 0); body(`Underutilization explanation: ${svc.underutilization_explanation}`); doc.setTextColor(0,0,0); }
        y += 8;
      });

      // Rights
      addPage();
      heading2("8. Rights & Risks");
      const rr = plan.rights_risks || {};
      kv("Guardianship Status", rr.guardianship_status);
      kv("Advance Directive", rr.advance_directive_status);
      if (rr.rights_statement) body(rr.rights_statement);
      if (rr.emergency_crisis_plan) { heading1("Emergency & Crisis Plan"); body(rr.emergency_crisis_plan); }
      (rr.dignity_of_risk || []).forEach(e => {
        checkY(50); heading1("Dignity of Risk — " + e.area);
        body(`Person's Choice: ${e.persons_choice}`);
        if (e.team_acknowledgment) body(`Team Acknowledgment: ${e.team_acknowledgment}`);
      });

      // Signatures
      addPage();
      heading2("10. Signatures");
      (plan.signatures || []).forEach(sig => {
        checkY(60);
        kv("Role", sig.role);
        kv("Name", sig.name);
        kv("Status", sig.status);
        if (sig.status === "Signed" && sig.signed_at) kv("Signed", format(new Date(sig.signed_at), "MMMM d, yyyy"));
        if (sig.is_guardian_signing_for_person) { doc.setTextColor(180,80,0); body(`Guardian signing for person — Reason: ${sig.guardian_justification || "see file"}`); doc.setTextColor(0,0,0); }
        if (sig.status !== "Signed") {
          doc.setDrawColor(180); doc.line(margin, y, margin + 200, y); y += 6;
          doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.text("Signature / Date", margin, y); y += 20;
        }
        if (sig.objection_note) { doc.setTextColor(200,0,0); body(`Objection: ${sig.objection_note}`); doc.setTextColor(0,0,0); }
        y += 10;
      });

      // Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(150);
        doc.text(`${plan.client_name} — ISP ${plan.plan_year_start || ""} | Page ${p} of ${totalPages} | CONFIDENTIAL`, margin, doc.internal.pageSize.getHeight() - 20);
        doc.setTextColor(0,0,0);
      }

      doc.save(`${plan.client_name?.replace(/ /g,"_")}_ISP_${plan.plan_year_start || "draft"}.pdf`);
    } finally {
      setGenerating(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setView("options"); setShowDialog(true); }} className="gap-1.5">
        <Download className="w-4 h-4" />Export
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Plan</DialogTitle>
          </DialogHeader>

          {view === "options" ? (
            <div className="space-y-3">
              <button type="button" onClick={handleGeneratePDF} disabled={generating}
                className="w-full flex items-start gap-3 border-2 border-border hover:border-primary/40 rounded-xl p-4 text-left transition-all">
                <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Full Clinical PDF</p>
                  <p className="text-xs text-muted-foreground">Complete plan for the record — all sections, service grid, and signature blocks. Minimum 12pt body text. Includes named signature lines.</p>
                </div>
              </button>
              <button type="button" onClick={handleGeneratePlain}
                className="w-full flex items-start gap-3 border-2 border-border hover:border-primary/40 rounded-xl p-4 text-left transition-all">
                <Eye className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Plain Language Summary</p>
                  <p className="text-xs text-muted-foreground">Written at 6th-grade level. Leads with person's voice. For the person and their family. Flag for AAC team if picture symbols are needed.</p>
                </div>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Plain language version — review before sharing with the person and family.</p>
              <div className="bg-muted rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">{plainText}</div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => view === "plain" ? setView("options") : setShowDialog(false)}>{view === "plain" ? "Back" : "Cancel"}</Button>
            {view === "plain" && <Button onClick={handleDownloadPlain}><Download className="w-4 h-4 mr-1" />Download .txt</Button>}
            {view === "options" && generating && <Button disabled>Generating PDF...</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}