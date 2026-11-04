import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Inbox } from "lucide-react";

function Pill({ color, label }) {
  const colors = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

export default function AlertListCard({ title, icon: Icon, iconColor, viewAllPath, alerts, emptyMessage }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </div>
        <Link to={viewAllPath}>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 shrink-0">
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-1 pt-1">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Inbox className="w-4 h-4" />
            <span className="text-sm">{emptyMessage}</span>
          </div>
        ) : (
          alerts.map((a, i) => (
            <Link to={a.path} key={i}>
              <div className="flex items-start gap-2 py-2 min-h-[44px] border-b border-border last:border-0 hover:bg-muted/40 rounded-md px-1 -mx-1 transition-colors cursor-pointer">
                <div className="pt-0.5 shrink-0"><Pill color={a.color} label={a.badge} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.meta}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 max-w-[45%] truncate">{a.right}</span>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}