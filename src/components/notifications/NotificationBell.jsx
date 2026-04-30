import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, X, Check, ChevronRight, AlertTriangle, Pill, Target, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  emar_reminder: { icon: Pill, color: "text-blue-500", bg: "bg-blue-50" },
  emar_missed: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  goal_missed: { icon: Target, color: "text-amber-500", bg: "bg-amber-50" },
};

const ROUTE_MAP = {
  emar: "/emar",
  goal: "/goals",
};

export default function NotificationBell({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [ackModal, setAckModal] = useState(null); // { notif }
  const [ackNote, setAckNote] = useState("");
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    const all = await base44.entities.AppNotification.filter({ recipient_user_id: currentUser.id });
    // Sort reverse chronological
    all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setNotifications(all);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = base44.entities.AppNotification.subscribe((event) => {
      if (event.data?.recipient_user_id === currentUser?.id) {
        fetchNotifications();
      }
    });
    return unsub;
  }, [currentUser?.id]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter(n => n.status === "unread").length;
  const visible = notifications.filter(n => n.status !== "dismissed");

  const markRead = async (notif) => {
    if (notif.status === "unread") {
      await base44.entities.AppNotification.update(notif.id, {
        status: "read",
        read_at: new Date().toISOString(),
      });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: "read", read_at: new Date().toISOString() } : n));
    }
  };

  const handleClick = async (notif) => {
    await markRead(notif);
    setOpen(false);
    const route = ROUTE_MAP[notif.related_record_type] || "/";
    navigate(route);
  };

  const handleDismiss = async (e, notif) => {
    e.stopPropagation();
    await base44.entities.AppNotification.update(notif.id, { status: "dismissed" });
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: "dismissed" } : n));
  };

  const handleAckOpen = (e, notif) => {
    e.stopPropagation();
    setAckModal({ notif });
    setAckNote("");
  };

  const handleAckConfirm = async () => {
    if (!ackModal) return;
    await base44.entities.AppNotification.update(ackModal.notif.id, {
      status: "acknowledged",
      acknowledged_note: ackNote,
      acknowledged_at: new Date().toISOString(),
    });
    setNotifications(prev => prev.map(n =>
      n.id === ackModal.notif.id ? { ...n, status: "acknowledged", acknowledged_note: ackNote } : n
    ));
    setAckModal(null);
    setAckNote("");
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-sidebar-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-sidebar-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-10 w-96 max-h-[520px] bg-white border border-border rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{unreadCount} new</Badge>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-border">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              visible.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || { icon: Info, color: "text-muted-foreground", bg: "bg-muted" };
                const Icon = cfg.icon;
                const isUnread = notif.status === "unread";
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      "flex gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors",
                      isUnread && "bg-blue-50/50"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={cn("text-xs leading-snug line-clamp-2", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                          {notif.is_controlled_substance && (
                            <span className="text-red-600 font-semibold mr-1">⚠️ CS —</span>
                          )}
                          {notif.message}
                        </p>
                        {isUnread && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />}
                      </div>
                      {notif.client_name && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{notif.client_name}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {notif.created_date ? formatDistanceToNow(new Date(notif.created_date), { addSuffix: true }) : ""}
                      </p>
                      {/* Admin actions */}
                      {isAdmin && (notif.status === "unread" || notif.status === "read") && (
                        <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleAckOpen(e, notif)}
                            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Acknowledge
                          </button>
                          <button
                            onClick={(e) => handleDismiss(e, notif)}
                            className="text-[11px] text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Dismiss
                          </button>
                        </div>
                      )}
                      {notif.status === "acknowledged" && (
                        <span className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Acknowledged
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-1" />
                  </div>
                );
              })
            )}
          </div>

          {isAdmin && (
            <div className="border-t border-border px-4 py-2.5 bg-muted/20">
              <button
                onClick={() => { setOpen(false); navigate("/notifications"); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                View Notification Center →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Acknowledge Modal */}
      <Dialog open={!!ackModal} onOpenChange={() => setAckModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Acknowledge Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{ackModal?.notif?.message}</p>
            <div>
              <Label>Note (optional)</Label>
              <Textarea
                value={ackNote}
                onChange={e => setAckNote(e.target.value)}
                placeholder="Add a note about the follow-up action taken..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAckModal(null)}>Cancel</Button>
            <Button onClick={handleAckConfirm}>Confirm Acknowledge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}