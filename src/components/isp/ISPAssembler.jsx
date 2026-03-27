// Auto-assembly engine: pulls live data from goals, sessions, BSP, health, meds
// and pre-fills the ISP draft structure

const DOMAINS = [
  "Health & Wellness",
  "Communication",
  "Relationships & Social Connections",
  "Community Participation & Inclusion",
  "Employment & Day Activities",
  "Home & Daily Living Skills",
  "Safety & Rights",
  "Recreation & Leisure",
  "Self-Advocacy & Decision-Making",
];

const DOMAIN_GOAL_MAP = {
  "Health & Wellness": ["Health & Wellness"],
  "Communication": ["Communication"],
  "Relationships & Social Connections": ["Social Skills"],
  "Community Participation & Inclusion": ["Community Integration"],
  "Employment & Day Activities": ["Vocational/Employment"],
  "Home & Daily Living Skills": ["Activities of Daily Living"],
  "Safety & Rights": ["Behavioral Support"],
  "Recreation & Leisure": ["Leisure & Recreation"],
  "Self-Advocacy & Decision-Making": ["Self-Advocacy"],
};

export function assembleISPDraft({ client, goals, sessionNotes, bsp, medications, authorizations }) {
  const flags = [];

  // ─── Person's Voice ───
  const voiceEntries = goals
    .flatMap(g => [g.persons_own_words, g.connection_to_personal_outcome].filter(Boolean));
  const sessionHighlights = sessionNotes
    .flatMap(n => (n.goal_data || []).map(gd => gd.session_highlight).filter(Boolean));

  const personsVoice = {
    most_important_daily: voiceEntries[0] || "",
    what_to_know_before_supporting: goals.find(g => g.trauma_considerations)?.trauma_considerations || "",
    good_day_looks_like: sessionHighlights.slice(0, 3).join(" ") || "",
    bad_day_looks_like_and_helps: goals.find(g => g.preferred_strategies)?.preferred_strategies || "",
    dreams_and_vision: voiceEntries.slice(1, 3).join(" ") || "",
    proud_of_this_year: goals.filter(g => g.status === "Mastered").map(g => g.goal_title).join(", ") || "",
    wants_to_change_or_try: goals.filter(g => g.status === "Active").slice(0, 2).map(g => g.goal_title).join(", ") || "",
    communication_method: client.notes || "",
    aac_device_or_support: "",
    voice_capture_method: "Direct input at planning meeting and via ongoing goal documentation",
  };

  if (!voiceEntries.length) flags.push("Person's Voice section has no source data — ensure goal entries include 'Person's Own Words' field");

  // ─── Personal Profile ───
  const personalProfile = {
    preferred_communication: goals.find(g => g.domain === "Communication")?.goal_narrative || "",
    aac_systems: "",
    sensory_preferences: goals.flatMap(g => g.trauma_considerations ? [g.trauma_considerations] : []).join("; ") || "",
    cultural_background: "",
    spiritual_preferences: "",
    meaningful_relationships: client.guardian_name ? `Guardian: ${client.guardian_name}` : "",
    living_situation: client.address || "",
    daily_routine_preferences: goals.find(g => g.best_times_settings)?.best_times_settings || "",
    food_preferences_restrictions: "",
    known_triggers_and_helps: goals.flatMap(g => g.preferred_strategies ? [g.preferred_strategies] : []).join("; ") || "",
    what_people_who_know_me_say: "",
  };

  if (!personalProfile.meaningful_relationships) flags.push("Personal Profile: no relationships documented — add family, friends, and natural supports");

  // ─── Life Domains ───
  const lifeDomains = DOMAINS.map(domain => {
    const domainKeys = DOMAIN_GOAL_MAP[domain] || [];
    const domainGoals = goals.filter(g => domainKeys.includes(g.domain) && g.status === "Active");
    const masteredGoals = goals.filter(g => domainKeys.includes(g.domain) && g.status === "Mastered");

    const recentEntries = domainGoals
      .flatMap(g => (g.progress_entries || []).slice(-3));
    const avgScore = recentEntries.length
      ? (recentEntries.filter(e => e.score && !isNaN(parseFloat(e.score)))
          .reduce((a, e) => a + parseFloat(e.score), 0) /
          Math.max(recentEntries.filter(e => e.score && !isNaN(parseFloat(e.score))).length, 1)).toFixed(0) + "%"
      : "no data";

    const progressNarrative = domainGoals.length
      ? `${client.first_name} is working on ${domainGoals.length} active goal${domainGoals.length !== 1 ? "s" : ""} in this domain. Recent performance: ${avgScore}. ${masteredGoals.length ? `${masteredGoals.length} goal${masteredGoals.length !== 1 ? "s" : ""} mastered this plan year.` : ""}`
      : `No active goals documented in this domain for the current plan year.`;

    return {
      domain,
      current_function_narrative: progressNarrative,
      progress_narrative: masteredGoals.length
        ? `Achieved: ${masteredGoals.map(g => g.goal_title).join(", ")}.`
        : "Continued progress toward established goals.",
      strengths: domainGoals.flatMap(g => g.personal_strengths ? [g.personal_strengths] : []).join("; ") || "",
      additional_support_needed: domainGoals.length > 0 ? domainGoals.map(g => g.goal_title).join("; ") : "",
      persons_priorities: domainGoals.flatMap(g => g.persons_own_words ? [g.persons_own_words] : []).join("; ") || "",
      support_level: domainGoals.length === 0 ? "No Support" : domainGoals.length <= 1 ? "Intermittent" : domainGoals.length <= 3 ? "Limited" : "Extensive",
      staffing_ratio: "1:1",
      specialized_qualifications: "",
    };
  });

  // ─── Health Summary ───
  const activeMeds = medications.filter(m => m.status === "Active");
  const healthSummary = {
    primary_diagnosis: client.diagnosis || "",
    secondary_diagnoses: "",
    allergies: "",
    physician_contacts: "",
    hospitalizations_er: "",
    standing_health_orders: "",
    seizure_protocol: "",
    dietary_orders: "",
    health_trend_narrative: activeMeds.length
      ? `Currently prescribed ${activeMeds.length} medication${activeMeds.length !== 1 ? "s" : ""}: ${activeMeds.map(m => `${m.medication_name} ${m.dosage}`).join(", ")}.`
      : "No active medications documented.",
    health_changes_influencing_plan: "",
  };

  if (!client.diagnosis) flags.push("Health Summary: primary diagnosis not on file — update client record");

  // ─── BSP Summary ───
  const bspSummary = {
    bsp_status: bsp ? "Active BSP" : "No BSP",
    supervising_bcba: bsp?.supervising_bcba || "",
    supervising_bcba_credential: bsp?.bsp_author_credential || "",
    behavioral_summary_narrative: bsp
      ? `${client.first_name} has an active Behavior Support Plan authored by ${bsp.bsp_author || "the clinical team"} (${bsp.bsp_author_credential || ""}). The plan addresses ${(bsp.target_behaviors || []).length} target behavior${(bsp.target_behaviors || []).length !== 1 ? "s" : ""}.`
      : `No Behavior Support Plan is currently in effect for ${client.first_name}.`,
    restrictive_procedures_authorized: bsp?.includes_restrictive_procedures || false,
    restrictive_procedures_justification: "",
  };

  // ─── Service Grid ───
  const serviceGrid = authorizations.map(auth => {
    const utilPct = auth.used_units && auth.authorized_units
      ? Math.round((auth.used_units / auth.authorized_units) * 100)
      : null;
    const underutilized = utilPct !== null && utilPct < 70;
    if (underutilized) flags.push(`Service underutilization: "${auth.service_type || auth.service_code}" — ${utilPct}% of authorized units used. Explanation required.`);
    return {
      service_type: auth.service_type || auth.service_code || "",
      provider_agency: "",
      authorized_units_monthly: auth.authorized_units || 0,
      units_used_prior_year: auth.used_units || 0,
      utilization_pct: utilPct,
      funding_source: auth.funding_source || "",
      auth_start: auth.start_date || "",
      auth_end: auth.end_date || "",
      underutilized,
      underutilization_explanation: "",
      coordinator_notes: auth.notes || "",
    };
  });

  // ─── Signatures (default set) ───
  const signatures = [
    { role: "Person Receiving Services", name: `${client.first_name} ${client.last_name}`, email: "", status: "Pending", is_guardian_signing_for_person: false },
    { role: "Guardian / Legal Representative", name: client.guardian_name || "", email: "", status: "Pending", is_guardian_signing_for_person: false },
    { role: "Service Coordinator", name: "", email: "", status: "Pending" },
    { role: "Program Director", name: "", email: "", status: "Pending" },
    { role: "Provider Agency Representative", name: "", email: "", status: "Pending" },
  ];

  if (!client.guardian_name) {
    // Remove guardian block if no guardian
    signatures.splice(1, 1);
  }

  return {
    client_id: client.id,
    client_name: `${client.first_name} ${client.last_name}`,
    medicaid_id: client.insurance_id || "",
    status: "Draft",
    plan_type: "Annual Review",
    plan_year_start: new Date().toISOString().split("T")[0],
    plan_year_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
    waiver_type: "HCBS Waiver",
    service_coordinator_name: "",
    service_coordinator_agency: "",
    persons_voice: personsVoice,
    personal_profile: personalProfile,
    life_domains: lifeDomains,
    health_summary: healthSummary,
    bsp_summary: bspSummary,
    rights_risks: {
      guardianship_status: client.guardian_name ? "Full Guardianship" : "No Guardian",
      advance_directive_status: "None on File",
      dignity_of_risk: [],
      rights_statement: `${client.first_name} has the right to make choices about their own life, to be treated with dignity and respect, to participate fully in their community, and to receive supports that reflect their preferences and goals.`,
    },
    service_grid: serviceGrid,
    team_input: { attendees: [], member_priorities: [], unresolved_concerns: [], action_items: [], what_team_heard: "" },
    signatures,
    assembly_flags: flags,
    version: 1,
    version_history: [],
  };
}

export { DOMAINS };