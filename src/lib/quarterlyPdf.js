import { format } from "date-fns";
import { effectiveStatus } from "@/lib/quarterlySummary";

/**
 * Prints a quarterly summary in the state's six-element order (SOW 1.25):
 *   1. person's name, 2. each service, 3. the date range,
 *   4. general summary / status and response / notable events,
 *   5. progress toward each goal, 6. the staff member writing it.
 * This is the packet that goes to the support coordinator.
 */
export async function downloadQuarterlyPdf({ summary, agency }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 54;
  const maxW = pageW - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };
  const checkY = (needed = 20) => {
    if (y + needed > pageH - margin - 30) addPage();
  };

  const band = () => {
    doc.setFillColor(11, 129, 183);
    doc.rect(0, 0, pageW, 6, "F");
  };

  const agencyName = agency?.display_name || agency?.name || "CareFlow Ops";
  const agencyLines = [
    agency?.npi ? `NPI ${agency.npi}` : "",
    agency?.medicaid_provider_id ? `Medicaid Provider ${agency.medicaid_provider_id}` : "",
    [agency?.address_street, agency?.address_city, agency?.address_state, agency?.address_zip]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  // Agency header
  band();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(23, 29, 38);
  doc.text(agencyName, margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 120);
  agencyLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 11;
  });
  y += 4;
  doc.setDrawColor(225, 229, 234);
  doc.line(margin, y, pageW - margin, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(23, 29, 38);
  doc.text("Quarterly Summary", margin, y);
  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(95, 105, 120);
  doc.text(
    `${summary.quarter || ""}  ·  Status: ${effectiveStatus(summary)}  ·  Due ${summary.due_date || "—"}`,
    margin,
    y
  );
  y += 20;

  const section = (number, title) => {
    checkY(46);
    doc.setFillColor(240, 247, 251);
    doc.rect(margin, y - 12, maxW, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 129, 183);
    doc.text(`${number}. ${title.toUpperCase()}`, margin + 8, y + 3);
    doc.setTextColor(23, 29, 38);
    y += 24;
  };

  const body = (text, indent = 0) => {
    const value = String(text || "").trim();
    if (!value) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(23, 29, 38);
    const lines = doc.splitTextToSize(value, maxW - indent);
    lines.forEach((line) => {
      checkY(14);
      doc.text(line, margin + indent, y);
      y += 13;
    });
    y += 4;
  };

  const label = (text) => {
    checkY(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(95, 105, 120);
    doc.text(String(text).toUpperCase(), margin, y);
    y += 12;
    doc.setTextColor(23, 29, 38);
  };

  // 1 — Person's name
  section(1, "Person's Name");
  body(summary.client_name || "—");

  // 2 — Each service provided
  section(2, "Each Service Provided");
  const services = summary.services_provided || [];
  if (services.length === 0) {
    body("No services recorded this quarter.");
  } else {
    services.forEach((svc) => {
      const units = Number(svc.units_delivered || 0);
      const staff = (svc.staff_names || []).join(", ");
      const line = `${svc.service_code || "Service"}${svc.service_name ? ` — ${svc.service_name}` : ""}  ·  ${units} unit(s)  ·  ${svc.notes_count || 0} note(s)${staff ? `  ·  ${staff}` : ""}`;
      body(line);
    });
  }

  // 3 — Date range covered
  section(3, "Date Range Covered");
  body(`${summary.period_start || "—"} to ${summary.period_end || "—"}`);

  // 4 — General summary, status and response, notable events
  section(4, "General Summary, Status and Response, Notable Events");
  label("Services provided");
  body(summary.services_summary || "No summary recorded.");
  label("Status and response to services");
  body(summary.status_and_response || "No status recorded.");
  label("Notable events and activities");
  body(summary.notable_events || "None reported.");

  // 5 — Progress toward each goal
  section(5, "Progress Toward Each Goal");
  const goals = summary.goal_progress || [];
  if (goals.length === 0) {
    body("No goal progress is required for the services on this plan (ELS, MTP, PBA, Professional Medication Monitoring and Respite are exempt).");
  } else {
    goals.forEach((goal) => {
      checkY(60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(goal.goal_title || "Untitled goal", margin, y);
      y += 13;
      if (goal.pcsp_goal_text) {
        body(`PCSP goal: ${goal.pcsp_goal_text}`, 10);
      }
      body(
        `Data points: ${goal.data_points_count || 0}  ·  Baseline: ${goal.baseline || "not recorded"}  ·  Current: ${goal.current_level || "insufficient data"}  ·  Trend: ${goal.trend || "Insufficient data"}${goal.prompt_level_trend ? `  ·  Prompting: ${goal.prompt_level_trend}` : ""}`,
        10
      );
      body(goal.narrative || "No narrative recorded.", 10);
      if (goal.mastery_met) body("Mastery criterion met this quarter.", 10);
      y += 4;
    });
  }

  // 6 — Name of staff member writing it
  section(6, "Name of the Staff Member Writing It");
  body(summary.writer_name || summary.signed_by_name || "—");
  if (summary.signed_by_name) {
    label("Agency sign-off");
    body(
      `${summary.signed_by_name}${summary.signed_by_role ? ` (${summary.signed_by_role})` : ""} — signed ${summary.signed_at ? format(new Date(summary.signed_at), "MMM d, yyyy h:mm a") : ""}`,
      0
    );
  }
  if (summary.status === "Sent" || summary.sent_to_sc_date) {
    label("Sent to support coordinator");
    body(
      `${summary.sent_to || "Support coordinator"}  ·  ${summary.sent_method || ""}  ·  ${summary.sent_to_sc_date || ""}`,
      0
    );
  }

  // Signature line
  checkY(60);
  y += 18;
  doc.setDrawColor(150, 160, 175);
  doc.line(margin, y, margin + 220, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(95, 105, 120);
  doc.text("Signature of the staff member writing this summary", margin, y);

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 155);
    doc.text(
      `${agencyName}  ·  DHHS91172 SOW 1.25  ·  Page ${i} of ${pages}`,
      margin,
      pageH - 24
    );
  }

  const safeName = String(summary.client_name || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`quarterly-${safeName}-${summary.quarter || ""}.pdf`.replace(/\s+/g, "-"));
}