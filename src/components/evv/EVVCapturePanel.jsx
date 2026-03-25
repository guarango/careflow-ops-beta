import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";

/**
 * EVV data capture panel for clock-in / clock-out.
 * onCapture(type, evvData) — called with "in" or "out" and the captured GPS data
 */
export default function EVVCapturePanel({ capturedIn, capturedOut, onCapture, required = true }) {
  const [capturingIn, setCapturingIn] = useState(false);
  const [capturingOut, setCapturingOut] = useState(false);
  const [error, setError] = useState(null);

  const captureGPS = async (type) => {
    setError(null);
    type === "in" ? setCapturingIn(true) : setCapturingOut(true);
    if (!navigator.geolocation) {
      setError("GPS not available on this device");
      type === "in" ? setCapturingIn(false) : setCapturingOut(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) address = data.display_name.split(",").slice(0, 3).join(",");
        } catch (_) {}
        const evvData = {
          lat: latitude,
          lng: longitude,
          address,
          timestamp: new Date().toISOString(),
        };
        onCapture(type, evvData);
        type === "in" ? setCapturingIn(false) : setCapturingOut(false);
      },
      (err) => {
        setError("Could not capture location. Please allow location access.");
        type === "in" ? setCapturingIn(false) : setCapturingOut(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const LocationSlot = ({ label, captured, captureType, loading }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div>
          <p className="text-xs font-medium">{label}</p>
          {captured ? (
            <div>
              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{captured.address}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {format(new Date(captured.timestamp), "h:mm a")}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Not yet captured</p>
          )}
        </div>
      </div>
      {captured ? (
        <Badge variant="outline" className="text-accent border-accent/30 bg-accent/10 gap-1 text-xs">
          <CheckCircle2 className="w-3 h-3" /> Verified
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => captureGPS(captureType)}
          disabled={loading}
          className="text-xs gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
          {loading ? "Locating…" : "Capture GPS"}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
        <MapPin className="w-3.5 h-3.5" />
        EVV Location Verification {required && <span className="text-destructive">*</span>}
      </div>
      <LocationSlot label="Clock-In Location" captured={capturedIn} captureType="in" loading={capturingIn} />
      <LocationSlot label="Clock-Out Location" captured={capturedOut} captureType="out" loading={capturingOut} />
      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive p-2 rounded-md bg-destructive/10">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      {capturedIn && capturedOut && (
        <div className="flex items-center gap-2 text-xs text-accent p-2 rounded-md bg-accent/10">
          <CheckCircle2 className="w-3.5 h-3.5" />
          All EVV data points captured successfully
        </div>
      )}
    </div>
  );
}