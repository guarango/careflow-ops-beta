import { displayValue } from "@/lib/customFields";

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Print-ready incident report, including custom fields (Admin-only answers when provided). */
export function printIncident(incident, restricted = [], definitions = []) {
  const defsById = Object.fromEntries((definitions || []).map((d) => [d.id, d]));

  const rows = [
    ["Client", incident.client_name],
    ["Date", incident.date],
    ["Time", incident.time],
    ["Location", incident.location_detail ? `${incident.location} — ${incident.location_detail}` : incident.location],
    ["Category", incident.type],
    ["Severity", incident.severity],
    ["Description", incident.description],
    ["Staff involved", incident.staff_involved],
    ["Witnesses", incident.witnesses],
    ["Injuries", incident.injuries_occurred ? incident.injuries_description || "Yes" : "No"],
    ["Medical treatment required", incident.medical_treatment_required ? "Yes" : "No"],
    ["Law enforcement involved", incident.law_enforcement_involved ? "Yes" : "No"],
    ["Restrictive intervention", incident.restrictive_intervention_used ? incident.restrictive_intervention_description || "Yes" : "No"],
    ["Immediate actions taken", incident.actions_taken],
    ["Reported by", incident.reported_by_name],
    ["Status", incident.status],
  ];

  Object.entries(incident.custom_fields || {}).forEach(([id, answer]) => {
    const def = defsById[id];
    rows.push([`${def?.label || answer?.label || "Field"}${def?.active === false || !def ? " (retired)" : ""}`, displayValue(answer?.value)]);
  });

  restricted.forEach((r) => {
    const def = defsById[r.field_id];
    rows.push([`${def?.label || r.label} (Admin only)${!def || def.active === false ? " (retired)" : ""}`, displayValue(r.value)]);
  });

  const body = rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Incident Report — ${esc(incident.client_name)}</title>
    <style>
      body{font-family:Inter,Arial,sans-serif;color:#171d26;padding:32px;font-size:12px}
      h1{font-size:18px;margin:0 0 4px}
      .sub{color:#555;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;vertical-align:top;width:32%;padding:6px 8px;border-bottom:1px solid #e1e5ea;color:#555;font-weight:600}
      td{padding:6px 8px;border-bottom:1px solid #e1e5ea;white-space:pre-wrap}
      .sig{margin-top:24px;color:#555;font-size:11px}
    </style></head><body>
    <h1>Incident Report — ${esc(incident.client_name)}</h1>
    <div class="sub">${esc(incident.date)} ${esc(incident.time || "")} · ${esc(incident.severity || "")} · ${esc(incident.status || "")}</div>
    <table>${body}</table>
    ${incident.signature_timestamp ? `<p class="sig">${esc(incident.signature_timestamp)}</p>` : ""}
    </body></html>`);
  win.document.close();
  win.print();
}