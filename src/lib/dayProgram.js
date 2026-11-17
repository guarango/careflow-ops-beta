/**
 * DSG staffing ratio and DSI setting checks — DHHS91172 SOW 7.3 and 8.4.
 *
 * 7.3(2): DSG is one staff to no more than six persons; one-to-one only when
 *         the PCSP documents the need.
 * 8.1:    DSI is at least one staff to one person.
 * 8.4(5): DSI may not be delivered site-based for the majority of the week.
 */

import { addDays, format, parseISO } from "date-fns";
import { noteMinutes } from "@/lib/serviceNote";

export const RATIO_MAX = 6;
export const DSI_CODE = "DSI";
export const DSG_CODE = "DSG";
export const SITE_SETTING = "Site-based day program";
export const COMMUNITY_SETTING = "Community";

/**
 * Ratio check for one session.
 * A person documented for one-to-one support consumes a dedicated staff member
 * before the remaining staff count against the 1:6 group limit.
 */
export function ratioCheck({ staff = 0, persons = 0, oneToOne = 0 } = {}) {
  const staffCount = Number(staff) || 0;
  const personCount = Number(persons) || 0;
  const documented = Math.min(Number(oneToOne) || 0, personCount);
  const dedicated = Math.min(documented, staffCount);
  const groupStaff = Math.max(0, staffCount - dedicated);
  const groupPersons = Math.max(0, personCount - dedicated);
  const ratio = staffCount > 0 ? personCount / staffCount : null;
  const warnings = [];

  if (staffCount === 0 && personCount > 0) {
    warnings.push("No staff on duty for the persons present.");
  }
  if (documented > dedicated) {
    warnings.push(
      `${documented - dedicated} person(s) documented for one-to-one support have no dedicated staff (SOW 7.3(2)).`
    );
  }
  if (groupStaff === 0 && groupPersons > 0) {
    warnings.push(
      `${groupPersons} person(s) are present with no staff left for group support — one-to-one is only allowed when the PCSP documents the need (SOW 7.3(2)).`
    );
  }
  if (groupStaff > 0 && groupPersons > groupStaff * RATIO_MAX) {
    warnings.push(
      `${groupPersons} persons to ${groupStaff} staff is above the 1:${RATIO_MAX} maximum (SOW 7.3(2)).`
    );
  }

  return {
    staff: staffCount,
    persons: personCount,
    documented,
    dedicated,
    groupStaff,
    groupPersons,
    ratio,
    over: warnings.length > 0,
    warnings,
  };
}

export function ratioLabel(ratio) {
  if (ratio === null || ratio === undefined) return "—";
  const rounded = Math.round(ratio * 10) / 10;
  return `1:${rounded}`;
}

/** Active clients whose PCSP documents a one-to-one need for DSG. */
export function oneToOneClientIds(plans = [], serviceCodes = []) {
  const ids = new Set();
  for (const plan of plans) {
    if (plan.status !== "Active") continue;
    for (const entry of plan.services_on_plan || []) {
      const code = entry.service_code
        || serviceCodes.find((c) => c.id === entry.service_code_id)?.code
        || "";
      if (String(code).toUpperCase() === DSG_CODE && entry.one_to_one_documented) {
        ids.add(plan.client_id);
      }
    }
  }
  return [...ids];
}

/** Sunday-start week containing a date (agency weeks run Sunday to Saturday). */
export function weekStartFor(dateISO) {
  const d = dateISO ? parseISO(dateISO) : new Date();
  return format(addDays(d, -d.getDay()), "yyyy-MM-dd");
}

export function weekRange(weekStart) {
  const start = parseISO(weekStart);
  return { startISO: format(start, "yyyy-MM-dd"), endISO: format(addDays(start, 6), "yyyy-MM-dd") };
}

export function noteServiceCode(note, serviceCodes = []) {
  return String(note?.service_code || serviceCodes.find((c) => c.id === note?.service_code_id)?.code || "").toUpperCase();
}

export function isDsiNote(note, serviceCodes = []) {
  return noteServiceCode(note, serviceCodes) === DSI_CODE;
}

/**
 * DSI minutes by setting, per person, for one Sunday–Saturday week.
 * Site-based minutes above half of the week's DSI minutes are a warning (SOW 8.4(5)).
 */
export function dsiWeekRows(notes = [], { weekStart, serviceCodes = [] } = {}) {
  const { startISO, endISO } = weekRange(weekStart);
  const rows = new Map();

  for (const note of notes) {
    if (!isDsiNote(note, serviceCodes)) continue;
    if (!note.date || note.date < startISO || note.date > endISO) continue;
    if (note.status === "Draft" || note.status === "Returned") continue;
    const minutes = noteMinutes(note);
    if (!minutes) continue;
    const key = note.client_id || note.client_name || "unknown";
    const row = rows.get(key) || {
      client_id: note.client_id,
      client_name: note.client_name || "Unknown person",
      site: 0,
      community: 0,
      other: 0,
      total: 0,
      notes: 0,
    };
    if (note.setting === SITE_SETTING) row.site += minutes;
    else if (note.setting === COMMUNITY_SETTING) row.community += minutes;
    else row.other += minutes;
    row.total += minutes;
    row.notes += 1;
    rows.set(key, row);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      siteHours: row.site / 60,
      communityHours: row.community / 60,
      totalHours: row.total / 60,
      siteShare: row.total > 0 ? row.site / row.total : 0,
      over: row.total > 0 && row.site * 2 > row.total,
    }))
    .sort((a, b) => String(a.client_name).localeCompare(String(b.client_name)));
}