import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, AlertTriangle } from "lucide-react";

export default function EVVLocationSettings({ agency, onSave, saving }) {
  const trackLocation = agency?.track_location_clock_in !== false;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium">Track location at clock in/out</p>
            <p className="text-xs text-muted-foreground mt-0.5">Capture GPS coordinates when staff clock in and out of shifts.</p>
          </div>
        </div>
        <Switch checked={trackLocation} onCheckedChange={(v) => onSave({ track_location_clock_in: v })} disabled={saving} />
      </div>

      {!trackLocation && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Location tracking is off for non-EVV services.</p>
            <p className="text-xs mt-1">EVV-required services (Companion, Homemaker, Respite except RP4/RP5/RPS, Supported Living, Personal Assistance) will <strong>still capture location</strong> as required by federal mandate. This setting only affects non-EVV services.</p>
          </div>
        </div>
      )}
    </div>
  );
}