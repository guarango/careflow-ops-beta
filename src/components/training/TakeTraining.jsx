import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, X, Type, Video, ImageIcon, FileText, MessageSquare, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BLOCK_ICON = { text: Type, video: Video, image: ImageIcon, document: FileText, response: MessageSquare, assessment: ListChecks };

export default function TakeTraining({ assignment, training, onExit }) {
  const queryClient = useQueryClient();
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [responses, setResponses] = useState(assignment.responses || []);
  const [assessmentAttempts, setAssessmentAttempts] = useState({});
  const [videoWatched, setVideoWatched] = useState({});

  const sections = training.sections || [];
  const currentSection = sections[currentSectionIdx];
  const currentLesson = currentSection?.lessons?.[currentLessonIdx];
  const allLessons = sections.flatMap((s, si) => (s.lessons || []).map((l, li) => ({ ...l, sectionId: s.id, sectionIdx: si, lessonIdx: li })));

  const updateAssignment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingAssignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-training-assignments"] }),
  });

  // Save progress on changes
  useEffect(() => {
    if (assignment.status === "Assigned") {
      updateAssignment.mutate({ id: assignment.id, data: { status: "In Progress", started_at: new Date().toISOString() } });
    }
  }, []);

  const allBlocks = currentLesson?.content_blocks || [];
  const totalBlocks = allLessons.reduce((sum, l) => sum + (l.content_blocks?.length || 0), 0);
  const completedBlocks = responses.length;

  const handleResponse = (block, value, isCorrect) => {
    const existing = responses.find(r => r.block_id === block.id);
    if (existing) {
      setResponses(responses.map(r => r.block_id === block.id ? { ...r, answer: value, assessment_correct: isCorrect } : r));
    } else {
      setResponses([...responses, { block_id: block.id, section_id: currentSection?.id, lesson_id: currentLesson?.id, question: block.response_question || block.assessment_question || "", answer: value, assessment_correct: isCorrect, attempts: assessmentAttempts[block.id] || 0 }]);
    }
  };

  const handleAssessmentSubmit = (block, selectedIndex, attempts) => {
    setAssessmentAttempts(prev => ({ ...prev, [block.id]: attempts }));
    const isCorrect = selectedIndex === block.assessment_correct_index;
    const existing = responses.find(r => r.block_id === block.id);
    if (existing) {
      setResponses(responses.map(r => r.block_id === block.id ? { ...r, answer: block.assessment_options?.[selectedIndex] || "", assessment_correct: isCorrect, attempts } : r));
    } else {
      setResponses([...responses, { block_id: block.id, section_id: currentSection?.id, lesson_id: currentLesson?.id, question: block.assessment_question, answer: block.assessment_options?.[selectedIndex] || "", assessment_correct: isCorrect, attempts }]);
    }
  };

  const canAdvance = () => {
    // Check all required blocks in current lesson are completed
    return allBlocks.every(block => {
      if (!block.required) return true;
      if (block.type === "text" || block.type === "video" || block.type === "image" || block.type === "document") return true;
      if (block.type === "video" && block.require_watch_to_end) return videoWatched[block.id];
      if (block.type === "response") {
        const r = responses.find(r => r.block_id === block.id);
        return r && (!block.response_min_chars || r.answer.length >= block.response_min_chars);
      }
      if (block.type === "assessment") {
        const r = responses.find(r => r.block_id === block.id);
        return r && r.assessment_correct;
      }
      return true;
    });
  };

  const handleNext = () => {
    const isLastLesson = currentLessonIdx >= (currentSection?.lessons?.length || 0) - 1;
    const isLastSection = currentSectionIdx >= sections.length - 1;
    if (isLastLesson && isLastSection) {
      handleComplete();
    } else if (isLastLesson) {
      setCurrentSectionIdx(currentSectionIdx + 1);
      setCurrentLessonIdx(0);
    } else {
      setCurrentLessonIdx(currentLessonIdx + 1);
    }
  };

  const handleComplete = () => {
    const progress = Math.round((responses.length / Math.max(totalBlocks, 1)) * 100);
    updateAssignment.mutate({
      id: assignment.id,
      data: {
        status: "Completed",
        progress_pct: 100,
        completed_at: new Date().toISOString(),
        responses,
      },
    }, {
      onSuccess: () => {
        toast.success("Training completed! It will be reviewed by your manager.");
        onExit();
      },
    });
  };

  // Auto-save progress
  useEffect(() => {
    if (responses.length > 0) {
      const progress = Math.round((responses.length / Math.max(totalBlocks, 1)) * 100);
      updateAssignment.mutate({ id: assignment.id, data: { progress_pct: progress, responses } });
    }
  }, [responses.length]);

  if (!currentLesson) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">This training has no content yet.</p>
        <Button variant="outline" onClick={onExit} className="mt-3">Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/20">
        <div>
          <h1 className="text-lg font-bold">{training.title}</h1>
          <p className="text-xs text-muted-foreground">
            {currentSection?.title} · Lesson {currentLessonIdx + 1} of {currentSection?.lessons?.length || 0}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-semibold">{currentLesson.title}</h2>

          {allBlocks.map((block, idx) => (
            <BlockRenderer
              key={block.id}
              block={block}
              response={responses.find(r => r.block_id === block.id)}
              onResponse={(value, isCorrect) => handleResponse(block, value, isCorrect)}
              onAssessmentSubmit={(idx, attempts) => handleAssessmentSubmit(block, idx, attempts)}
              attempts={assessmentAttempts[block.id] || 0}
              videoWatched={videoWatched[block.id]}
              onVideoEnded={() => setVideoWatched(prev => ({ ...prev, [block.id]: true }))}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20">
        <Button variant="outline" size="sm"
          onClick={() => {
            if (currentLessonIdx === 0 && currentSectionIdx === 0) return;
            if (currentLessonIdx === 0) {
              setCurrentSectionIdx(currentSectionIdx - 1);
              setCurrentLessonIdx((sections[currentSectionIdx - 1]?.lessons?.length || 1) - 1);
            } else {
              setCurrentLessonIdx(currentLessonIdx - 1);
            }
          }}
          disabled={currentSectionIdx === 0 && currentLessonIdx === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {responses.length} of {totalBlocks} blocks completed
        </span>
        <Button size="sm" onClick={handleNext} disabled={!canAdvance()}>
          {currentLessonIdx >= (currentSection?.lessons?.length || 0) - 1 && currentSectionIdx >= sections.length - 1
            ? "Complete" : "Next"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function BlockRenderer({ block, response, onResponse, onAssessmentSubmit, attempts, videoWatched, onVideoEnded }) {
  const [assessmentAnswer, setAssessmentAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);

  if (block.type === "text") {
    return (
      <div className="prose prose-sm max-w-none">
        {block.text_content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{block.text_content}</p>}
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <div>
        {block.video_url ? (
          <video src={block.video_url} controls onEnded={onVideoEnded} className="w-full rounded" />
        ) : block.video_file_uri ? (
          <video src={block.video_file_uri} controls onEnded={onVideoEnded} className="w-full rounded" />
        ) : (
          <p className="text-muted-foreground text-sm">No video available</p>
        )}
        {block.require_watch_to_end && (
          <p className="text-xs text-muted-foreground mt-1">
            {videoWatched ? "✓ Watched" : "You must watch the entire video to continue"}
          </p>
        )}
      </div>
    );
  }

  if (block.type === "image") {
    return (
      <div>
        {block.image_uri && <img src={block.image_uri} alt={block.image_caption || ""} className="w-full rounded" />}
        {block.image_caption && <p className="text-sm text-muted-foreground mt-1">{block.image_caption}</p>}
      </div>
    );
  }

  if (block.type === "document") {
    return (
      <div>
        {block.document_uri ? (
          <a href={block.document_uri} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent">
            <FileText className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">{block.document_name || "View document"}</span>
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">No document available</p>
        )}
      </div>
    );
  }

  if (block.type === "response") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{block.response_question}</p>
        <textarea
          value={response?.answer || ""}
          onChange={e => onResponse(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Type your answer here..."
        />
        {block.response_min_chars > 0 && (
          <p className="text-xs text-muted-foreground">
            Minimum {block.response_min_chars} characters ({(response?.answer || "").length}/{block.response_min_chars})
          </p>
        )}
      </div>
    );
  }

  if (block.type === "assessment") {
    const options = block.assessment_type === "true_false" ? ["True", "False"] : block.assessment_options || [];
    const correct = block.assessment_correct_index;
    const isCorrect = showResult && assessmentAnswer === correct;

    const handleSubmit = () => {
      setShowResult(true);
      onAssessmentSubmit(assessmentAnswer, attempts + 1);
    };

    const handleRetry = () => {
      setShowResult(false);
      setAssessmentAnswer(null);
    };

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">{block.assessment_question}</p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => !showResult && setAssessmentAnswer(i)}
              className={cn(
                "w-full text-left p-2.5 rounded-md border text-sm transition-colors",
                assessmentAnswer === i ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                showResult && i === correct && "border-green-500 bg-green-50",
                showResult && i === assessmentAnswer && i !== correct && "border-red-500 bg-red-50",
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {showResult ? (
          <div className="flex items-center gap-3">
            <span className={cn("text-sm font-medium", isCorrect ? "text-green-600" : "text-red-600")}>
              {isCorrect ? "✓ Correct!" : "✗ Not correct. Try again."}
            </span>
            {block.retakes_allowed && !isCorrect && (
              <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
            )}
            {!block.retakes_allowed && !isCorrect && (
              <span className="text-xs text-muted-foreground">No retakes allowed</span>
            )}
          </div>
        ) : (
          <Button size="sm" disabled={assessmentAnswer === null} onClick={handleSubmit}>Submit</Button>
        )}
      </div>
    );
  }

  return null;
}