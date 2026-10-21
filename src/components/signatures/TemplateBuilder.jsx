import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pen, Type, Calendar, Square, Trash2, Upload, Save, X, ArrowLeft,
  Plus, FileText
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const FIELD_TYPES = [
  { type: "signature", label: "Signature", icon: Pen, color: "text-blue-600" },
  { type: "initials", label: "Initials", icon: Type, color: "text-purple-600" },
  { type: "date", label: "Date", icon: Calendar, color: "text-emerald-600" },
  { type: "text", label: "Text", icon: FileText, color: "text-slate-600" },
  { type: "checkbox", label: "Checkbox", icon: Square, color: "text-amber-600" },
];

export default function TemplateBuilder({ template, onSave, onCancel }) {
  const { toast } = useToast();
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [docUrl, setDocUrl] = useState(template?.document_url || "");
  const [docName, setDocName] = useState(template?.document_name || "");
  const [docType, setDocType] = useState(template?.document_type || "pdf");
  const [signedUrl, setSignedUrl] = useState(null);
  const [fields, setFields] = useState(template?.fields || []);
  const [selectedField, setSelectedField] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const overlayRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  // Load signed URL when docUrl changes
  useEffect(() => {
    if (!docUrl) { setSignedUrl(null); return; }
    setLoadingUrl(true);
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: docUrl, expires_in: 3600 })
      .then(res => setSignedUrl(res.signed_url))
      .catch(() => setSignedUrl(null))
      .finally(() => setLoadingUrl(false));
  }, [docUrl]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadPrivateFile({ file });
      setDocUrl(res.file_uri);
      setDocName(file.name);
      const ext = file.name.split('.').pop().toLowerCase();
      setDocType(ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ext === "doc" ? "doc" : "image");
      toast({ title: "Document uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addField = (type) => {
    const newField = {
      id: `f_${Date.now()}`,
      type,
      x: 35,
      y: 50,
      width: type === "checkbox" ? 5 : type === "initials" ? 15 : 30,
      height: type === "checkbox" ? 5 : 8,
      page: 1,
      label: FIELD_TYPES.find(f => f.type === type)?.label || type,
      required: true,
    };
    setFields([...fields, newField]);
    setSelectedField(newField.id);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  // Drag logic
  const onFieldMouseDown = (e, field) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = overlayRef.current.getBoundingClientRect();
    setDragState({
      fieldId: field.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: field.x,
      origY: field.y,
      rectW: rect.width,
      rectH: rect.height,
    });
    setSelectedField(field.id);
  };

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const dx = ((e.clientX - dragState.startX) / dragState.rectW) * 100;
      const dy = ((e.clientY - dragState.startY) / dragState.rectH) * 100;
      const newX = Math.max(0, Math.min(90, dragState.origX + dx));
      const newY = Math.max(0, Math.min(92, dragState.origY + dy));
      updateField(dragState.fieldId, { x: newX, y: newY });
    };
    const onUp = () => setDragState(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState]);

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!docUrl) { toast({ title: "Upload a document first", variant: "destructive" }); return; }
    const data = {
      name: name.trim(),
      description: description.trim(),
      document_url: docUrl,
      document_name: docName,
      document_type: docType,
      page_count: 1,
      fields,
      status: "Active",
    };
    if (template?.id) {
      data.version = (template.version || 1) + 1;
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-slate-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              {template ? "Edit Template" : "New Template"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Upload a document and place signature fields
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> Save Template
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — field tools */}
        <div className="w-64 border-r bg-slate-50 p-4 space-y-4 overflow-y-auto">
          <div>
            <Label>Template Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Employee Handbook" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          {/* Upload */}
          <div>
            <Label>Document *</Label>
            {!docUrl ? (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Click to upload PDF or Word"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm truncate flex-1">{docName}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDocUrl(""); setDocName(""); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Field tools */}
          {docUrl && (
            <div>
              <Label>Add Fields</Label>
              <div className="space-y-2">
                {FIELD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => addField(ft.type)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <ft.icon className={`w-4 h-4 ${ft.color}`} />
                    <span className="text-sm">{ft.label}</span>
                    <Plus className="w-3 h-3 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Click a field type, then drag it to position on the document.
              </p>
            </div>
          )}

          {/* Selected field properties */}
          {selectedField && (() => {
            const f = fields.find(fld => fld.id === selectedField);
            if (!f) return null;
            return (
              <div className="space-y-2 p-3 bg-white border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Field Properties</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeField(f.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} className="h-8 text-sm" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} className="w-3.5 h-3.5" />
                  <span className="text-sm">Required</span>
                </label>
              </div>
            );
          })()}

          <div className="text-xs text-muted-foreground">
            {fields.length} field{fields.length !== 1 ? "s" : ""} placed
          </div>
        </div>

        {/* Document preview */}
        <div className="flex-1 overflow-auto bg-slate-200 p-6 flex justify-center">
          {loadingUrl ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-300 border-t-primary rounded-full animate-spin" />
            </div>
          ) : signedUrl ? (
            <div className="relative" style={{ width: "100%", maxWidth: "800px" }} ref={overlayRef}>
              <iframe
                src={signedUrl}
                className="w-full bg-white rounded shadow-lg"
                style={{ height: "1000px", border: "1px solid #e2e8f0" }}
                title="Document Preview"
              />
              {/* Field overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {fields.map(f => (
                  <div
                    key={f.id}
                    className={`absolute border-2 rounded cursor-move pointer-events-auto transition-shadow ${selectedField === f.id ? "border-primary shadow-lg z-10" : "border-blue-400 shadow"}`}
                    style={{
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      width: `${f.width}%`,
                      height: `${f.height}%`,
                      minHeight: "32px",
                      background: f.type === "checkbox" ? "rgba(251,191,36,0.1)" : "rgba(59,130,246,0.08)",
                    }}
                    onMouseDown={(e) => onFieldMouseDown(e, f)}
                    onClick={(e) => { e.stopPropagation(); setSelectedField(f.id); }}
                  >
                    <div className="flex items-center gap-1 px-1 h-full">
                      {f.type === "checkbox" && <Square className="w-3 h-3 text-amber-600" />}
                      {f.type === "signature" && <Pen className="w-3 h-3 text-blue-600" />}
                      {f.type === "initials" && <Type className="w-3 h-3 text-purple-600" />}
                      {f.type === "date" && <Calendar className="w-3 h-3 text-emerald-600" />}
                      <span className="text-[10px] truncate font-medium text-slate-700">{f.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">Upload a document to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}