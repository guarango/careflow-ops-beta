import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, ChevronRight } from "lucide-react";
import CheckSignature from "@/components/signatures/CheckSignature";

const reviewTypes = ["Annual", "Semi-Annual", "90-Day Probationary", "PIP", "Other"];
const ratings = ["Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory"];
const emptyReview = { staff_id: "", staff_name: "", review_type: "Annual", review_period_start: "", review_period_end: "", reviewer_name: "", overall_rating: "", goals: "", strengths: "", areas_for_improvement: "", manager_comments: "", status: "Draft", due_date: "" };

const ratingColors = {
  "Exceeds Expectations": "text-accent border-accent/30 bg-accent/10",
  "Meets Expectations": "text-primary border-primary/30 bg-primary/10",
  "Needs Improvement": "text-amber-600 border-amber-300 bg-amber-50",
  "Unsatisfactory": "text-destructive border-destructive/30 bg-destructive/10",
};

export default function HRPerformance({ reviews, staff }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyReview);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PerformanceReview.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); setShowDialog(false); setForm(emptyReview); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PerformanceReview.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["performance-reviews"] }); setSelected(null); },
  });

  const handleStaffSelect = (id) => {
    const s = staff.find(x => x.id === id);
    setForm(f => ({ ...f, staff_id: id, staff_name: s ? `${s.first_name} ${s.last_name}` : "" }));
  };

  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>← Back</Button>
          <h2 className="font-semibold">{selected.review_type} Review — {selected.staff_name}</h2>
          <Badge variant="outline" className={`text-xs ${ratingColors[selected.overall_rating] || ""}`}>{selected.overall_rating || "Not rated"}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: "Goals", field: "goals", value: selected.goals },
            { label: "Strengths", field: "strengths", value: selected.strengths },
            { label: "Areas for Improvement", field: "areas_for_improvement", value: selected.areas_for_improvement },
            { label: "Manager Comments", field: "manager_comments", value: selected.manager_comments },
          ].map(({ label, field, value }) => (
            <Card key={field}>
              <CardContent className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
                <p className="text-sm">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <CheckSignature
          recordId={selected.id}
          recordType="SessionNote"
          requiredSigners={[{ role: "any", label: "Reviewer Signature" }, { role: "any", label: "Employee Acknowledgment" }]}
          onSignComplete={() => updateMutation.mutate({ id: selected.id, data: { status: "Signed" } })}
        />
        {selected.status !== "Completed" && selected.status !== "Signed" && (
          <Button onClick={() => updateMutation.mutate({ id: selected.id, data: { status: "Completed" } })}>
            Mark as Completed
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4" />Performance Reviews</CardTitle>
          <Button size="sm" onClick={() => { setForm(emptyReview); setShowDialog(true); }} className="gap-1">
            <Plus className="w-3.5 h-3.5" />New Review
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No performance reviews yet</TableCell></TableRow>
              )}
              {reviews.map(r => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(r)}>
                  <TableCell className="font-medium">{r.staff_name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{r.review_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.review_period_start || "—"} – {r.review_period_end || "—"}</TableCell>
                  <TableCell className="text-sm">{r.due_date || "—"}</TableCell>
                  <TableCell>
                    {r.overall_rating ? (
                      <Badge variant="outline" className={`text-xs ${ratingColors[r.overall_rating] || ""}`}>{r.overall_rating}</Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${r.status === "Signed" ? "text-accent border-accent/30 bg-accent/10" : r.status === "Completed" ? "text-primary border-primary/30 bg-primary/10" : ""}`}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select value={form.staff_id} onValueChange={handleStaffSelect}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Type *</Label>
                <Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{reviewTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Overall Rating</Label>
                <Select value={form.overall_rating} onValueChange={v => setForm(f => ({ ...f, overall_rating: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{ratings.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Period Start</Label><Input type="date" value={form.review_period_start} onChange={e => setForm(f => ({ ...f, review_period_start: e.target.value }))} /></div>
              <div><Label>Period End</Label><Input type="date" value={form.review_period_end} onChange={e => setForm(f => ({ ...f, review_period_end: e.target.value }))} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>Reviewer Name</Label><Input value={form.reviewer_name} onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))} /></div>
            </div>
            <div><Label>Goals</Label><Textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={2} /></div>
            <div><Label>Strengths</Label><Textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))} rows={2} /></div>
            <div><Label>Areas for Improvement</Label><Textarea value={form.areas_for_improvement} onChange={e => setForm(f => ({ ...f, areas_for_improvement: e.target.value }))} rows={2} /></div>
            <div><Label>Manager Comments</Label><Textarea value={form.manager_comments} onChange={e => setForm(f => ({ ...f, manager_comments: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.staff_id || !form.review_type}>Create Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}