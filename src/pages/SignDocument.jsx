import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import {
  FileSignature, CheckCircle2, Clock, AlertTriangle, Pen, Calendar,
  Type, Square, FileText, Shield, Loader2
} from "lucide-react";
import SignaturePad from "@/components/signatures/SignaturePad";

export default function SignDocument() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signedUrl, setSignedUrl] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [signatureData, setSignatureData] = useState(null);
  const overlayRef = useRef(null);

  const { data: request, isLoading } = useQuery({
    queryKey: ["sig-request", requestId],
    queryFn: () => base44.entities.SignatureRequest.get(requestId),
    enabled: !!requestId,
  });

  const { data: template } = useQuery({
    queryKey: ["sig-template-for-sign", request?.template_id],
    queryFn: () => base44.entities.SignatureTemplate.get(request.template_id),
    enabled: !!request?.template_id,
  });

  // Load signed URL for the document
  useEffect(() => {
    if (!template?.document_url) return;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: template.document_url, expires_in: 3600 })
      .then(res => setSignedUrl(res.signed_url))
      .catch(() => setSignedUrl(null));
  }, [template?.document_url]);

  // Mark as Viewed when opened
  useEffect(() => {
    if (request?.id && request.status === "Sent") {
      base44.entities.SignatureRequest.update(request.id, { status: "Viewed", viewed_at: new Date().toISOString() });
    }
  }, [request?.id, request?.status]);

  const fields = template?.fields || [];

  const handleFieldChange = (fieldId, value) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const allRequiredFilled = () => {
    if (!agreed || !signatureData) return false;
    for (const f of fields) {
      if (f.required && f.type !== "date") {
        if (!fieldValues[f.id]) return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!allRequiredFilled()) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Build field data array
      const fieldData = fields.map(f => ({
        field_id: f.id,
        type: f.type,
        value: f.type === "date"
          ? (fieldValues[f.id] || format(new Date(), "MM/dd/yyyy"))
          : (fieldValues[f.id] || ""),
      }));

      // Generate certificate PDF using jsPDF
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Electronic Signature Certificate", 105, y, { align: "center" });
      y += 10;

      doc.setDrawColor(200);
      doc.line(20, y, 190, y);
      y += 12;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Document: ${template.name}`, 20, y); y += 7;
      doc.text(`Signer: ${request.staff_name}`, 20, y); y += 7;
      doc.text(`Email: ${request.staff_email || "N/A"}`, 20, y); y += 7;
      doc.text(`Signed At: ${format(new Date(), "MM/dd/yyyy h:mm aa")}`, 20, y); y += 7;
      if (request.due_date) { doc.text(`Due Date: ${request.due_date}`, 20, y); y += 7; }
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.text("Field Values:", 20, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      for (const fd of fieldData) {
        const label = fields.find(f => f.id === fd.field_id)?.label || fd.type;
        const val = fd.type === "checkbox" ? (fd.value ? "Checked" : "Unchecked") : fd.value || "N/A";
        doc.text(`  ${label}: ${val}`, 20, y); y += 6;
        if (y > 250) { doc.addPage(); y = 20; }
      }
      y += 5;

      // Add signature image
      if (signatureData?.type === "drawn" && signatureData.data) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Signature:", 20, y); y += 7;
        try {
          const imgData = signatureData.data;
          doc.addImage(imgData, "PNG", 20, y, 60, 24);
        } catch (_) {}
        y += 30;
      } else if (signatureData?.type === "typed" && signatureData.data) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "italic");
        doc.text(`Signature: ${signatureData.data}`, 20, y);
        y += 10;
      }

      y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Document Fingerprint: ${request.id}_${Date.now()}`, 20, y); y += 5;
      doc.text("This document was signed electronically. The signer's identity was", 20, y); y += 5;
      doc.text("verified through their authenticated CareFlow Ops account.", 20, y); y += 5;
      doc.text("This certificate is appended as the final page of the signed record.", 20, y);

      // Upload the PDF
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], `${template.name}_signed.pdf`, { type: "application/pdf" });
      const uploadRes = await base44.integrations.Core.UploadPrivateFile({ file });

      // Call backend function to complete
      const res = await base44.functions.invoke("completeSignature", {
        request_id: request.id,
        field_data: fieldData,
        signature_data: signatureData,
        signed_pdf_uri: uploadRes.file_uri,
      });

      if (res.error) throw new Error(res.error);

      queryClient.invalidateQueries({ queryKey: ["sig-request", requestId] });
      toast({ title: "Document signed successfully!" });
    } catch (err) {
      toast({ title: "Signing failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <FileSignature className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Signature request not found.</p>
      </div>
    );
  }

  if (request.status === "Signed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Already Signed</h1>
        <p className="text-muted-foreground text-sm mb-4 text-center">
          This document was signed on {request.signed_at ? format(new Date(request.signed_at), "MM/dd/yyyy h:mm aa") : "—"}.
        </p>
      </div>
    );
  }

  if (request.status === "Voided") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-semibold mb-1">Document Voided</h1>
        <p className="text-muted-foreground text-sm">This signature request has been voided.</p>
      </div>
    );
  }

  const isOverdue = request.due_date && differenceInDays(parseISO(request.due_date), new Date()) < 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{template?.name || "Document"}</h1>
              <p className="text-xs text-muted-foreground">
                {request.staff_name} · Due {request.due_date || "—"}
                {isOverdue && <span className="text-red-600 font-medium ml-1">(Overdue)</span>}
              </p>
            </div>
          </div>
          <StatusPill status={request.status} overdue={isOverdue} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Document */}
        {signedUrl && (
          <div className="relative bg-white rounded-lg shadow-sm overflow-hidden" ref={overlayRef}>
            <iframe
              src={signedUrl}
              className="w-full bg-white"
              style={{ height: "1000px", border: "1px solid #e2e8f0" }}
              title="Document"
            />
            {/* Field overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {fields.map(f => (
                <div
                  key={f.id}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${f.x}%`,
                    top: `${f.y}%`,
                    width: `${f.width}%`,
                    minHeight: "40px",
                  }}
                >
                  <FieldInput field={f} value={fieldValues[f.id]} onChange={(val) => handleFieldChange(f.id, val)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature section */}
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Pen className="w-4 h-4 text-primary" />
              <h2 className="font-medium text-sm">Your Signature</h2>
            </div>
            <SignaturePad onChange={setSignatureData} value={signatureData} />

            {/* Agreement checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer p-3 bg-slate-50 rounded-lg border">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-slate-700">
                I agree that my electronic signature is as legally binding as a handwritten signature.
                I have reviewed the document above and am signing voluntarily.
              </span>
            </label>

            <div className="flex justify-end gap-2">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!allRequiredFilled() || submitting}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing...</>
                ) : (
                  <><Shield className="w-4 h-4 mr-2" />Sign Document</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Field Input Component ─────────────────────────────────────────────────
function FieldInput({ field, value, onChange }) {
  if (field.type === "date") {
    return (
      <Input
        type="text"
        value={value || format(new Date(), "MM/dd/yyyy")}
        readOnly
        className="h-8 text-xs bg-blue-50/50 border-blue-300"
      />
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-1 cursor-pointer bg-amber-50/50 border border-amber-300 rounded px-2 py-1 h-8">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="w-3.5 h-3.5"
        />
        <span className="text-xs">{field.label}</span>
      </label>
    );
  }
  if (field.type === "signature" || field.type === "initials") {
    return (
      <div className="border-2 border-dashed border-blue-300 bg-blue-50/30 rounded p-1 min-h-[40px]">
        {value ? (
          <div className="flex items-center gap-1">
            {value.type === "drawn" ? (
              <img src={value.data} alt="signature" className="h-8" />
            ) : (
              <span className="text-sm italic font-serif">{value.data}</span>
            )}
            <button onClick={() => onChange(null)} className="text-xs text-red-500 ml-auto">Clear</button>
          </div>
        ) : (
          <button
            onClick={() => {
              const name = prompt(`Enter your ${field.type === "initials" ? "initials" : "full name"}:`);
              if (name) onChange({ type: "typed", data: name });
            }}
            className="text-xs text-blue-600 hover:underline w-full text-center py-1"
          >
            Click to {field.type === "initials" ? "initial" : "sign"}
          </button>
        )}
      </div>
    );
  }
  // text
  return (
    <Input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.label}
      className="h-8 text-xs bg-white border-slate-300"
    />
  );
}

// ─── Status Pill ───────────────────────────────────────────────────────────
function StatusPill({ status, overdue }) {
  const effective = overdue ? "Overdue" : status;
  const styles = {
    Sent: "bg-blue-50 text-blue-700 border-blue-200",
    Viewed: "bg-amber-50 text-amber-700 border-amber-200",
    Signed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Overdue: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[effective] || styles.Sent}`}>
      {effective}
    </span>
  );
}