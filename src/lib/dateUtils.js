import { format } from "date-fns";

/**
 * Local calendar date as YYYY-MM-DD.
 * Never derive a working date from toISOString(): that returns the UTC date,
 * which is already "tomorrow" for US timezones from late afternoon onward.
 */
export function localDateISO(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

/** Local date for "today". */
export function todayISO() {
  return localDateISO(new Date());
}

/** Local date N days from a base date (defaults to today). */
export function addDaysISO(days, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

/** Local date N days before a base date (defaults to today). */
export function subtractDaysISO(days, base = new Date()) {
  return addDaysISO(-days, base);
}