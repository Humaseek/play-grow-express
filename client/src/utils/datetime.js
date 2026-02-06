// Centralized date/time formatting for the whole app.
// Requirement: show times like 16:00 (24-hour), not 4 .
// We keep Arabic UI labels, but render times using Latin digits for readability.

export function toDate(value) {
 if (!value) return null;
 const d = value instanceof Date ? value : new Date(value);
 return Number.isNaN(d.getTime()) ? null : d;
}

// 24-hour time (HH:MM) with Latin digits.
export function fmtTime24(value) {
 const d = toDate(value);
 if (!d) return "";
 return new Intl.DateTimeFormat("en-GB", {
 hour: "2-digit",
 minute: "2-digit",
 hour12: false,
 }).format(d);
}

// Date as DD/MM/YYYY (Latin digits).
export function fmtDateDMY(value) {
 const d = toDate(value);
 if (!d) return "";
 return new Intl.DateTimeFormat("en-GB", {
 year: "numeric",
 month: "2-digit",
 day: "2-digit",
 }).format(d);
}

// Date + time as DD/MM/YYYY HH:MM.
export function fmtDateTime24(value) {
 const d = toDate(value);
 if (!d) return "—";
 return `${fmtDateDMY(d)} ${fmtTime24(d)}`;
}

// Arabic weekday name (for labels like: No).
export function fmtWeekdayAr(value) {
 const d = toDate(value);
 if (!d) return "";
 return new Intl.DateTimeFormat("ar-IL", { weekday: "long" }).format(d);
}

// Arabic day label like: No 09/02
export function fmtDayLabelAr(value) {
 const d = toDate(value);
 if (!d) return "";
 const wd = fmtWeekdayAr(d);
 const dm = new Intl.DateTimeFormat("en-GB", {
 day: "2-digit",
 month: "2-digit",
 }).format(d);
 return `${wd} ${dm}`;
}
