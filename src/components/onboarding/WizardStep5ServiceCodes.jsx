import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Upload, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATE_TEMPLATES = {
  UT: [
    { code: "T2016", description: "Personal Care — Hourly", rate_type: "Hourly", rate: 22.5, service_type: "Community Living", funding_source: "Medicaid Waiver" },
    { code: "H2015", description: "Supported Living — Daily", rate_type: "Daily", rate: 185, service_type: "Residential", funding_source: "Medicaid Waiver" },
    { code: "H2023", description: "Supported Employment", rate_type: "Hourly", rate: 19.75, service_type: "Supported Employment", funding_source: "Medicaid Waiver" },
  ],
  CO: [
    { code: "T2016-CO", description: "In-Home Support Services", rate_type: "Hourly", rate: 24.0, service_type: "Community Living", funding_source: "Medicaid Waiver" },
    { code: "H2015-CO", description: "Residential Habilitation", rate_type: "Daily", rate: 210, service_type: "Residential", funding_source: "Medicaid Waiver" },
  ],
};

export default function WizardStep5ServiceCodes({ data, onNext, onBack }) {
  const { toast } = useToast();
  const [method, setMethod] = useState("template");
  const [importing, setImporting] = useState(false);

  const stateTemplate = STATE_TEMPLATES[data.state] || STATE_TEMPLATES.UT;

  const importTemplate = async () => {
    setImporting(true);
    await base44.entities.ServiceCode.bulkCreate(stateTemplate);
    setImporting(false);
    toast({ title: `${stateTemplate.length} service codes imported from ${data.state || "state"} template` });
  };

  const handleCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" }, description: { type: "string" },
                rate: { type: "number" }, rate_type: { type: "string" },
              }
            }
          }
        }
      }
    });
    if (result.status === "success" && result.output?.codes?.length) {
      await base44.entities.ServiceCode.bulkCreate(result.output.codes);
      toast({ title: `${result.output.codes.length} service codes imported from CSV` });
    }
    setImporting(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-1">Service Code Library</h2>
      <p className="text-muted-foreground mb-6">Set up the service codes your agency uses for billing and scheduling.</p>

      <div className="flex gap-3 mb-6">
        {["template", "csv", "skip"].map(m => (
          <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${method === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
            {m === "template" ? "State Template" : m === "csv" ? "Import CSV" : "Set Up Later"}
          </button>
        ))}
      </div>

      {method === "template" && (
        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">The following codes will be imported for <strong>{data.state || "your state"}</strong>:</p>
          <div className="bg-muted/30 rounded-xl divide-y divide-border overflow-hidden">
            {stateTemplate.map(code => (
              <div key={code.code} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-mono text-sm font-bold text-primary">{code.code}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{code.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">${code.rate}/{code.rate_type === "Hourly" ? "hr" : "day"}</p>
                  <p className="text-xs text-muted-foreground">{code.service_type}</p>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={importTemplate} disabled={importing} className="w-full gap-2">
            <FileText className="w-4 h-4" /> {importing ? "Importing..." : `Import ${stateTemplate.length} Service Codes`}
          </Button>
        </div>
      )}

      {method === "csv" && (
        <div className="mb-6">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload CSV file</p>
            <p className="text-xs text-muted-foreground mt-1">Columns: code, description, rate, rate_type</p>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </label>
        </div>
      )}

      {method === "skip" && (
        <div className="bg-muted/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-muted-foreground">You can configure service codes later in <strong>Settings → Service Codes</strong>.</p>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
        <Button onClick={() => onNext({ service_codes_configured: method !== "skip" })} className="gap-2">Continue <ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}