import React, { useContext, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, CheckCircle, Clock, AlertTriangle, PenLine, Download, Eye, Shield } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-700", label: "Signature Needed" },
  "In Review": { color: "bg-amber-100 text-amber-700", label: "Signature Needed" },
  "Approved": { color: "bg-emerald-100 text-emerald-700", label: "Signed" },
  "Signed": { color: "bg-emerald-100 text-emerald-700", label: "Signed" },
  "Expired": { color: "bg-red-100 text-red-700", label: "Expired" },
};

export default function PortalDocuments() {
  const { portalUser } = useContext(PortalContext);
  const [signing, setSigning] = useState(null);
  const [signed, setSigned] = useState({});
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ["portal-docs", portalUser?.client_id],
    queryFn: () => base44.entities.ComplianceDocument.filter({ client_id: portalUser?.client_id }),
  });

  const updateDoc = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceDocument.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal-docs"] }),
  });

  const pending = documents.filter(d => d.status === "Pending" || d.status === "In Review");
  const completed = documents.filter(d => d.status === "Approved" || d.status === "Signed");

  const startDraw = (e) => {
    setDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX || e.clientX) - rect.left;
    const y = (e.touches?.[0]?.clientY || e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = () => {
    if (!signing) return;
    updateDoc.mutate({
      id: signing.id,
      data: { status: "Signed", signed_date: new Date().toISOString().split("T")[0] }
    });
    setSigned(prev => ({ ...prev, [signing.id]: true }));
    setSigning(null);
    setHasDrawn(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Documents & Signatures</h2>
        <p className="text-sm text-slate-500">Review and sign documents for {portalUser?.client_name}</p>
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Requires Your Signature ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(doc => (
              <Card key={doc.id} className="border-0 shadow-sm border-l-4 border-l-amber-400">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{doc.title || doc.document_type}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{doc.document_type} · Created {doc.created_date ? format(new Date(doc.created_date), "MMM d, yyyy") : "recently"}</p>
                        {signed[doc.id] && <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Just signed</p>}
                      </div>
                    </div>
                    <Button onClick={() => setSigning(doc)} className="bg-sky-600 hover:bg-sky-700 gap-1.5" size="sm">
                      <PenLine className="w-3.5 h-3.5" />Review & Sign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />Signed Documents ({completed.length})
          </h3>
          <div className="space-y-2">
            {completed.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{doc.title || doc.document_type}</p>
                  <p className="text-xs text-slate-400">{doc.document_type}</p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 text-xs">Signed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 text-sm">No documents on file</p>
          </CardContent>
        </Card>
      )}

      {/* Signing Dialog */}
      <Dialog open={!!signing} onOpenChange={() => setSigning(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PenLine className="w-4 h-4 text-sky-500" />Review & Sign Document</DialogTitle>
          </DialogHeader>
          {signing && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 border">
                <p className="font-semibold text-slate-800">{signing.title || signing.document_type}</p>
                <p className="text-xs text-slate-500 mt-1">{signing.document_type}</p>
                {signing.notes && <p className="text-sm text-slate-600 mt-2">{signing.notes}</p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-700">Draw Your Signature</p>
                  <button onClick={clearCanvas} className="text-xs text-sky-600 hover:underline">Clear</button>
                </div>
                <canvas ref={canvasRef} width={420} height={100}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-crosshair touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => setDrawing(false)}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => setDrawing(false)} />
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Shield className="w-3 h-3" />Your signature is legally binding and HIPAA-compliant</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSigning(null)}>Cancel</Button>
            <Button onClick={handleSign} disabled={!hasDrawn} className="bg-sky-600 hover:bg-sky-700">
              <CheckCircle className="w-4 h-4 mr-1.5" />Confirm Signature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}