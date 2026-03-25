import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

const PLANS = [
  { id: "starter", name: "Starter", price: 99, limits: "25 clients · 10 staff", features: ["Core scheduling", "Timecards", "eMAR", "Session Notes"] },
  { id: "professional", name: "Professional", price: 299, limits: "150 clients · 50 staff", features: ["Everything in Starter", "EVV", "HR module", "Payroll"], popular: true },
  { id: "enterprise", name: "Enterprise", price: 799, limits: "Unlimited", features: ["Everything in Professional", "API access", "Custom domain", "Priority support"] },
];

export default function WizardStep3Plan({ data, onNext, onBack }) {
  const [plan, setPlan] = useState(data.plan || "professional");
  const [cycle, setCycle] = useState(data.billing_cycle || "monthly");

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Choose Your Plan</h2>
      <p className="text-muted-foreground mb-6">Select the plan that best fits your agency. You can upgrade anytime.</p>

      <div className="flex gap-2 mb-6">
        {["monthly", "annual"].map(c => (
          <button key={c} onClick={() => setCycle(c)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${cycle === c ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
            {c.charAt(0).toUpperCase() + c.slice(1)} {c === "annual" && <span className="text-xs opacity-75 ml-1">Save 20%</span>}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {PLANS.map(p => (
          <button key={p.id} onClick={() => setPlan(p.id)} className={`text-left border-2 rounded-xl p-4 transition-all ${plan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
            {p.popular && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-semibold">Popular</span>}
            <h3 className="font-bold text-foreground text-lg mt-2">{p.name}</h3>
            <div className="my-2">
              <span className="text-2xl font-bold text-foreground">${cycle === "annual" ? Math.round(p.price * 0.8) : p.price}</span>
              <span className="text-muted-foreground text-sm">/mo</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{p.limits}</p>
            <ul className="space-y-1.5">
              {p.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                  <CheckCircle2 className="w-3 h-3 text-accent flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      <div className="bg-muted/30 rounded-xl p-4 mb-6 text-sm text-muted-foreground">
        <strong className="text-foreground">14-day free trial</strong> included. No credit card required to start. You'll be asked for payment details before your trial ends.
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={() => onNext({ plan, billing_cycle: cycle })} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}