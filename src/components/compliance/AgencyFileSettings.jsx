import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Plus, FileText, Trash2 } from "lucide-react";
import { expiryStatus, daysUntil } from "./complianceStatus";

const AGENCY_ITEMS = [
  { item_name: "DHHS Certification or License", category: "Certification", sort_order: 1 },
  { item_name: "Human Rights Committee Meeting Minutes & Attendance", category: "Committee", sort_order: 2 },
  { item_name: "Emergency Management & Business Continuity Plan", category: "Plan", sort_order: 3 },
  { item_name: "Internal Quality Management Plan", category: "Plan", sort_order: 4 },
  { item_name: "Conflict-of-Interest Process", category: "Process", sort_order: 5 },
  { item_name: "No-Gifts / No-Purchases Process", category: "Process", sort_order: 6 },
  { item_name: "Incident Reporting Process", category: "Process", sort_order: 7 },
  { item_name: "Liability Insurance - General", category: "Insurance", sort_order: 8 },
  { item_name: "Liability Insurance - Professional", category: "Insurance", sort_order: 9 },
  { item_name: "Liability Insurance - Auto", category: "Insurance", sort_order: 10 },
  { item_name: "Loan Disclosures ($2,000+)", category: "Disclosure", sort_order: 11 },
];

export default function AgencyFileSettings({ user }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: "", category: "Process" });

  const { data: items = [] } = useQuery({
    queryKey: ["agency-file-items"],
    queryFn: () => base44.entities.AgencyFileItem.list("sort_order"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgencyFileItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agency-file-items"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AgencyFileItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["agency-file-items"] }); setShowAdd(false); setNewItem({ item_name: "", category: "Process" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgencyFileItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agency-file-items"] }),
  });

  const ensureItems = () => {
    const existingNames = items.map(i => i.item_name);
    const missing = AGENCY_ITEMS.filter(item => !existingNames.includes(item.item_name));
    if (missing.length > 0) {
      missing.forEach(item => createMutation.mutate({ ...item, status: "N/A" }));
    }
  };

  const handleUpload = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(itemId);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    updateMutation.mutate({ id: itemId, data: { document_url: file_uri, document_name: file.name, status: "Current", last_reviewed_date: new Date().toISOString().split("T")[0], reviewed_by: user?.full_name || user?.email } });
    setUploading(null);
  };

  const sortedItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const currentCount = items.filter(i => i.status === "Current").length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{currentCount}/{totalCount} items current</p>
        <div className="flex gap-2">
          {items.length < AGENCY_ITEMS.length && <Button variant="outline" size="sm" onClick={ensureItems}>Initialize Checklist</Button>}
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1"><Plus className="w-3 h-3" /> Add Item</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {sortedItems.map(item => {
          const status = item.expiration_date ? expiryStatus(item.expiration_date) : (item.status === "Current" ? "green" : item.status === "Expired" ? "red" : "gray");
          const expDays = item.expiration_date ? daysUntil(item.expiration_date) : null;
          return (
            <Card key={item.id} className={status === "red" ? "border-red-300" : ""}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className={`w-3 h-3 rounded-full ${status === "green" ? "bg-green-500" : status === "red" ? "bg-red-500" : status === "orange" ? "bg-orange-500" : status === "yellow" ? "bg-yellow-400" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.item_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.category}
                    {item.last_reviewed_date && ` · Reviewed ${item.last_reviewed_date}`}
                    {expDays !== null && expDays >= 0 && ` · Expires in ${expDays} days`}
                    {expDays !== null && expDays < 0 && ` · Expired ${Math.abs(expDays)} days ago`}
                  </div>
                  {item.document_name && (
                    <a href="#" onClick={async (e) => { e.preventDefault(); const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: item.document_url }); window.open(signed_url); }} className="text-xs text-primary underline flex items-center gap-1 mt-1">
                      <FileText className="w-3 h-3" /> {item.document_name}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input type="date" value={item.expiration_date || ""} onChange={e => updateMutation.mutate({ id: item.id, data: { expiration_date: e.target.value } })} className="w-36" />
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={e => handleUpload(item.id, e)} disabled={uploading === item.id} />
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border ${uploading === item.id ? "opacity-50" : "hover:bg-muted"}`}>
                      <Upload className="w-3 h-3" /> {uploading === item.id ? "Uploading…" : "Upload"}
                    </span>
                  </label>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sortedItems.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            No agency file items yet. Click "Initialize Checklist" to create the standard DHHS items.
          </CardContent></Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Agency File Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name</Label><Input value={newItem.item_name} onChange={e => setNewItem(n => ({ ...n, item_name: e.target.value }))} /></div>
            <div>
              <Label>Category</Label>
              <Select value={newItem.category} onValueChange={v => setNewItem(n => ({ ...n, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Certification", "Committee", "Plan", "Process", "Insurance", "Disclosure"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate({ ...newItem, status: "N/A" })} disabled={!newItem.item_name}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}