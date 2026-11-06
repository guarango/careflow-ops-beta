import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomFieldInput({ field, value, onChange }) {
  const v = value ?? "";
  switch (field.field_type) {
    case "long_text":
      return <Textarea value={v} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.help_text || ""} />;
    case "yes_no":
      return (
        <Select value={v || undefined} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
          </SelectContent>
        </Select>
      );
    case "dropdown":
      return (
        <Select value={v || undefined} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    case "date":
      return <Input type="date" value={v} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return <Input type="number" value={v} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <Input value={v} onChange={(e) => onChange(e.target.value)} placeholder={field.help_text || ""} />;
  }
}