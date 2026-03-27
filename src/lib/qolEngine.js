// QoL Outcomes Engine — domain definitions, scoring logic, and cross-module data synthesis

export const QOL_DOMAINS = [
  {
    id: "emotional_wellbeing",
    label: "Emotional Wellbeing",
    color: "violet",
    colorClass: "text-violet-700",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-300",
    icon: "Heart",
    description: "Contentment, self-concept, freedom from stress",
    hcbs_indicator: "Individuals are free from abuse, neglect, and exploitation",
    objective_sources: ["BSP incidents", "Medication refusals", "Session note affect", "Health events"],
    subjective_question: "How do you feel most days? Are you happy with your life right now?",
  },
  {
    id: "interpersonal_relations",
    label: "Interpersonal Relations",
    color: "pink",
    colorClass: "text-pink-700",
    bgClass: "bg-pink-50",
    borderClass: "border-pink-300",
    icon: "Users",
    description: "Interactions, relationships, supports",
    hcbs_indicator: "Individuals choose their own services and supports, including who provides them",
    objective_sources: ["Session note social interactions", "ISP personal network", "Portal family engagement", "Community outings"],
    subjective_question: "Who are the most important people in your life right now? Do you have enough people to talk to?",
  },
  {
    id: "material_wellbeing",
    label: "Material Wellbeing",
    color: "amber",
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-300",
    icon: "Briefcase",
    description: "Financial status, employment, housing",
    hcbs_indicator: "Individuals have opportunities for competitive integrated employment",
    objective_sources: ["Vocational goal progress", "Employment status from ISP", "Financial records"],
    subjective_question: "Do you have enough money? Do you like where you live? Do you have work or activities that feel meaningful?",
  },
  {
    id: "personal_development",
    label: "Personal Development",
    color: "blue",
    colorClass: "text-blue-700",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-300",
    icon: "TrendingUp",
    description: "Education, personal competence, performance",
    hcbs_indicator: "Individuals participate in activities that align with their interests and goals",
    objective_sources: ["Goal progress", "Mastery achievements", "Session note new skills", "Educational participation"],
    subjective_question: "What new things have you learned or gotten better at? What do you want to learn?",
  },
  {
    id: "physical_wellbeing",
    label: "Physical Wellbeing",
    color: "green",
    colorClass: "text-green-700",
    bgClass: "bg-green-50",
    borderClass: "border-green-300",
    icon: "Activity",
    description: "Health, activities of daily living, leisure",
    hcbs_indicator: "Individuals receive supports that meet their health and safety needs",
    objective_sources: ["Vitals trends", "Health appointment completion", "Medication adherence", "Seizure frequency"],
    subjective_question: "How is your health? Are you doing things you enjoy? Do you feel good in your body?",
  },
  {
    id: "self_determination",
    label: "Self-Determination",
    color: "orange",
    colorClass: "text-orange-700",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-300",
    icon: "Star",
    description: "Autonomy, goals and personal values, choices",
    hcbs_indicator: "Individuals direct their own services and make their own choices about daily life",
    objective_sources: ["Choice documentation in session notes", "ISP dignity of risk", "Rights restriction status", "Preference documentation"],
    subjective_question: "Do people listen to you? Do you get to make choices about your own life? Does your plan feel like yours?",
  },
  {
    id: "social_inclusion",
    label: "Social Inclusion",
    color: "teal",
    colorClass: "text-teal-700",
    bgClass: "bg-teal-50",
    borderClass: "border-teal-300",
    icon: "Globe",
    description: "Community integration, community roles, social supports",
    hcbs_indicator: "Individuals have access to the benefits of community living",
    objective_sources: ["Community outing frequency", "Integrated employment", "Volunteer/civic participation", "Community group membership"],
    subjective_question: "Do you feel like part of your community? Do you go places and do things with people who don't work with you?",
  },
  {
    id: "rights",
    label: "Rights",
    color: "red",
    colorClass: "text-red-700",
    bgClass: "bg-red-50",
    borderClass: "border-red-300",
    icon: "Shield",
    description: "Human rights, legal rights",
    hcbs_indicator: "Individuals are treated with dignity and respect and have their rights protected",
    objective_sources: ["Rights violations in incidents", "Unauthorized restrictions in ISP", "Grievance filings", "Mandatory reporter outcomes"],
    subjective_question: "Do people treat you with respect? Are there things you want to do but aren't allowed? Do you know your rights?",
  },
];

export const DOMAIN_IDS = QOL_DOMAINS.map(d => d.id);

export function getDomain(id) {
  return QOL_DOMAINS.find(d => d.id === id);
}

