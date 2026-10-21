import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { FileText, Printer } from "lucide-react";

export default function AuditReportDialog({ open, onClose, user }) {
  const [reportType, setReportType] = useState("client");
  const [selectedId, setSelectedId] = useState("");

  const { data: clients = [] } = useQuery({ queryKey: ["audit-clients"], queryFn: () => base44.entities.Client.list(), enabled: open });
  const { data: staff = [] } = useQuery({ queryKey: ["audit-staff"], queryFn: () => base44.entities.StaffMember.list(), enabled: open });
  const { data: isps = [] } = useQuery({ queryKey: ["audit-isps"], queryFn: () => base44.entities.ISPlan.list(), enabled: open });
  const { data: bsps = [] } = useQuery({ queryKey: ["audit-bsps"], queryFn: () => base44.entities.BehaviorSupportPlan.list(), enabled: open });
  const { data: meds = [] } = useQuery({ queryKey: ["audit-meds"], queryFn: () => base44.entities.Medication.list(), enabled: open });
  const { data: auths = [] } = useQuery({ queryKey: ["audit-auths"], queryFn: () => base44.entities.Authorization.list(), enabled: open });
  const { data: notes = [] } = useQuery({ queryKey: ["audit-notes"], queryFn: () => base44.entities.SessionNote.list(), enabled: open });
  const { data: compDocs = [] } = useQuery({ queryKey: ["audit-compdocs"], queryFn: () => base44.entities.StaffComplianceDocument.list(), enabled: open });
  const { data: trainings = [] } = useQuery({ queryKey: ["audit-trainings"], queryFn: () => base44.entities.TrainingAssignment.list(), enabled: open });
  const { data: onboarding = [] } = useQuery({ queryKey: ["audit-onboarding"], queryFn: () => base44.entities.OnboardingDocument.list(), enabled: open });
  const { data: agencyItems = [] } = useQuery({ queryKey: ["audit-agency"], queryFn: () => base44.entities.AgencyFileItem.list("sort_order"), enabled: open });

  const options = reportType === "client" ? clients.map(c => ({ id: c.id, label: `${c.first_name} ${c.last_name}` })) : staff.map(s => ({ id: s.id, label: `${s.first_name} ${s.last_name} (${s.role})` }));

  const reportData = useMemo(() => {
    if (!selectedId) return null;
    if (reportType === "client") {
      const client = clients.find(c => c.id === selectedId);
      if (!client) return null;
      const isp = isps.find(p => p.client_id === client.id);
      const bsp = bsps.find(p => p.client_id === client.id);
      const clientMeds = meds.filter(m => m.client_id === client.id);
      const clientAuths = auths.filter(a => a.client_id === client.id);
      const clientNotes = notes.filter(n => n.client_id === client.id);

      return {
        title: `${client.first_name} ${client.last_name}`,
        subtitle: `Client Audit Report`,
        sections: [
          {
            part: "Part II — Person Records",
            items: [
              { item: "Demographics", status: "On File", date: client.date_of_birth || "N/A", ref: "Client Profile" },
              { item: "PCSP (Person-Centered Support Plan)", status: isp?.status || "Missing", date: isp?.next_review_date || "N/A", ref: "ISPlan Record" },
              { item: "Support Strategies", status: isp?.support_strategies?.length > 0 ? `${isp.support_strategies.length} strategies` : "Missing", date: "N/A", ref: "ISPlan" },
              { item: "Behavior Support Plan / FBA", status: bsp?.status || "N/A", date: bsp?.next_review_date || "N/A", ref: "BSP Record" },
              { item: "Human Rights Restrictions", status: bsp?.human_rights_restrictions?.length > 0 ? `${bsp.human_rights_restrictions.length} on file` : "None", date: "N/A", ref: "BSP" },
              { item: "Medication Orders & MAR", status: clientMeds.length > 0 ? `${clientMeds.length} medications` : "Missing", date: "N/A", ref: "eMAR" },
              { item: "Consents", status: "See Portal", date: "N/A", ref: "Portal Consents" },
              { item: "Emergency Info", status: client.guardian_name ? "On File" : "Missing", date: "N/A", ref: "Client Profile" },
              { item: "Quarterly Summaries", status: clientNotes.length > 0 ? `${clientNotes.length} notes` : "Missing", date: "N/A", ref: "Session Notes" },
            ]
          },
          {
            part: "Part III — Fiscal",
            items: [
              { item: "Active Authorization", status: clientAuths.find(a => a.status === "Approved") ? "Active" : "None Active", date: "N/A", ref: "Authorization" },
              { item: "Units Remaining", status: "See Authorization", date: "N/A", ref: "Authorization" },
              { item: "Billing Records", status: "See Billing", date: "N/A", ref: "Billing Module" },
            ]
          },
          {
            part: "Part IV — Staff Requirements",
            items: [
              { item: "Assigned Staff", status: client.assigned_staff || "See Assignments", date: "N/A", ref: "Staff Assignments" },
            ]
          },
        ]
      };
    } else {
      const member = staff.find(s => s.id === selectedId);
      if (!member) return null;
      const myDocs = compDocs.filter(d => d.staff_id === member.id);
      const myTrainings = trainings.filter(t => t.staff_id === member.id);
      const myOnboarding = onboarding.filter(d => d.staff_id === member.id);
      const completedTrainings = myTrainings.filter(t => t.status === "Completed" || t.status === "Verified");

      return {
        title: `${member.first_name} ${member.last_name}`,
        subtitle: `Staff Audit Report — ${member.role}`,
        sections: [
          {
            part: "Part II — Person Records",
            items: [
              { item: "Employee Profile", status: "On File", date: "N/A", ref: "Staff Record" },
              { item: "Emergency Contact", status: member.emergency_contact_name ? "On File" : "Missing", date: "N/A", ref: "Staff Profile" },
            ]
          },
          {
            part: "Part III — Fiscal",
            items: [
              { item: "Employment Type", status: member.employment_type || "N/A", date: "N/A", ref: "Staff Record" },
              { item: "Contract Areas", status: member.contract_areas?.length > 0 ? member.contract_areas.join(", ") : "N/A", date: "N/A", ref: "Staff Record" },
            ]
          },
          {
            part: "Part IV — Staff Requirements",
            items: [
              { item: "Background Check", status: myDocs.find(d => d.document_type?.toLowerCase().includes("background"))?.status === "Active" ? "Current" : "Missing", date: myDocs.find(d => d.document_type?.toLowerCase().includes("background"))?.expiration_date || "N/A", ref: "Compliance Document" },
              { item: "OIG Check", status: myDocs.find(d => d.document_type?.toLowerCase().includes("oig"))?.status === "Active" ? "Current" : "Missing", date: "N/A", ref: "Compliance Document" },
              { item: "CPR/First Aid", status: myDocs.find(d => /cpr|first.?aid/i.test(d.document_type || ""))?.status === "Active" ? "Current" : "Missing", date: myDocs.find(d => /cpr|first.?aid/i.test(d.document_type || ""))?.expiration_date || "N/A", ref: "Compliance Document" },
              { item: "Onboarding Documents", status: myOnboarding.length > 0 ? `${myOnboarding.filter(d => d.status === "Signed").length}/${myOnboarding.length} signed` : "Missing", date: "N/A", ref: "Onboarding" },
              { item: "Core Trainings", status: myTrainings.length > 0 ? `${completedTrainings.length}/${myTrainings.length} complete` : "None assigned", date: "N/A", ref: "Training Assignments" },
              { item: "Training Hours (Yearly)", status: `${member.training_hours || 0} hrs`, date: "N/A", ref: "Staff Record" },
            ]
          },
        ]
      };
    }
  }, [selectedId, reportType, clients, staff, isps, bsps, meds, auths, notes, compDocs, trainings, onboarding]);

  const generatePDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(reportData.title, 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.text(reportData.subtitle, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} by ${user?.full_name || user?.email || "System"}`, 14, y);
    y += 4;
    doc.text("DHHS 91172 Review Tool Format", 14, y);
    y += 8;

    doc.setDrawColor(200);
    doc.line(14, y, pageWidth - 14, y);
    y += 8;

    reportData.sections.forEach(section => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text(section.part, 14, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.text("Item", 14, y);
      doc.text("Status", 110, y);
      doc.text("Date", 150, y);
      doc.text("Ref", 175, y);
      y += 3;
      doc.line(14, y, pageWidth - 14, y);
      y += 4;

      doc.setFont(undefined, "normal");
      section.items.forEach(item => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(doc.splitTextToSize(item.item, 90), 14, y);
        doc.text(doc.splitTextToSize(item.status, 35), 110, y);
        doc.text(doc.splitTextToSize(item.date, 20), 150, y);
        doc.text(doc.splitTextToSize(item.ref, 25), 175, y);
        y += 7;
      });
      y += 4;
    });

    if (y > 250) { doc.addPage(); y = 20; }
    y += 6;
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Evidence Appendix", 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("This report was generated from the CareFlow Ops compliance system. All referenced", 14, y);
    y += 4;
    doc.text("records are available in the system with full audit trails.", 14, y);

    doc.save(`Audit_Report_${reportData.title.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Audit Report (DHHS 91172)</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 items-end">
          <div className="w-32">
            <label className="text-xs font-medium">Report For</label>
            <Select value={reportType} onValueChange={v => { setReportType(v); setSelectedId(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="staff">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium">{reportType === "client" ? "Select Client" : "Select Employee"}</label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder={`Select ${reportType}…`} /></SelectTrigger>
              <SelectContent>
                {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {reportData && (
          <div className="space-y-4 mt-4">
            <div className="bg-muted/40 rounded-lg p-4">
              <h3 className="font-bold text-lg">{reportData.title}</h3>
              <p className="text-sm text-muted-foreground">{reportData.subtitle}</p>
              <p className="text-xs text-muted-foreground mt-1">Generated {new Date().toLocaleDateString()} · DHHS 91172 Review Tool Format</p>
            </div>
            {reportData.sections.map(section => (
              <div key={section.part} className="border rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-3 py-2 font-semibold text-sm">{section.part}</div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{item.item}</td>
                        <td className="p-2">{item.status}</td>
                        <td className="p-2">{item.date}</td>
                        <td className="p-2 text-muted-foreground">{item.ref}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="text-xs text-muted-foreground italic">
              Evidence Appendix: All referenced records are available in the CareFlow Ops system with full audit trails.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={generatePDF} disabled={!reportData} className="gap-1"><Printer className="w-3 h-3" /> Print Audit Report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}