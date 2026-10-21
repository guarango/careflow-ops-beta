import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ContentBlockEditor({ block, onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      if (block.type === "video") onChange({ video_file_uri: file_uri });
      else if (block.type === "image") onChange({ image_uri: file_uri });
      else if (block.type === "document") onChange({ document_uri: file_uri, document_name: file.name });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Block title (optional)</Label>
        <Input value={block.title || ""} onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Introduction" className="h-8 text-sm" />
      </div>

      {block.type === "text" && (
        <div className="space-y-1">
          <Label className="text-xs">Text content</Label>
          <Textarea value={block.text_content || ""} onChange={e => onChange({ text_content: e.target.value })}
            rows={5} placeholder="Write your lesson content here..." />
        </div>
      )}

      {block.type === "video" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Video URL (YouTube, Vimeo, etc.)</Label>
            <Input value={block.video_url || ""} onChange={e => onChange({ video_url: e.target.value })}
              placeholder="https://..." className="h-8 text-sm" />
          </div>
          <div className="text-xs text-muted-foreground text-center">— or —</div>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent/50">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : block.video_file_uri ? "Replace video file" : "Upload video file"}
            </span>
            <input type="file" accept="video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <div className="flex items-center gap-2">
            <Switch checked={block.require_watch_to_end || false}
              onCheckedChange={v => onChange({ require_watch_to_end: v })} />
            <Label className="text-xs">Require watching to the end</Label>
          </div>
        </>
      )}

      {block.type === "image" && (
        <>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent/50">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : block.image_uri ? "Replace image" : "Upload image"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {block.image_uri && (
            <img src={block.image_uri} alt="" className="max-h-40 rounded border" />
          )}
          <div className="space-y-1">
            <Label className="text-xs">Caption</Label>
            <Input value={block.image_caption || ""} onChange={e => onChange({ image_caption: e.target.value })}
              placeholder="Image caption" className="h-8 text-sm" />
          </div>
        </>
      )}

      {block.type === "document" && (
        <>
          <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-accent/50">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {uploading ? "Uploading..." : block.document_uri ? `Replace (${block.document_name || "file"})` : "Upload document (PDF, Word, PowerPoint)"}
            </span>
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          {block.document_uri && (
            <p className="text-xs text-green-600">✓ {block.document_name || "Document"} uploaded</p>
          )}
        </>
      )}

      {block.type === "response" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Question</Label>
            <Textarea value={block.response_question || ""} onChange={e => onChange({ response_question: e.target.value })}
              rows={2} placeholder="e.g. Describe the steps for proper handwashing" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Minimum characters required</Label>
            <Input type="number" value={block.response_min_chars || 0}
              onChange={e => onChange({ response_min_chars: Number(e.target.value) })} className="h-8 text-sm" />
          </div>
        </>
      )}

      {block.type === "assessment" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Question</Label>
            <Textarea value={block.assessment_question || ""} onChange={e => onChange({ assessment_question: e.target.value })}
              rows={2} placeholder="e.g. What is the correct handwashing duration?" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Assessment type</Label>
            <Select value={block.assessment_type || "multiple_choice"}
              onValueChange={v => onChange({
                assessment_type: v,
                assessment_options: v === "true_false" ? ["True", "False"] : block.assessment_options?.length >= 2 ? block.assessment_options : ["", ""],
                assessment_correct_index: 0,
              })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(block.assessment_type !== "true_false") && (
            <div className="space-y-2">
              <Label className="text-xs">Options (select the correct one)</Label>
              {(block.assessment_options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => onChange({ assessment_correct_index: i })}
                    className={`w-4 h-4 rounded-full border-2 shrink-0 ${block.assessment_correct_index === i ? "border-primary bg-primary" : "border-muted"}`}
                  />
                  <Input value={opt} onChange={e => {
                    const opts = [...(block.assessment_options || [])];
                    opts[i] = e.target.value;
                    onChange({ assessment_options: opts });
                  }} className="h-8 text-sm" placeholder={`Option ${i + 1}`} />
                  {(block.assessment_options || []).length > 2 && (
                    <button onClick={() => {
                      const opts = (block.assessment_options || []).filter((_, idx) => idx !== i);
                      const correct = block.assessment_correct_index === i ? 0 : block.assessment_correct_index > i ? block.assessment_correct_index - 1 : block.assessment_correct_index;
                      onChange({ assessment_options: opts, assessment_correct_index: correct });
                    }}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs h-7"
                onClick={() => onChange({ assessment_options: [...(block.assessment_options || []), ""] })}>
                + Add option
              </Button>
            </div>
          )}
          {block.assessment_type === "true_false" && (
            <div className="flex items-center gap-3">
              <Label className="text-xs">Correct answer:</Label>
              <Select value={String(block.assessment_correct_index || 0)}
                onValueChange={v => onChange({ assessment_correct_index: Number(v) })}>
                <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">True</SelectItem>
                  <SelectItem value="1">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Passing score (%)</Label>
              <Input type="number" value={block.passing_score_pct || 80}
                onChange={e => onChange({ passing_score_pct: Number(e.target.value) })} className="h-8 text-sm" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={block.retakes_allowed !== false}
                onCheckedChange={v => onChange({ retakes_allowed: v })} />
              <Label className="text-xs">Retakes allowed</Label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}