import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function generateQuizFromPlan(bsp) {
  const questions = [];
  const behaviors = bsp.target_behaviors || [];

  if (behaviors.length > 0) {
    const b = behaviors[0];
    if (b.name && b.severity_mild) {
      questions.push({
        question: `Which of the following is an example of MILD "${b.name}"?`,
        options: [b.severity_mild, b.severity_moderate || "Any behavior that causes injury", "Behavior that resolves immediately on its own", "Refusal to participate in an activity"],
        correct_index: 0
      });
    }
    if (b.replacement_behavior?.definition) {
      questions.push({
        question: `What is the replacement behavior for "${b.name}"?`,
        options: [b.replacement_behavior.definition, "Ignoring the behavior completely", "Using physical redirection", "Removing the person from the activity"],
        correct_index: 0
      });
    }
    if (b.reactive_strategies?.length) {
      const mild = b.reactive_strategies.find(r => r.severity_tier === "Mild");
      if (mild?.contraindicated_responses?.length && mild.contraindicated_responses[0]) {
        questions.push({
          question: `Which of these responses should you NEVER use during a "${b.name}" episode?`,
          options: [mild.contraindicated_responses[0], "Stay calm and speak quietly", "Create physical space", "Use a preferred item to redirect"],
          correct_index: 0
        });
      }
    }
  }

  if (bsp.fba_summary_narrative) {
    questions.push({
      question: "Behaviors are best understood as:",
      options: ["A form of communication about unmet needs", "Intentional attempts to manipulate staff", "Signs of poor character or defiance", "Random events with no identifiable cause"],
      correct_index: 0
    });
  }

  questions.push({
    question: "Before being scheduled with a client, a DSP must:",
    options: ["Read and acknowledge the Behavior Support Plan AND pass the quiz", "Complete 8 hours of general training", "Get verbal approval from any colleague", "Review the incident log only"],
    correct_index: 0
  });

  return questions.slice(0, 5);
}

export default function BSPStaffAcknowledgment({ bsp, onUpdate, updating }) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const questions = bsp.staff_training?.quiz_questions?.length
    ? bsp.staff_training.quiz_questions
    : generateQuizFromPlan(bsp);

  const acknowledgments = bsp.staff_training?.acknowledgments || [];

  const handleSubmitQuiz = async () => {
    const user = await base44.auth.me();
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_index) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 80;

    if (passed) {
      const newAck = {
        staff_id: user?.id || "",
        staff_name: user?.full_name || "Staff",
        acknowledged_at: new Date().toISOString(),
        quiz_passed: true,
        quiz_score: score
      };
      const updated = {
        ...bsp,
        staff_training: {
          ...bsp.staff_training,
          quiz_questions: questions,
          acknowledgments: [...acknowledgments, newAck]
        }
      };
      onUpdate(updated);
    }
    setSubmitted(true);
  };

  const score = submitted ? Math.round((Object.entries(answers).filter(([i, a]) => questions[parseInt(i)]?.correct_index === a).length / questions.length) * 100) : null;
  const passed = score !== null && score >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-sm">Staff Training & Acknowledgments</p>
          <p className="text-xs text-muted-foreground">
            {acknowledgments.length} staff acknowledged · All assigned staff must pass before working with {bsp.client_name}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowQuiz(true)} className="gap-1.5">
          <BookOpen className="w-4 h-4" />Take Quiz & Acknowledge
        </Button>
      </div>

      {/* Acknowledgment table */}
      {acknowledgments.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No acknowledgments yet. Staff must read this BSP and pass the quiz before being cleared to work with {bsp.client_name}.
        </div>
      ) : (
        <div className="space-y-2">
          {acknowledgments.map((ack, i) => (
            <div key={i} className={cn("flex items-center justify-between px-3 py-2.5 rounded-xl border", ack.quiz_passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
              <div className="flex items-center gap-2">
                {ack.quiz_passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                <span className="text-sm font-medium">{ack.staff_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold", ack.quiz_passed ? "text-emerald-700" : "text-red-700")}>{ack.quiz_score}%</span>
                <span className="text-xs text-muted-foreground">{ack.acknowledged_at ? format(new Date(ack.acknowledged_at), "MMM d, yyyy") : ""}</span>
                <Badge variant="outline" className={ack.quiz_passed ? "text-emerald-700 border-emerald-300" : "text-red-700 border-red-300"}>
                  {ack.quiz_passed ? "Cleared" : "Failed"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Dialog */}
      <Dialog open={showQuiz} onOpenChange={v => { setShowQuiz(v); if (!v) { setSubmitted(false); setAnswers({}); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BSP Acknowledgment Quiz</DialogTitle>
            <p className="text-xs text-muted-foreground">Read the Behavior Support Plan for {bsp.client_name}, then answer all questions. You need 80% or higher to be cleared.</p>
          </DialogHeader>

          {!submitted ? (
            <div className="space-y-4">
              {questions.map((q, qi) => (
                <div key={qi} className="bg-muted/30 rounded-xl p-3">
                  <p className="text-sm font-medium mb-2">{qi + 1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => (
                      <button key={oi} type="button" onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                        className={cn("w-full text-left px-3 py-2 rounded-lg border text-sm transition-all",
                          answers[qi] === oi ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-white text-muted-foreground hover:border-primary/30"
                        )}
                      >{opt}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              {passed ? (
                <div>
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-xl font-bold text-emerald-700">Passed — {score}%</p>
                  <p className="text-sm text-muted-foreground mt-1">You are now cleared to work with {bsp.client_name}. Your acknowledgment has been recorded.</p>
                </div>
              ) : (
                <div>
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-xl font-bold text-red-700">Score: {score}%</p>
                  <p className="text-sm text-muted-foreground mt-1">You need 80% to pass. Please re-read the BSP and try again. Ask your supervisor if you have questions.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSubmitted(false); setAnswers({}); }}>Try Again</Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {!submitted && (
              <>
                <Button variant="outline" onClick={() => setShowQuiz(false)}>Cancel</Button>
                <Button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length < questions.length || updating}>
                  Submit & Acknowledge
                </Button>
              </>
            )}
            {submitted && passed && <Button onClick={() => setShowQuiz(false)}>Close</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}