import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Lock } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS = {
  goal_progress: "Goal Progress Updates",
  session_highlights: "Session Highlights (Weekly Report)",
  health_updates: "Health & Medication Updates",
  incident_notifications: "Incident Notifications",
  schedule_information: "Schedule & Visit Information",
  photo_sharing: "Photo Sharing",
  financial_information: "Financial Information",
  weekly_highlight_report: "Weekly Highlight Report",
};

export default function PortalConsentView() {
  const { portalUser } = useContext(PortalContext);
  const firstName = portalUser?.client_name?.split(" ")[0] || "them";

  const { data: consents = [] } = useQuery({
    queryKey: ["portal-consent", portalUser?.id, portalUser?.client_id],
    queryFn: () => base44.entities.PortalConsent.filter({
      portal_user_id: portalUser?.id,
      client_id: portalUser?.client_id,
    }),
  });

  const active = consents.find(c => c.status === "Active");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Your Access & Privacy Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">What {firstName} has chosen to share with you through this portal</p>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex gap-3">
        <Lock className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-800">
          <p className="font-semibold">This portal is controlled by {firstName}.</p>
          <p className="mt-1 text-xs text-violet-700">The information you can see — and the information you can't — reflects choices {firstName} made, with whatever support they needed to understand and communicate those choices. If your access changes, you will be notified that a change has occurred. The reason belongs to {firstName}.</p>
        </div>
      </div>

      {!active ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 text-sm">No consent record found.</p>
            <p className="text-xs text-slate-400 mt-1">Contact the program to complete the consent process with {firstName}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" />
                Access Granted By {firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const granted = active.access_categories?.[key];
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700">{label}</span>
                    {granted
                      ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Shared</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-400"><XCircle className="w-3.5 h-3.5" />Not shared</span>
                    }
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-600">Consent Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Consent date</span>
                <span className="text-slate-700">{active.consent_date ? format(new Date(active.consent_date), "MMMM d, yyyy") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last reviewed</span>
                <span className="text-slate-700">{active.consent_reviewed_date ? format(new Date(active.consent_reviewed_date), "MMMM d, yyyy") : "Not yet reviewed"}</span>
              </div>
              {active.support_person_assisted && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Support during consent</span>
                  <span className="text-slate-700">{active.support_person_assisted}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Communication method</span>
                <span className="text-slate-700">{active.communication_method_used}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{firstName}'s involvement preference</span>
                <span className="text-slate-700 text-right max-w-[60%]">{active.person_involvement_preference}</span>
              </div>
              {active.guardianship_in_place && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                  <p className="text-xs font-semibold text-amber-800">Guardianship on record</p>
                  <p className="text-xs text-amber-700 mt-0.5">Areas of legal authority: {active.guardianship_authority_areas || "Not specified"}</p>
                  <p className="text-xs text-amber-600 mt-1">Guardianship does not automatically override {firstName}'s privacy preferences. Information outside the areas of legal authority remains subject to {firstName}'s own consent.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}