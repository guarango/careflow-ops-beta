import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, User, Clock, Shield, Lock } from "lucide-react";
import { format } from "date-fns";

export default function StaffMessageInbox() {
  const [activeThread, setActiveThread] = useState(null);
  const [reply, setReply] = useState("");
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["staff-messages"],
    queryFn: () => base44.entities.PortalMessage.list("-created_date"),
  });

  const sendReply = useMutation({
    mutationFn: (data) => base44.entities.PortalMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-messages"] });
      setReply("");
    },
  });

  // Group by thread
  const threads = messages.reduce((acc, msg) => {
    const tid = msg.thread_id || msg.id;
    if (!acc[tid]) acc[tid] = [];
    acc[tid].push(msg);
    return acc;
  }, {});

  const threadList = Object.entries(threads).map(([tid, msgs]) => ({
    id: tid,
    subject: msgs[0].thread_subject || msgs[0].subject || "Portal Message",
    client: msgs[0].client_name,
    sender: msgs[0].sender_name,
    lastMsg: msgs[msgs.length - 1],
    messages: msgs,
    unread: msgs.some(m => !m.is_read && m.sender_type === "Portal User"),
    count: msgs.length,
  })).sort((a, b) => new Date(b.lastMsg.sent_at || b.lastMsg.created_date) - new Date(a.lastMsg.sent_at || a.lastMsg.created_date));

  const activeMessages = activeThread ? threads[activeThread] || [] : [];

  const handleReply = () => {
    if (!reply.trim() || !activeThread) return;
    const first = activeMessages[0];
    sendReply.mutate({
      thread_id: activeThread, thread_subject: first?.thread_subject || first?.subject,
      client_id: first?.client_id, client_name: first?.client_name,
      subject: first?.subject,
      sender_name: "Program Supervisor",
      sender_type: "Staff",
      recipient_name: first?.sender_name,
      body: reply, sent_at: new Date().toISOString(), is_read: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Portal Messages</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-500" />Secure messages from guardians and case managers
          </p>
        </div>
      </div>

      {activeThread ? (
        <div className="space-y-4">
          <button onClick={() => setActiveThread(null)} className="text-sm text-sky-600 hover:underline">
            ← Back to inbox
          </button>
          <Card className="border-0 shadow-sm">
            <div className="p-4 border-b bg-slate-50 rounded-t-xl">
              <p className="font-semibold text-slate-800">{activeMessages[0]?.thread_subject || activeMessages[0]?.subject}</p>
              <p className="text-xs text-slate-500">Client: {activeMessages[0]?.client_name} · {activeMessages[0]?.sender_name}</p>
            </div>
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
              {activeMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === "Staff" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.sender_type === "Staff" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                    <p className="text-xs font-semibold mb-1 opacity-75">{msg.sender_name}</p>
                    <p className="text-sm">{msg.body}</p>
                    <p className={`text-xs mt-1.5 ${msg.sender_type === "Staff" ? "text-sky-200" : "text-slate-400"}`}>
                      {msg.sent_at ? format(new Date(msg.sent_at), "MMM d, h:mm a") : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <Textarea value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Reply as Program Supervisor..." rows={2} className="flex-1 resize-none" />
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
              <CardContent className="py-10 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500 text-sm">No portal messages yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {threadList.map(thread => (
                <button key={thread.id} onClick={() => setActiveThread(thread.id)} className="w-full text-left">
                  <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${thread.unread ? "border-l-4 border-l-sky-500" : ""}`}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-sky-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 truncate">{thread.subject}</p>
                            {thread.unread && <Badge className="bg-sky-100 text-sky-700 text-xs px-1.5">New</Badge>}
                          </div>
                          <p className="text-xs text-slate-500">{thread.client} · {thread.sender}</p>
                          <p className="text-xs text-slate-400 truncate">{thread.lastMsg.body}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400">{thread.lastMsg.sent_at ? format(new Date(thread.lastMsg.sent_at), "MMM d") : ""}</p>
                          <p className="text-xs text-slate-300">{thread.count} msg{thread.count !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}