import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, BookOpen, Search, FileText, Users } from "lucide-react";
import TrainingOutline from "@/components/training/TrainingOutline";
import LessonEditor from "@/components/training/LessonEditor";
import TrainingSettingsDialog from "@/components/training/TrainingSettingsDialog";
import AssignTrainingDialog from "@/components/training/AssignTrainingDialog";

export default function TrainingBuilder() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["trainings"],
    queryFn: () => base44.entities.Training.list({ sort: "-created_date" }),
  });

  const trainingList = trainings.items || trainings;
  const filtered = trainingList.filter(t =>
    t.title?.toLowerCase().includes(search.toLowerCase())
  );
  const selectedTraining = trainingList.find(t => t.id === selectedTrainingId);

  const createTraining = useMutation({
    mutationFn: (data) => base44.entities.Training.create(data),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      setShowNewDialog(false);
      setNewTitle("");
      setSelectedTrainingId(record.id);
    },
  });

  const updateTraining = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Training.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trainings"] }),
  });

  const handleSave = (updatedSections) => {
    if (!selectedTraining) return;
    updateTraining.mutate({ id: selectedTraining.id, data: { sections: updatedSections } });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Training Builder</h1>
          <p className="text-sm text-muted-foreground">Create courses with sections, lessons, and content blocks</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Training
        </Button>
      </div>

      {selectedTraining ? (
        <div className="flex flex-1 min-h-0">
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-end gap-2 px-4 py-2 border-b bg-muted/20">
              <Button variant="outline" size="sm" onClick={() => setShowAssign(true)} disabled={selectedTraining.status !== "Published"}>
                <Users className="w-4 h-4 mr-1" /> Assign
              </Button>
            </div>
            <div className="flex flex-1 min-h-0">
          <TrainingOutline
            training={selectedTraining}
            onSelectLesson={setSelectedLesson}
            onSave={handleSave}
            onOpenSettings={() => setShowSettings(true)}
            onBack={() => { setSelectedTrainingId(null); setSelectedLesson(null); }}
          />
          <LessonEditor
            training={selectedTraining}
            lesson={selectedLesson}
            onSave={handleSave}
          />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No trainings yet. Create your first training course.</p>
            </div>
          ) : (
            <div className="grid gap-3 max-w-2xl">
              {filtered.map(t => (
                <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedTrainingId(t.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.training_hours} hrs · v{t.version}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.status === "Published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>{t.status}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <TrainingSettingsDialog
        training={selectedTraining}
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <AssignTrainingDialog
        training={selectedTraining}
        open={showAssign}
        onClose={() => setShowAssign(false)}
      />

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Training Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. CPR & First Aid" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button
              disabled={!newTitle.trim() || createTraining.isPending}
              onClick={() => createTraining.mutate({ title: newTitle, description: "", sections: [] })}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}