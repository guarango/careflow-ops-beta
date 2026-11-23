import { base44 } from "@/api/base44Client";

/**
 * This app runs one agency. Audit entries carry that single agency's id so
 * attribution is never blank; no multi-agency separation is implied.
 */
let cachedAgencyId = null;

export async function getAgencyId() {
  if (cachedAgencyId !== null) return cachedAgencyId;
  try {
    const agencies = await base44.entities.Agency.list();
    cachedAgencyId = agencies?.[0]?.id || "";
  } catch (err) {
    cachedAgencyId = "";
  }
  return cachedAgencyId;
}