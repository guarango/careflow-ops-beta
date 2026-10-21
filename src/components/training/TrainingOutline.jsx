import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Settings, Eye, BookOpen, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrainingOutline({ training, onSelectLesson, onSave, onOpenSettings, onBack }) {
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);

  const genId = () => Math.random().toString(36).slice(2, 11);

  const addSection = () => {
    const newSection = { id: genId(), title: newSectionTitle, lessons: [] };
    const sections = [...(training.sections || []), newSection];
    onSave(sections);
    setNewSectionTitle("");
    setAddingSection(false);
  };

  const addLesson = (sectionId) => {
    const sections = (training.sections || []).map(s =>
      s.id === sectionId
        ? { ...s, lessons: [...(s.lessons || []), { id: genId(), title: "New Lesson", content_blocks: [] }] }
        : s
    );
    onSave(sections);
  };

  const updateSectionTitle = (sectionId, title) => {
    const sections = (training.sections || []).map(s => s.id === sectionId ? { ...s, title } : s);
    onSave(sections);
  };

  const updateLessonTitle = (sectionId, lessonId, title) => {
    const sections = (training.sections || []).map(s =>
      s.id === sectionId
        ? { ...s, lessons: (s.lessons || []).map(l => l.id === lessonId ? { ...l, title } : l) }
        : s
    );
    onSave(sections);
  };

  const deleteSection = (sectionId) => {
    onSave((training.sections || []).filter(s => s.id !== sectionId));
  };

  const deleteLesson = (sectionId, lessonId) => {
    const sections = (training.sections || []).map(s =>
      s.id === sectionId
        ? { ...s, lessons: (s.lessons || []).filter(l => l.id !== lessonId) }
        : s
    );
    onSave(sections);
  };

  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col shrink-0">
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="px-2">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{training.title}</p>
          <p className="text-xs text-muted-foreground">
            {training.status === "Published" ? "Published" : "Draft"} · v{training.version}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="px-2" title="Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {(training.sections || []).map((section) => (
          <div key={section.id} className="space-y-0.5">
            <div className="flex items-center gap-1 group">
              <Input
                value={section.title}
                onChange={e => updateSectionTitle(section.id, e.target.value)}
                className="h-8 text-sm font-semibold bg-transparent border-transparent hover:border-border"
              />
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 px-1.5 h-8"
                onClick={() => deleteSection(section.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
            {(section.lessons || []).map((lesson) => (
              <div key={lesson.id} className="flex items-center gap-1 pl-4 group">
                <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                <button
                  onClick={() => onSelectLesson({ sectionId: section.id, lessonId: lesson.id })}
                  className={cn(
                    "flex-1 text-left text-sm px-2 py-1.5 rounded truncate transition-colors",
                    "hover:bg-accent",
                  )}
                >
                  {lesson.title}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({(lesson.content_blocks || []).length})
                  </span>
                </button>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 px-1.5 h-7"
                  onClick={() => deleteLesson(section.id, lesson.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="ml-4 text-xs h-7 text-muted-foreground"
              onClick={() => addLesson(section.id)}>
              <Plus className="w-3 h-3 mr-1" /> Add lesson
            </Button>
          </div>
        ))}

        {addingSection ? (
          <div className="flex items-center gap-1 p-1">
            <Input
              autoFocus
              value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              placeholder="Section title"
              className="h-8 text-sm"
              onKeyDown={e => { if (e.key === "Enter") addSection(); if (e.key === "Escape") setAddingSection(false); }}
            />
            <Button size="sm" onClick={addSection} className="h-8 px-2">Add</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setAddingSection(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add section
          </Button>
        )}
      </div>

      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs">
          <Eye className="w-3 h-3 mr-1" /> Preview as Staff
        </Button>
      </div>
    </div>
  );
}