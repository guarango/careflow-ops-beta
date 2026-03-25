import React, { useContext, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { PortalContext } from "@/pages/Portal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Send, Plus, Shield, User, Lock, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";

export default function PortalMessages() {
  const { portalUser } = useContext(PortalContext);
  const [newThread, setNewThread] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [activeThread, setActiveThread] = useState(null);
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["portal-messages", portalUser?.client_id],
    queryFn: () => base44.entities.PortalMessage.filter({ client_id: portalUser?.client_id }),
  });

  const sendMessage = useMutation({
    mutationFn: (data) => base44.entities.PortalMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-messages"] });
      setNewThread(false);
      setSubject("");
      setBody("");
      setReply("");
    },
  });

  // Group messages into threads
  const threads = messages.reduce((acc, msg) => {
    const tid = msg.thread_id || msg.id;
    if (!acc[tid]) acc[tid] = [];
    acc[tid].push(msg);
    return acc;
  }, {});

  const threadList = Object.entries(threads).map(([tid, msgs]) => ({
    id: tid,
    subject: msgs[0].thread_subject || msgs[0].subject || "Message",
    lastMsg: msgs[msgs.length - 1],
    messages: msgs,
    unread: msgs.some(m => !m.is_read && m.sender_type === "Staff"),
  })).sort((a, b) => new Date(b.lastMsg.sent_at || b.lastMsg.created_date) - new Date(a.lastMsg.sent_at || a.lastMsg.created_date));

  const handleSend = () => {
    const tid = `thread-${Date.now()}`;
    sendMessage.mutate({
      thread_id: tid, thread_subject: subject, client_id: portalUser?.client_id,
      client_name: portalUser?.client_name, subject,
      sender_id: portalUser?.id, sender_name: portalUser?.full_name,
      sender_type: "Portal User",
      recipient_name: "Program Supervisor",
      body, sent_at: new Date().toISOString(), is_read: false,
    });
  };

  const handleReply = () => {
    if (!reply.trim() || !activeThread) return;
    const firstMsg = threads[activeThread]?.[0];
    sendMessage.mutate({
      thread_id: activeThread, thread_subject: firstMsg?.thread_subject || firstMsg?.subject,
      client_id: portalUser?.client_id, client_name: portalUser?.client_name,
      subject: firstMsg?.subject,
      sender_id: portalUser?.id, sender_name: portalUser?.full_name,
      sender_type: "Portal User",
      recipient_name: "Program Supervisor",
      body: reply, sent_at: new Date().toISOString(), is_read: false,
    });
    setReply("");
  };

  const activeMessages = activeThread ? threads[activeThread] || [] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Secure Messages</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Lock className="w-3 h-3 text-emerald-500" />
            <p className="text-sm text-slate-500">HIPAA-compliant · No PHI in notifications</p>
          </div>
        </div>
        {!activeThread && (
          <Button onClick={() => setNewThread(true)} className="bg-sky-600 hover:bg-sky-700 gap-1.5">
            <Plus className="w-4 h-4" />New Message
          </Button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-sm">
        <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800 text-xs">Messages are routed to your program supervisor. You will never be able to message DSPs directly. Email notifications contain no health information — only a prompt to log in and view your message.</p>
      </div>

      {activeThread ? (
        <div className="space-y-4">
          <button onClick={() => setActiveThread(null)} className="text-sm text-sky-600 hover:underline flex items-center gap-1">
            ← Back to messages
          </button>

          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b bg-slate-50 rounded-t-xl">
              <p className="font-semibold text-slate-800">{activeMessages[0]?.thread_subject || activeMessages[0]?.subject}</p>
              <p className="text-xs text-slate-500">Re: {portalUser?.client_name}</p>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {activeMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === "Portal User" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender_type === "Portal User" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                    <p className="text-xs font-semibold mb-1 opacity-80">{msg.sender_name}</p>
                    <p className="text-sm">{msg.body}</p>
                    <p className={`text-xs mt-1.5 ${msg.sender_type === "Portal User" ? "text-sky-200" : "text-slate-400"}`}>
                      {msg.sent_at ? format(new Date(msg.sent_at), "MMM d, h:mm a") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type your reply..." rows={2} className="flex-1 resize-none" />
              <Button onClick={handleReply} disabled={!reply.trim()} className="self-end bg-sky-600 hover:bg-sky-700 px-3">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        <div>
          {threadList.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-500 text-sm mb-3">No messages yet</p>
                <Button onClick={() => setNewThread(true)} size="sm" className="bg-sky-600 hover:bg-sky-700 gap-1.5">
                  <Plus className="w-4 h-4" />Start a Conversation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {threadList.map(thread => (
                <button key={thread.id} onClick={() => setActiveThread(thread.id)}
                  className="w-full text-left">
                  <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${thread.unread ? "border-l-4 border-l-sky-500" : ""}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-800 text-sm truncate">{thread.subject}</p>
                            {thread.unread && <Badge className="bg-sky-100 text-sky-700 text-xs ml-2 flex-shrink-0">New</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{thread.lastMsg.body}</p>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {thread.lastMsg.sent_at ? format(new Date(thread.lastMsg.sent_at), "MMM d") : ""}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Thread Dialog */}
      <Dialog open={newThread} onOpenChange={setNewThread}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Message to Program Supervisor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Brief subject..." className="mt-1" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)}
                placeholder="Type your message here..." rows={5} className="mt-1" />
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />Sent securely. No health information will be included in email notifications.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewThread(false)}>Cancel</Button>
            <Button onClick={handleSend} disabled={!subject.trim() || !body.trim()} className="bg-sky-600 hover:bg-sky-700 gap-1.5">
              <Send className="w-4 h-4" />Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}