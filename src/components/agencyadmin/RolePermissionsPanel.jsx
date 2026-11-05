import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Info, RotateCcw, ShieldCheck,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FEATURE_SECTIONS, getSubjectLabel } from "@/lib/permissions";
import { useRole } from "@/hooks/useRole";
import { usePermissions } from "@/lib/PermissionsContext";

const SUBJECT_COLUMNS = [
  { key: "dsp", label: "DSP" },
  { key: "manager", label: "Manager" },
  { key: "admin", label: "Admin" },
  { key: "hr_bundle", label: "+HR bundle" },
  { key: "billing_bundle", label: "+Billing bundle" },
];

/**
 * Role permissions matrix, hosted inside Settings & Admin.
 * Editable only by Super Admin; everyone else gets a read-only view.
 * Every cell writes to the PermissionMatrix entity.
 */
export default function RolePermissionsPanel() {
  const { isSuperAdmin } = useRole();
  const { matrix, togglePermission, toggleNavPaths, resetToDefaults, saving } = usePermissions();
  const [confirmReset, setConfirmReset] = useState(false);

  const navAccess = matrix.navAccess;
  const canMap = matrix.can;

  const viewHasAccess = (paths, subject) =>
    paths.length > 0 && paths.every((p) => (navAccess[p] || []).includes(subject));

  const actionHasAccess = (code, subject) => (canMap[code] || []).includes(subject);

  const toggleView = (feature, subject) => {
    const meta = { featureLabel: feature.label, rowLabel: "View page" };
    if (feature.paths.length > 1) {
      toggleNavPaths(feature.paths, subject, meta);
    } else {
      togglePermission("nav", feature.paths[0], subject, meta);
    }
  };

  const toggleAction = (feature, action, subject) => {
    togglePermission("can", action.code, subject, {
      featureLabel: feature.label,
      rowLabel: `${action.level}: ${action.label}`,
    });
  };

  const renderCells = (hasAccessFn, onToggle) => SUBJECT_COLUMNS.map((col) => (
    <td key={col.key} className="px-3 py-2 text-center align-middle">
      <PermissionToggle
        hasAccess={hasAccessFn(col.key)}
        editable={isSuperAdmin}
        onClick={() => onToggle(col.key)}
        title={`${getSubjectLabel(col.key)} — ${hasAccessFn(col.key) ? "granted" : "not granted"}`}
      />
    </td>
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Who can open each page and take each action, across DSP, Manager, Admin, and the HR and Billing bundles.
          </p>
        </div>
        {isSuperAdmin && (
          <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        )}
      </div>

      <div className="p-4 bg-muted rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Bundles</strong> only apply to Admins who hold them — a DSP or Manager never gains access from a bundle.
            <strong> Super Admin</strong> always has full access.
          </p>
          {!isSuperAdmin && (
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              Permissions are managed by CareFlow support.
            </p>
          )}
          {isSuperAdmin && <p>Click any checkmark or X to change it — changes save immediately and are written to the audit log.</p>}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Full Permissions Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Feature / Action</th>
                {SUBJECT_COLUMNS.map((col) => (
                  <th key={col.key} className="text-center px-3 py-2.5 font-medium">
                    <Badge variant="outline" className={col.key === "admin" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"}>
                      {col.label}
                    </Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_SECTIONS.map((section) => (
                <React.Fragment key={section.title}>
                  <tr className="bg-muted/20 border-t-2">
                    <td className="px-4 py-2 font-semibold text-xs text-muted-foreground uppercase tracking-wider" colSpan={SUBJECT_COLUMNS.length + 1}>
                      {section.title}
                    </td>
                  </tr>

                  {section.features.map((feature) => {
                    if (feature.hideView) {
                      return (
                        <React.Fragment key={feature.key}>
                          <tr className="border-t bg-muted/10">
                            <td colSpan={SUBJECT_COLUMNS.length + 1} className="px-4 pt-3 pb-1 text-xs font-semibold text-foreground">
                              {feature.label}
                            </td>
                          </tr>
                          {(feature.actions || []).map((action) => (
                            <tr key={action.code} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-4 py-2 pl-8">
                                <div className="flex items-center gap-2">
                                  <LevelBadge level={action.level} />
                                  <span className="text-muted-foreground">{action.label}</span>
                                </div>
                              </td>
                              {renderCells(
                                (subject) => actionHasAccess(action.code, subject),
                                (subject) => toggleAction(feature, action, subject)
                              )}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={feature.key}>
                        <tr className="border-b hover:bg-muted/20">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{feature.label}</span>
                              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">View page</span>
                            </div>
                          </td>
                          {renderCells(
                            (subject) => viewHasAccess(feature.paths, subject),
                            (subject) => toggleView(feature, subject)
                          )}
                        </tr>
                        {(feature.actions || []).map((action) => (
                          <tr key={action.code} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 pl-8">
                              <div className="flex items-center gap-2">
                                <LevelBadge level={action.level} />
                                <span className="text-muted-foreground">{action.label}</span>
                              </div>
                            </td>
                            {renderCells(
                              (subject) => actionHasAccess(action.code, subject),
                              (subject) => toggleAction(feature, action, subject)
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all permissions?</AlertDialogTitle>
            <AlertDialogDescription>
              Every role and bundle goes back to the CareFlow default table. Custom changes are removed and the reset is written to the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { resetToDefaults(); setConfirmReset(false); }}
            >
              Reset to defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LevelBadge({ level }) {
  const tone = {
    Create: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Edit: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    Approve: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    View: "bg-green-500/10 text-green-700 border-green-500/20",
  }[level] || "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tone}`}>
      {level}
    </span>
  );
}

function PermissionToggle({ hasAccess, editable, onClick, title }) {
  if (!editable) {
    return hasAccess
      ? <Check className="w-4 h-4 text-green-600 mx-auto" />
      : <X className="w-4 h-4 text-red-400 mx-auto" />;
  }
  return (
    <button
      onClick={onClick}
      title={title || (hasAccess ? "Click to revoke" : "Click to grant")}
      className={`mx-auto p-1 rounded-md transition-colors hover:scale-110 ${
        hasAccess ? "text-green-600 hover:bg-green-100" : "text-red-400 hover:bg-red-100"
      }`}
    >
      {hasAccess ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );
}