// Calculate trend direction from an array of scores (chronological)
export function calcTrend(scores) {
  if (!scores || scores.length < 2) return "insufficient_data";
  const recent = scores.slice(-3);
  const older = scores.slice(-6, -3);
  if (older.length === 0) return "insufficient_data";
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff >= 0.5) return "improving";
  if (diff <= -0.5) return "declining";
  return "stable";
}

export function trendLabel(trend) {
  return { improving: "↑ Improving", declining: "↓ Declining", stable: "→ Stable", insufficient_data: "— Insufficient Data" }[trend] || "—";
}

export function trendColor(trend) {
  return { improving: "text-emerald-600", declining: "text-red-600", stable: "text-slate-500", insufficient_data: "text-slate-400" }[trend] || "text-slate-400";
}

// Build domain scores from list of assessments for one client
export function buildDomainTimeline(assessments, domainId) {
  return assessments
    .filter(a => a.domain_ratings?.[domainId] != null)
    .sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date))
    .map(a => ({ date: a.assessment_date, score: a.domain_ratings[domainId], type: a.assessment_type }));
}

// Detect priority discrepancy between person and team
export function detectPriorityDiscrepancy(personPriority, teamPriority) {
  if (!personPriority || !teamPriority) return false;
  const rank = { high: 3, medium: 2, low: 1 };
  return rank[personPriority?.toLowerCase()] > rank[teamPriority?.toLowerCase()];
}

// Calculate paid vs natural support ratio
export function calcNetworkRatio(contacts) {
  if (!contacts || contacts.length === 0) return { natural: 0, paid: 0, ratio: null };
  const natural = contacts.filter(c => c.is_natural_support).length;
  const paid = contacts.filter(c => !c.is_natural_support).length;
  return {
    natural,
    paid,
    total: contacts.length,
    ratio: contacts.length > 0 ? Math.round((natural / contacts.length) * 100) : 0,
  };
}

// Check if community participation has integrated activity in last N days
export function hasIntegratedActivityInDays(activities, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return activities.some(a =>
    a.integration_type === "Integrated (includes non-disabled people)" &&
    new Date(a.date) >= cutoff
  );
}

// Detect if same 3 activities are being repeated
export function detectRepetitiveActivities(activities) {
  if (activities.length < 6) return null;
  const recent = activities.slice(-6).map(a => a.activity_name);
  const counts = {};
  recent.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
  const repeated = Object.entries(counts).filter(([, n]) => n >= 3).map(([name]) => name);
  return repeated.length > 0 ? repeated : null;
}

// Calculate self-determination index from behavioral data
export function calcSelfDeterminationIndex(sessionNotes, ispPlan) {
  // Simplified proxy calculation from session note data
  if (!sessionNotes || sessionNotes.length === 0) return null;
  // In a real implementation this would analyze choice documentation frequency
  // For now returns a placeholder that the UI will display
  return null;
}

// Score interpretation for human-readable context
export function interpretScore(score, domain, personName) {
  if (score == null) return null;
  const first = personName?.split(" ")[0] || "This person";
  if (score >= 8) return `${first} rated their ${domain.label.toLowerCase()} very highly — this is an area of strength.`;
  if (score >= 6) return `${first} rated their ${domain.label.toLowerCase()} above average — there is room to grow but things are generally positive.`;
  if (score >= 4) return `${first} rated their ${domain.label.toLowerCase()} in the middle — this area deserves attention in the next planning cycle.`;
  return `${first} rated their ${domain.label.toLowerCase()} as low — this is a priority area that needs active team response.`;
}

export const PRIORITY_LEVELS = ["high", "medium", "low"];

export const EMPLOYMENT_STATUS_LABELS = {
  "Competitive Integrated Employment": { label: "Competitive Integrated", color: "bg-emerald-100 text-emerald-800" },
  "Supported Employment": { label: "Supported Employment", color: "bg-blue-100 text-blue-800" },
  "Sheltered/Center-Based Work": { label: "Sheltered/Center-Based", color: "bg-amber-100 text-amber-800" },
  "Volunteer": { label: "Volunteer", color: "bg-teal-100 text-teal-800" },
  "Day Program": { label: "Day Program", color: "bg-slate-100 text-slate-700" },
  "Other Meaningful Activity": { label: "Meaningful Activity", color: "bg-purple-100 text-purple-800" },
  "Unemployed — Not Seeking": { label: "Not Seeking Employment", color: "bg-slate-100 text-slate-500" },
  "Unemployed — Seeking": { label: "Seeking Employment", color: "bg-orange-100 text-orange-800" },
};