import { jsPDF } from "jspdf";

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(payload) {
  return `${(payload?.client?.name || "client").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-record`;
}

export function downloadClientRecordCsv(payload) {
  const rows = [["Section", "Date", "Record", "Detail"]];
  for (const section of payload.sections || []) {
    for (const row of section.rows || []) {
      rows.push([section.label, row.date, row.title, row.detail]);
    }
  }
  for (const archived of payload.archived || []) {
    rows.push(["Archived", String(archived.archived_at || "").slice(0, 10), `${archived.entity_name} · ${archived.label}`, archived.reason || ""]);
  }
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  downloadBlob(csv, `${safeName(payload)}.csv`, "text/csv;charset=utf-8;");
}

export function downloadClientRecordPdf(payload) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const width = 612 - margin * 2;
  let y = margin;

  const line = (text, size = 10, style = "normal", gap = 14) => {
    if (y > 720) { doc.addPage(); y = margin; }
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(String(text ?? ""), width);
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size + 3) + gap - 12;
  };

  line("Confidential client record", 16, "bold", 6);
  line(payload.client?.name || "Client", 13, "bold", 4);
  line(`Date of birth: ${payload.client?.date_of_birth || "—"} · Medicaid ID: ${payload.client?.medicaid_id || "—"} · Status: ${payload.client?.status || "—"}`, 9);
  line(`Exported ${new Date(payload.generated_at).toLocaleString("en-US")} by ${payload.generated_by || "staff"}`, 9, "normal", 18);

  for (const section of payload.sections || []) {
    line(`${section.label} (${section.rows.length})`, 12, "bold", 4);
    if (!section.rows.length) line("None on file.", 9, "italic", 12);
    for (const row of section.rows) {
      line(`${row.date || "—"} · ${row.title}`, 9, "bold", 2);
      if (row.detail) line(row.detail, 9, "normal", 10);
    }
    y += 8;
  }

  if ((payload.archived || []).length) {
    line(`Archived records (${payload.archived.length})`, 12, "bold", 4);
    for (const a of payload.archived) {
      line(`${String(a.archived_at || "").slice(0, 10)} · ${a.entity_name} · ${a.label || ""} — retained until ${a.retention_until || "—"}`, 9);
    }
  }

  doc.save(`${safeName(payload)}.pdf`);
}