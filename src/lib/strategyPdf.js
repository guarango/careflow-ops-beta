import { format } from "date-fns";
import {
  coverageSummary,
  findPcspGoal,
  isStrategyLate,
  strategyDueDate,
} from "@/lib/supportStrategies";

/** Builds the agency's submission packet: one PDF per person, every strategy on it. */
export async function downloadSupportStrategiesPdf({ plan, strategies, codesById }) {
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
    if (y + needed > pageH - margin) addPage();
  };
  const heading = (text) => {
    checkY(30);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 129, 183);
    doc.text(text.toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(225, 229, 234);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
    doc.setTextColor(23, 29, 38);
  };
  const body = (text, indent = 0) => {
    if (!text) return;
    doc.setFontSize(10.5);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(text), maxW - indent);
    checkY(lines.length * 14);
    lines.forEach((line) => {
      doc.text(line, margin + indent, y);
      y += 14;
    });
    y += 3;
  };
  const kv = (label, value) => {
    if (!value) return;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(95, 105, 120);
    checkY(14);
    doc.text(label.toUpperCase(), margin, y);
    y += 12;
    doc.setTextColor(23, 29, 38);
    body(value, 0);
  };

  const due = strategyDueDate(plan);
  const coverage = coverageSummary(plan, codesById, strategies);
  const codesLabel = (ids) =>
    (ids || []).map((id) => codesById?.[id]?.code || "—").filter(Boolean).join(", ");

  // Header band
  doc.setFillColor(11, 129, 183);
  doc.rect(0, 0, pageW, 74, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Support Strategies", margin, 34);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${plan.client_name} · PCSP plan year ${plan.plan_year_start || "—"} to ${plan.plan_year_end || "—"}`, margin, 54);
  doc.setTextColor(23, 29, 38);
  y = 96;

  kv("Person", plan.client_name);
  kv("PCSP activated", plan.activation_date);
  kv("Support Strategies due", due);
  kv(
    "Support coordinator",
    [plan.support_coordinator_name, plan.support_coordinator_agency, plan.support_coordinator_email]
      .filter(Boolean)
      .join(" · ")
  );
  kv("Service coverage", `${coverage.coveredCount} of ${coverage.total} services covered${coverage.gaps.length ? ` — gaps: ${coverage.gaps.join("; ")}` : ""}`);
  y += 6;

  strategies.forEach((strategy, i) => {
    checkY(120);
    const pcspGoal = findPcspGoal(plan, strategy.pcsp_goal_id);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(23, 29, 38);
    const title = `Strategy ${i + 1} — ${pcspGoal?.goal_text_as_written || strategy.goal_title || "Goal"}`;
    const titleLines = doc.splitTextToSize(title, maxW);
    titleLines.forEach((line) => {
      checkY(20);
      doc.text(line, margin, y);
      y += 17;
    });
    y += 4;

    const late = isStrategyLate(strategy, due);
    const statusLine = [
      `Status: ${strategy.strategy_status || "Draft"}`,
      strategy.submitted_to_sc_date
        ? `Submitted ${strategy.submitted_to_sc_date}${strategy.submission_method ? ` via ${strategy.submission_method}` : ""}${late ? " (LATE)" : " (on time)"}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
    body(statusLine);

    heading("Goal as written in the PCSP");
    body(pcspGoal?.goal_text_as_written || strategy.goal_title);

    heading("Person's own words");
    body(pcspGoal?.persons_own_words || strategy.persons_own_words || "Not recorded");

    heading("Connection to personal outcome");
    body(strategy.connection_to_personal_outcome);

    heading("Baseline");
    body(
      [strategy.baseline_description, strategy.baseline_date ? `Baseline date: ${strategy.baseline_date}` : ""]
        .filter(Boolean)
        .join(" · ")
    );

    heading("Measurable target & mastery criteria");
    body(strategy.mastery_criteria);

    heading("Staff instructions");
    body(strategy.data_collection_instructions);

    heading("Data collection method & schedule");
    body(
      [strategy.primary_measurement_method, strategy.data_collection_schedule]
        .filter(Boolean)
        .join(" · ")
    );

    heading("Prompt fading plan");
    body(strategy.prompt_fading_plan || "Not recorded");

    heading("Responsible service codes");
    body(codesLabel(strategy.service_code_ids) || "None linked");

    doc.setFontSize(9);
    doc.setTextColor(95, 105, 120);
    checkY(16);
    doc.text(
      `Author: ${strategy.goal_author || "—"} · Prepared ${format(new Date(), "MMMM d, yyyy")}`,
      margin,
      y
    );
    y += 22;
    doc.setTextColor(23, 29, 38);
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(
      `${plan.client_name} — Support Strategies ${plan.plan_year_start || ""} | Page ${p} of ${totalPages} | CONFIDENTIAL`,
      margin,
      pageH - 20
    );
    doc.setTextColor(0, 0, 0);
  }

  const safeName = (plan.client_name || "client").replace(/ /g, "_");
  doc.save(`${safeName}_SupportStrategies_${plan.plan_year_start || "draft"}.pdf`);
}