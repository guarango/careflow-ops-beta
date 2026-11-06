import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Archive, Lock } from "lucide-react";
import { fieldTypeLabel } from "@/lib/customFields";

export default function SortableFieldRow({ field, index, onEdit, onRetire }) {
  return (
    <Draggable draggableId={field.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-3 border border-border rounded-lg px-3 py-2 bg-card ${snapshot.isDragging ? "shadow-lg" : ""}`}
        >
          <span {...provided.dragHandleProps} className="text-muted-foreground cursor-grab" aria-label="Reorder">
            <GripVertical className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{field.label}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <Badge variant="outline" className="text-[10px]">{fieldTypeLabel(field.field_type)}</Badge>
              {field.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
              {field.admin_only && (
                <Badge variant="outline" className="text-[10px] gap-1"><Lock className="w-2.5 h-2.5" /> Admin only</Badge>
              )}
              {field.help_text && <span className="text-[11px] text-muted-foreground truncate">{field.help_text}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(field)}>
              <Pencil className="w-3 h-3 mr-1" />Edit
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => onRetire(field)}>
              <Archive className="w-3 h-3 mr-1" />Retire
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
}