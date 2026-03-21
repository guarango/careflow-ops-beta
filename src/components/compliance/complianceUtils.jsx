export const REQUIRED_DOCS = [
  "Background Check",
  "I-9 Verification",
  "Drug Screen",
  "TB Test",
  "Orientation Record",
];

export const CLINICAL_ROLES = ["Nurse", "QIDP", "Behavioral Specialist", "Mental Health Pro"];
export const CLINICAL_EXTRA_DOCS = ["CPR Certification", "First Aid Certification"];

export function getRequiredDocs(staffRole) {
  const base = [...REQUIRED_DOCS];
  if (CLINICAL_ROLES.includes(staffRole)) return [...base, ...CLINICAL_EXTRA_DOCS];
  return base;
}

export function getStaffDocs(staffMember, allDocs) {
  const name = `${staffMember.first_name} ${staffMember.last_name}`.toLowerCase();
  return allDocs.filter(d => d.related_to?.toLowerCase().includes(name));
}

export function calcCompliance(staffMember, allDocs) {
  const required = getRequiredDocs(staffMember.role);
  const staffDocs = getStaffDocs(staffMember, allDocs);

  let compliantCount = 0;
  let missingCount = 0;
  let expiringCount = 0;
  let pendingCount = 0;
  let expiredCount = 0;

  required.forEach(reqDoc => {
    const found = staffDocs.find(d => d.title?.toLowerCase().includes(reqDoc.toLowerCase()));
    if (!found) {
      missingCount++;
    } else if (found.status === "Current") {
      compliantCount++;
    } else if (found.status === "Expiring Soon") {
      expiringCount++;
    } else if (found.status === "Pending Review") {
      pendingCount++;
    } else if (found.status === "Expired") {
      expiredCount++;
    } else {
      compliantCount++;
    }
  });

  const pct = required.length > 0 ? Math.round((compliantCount / required.length) * 100) : 100;

  let overallStatus = "Compliant";
  if (missingCount > 0 || expiredCount > 0) overallStatus = "Non-Compliant";
  else if (expiringCount > 0 || pendingCount > 0) overallStatus = "At Risk";

  return { pct, missingCount, expiringCount, pendingCount, expiredCount, compliantCount, overallStatus, required, staffDocs };
}