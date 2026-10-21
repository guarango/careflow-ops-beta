import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShieldAlert, Calendar, FileText, Upload, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const REQUIRED_FIELDS = [
  { key: "informed_consent", label: "a. Informed Consent of the Person", placeholder: "Document that the person (or legal representative) gave informed consent. Include date and method of consent." },
  { key: "assessed_need", label: "b. Specific, Individualized Assessed Need", placeholder: "Describe the specific assessed need that justifies this restriction. Must be individualized, not blanket." },
  { key: "positive_interventions", label: "c. Positive Interventions & Supports Used Before", placeholder: "List positive interventions and supports attempted before this modification was considered." },
  { key: "less_intrusive_methods", label: "d. Less Intrusive Methods Tried That Did Not Work", placeholder: "Document less intrusive methods that were tried and why they did not work." },
  { key: "condition_description", label: "e. Description of the Condition (Proportionate to Need)", placeholder: "Describe the restriction itself — the specific conditions under which it applies. Must be proportionate to the assessed need." },
  { key: "data_collection_method", label: "f. How Data Is Collected & Reviewed", placeholder: "Describe the data collection method and review schedule to measure effectiveness of the restriction." },
  { key: "no_harm_assurance", label: "h. Assurance That Interventions Cause No Harm", placeholder: "Provide assurance that the intervention causes no harm to the person. Reference any monitoring or safeguards." },
];

function RestrictionCard({ restriction, index, onChange, onRemove, onUploadDoc }) {
  const isComplete = REQUIRED_FIELDS.every(f => restriction[f.key]?.trim());
  const reviewDate = restriction.review_date;
  const daysUntilReview = reviewDate ? differenceInDays(new Date(reviewDate), new Date()) : null;

  const set = (k, v) => {
    const updated = { ...restriction, [k]: v };
    onChange(index, updated);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await onUploadDoc(file, index);
    if (result) {
      const docs = restriction.attached_document_urls || [];
      set("attached_document_urls", [...docs, result.file_uri]);
    }
  };

  return (
    <Card className={cn("border-2", isComplete ? "border-emerald-200" : "border-amber-300")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <Input
              value={restriction.restriction_type || ""}
              onChange={e => set("restriction_type", e.target.value)}
              placeholder="Restriction type (e.g. Physical restraint, Environmental restriction)"
              className="h-8 text-sm font-semibold border-0 px-0"
            />
          </div>
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-0.5" />Complete</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-xs">Incomplete</Badge>
            )}
            <button type="button" onClick={() => onRemove(index)} className="text-destructive hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key}>
              <Label className="text-xs font-medium">{field.label}</Label>
              <Textarea
                value={restriction[field.key] || ""}
                onChange={e => set(field.key, e.target.value)}
                rows={2}
                placeholder={field.placeholder}
                className={cn("text-sm mt-0.5", restriction[field.key]?.trim() ? "border-emerald-200" : "border-amber-200")}
              />
            </div>
          ))}

          {/* Field g: Review date */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> g. Time Limit / Next Review Date *
            </Label>
            <Input
              type="date"
              value={restriction.review_date || ""}
              onChange={e => set("review_date", e.target.value)}
              className="h-8 text-sm mt-0.5"
            />
            {daysUntilReview !== null && (
              <p className={cn("text-xs mt-1", daysUntilReview < 0 ? "text-red-600 font-semibold" : daysUntilReview <= 30 ? "text-amber-600" : "text-muted-foreground")}>
                {daysUntilReview < 0 ? `⚠ Overdue by ${Math.abs(daysUntilReview)} days` : `Review due in ${daysUntilReview} days`}
              </p>
            )}
          </div>

          {/* HRC Approval */}
          <div>
            <Label className="text-xs font-medium">Human Rights Committee Approval Date</Label>
            <Input
              type="date"
              value={restriction.hrc_approval_date || ""}
              onChange={e => set("hrc_approval_date", e.target.value)}
              className="h-8 text-sm mt-0.5"
            />
          </div>

          {/* Attached documents */}
          <div>
            <Label className="text-xs font-medium flex items-center gap-1">
              <FileText className="w-3 h-3" /> Attached Documents
            </Label>
            <div className="space-y-1 mt-1">
              {(restriction.attached_document_urls || []).map((url, di) => (
                <div key={di} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1 text-xs">
                  <span className="truncate flex-1">{url.split("/").pop()}</span>
                  <button type="button" onClick={() => set("attached_document_urls", (restriction.attached_document_urls || []).filter((_, idx) => idx !== di))} className="text-destructive ml-2">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer mt-1.5 hover:underline">
              <Upload className="w-3.5 h-3.5" /> Upload document
              <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HumanRightsRestrictionForm({ restrictions = [], onChange, onUploadDoc }) {
  const add = () => {
    const newR = { restriction_type: "", informed_consent: "", assessed_need: "", positive_interventions: "", less_intrusive_methods: "", condition_description: "", data_collection_method: "", review_date: "", no_harm_assurance: "", hrc_approval_date: "", attached_document_urls: [] };
    onChange([...restrictions, newR]);
  };
  const update = (idx, updated) => {
    const arr = [...restrictions];
    arr[idx] = updated;
    onChange(arr);
  };
  const remove = (idx) => onChange(restrictions.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div className="text-xs text-red-800">
          <strong>Human Rights Restrictions.</strong> Each restriction must have all 8 required fields documented,
          plus HRC approval date and supporting documents. Managers are notified before each review date.
        </div>
      </div>

      {restrictions.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground">
          No rights restrictions documented.
          <br />
          <button type="button" onClick={add} className="text-primary hover:underline mt-1 text-sm">Add a restriction →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {restrictions.map((r, i) => (
            <RestrictionCard
              key={i}
              restriction={r}
              index={i}
              onChange={update}
              onRemove={remove}
              onUploadDoc={onUploadDoc}
            />
          ))}
        </div>
      )}

      <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1.5 mt-4">
        <Plus className="w-4 h-4" />Add Restriction
      </Button>
    </div>
  );
}