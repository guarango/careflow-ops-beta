// Training compliance engine — shared logic used by scheduler, dashboard, and staff views

export const DEFAULT_AGENCY_TRAININGS = [
  { id: "idd-overview", title: "IDD Overview & Disability Etiquette", category: "Agency-Universal", frequency: "One-Time", valid_days: null, scheduling_block: "Hard Block", sort_order: 1 },
  { id: "person-centered", title: "Person-Centered Thinking & Planning", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 2 },
  { id: "abuse-neglect", title: "Abuse, Neglect & Mandatory Reporting", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 3 },
  { id: "rights-idd", title: "Rights of People with IDD", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 4 },
  { id: "hipaa", title: "HIPAA & Confidentiality", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 5 },
  { id: "crisis-prevention", title: "Crisis Prevention & De-escalation (CPI/MANDT)", category: "Agency-Universal", frequency: "Annual", valid_days: 365, has_competency_checkoff: true, scheduling_block: "Hard Block", sort_order: 6 },
  { id: "cpr-first-aid", title: "CPR & First Aid", category: "Certification", frequency: "Biennial", valid_days: 730, scheduling_block: "Hard Block", sort_order: 7 },
  { id: "bloodborne", title: "Bloodborne Pathogens", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 8 },
  { id: "fire-safety", title: "Fire Safety & Emergency Evacuation", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Soft Block", sort_order: 9 },
  { id: "documentation", title: "Documentation Standards & Falsification Policy", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Alert Only", sort_order: 10 },
  { id: "code-of-conduct", title: "Code of Conduct & Whistleblower Protections", category: "Agency-Universal", frequency: "Annual", valid_days: 365, scheduling_block: "Alert Only", sort_order: 11 },
];

export const ROLE_SPECIFIC_TRAININGS = {
  Nurse: [
    { id: "nursing-delegation", title: "Nursing Delegation & Supervision", category: "Role-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block" },
  ],
  DSP: [
    { id: "med-admin", title: "Medication Administration Certification", category: "Role-Specific", frequency: "Annual", valid_days: 365, has_competency_checkoff: true, scheduling_block: "Hard Block" },
    { id: "personal-care", title: "Personal Care & Dignity Protocols", category: "Role-Specific", frequency: "Annual", valid_days: 365, has_competency_checkoff: true, scheduling_block: "Hard Block" },
  ],
  "Job Coach": [
    { id: "supported-employment", title: "Supported Employment Principles", category: "Role-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block" },
    { id: "vehicle-safety", title: "Vehicle Operation & Passenger Safety", category: "Role-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block" },
  ],
  "Behavioral Specialist": [
    { id: "bsp-implementation", title: "BSP Implementation & Data Collection", category: "Role-Specific", frequency: "Annual", valid_days: 365, has_competency_checkoff: true, scheduling_block: "Hard Block" },
    { id: "fba-training", title: "Functional Behavior Assessment", category: "Role-Specific", frequency: "Biennial", valid_days: 730, scheduling_block: "Soft Block" },
  ],
  QIDP: [
    { id: "isp-writing", title: "ISP Writing & Person-Centered Planning", category: "Role-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block" },
  ],
};

export const CLIENT_SPECIFIC_TRAININGS = [
  { id: "bsp-ack", title: "BSP Acknowledgment & Competency Quiz", category: "Client-Specific", frequency: "Per Plan Update", valid_days: 365, scheduling_block: "Hard Block", sort_order: 1 },
  { id: "health-protocol", title: "Health Protocols Review (Meds, Seizure, Dietary)", category: "Client-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 2 },
  { id: "communication-system", title: "Communication System Training", category: "Client-Specific", frequency: "One-Time", valid_days: null, scheduling_block: "Hard Block", sort_order: 3 },
  { id: "personal-care-client", title: "Personal Care Preferences & Dignity Protocols", category: "Client-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Hard Block", sort_order: 4 },
  { id: "isp-review", title: "ISP Goals & Support Strategies Review", category: "Client-Specific", frequency: "Annual", valid_days: 365, scheduling_block: "Soft Block", sort_order: 5 },
];

// Calculate days until expiration
export function daysUntilExpiry(expirationDate) {
  if (!expirationDate) return null;
  return Math.ceil((new Date(expirationDate) - new Date()) / (1000 * 60 * 60 * 24));
}

// Get alert tier for a record
export function getExpiryTier(expirationDate) {
  const days = daysUntilExpiry(expirationDate);
  if (days === null) return "none";
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  if (days <= 90) return "caution";
  return "ok";
}

// Derive effective training status from a TrainingRecord
export function getEffectiveStatus(record) {
  if (!record) return "Not Started";
  if (record.status === "Completed" && record.expiration_date) {
    const days = daysUntilExpiry(record.expiration_date);
    if (days !== null && days < 0) return "Expired";
  }
  return record.status;
}

// Calculate compliance score for a staff member given their records and required trainings
export function calcComplianceScore(requiredTrainingIds, recordsByTrainingId) {
  if (!requiredTrainingIds.length) return 100;
  let current = 0;
  requiredTrainingIds.forEach(tid => {
    const rec = recordsByTrainingId[tid];
    const status = getEffectiveStatus(rec);
    if (status === "Completed") current++;
  });
  return Math.round((current / requiredTrainingIds.length) * 100);
}

// Get all required training IDs for a staff member (universal + role-specific)
export function getRequiredTrainingIds(role, libraryItems = []) {
  const universal = DEFAULT_AGENCY_TRAININGS.map(t => t.id);
  const roleItems = ROLE_SPECIFIC_TRAININGS[role] || [];
  const roleIds = roleItems.map(t => t.id);
  const libraryIds = libraryItems.filter(t => t.is_active && (t.category === "Agency-Universal" || (t.applies_to_roles || []).includes(role))).map(t => t.id);
  return [...new Set([...universal, ...roleIds, ...libraryIds])];
}

// Get scheduling eligibility for staff member for a specific client
export function getSchedulingEligibility(staffId, clientId, records) {
  const clientRecords = records.filter(r => r.staff_id === staffId && r.client_id === clientId);
  const clientRequiredIds = CLIENT_SPECIFIC_TRAININGS.map(t => t.id);
  const gaps = [];

  clientRequiredIds.forEach(tid => {
    const templateTraining = CLIENT_SPECIFIC_TRAININGS.find(t => t.id === tid);
    const rec = clientRecords.find(r => r.training_id === tid);
    const status = getEffectiveStatus(rec);
    if (status !== "Completed") {
      gaps.push({
        training_id: tid,
        title: templateTraining?.title || tid,
        status,
        block_type: templateTraining?.scheduling_block || "Hard Block",
      });
    }
  });

  const hasHardBlock = gaps.some(g => g.block_type === "Hard Block");
  const hasSoftBlock = gaps.some(g => g.block_type === "Soft Block");

  return {
    eligible: gaps.length === 0,
    hard_blocked: hasHardBlock,
    soft_blocked: !hasHardBlock && hasSoftBlock,
    gaps,
  };
}