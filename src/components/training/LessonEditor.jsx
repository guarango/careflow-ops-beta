import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Type, Video, ImageIcon, FileText, MessageSquare, ListChecks,
  Trash2, ArrowUp, ArrowDown, Plus
} from "lucide-react";
import ContentBlockEditor from "@/components/training/ContentBlockEditor";

const BLOCK_TYPES = [
  { type: "text", label: "Text", icon: Type },
  { type: "video", label: "Video", icon: Video },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "document", label: "Document", icon: FileText },
  { type: "response", label: "Response", icon: MessageSquare },
  { type: "assessment", label: "Assessment", icon: ListChecks },
];

export default function LessonEditor({ training, lesson, onSave }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);

  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Select a lesson to edit its content</p>
        </div>
      </div>
    );
  }

  const section = (training.sections || []).find(s => s.id === lesson.sectionId);
  const lessonData = section?.lessons?.find(l => l.id === lesson.lessonId);
  if (!lessonData) return null;

  const blocks = lessonData.content_blocks || [];
  const genId = () => Math.random().toString(36).slice(2, 11);

  const updateBlocks = (newBlocks) => {
    const sections = (training.sections || []).map(s => {
      if (s.id !== lesson.sectionId) return s;
      return {
        ...s,
        lessons: (s.lessons || []).map(l =>
          l.id === lesson.lessonId ? { ...l, content_blocks: newBlocks } : l
        ),
      };
    });
    onSave(sections);
  };

  const addBlock = (type) => {
    const newBlock = { id: genId(), type, title: "", required: true };
    if (type === "text") newBlock.text_content = "";
    if (type === "video") { newBlock.video_url = ""; newBlock.require_watch_to_end = false; }
    if (type === "image") { newBlock.image_uri = ""; newBlock.image_caption = ""; }
    if (type === "document") { newBlock.document_name = ""; newBlock.document_uri = ""; }
    if (type === "response") { newBlock.response_question = ""; newBlock.response_min_chars = 0; }
    if (type === "assessment") {
      newBlock.assessment_type = "multiple_choice";
      newBlock.assessment_options = ["", ""];
      newBlock.assessment_correct_index = 0;
      newBlock.passing_score_pct = 80;
      newBlock.retakes_allowed = true;
    }
    updateBlocks([...blocks, newBlock]);
    setShowAddMenu(false);
    setEditingBlockId(newBlock.id);
  };

  const updateBlock = (blockId, data) => {
    updateBlocks(blocks.map(b => b.id === blockId ? { ...b, ...data } : b));
  };

  const deleteBlock = (blockId) => {
    updateBlocks(blocks.filter(b => b.id !== blockId));
    if (editingBlockId === blockId) setEditingBlockId(null);
  };

  const moveBlock = (blockId, dir) => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    updateBlocks(newBlocks);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-3">
        <h2 className="text-lg font-semibold">{lessonData.title}</h2>

        {blocks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm mb-3">No content blocks yet</p>
          </div>
        )}

        {blocks.map((block, idx) => (
          <Card key={block.id} className={editingBlockId === block.id ? "border-primary" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Block {idx + 1} · {BLOCK_TYPES.find(b => b.type === block.type)?.label}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteBlock(block.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <ContentBlockEditor
                block={block}
                onChange={(data) => updateBlock(block.id, data)}
              />
            </CardContent>
          </Card>
        ))}

        {showAddMenu ? (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Choose content type</p>
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map(bt => {
                  const Icon = bt.icon;
                  return (
                    <Button key={bt.type} variant="outline" size="sm" onClick={() => addBlock(bt.type)}>
                      <Icon className="w-4 h-4 mr-1.5" /> {bt.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowAddMenu(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add content block
          </Button>
        )}
      </div>
    </div>
  );
}