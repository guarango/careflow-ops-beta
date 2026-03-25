import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ArrowUpRight, FileText } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 99,
    limits: "Up to 25 clients · 10 staff seats",
    features: ["Core scheduling", "Timecards", "eMAR", "Session Notes", "Incidents", "Basic billing"],
    color: "border-border",
  },
  {
    id: "professional",
    name: "Professional",
    price: 299,
    limits: "Up to 150 clients · 50 staff seats",
    features: ["Everything in Starter", "EVV integration", "HR module", "Payroll", "Goals tracking", "Full compliance suite"],
    color: "border-primary",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 799,
    limits: "Unlimited clients & staff",
    features: ["Everything in Professional", "API access + webhooks", "Custom domain", "Priority support", "Custom integrations", "Dedicated CSM"],
    color: "border-accent",
  },
];

export default function AgencySubscription({ agency }) {
  const current = agency?.plan || "starter";

  return (
    <div className="space-y-6">
      {/* Current plan summary */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Current Subscription</h2>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${
            agency?.payment_status === "current" || !agency?.payment_status ? "bg-accent/10 text-accent border-accent/20" :
            agency?.payment_status === "past_due" ? "bg-destructive/10 text-destructive border-destructive/20" :
            "bg-muted text-muted-foreground"
          }`}>
            {agency?.payment_status || "current"}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            ["Plan", <span className="capitalize font-semibold text-primary">{current}</span>],
            ["Billing Cycle", <span className="capitalize">{agency?.billing_cycle || "monthly"}</span>],
            ["Next Billing", agency?.next_billing_date || "—"],
            ["Stripe Customer", agency?.stripe_customer_id ? <span className="font-mono text-xs">{agency.stripe_customer_id}</span> : "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <div className="font-medium text-foreground mt-1">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Available Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div key={plan.id} className={`bg-card border-2 rounded-xl p-5 relative ${plan.color} ${current === plan.id ? "ring-2 ring-primary/30" : ""}`}>
              {plan.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-primary text-white px-3 py-0.5 rounded-full font-semibold">Most Popular</span>}
              {current === plan.id && <span className="absolute top-3 right-3 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-semibold">Current</span>}
              <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
              <div className="mt-1 mb-3">
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{plan.limits}</p>
              <ul className="space-y-2 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {current !== plan.id && (
                <Button size="sm" variant={plan.popular ? "default" : "outline"} className="w-full gap-2">
                  <ArrowUpRight className="w-4 h-4" />
                  {PLANS.findIndex(p => p.id === current) < PLANS.findIndex(p => p.id === plan.id) ? "Upgrade" : "Downgrade"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoices placeholder */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Invoices</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">Invoice history is available via your Stripe billing portal. <button className="text-primary underline">Open Billing Portal</button></p>
      </div>
    </div>
  );
}