import React, { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PenLine, Type, CheckCircle2, Lock, Trash2, User, Clock } from "lucide-react";
import { format } from "date-fns";

export default function DrawnSignature({ recordId, recordType, onSignComplete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [activeTab, setActiveTab] = useState("draw");
  const [lastPos, setLastPos] = useState(null);

  const { data: existingSigs = [] } = useQuery({
    queryKey: ["signatures", recordId],
    queryFn: () => base44.entities.Signature.filter({ record_id: recordId }),
    enabled: !!recordId,
  });

  const signMutation = useMutation({
    mutationFn: (data) => base44.entities.Signature.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signatures", recordId] });
      clearCanvas();
      setTypedName("");
      onSignComplete?.();
    },
  });

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    setLastPos(getPos(e, canvas));
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
    setHasDrawn(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = () => {
    let sigData = "";
    let sigType = "typed";
    if (activeTab === "draw" && hasDrawn) {
      sigData = canvasRef.current.toDataURL();
      sigType = "drawn";
    } else if (activeTab === "type" && typedName) {
      sigData = typedName;
      sigType = "typed";
    } else return;

    signMutation.mutate({
      record_id: recordId,
      record_type: recordType,
      signer_id: user?.id,
      signer_name: user?.full_name || user?.email,
      signer_role: user?.role,
      signer_email: user?.email,
      signature_type: sigType,
      signature_data: sigData,
      signed_at: new Date().toISOString(),
      device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
    });
  };

  const userAlreadySigned = existingSigs.some(s => s.signer_id === user?.id);

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <PenLine className="w-4 h-4" />
        <span>E-Signature</span>
        {existingSigs.length > 0 && (
          <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10 text-xs">
            {existingSigs.length} signature{existingSigs.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Existing signatures */}
      {existingSigs.length > 0 && (
        <div className="space-y-2">
          {existingSigs.map(sig => (
            <div key={sig.id} className="flex items-start gap-3 py-2 px-3 rounded-md bg-background border border-border/50">
              <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{sig.signer_name}</span>
                  <Badge variant="outline" className="text-[10px]">{sig.signer_role}</Badge>
                  {sig.is_guardian && <Badge variant="outline" className="text-[10px] text-chart-4 border-chart-4/30">Guardian</Badge>}
                </div>
                {sig.signature_type === "drawn" && sig.signature_data && (
                  <img src={sig.signature_data} alt="Signature" className="h-8 mt-1 bg-white rounded border" />
                )}
                {sig.signature_type === "typed" && sig.signature_data && (
                  <p className="text-sm italic font-serif mt-1">{sig.signature_data}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy h:mm a") : "—"}
                  {sig.device_type && <span>· {sig.device_type}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sign panel */}
      {!userAlreadySigned && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1 gap-1"><PenLine className="w-3 h-3" />Draw</TabsTrigger>
            <TabsTrigger value="type" className="flex-1 gap-1"><Type className="w-3 h-3" />Type</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-2">
            <div className="relative border border-dashed border-border rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={480}
                height={120}
                className="w-full touch-none cursor-crosshair block"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-xs text-muted-foreground">Sign here using your mouse or finger</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearCanvas} className="gap-1">
                <Trash2 className="w-3 h-3" />Clear
              </Button>
              <Button size="sm" onClick={handleSign} disabled={!hasDrawn || signMutation.isPending} className="flex-1">
                {signMutation.isPending ? "Signing…" : "Apply Signature"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="type" className="space-y-2">
            <div>
              <Label className="text-xs">Type your full name</Label>
              <Input
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="Your full name"
                className="font-serif italic text-lg"
              />
            </div>
            <Button size="sm" onClick={handleSign} disabled={!typedName.trim() || signMutation.isPending} className="w-full">
              {signMutation.isPending ? "Signing…" : "Apply Signature"}
            </Button>
          </TabsContent>
        </Tabs>
      )}

      {userAlreadySigned && (
        <p className="text-xs text-center text-accent font-medium flex items-center justify-center gap-1">
          <Lock className="w-3 h-3" />Your signature has been recorded
        </p>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        By signing, you acknowledge this is a legally binding electronic signature.
      </p>
    </div>
  );
}