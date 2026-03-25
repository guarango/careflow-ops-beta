import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

const CHECKLIST = [
  "Agency profile configured",
  "Branding and colors set",
  "Subscription plan selected",
  "Admin user invited",
  "Service codes loaded",
  "EVV integration configured",
  "Staff invitations sent",
];

export default function WizardStep8Complete({ agencyName }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-accent" />
      </div>
      <h2 className="text-3xl font-bold text-foreground mb-2">You're Live! 🎉</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        <strong>{agencyName || "Your agency"}</strong> is fully configured and ready to go. A welcome email has been sent to your admin user.
      </p>

      <div className="bg-card border border-border rounded-xl p-6 text-left max-w-md mx-auto mb-8">
        <h3 className="font-semibold text-foreground mb-4">Setup Checklist</h3>
        <div className="space-y-3">
          {CHECKLIST.map(item => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild size="lg" className="gap-2">
          <Link to="/">Go to Dashboard <ArrowRight className="w-4 h-4" /></Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/agency-admin">Agency Settings</Link>
        </Button>
      </div>
    </div>
  );
}