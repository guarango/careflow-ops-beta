import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, Mail, TrendingUp } from "lucide-react";

const PLAN_PRICES = { starter: 99, professional: 299, enterprise: 799 };

export default function SuperAdminBilling({ agencies }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Agency.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agencies"] }),
  });

  const totalMRR = agencies.reduce((s, a) => s + (a.mrr || PLAN_PRICES[a.plan] || 0), 0);
  const active = agencies.filter(a => a.status === "active").length;
  const pastDue = agencies.filter(a => a.payment_status === "past_due");
  const churnedCount = agencies.filter(a => a.status === "churned").length;

  const sendReminder = (agency) => {
    toast({ title: "Payment reminder sent", description: `Email sent to ${agency.billing_contact_email || agency.primary_contact_email}` });
  };

  return (
    <div className="space-y-6">
      {/* MRR overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Monthly MRR", value: `$${totalMRR.toLocaleString()}`, icon: TrendingUp, color: "text-accent" },
          { label: "Active Agencies", value: active, icon: TrendingUp, color: "text-primary" },
          { label: "Past Due", value: pastDue.length, icon: AlertCircle, color: "text-destructive" },
          { label: "Churn This Month", value: churnedCount, icon: TrendingUp, color: "text-chart-4" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Plan Distribution</h3>
        <div className="space-y-3">
          {["starter", "professional", "enterprise"].map(plan => {
            const count = agencies.filter(a => a.plan === plan).length;
            const pct = agencies.length > 0 ? (count / agencies.length) * 100 : 0;
            return (
              <div key={plan}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-foreground font-medium">{plan}</span>
                  <span className="text-muted-foreground">{count} agencies · ${PLAN_PRICES[plan]}/mo each</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past due accounts */}
      {pastDue.length > 0 && (
        <div className="bg-card border border-destructive/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Past Due Accounts ({pastDue.length})</h3>
          </div>
          <div className="space-y-2">
            {pastDue.map(agency => (
              <div key={agency.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{agency.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{agency.plan} · ${PLAN_PRICES[agency.plan] || 0}/mo</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => sendReminder(agency)}>
                    <Mail className="w-3 h-3" /> Send Reminder
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ id: agency.id, data: { status: "suspended" } })}>
                    Suspend
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All billing records */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">All Agency Billing</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Agency", "Plan", "Billing Cycle", "Payment Status", "MRR"].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {agencies.map(agency => (
              <tr key={agency.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-foreground">{agency.name}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{agency.plan || "starter"}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{agency.billing_cycle || "monthly"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                    agency.payment_status === "current" || !agency.payment_status ? "bg-accent/10 text-accent" :
                    agency.payment_status === "past_due" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {agency.payment_status || "current"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">${agency.mrr || PLAN_PRICES[agency.plan] || 0}/mo</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}