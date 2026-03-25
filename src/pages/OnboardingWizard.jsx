import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Circle, ChevronRight, ChevronLeft, Activity } from "lucide-react";
import WizardStep1Profile from "@/components/onboarding/WizardStep1Profile";
import WizardStep2Branding from "@/components/onboarding/WizardStep2Branding";
import WizardStep3Plan from "@/components/onboarding/WizardStep3Plan";
import WizardStep4Admin from "@/components/onboarding/WizardStep4Admin";
import WizardStep5ServiceCodes from "@/components/onboarding/WizardStep5ServiceCodes";
import WizardStep6EVV from "@/components/onboarding/WizardStep6EVV";
import WizardStep7Staff from "@/components/onboarding/WizardStep7Staff";
import WizardStep8Complete from "@/components/onboarding/WizardStep8Complete";

const STEPS = [
  { id: 1, label: "Agency Profile" },
  { id: 2, label: "Branding" },
  { id: 3, label: "Plan & Payment" },
  { id: 4, label: "Admin User" },
  { id: 5, label: "Service Codes" },
  { id: 6, label: "EVV Setup" },
  { id: 7, label: "Invite Staff" },
  { id: 8, label: "Go Live!" },
];

export default function OnboardingWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [agencyId, setAgencyId] = useState(null);
  const [data, setData] = useState({});

  const createMutation = useMutation({
    mutationFn: (d) => agencyId
      ? base44.entities.Agency.update(agencyId, d)
      : base44.entities.Agency.create({ ...d, status: "onboarding", onboarding_completed: false }),
    onSuccess: (result) => {
      if (!agencyId && result?.id) setAgencyId(result.id);
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    },
  });

  const handleStepData = async (stepData) => {
    const merged = { ...data, ...stepData };
    setData(merged);
    await createMutation.mutateAsync(merged);
    if (step < 8) setStep(s => s + 1);
  };

  const handleComplete = async () => {
    await createMutation.mutateAsync({ ...data, status: "active", onboarding_completed: true, onboarding_step: 8 });
    toast({ title: "Agency is live!", description: "Welcome email sent to the admin." });
    setStep(8);
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-foreground">CareOps Pro</h1>
          <p className="text-xs text-muted-foreground">Agency Setup Wizard</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1">
        {/* Stepper sidebar */}
        <div className="lg:w-64 bg-card border-r border-border p-6 flex-shrink-0">
          <div className="mb-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            {STEPS.map((s) => (
              <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${step === s.id ? "bg-primary/10 text-primary font-medium" : step > s.id ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                {step > s.id
                  ? <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                  : <Circle className={`w-4 h-4 flex-shrink-0 ${step === s.id ? "text-primary" : "text-muted-foreground/30"}`} />
                }
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {step === 1 && <WizardStep1Profile data={data} onNext={handleStepData} />}
            {step === 2 && <WizardStep2Branding data={data} onNext={handleStepData} onBack={() => setStep(1)} />}
            {step === 3 && <WizardStep3Plan data={data} onNext={handleStepData} onBack={() => setStep(2)} />}
            {step === 4 && <WizardStep4Admin data={data} onNext={handleStepData} onBack={() => setStep(3)} />}
            {step === 5 && <WizardStep5ServiceCodes data={data} onNext={handleStepData} onBack={() => setStep(4)} />}
            {step === 6 && <WizardStep6EVV data={data} onNext={handleStepData} onBack={() => setStep(5)} />}
            {step === 7 && <WizardStep7Staff data={data} onNext={handleComplete} onBack={() => setStep(6)} />}
            {step === 8 && <WizardStep8Complete agencyName={data.name} />}
          </div>
        </div>
      </div>
    </div>
  );
}