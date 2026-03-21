import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock, Eye, Send, FileQuestion } from "lucide-react";
import DocumentReviewPanel from "./DocumentReviewPanel";
import RequestDocumentModal from "./RequestDocumentModal";
import StaffRequestsPanel from "./StaffRequestsPanel";

const STATUS_CONFIG = {
  Current: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  Missing: { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
  "Expiring Soon": { color: "bg-orange-100 text-orange-700 border-orange-200", icon: AlertTriangle },
  "Pending Review": { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  Expired: { color: "bg-red-200 text-red-800 border-red-300", icon: XCircle },
};

const OVERALL_STATUS = {
  Compliant: "bg-green-100 text-green-700 border-green-200",
  "At Risk": "bg-amber-100 text-amber-700 border-amber-200",
  "Non-Compliant": "bg-red-100 text-red-700 border-red-200",
};

export default function StaffComplianceProfile({ staffMember, compliance, onBack, onUpdateDoc }) {
  const [reviewDoc, setReviewDoc] = useState(null);
  const [requestDoc, setRequestDoc] = useState(null);
  const [showRequestAll, setShowRequestAll] = useState(false);

  const { required, staffDocs, overallStatus, pct } = compliance;

  const rows = required.map(reqDoc => {
    const found = staffDocs.find(d => d.title?.toLowerCase().includes(reqDoc.toLowerCase()));
    return { name: reqDoc, doc: found || null, status: found ? found.status : "Missing" };
  });

  const missingRows = rows.filter(r => r.status === "Missing");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold">{staffMember.first_name} {staffMember.last_name}</h2>
            <span className="text-sm text-muted-foreground">{staffMember.role}</span>
            <Badge variant="outline" className={`text-xs border ${OVERALL_STATUS[overallStatus]}`}>{overallStatus}</Badge>
            <span className="text-sm font-semibold">{pct}% compliant</span>
          </div>
        </div>
        <div className="flex gap-2">
          {missingRows.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowRequestAll(true)} className="gap-1">
              <FileQuestion className="w-4 h-4" /> Request Missing Docs
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setRequestDoc({ staffMember })} className="gap-1">
            <Send className="w-4 h-4" /> Send Reminder
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Expiry Date</TableHead>
                <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ name, doc, status }) => {
                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Current"];
                const Icon = cfg.icon;
                return (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{doc ? doc.title : name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc ? doc.category : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs border ${cfg.color} flex items-center gap-1 w-fit`}>
                        <Icon className="w-3 h-3" />{status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{doc?.expiry_date || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {doc?.created_date ? new Date(doc.created_date).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {doc && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setReviewDoc(doc)}>
                            <Eye className="w-3 h-3" /> View
                          </Button>
                        )}
                        {status === "Missing" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-primary" onClick={() => setRequestDoc({ staffMember, docName: name })}>
                            <FileQuestion className="w-3 h-3" /> Request
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {reviewDoc && (
        <DocumentReviewPanel
          doc={reviewDoc}
          staffMember={staffMember}
          onClose={() => setReviewDoc(null)}
          onUpdate={(id, data) => { onUpdateDoc(id, data); setReviewDoc(null); }}
        />
      )}

      {requestDoc && (
        <RequestDocumentModal
          staffMember={requestDoc.staffMember}
          defaultDocName={requestDoc.docName}
          onClose={() => setRequestDoc(null)}
        />
      )}

      {showRequestAll && (
        <RequestDocumentModal
          staffMember={staffMember}
          missingDocs={missingRows.map(r => r.name)}
          onClose={() => setShowRequestAll(false)}
        />
      )}
    </div>
  );
}