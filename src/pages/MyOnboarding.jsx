import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMyStaffRecord } from "@/hooks/useMyStaffRecord";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut } from "lucide-react";
import StepConfirmInfo from "@/components/onboarding/staff/StepConfirmInfo";
import StepEmergencyContact from "@/components/onboarding/staff/StepEmergencyContact";
import StepNotifications from "@/components/onboarding/staff/StepNotifications";
import StepDocuments from "@/components/onboarding/staff/StepDocuments";

/**
 * First-login onboarding. Required before any other page (StaffOnboardingGuard).
 * Progress is saved to the StaffMember after every step, so closing the app
 * resumes at the same step.
 */
export default function MyOnboarding() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading: loadingStaff } = useMyStaffRecord();
  const [stepIndex, setStepIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: requests = [], isFetching: loadingDocs, refetch } = useQuery({
    queryKey: ["my-onboarding-docs", staff?.id],
    queryFn: () => base44.entities.SignatureRequest.filter({ staff_id: staff.id }),
    enabled: !!staff?.id,
  });

  const steps = useMemo(() => {
    const list = [
      { key: "info", title: "Confirm your info", hint: "Make sure we can reach you.", Comp: StepConfirmInfo },
      { key: "emergency", title: "Emergency contact", hint: "Who we call if something happens.", Comp: StepEmergencyContact },
      { key: "notifications", title: "Notifications", hint: "Pick how CareFlow reaches you.", Comp: StepNotifications },
    ];
    if (requests.some((r) => r.status !== "Voided")) {
      list.push({ key: "documents", title: "Sign your documents", hint: "These came with your invite.", Comp: StepDocuments });
    }
    return list;
  }, [requests]);

  // Resume where they left off.
  useEffect(() => {
    if (stepIndex !== null) return;
    if (!staff || loadingDocs) return;
    const saved = Number(staff.onboarding_step || 0);
    setStepIndex(Math.max(0, Math.min(saved, steps.length - 1)));
  }, [staff, loadingDocs, steps.length, stepIndex]);

  useEffect(() => {
    if (staff?.onboarding_completed_at) navigate("/", { replace: true });
  }, [staff?.onboarding_completed_at]);

  const saveProgress = async (payload, nextStep, complete = false) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("updateMyStaffProfile", {
        ...payload,
        onboarding_step: nextStep,
        ...(complete ? { onboarding_completed: true } : {}),
      });
      if (res.data?.error) throw new Error(res.data.error);
      await queryClient.invalidateQueries({ queryKey: ["my-staff", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error) {
      toast({ title: "Could not save your progress", description: error.message, variant: "destructive" });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async (payload) => {
    const next = stepIndex + 1;
    try {
      await saveProgress(payload, next);
      setStepIndex(next);
    } catch {
      /* toast already shown */
    }
  };

  const handleFinish = async () => {
    try {
      await saveProgress({}, steps.length, true);
      navigate("/", { replace: true });
    } catch {
      /* toast already shown */
    }
  };

  if (!loadingStaff && !staff) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No staff record is linked to your account yet. Contact your agency administrator.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />Sign out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stepIndex === null || !staff) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const step = steps[stepIndex];
  const StepComponent = step.Comp;
  const progress = ((stepIndex) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">CareFlow Ops</p>
          <h1 className="mt-1 text-2xl font-semibold">Welcome{staff.preferred_name ? `, ${staff.preferred_name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">A few details before you get started.</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Step {stepIndex + 1} of {steps.length}</span>
            <span>{step.title}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="text-sm text-muted-foreground">{step.hint}</p>
            </div>

            {step.key === "documents" ? (
              <StepDocuments
                requests={requests}
                saving={saving}
                refreshing={loadingDocs}
                onRefresh={() => refetch()}
                onFinish={handleFinish}
              />
            ) : (
              <StepComponent staff={staff} saving={saving} onNext={handleNext} />
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Your progress is saved automatically.</span>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" />Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}