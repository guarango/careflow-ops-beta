// Shared status filter for both people screens (Staff = HR view, Users = access view).
// They read the same StaffMember records, so the same filter must yield the same count.

export const STATUS_TABS = [
  // "All" is the working set: everyone who is current (Active or Pending). Inactive has its own tab.
  { key: "all", label: "All", statuses: ["Active", "Pending"] },
  { key: "pending", label: "Pending", statuses: ["Pending"] },
  { key: "active", label: "Active", statuses: ["Active"] },
  { key: "inactive", label: "Inactive", statuses: ["Inactive"] },
];

export const DEFAULT_STATUS_TAB = "all";

export const ACCESS_LABELS = { dsp: "DSP", manager: "Manager", admin: "Admin" };

export function personStatus(person) {
  return person?.status || "Pending";
}

export function peopleInTab(people, tabKey) {
  const tab = STATUS_TABS.find((t) => t.key === tabKey) || STATUS_TABS[0];
  return (people || []).filter((p) => tab.statuses.includes(personStatus(p)));
}

export function countByTab(people) {
  return STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = peopleInTab(people, tab.key).length;
    return acc;
  }, {});
}

export function matchesSearch(person, search) {
  const q = (search || "").toLowerCase();
  if (!q) return true;
  return `${person.first_name || ""} ${person.last_name || ""} ${person.name || ""} ${person.email || ""} ${person.job_title || ""} ${person.role || ""}`
    .toLowerCase()
    .includes(q);
}