import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pen, Type, Eraser, Check } from "lucide-react";

export default function SignaturePad({ onChange, value }) {
  const [mode, setMode] = useState(value?.type || "draw");
  const [drawn, setDrawn] = useState(value?.type === "drawn" ? value.data : null);
  const [typed, setTyped] = useState(value?.type === "typed" ? value.data : "");
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const hasContent = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    hasContent.current = true;
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (hasContent.current) {
      const data = canvasRef.current.toDataURL("image/png");
      setDrawn(data);
      onChange({ type: "drawn", data });
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    setDrawn(null);
    onChange(null);
  };

  const handleType = (val) => {
    setTyped(val);
    if (val.trim()) {
      onChange({ type: "typed", data: val });
    } else {
      onChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "draw" ? "default" : "outline"}
          onClick={() => setMode("draw")}
        >
          <Pen className="w-3.5 h-3.5 mr-1" /> Draw
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "type" ? "default" : "outline"}
          onClick={() => setMode("type")}
        >
          <Type className="w-3.5 h-3.5 mr-1" /> Type
        </Button>
        {mode === "draw" && drawn && (
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            <Eraser className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      {mode === "draw" ? (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-2 bg-slate-50">
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            className="w-full touch-none cursor-crosshair bg-white rounded"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <p className="text-xs text-muted-foreground text-center mt-1">
            {drawn ? "Signature captured" : "Sign above using your mouse or finger"}
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-white">
          <input
            type="text"
            value={typed}
            onChange={(e) => handleType(e.target.value)}
            placeholder="Type your full name"
            className="w-full text-2xl font-serif italic border-0 border-b border-slate-200 focus:ring-0 focus:border-primary bg-transparent pb-2"
            style={{ fontFamily: "'Brush Script MT', cursive, serif" }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {typed ? "Signature captured" : "Type your name to sign"}
          </p>
        </div>
      )}
    </div>
  );
}