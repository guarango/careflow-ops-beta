import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Briefcase, Shield, Award, Plus, Trash2, Paperclip, ExternalLink, Loader2, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import AssignedClientsTab from "./AssignedClientsTab";
import SensitiveValue from "@/components/shared/SensitiveValue";
import StatusBadge from "@/components/shared/StatusBadge";
import { ACCESS_LABELS } from "@/lib/staffFilters";

const CONTRACT_AREAS = ["DSPD", "DCFS", "Private Pay", "Licensed Program", "Foster Care"];
const CERT_NAMES = ["CPR/First Aid", "Medication Administration", "CPI / Crisis Prevention", "HIPAA", "Mandated Reporter", "Abuse & Neglect", "Driver's License", "Other"];

export default function StaffProfileDialog({ staff, onSave, onClose, canAssign = false, canViewHR = false, canEditHR = false, readOnly = false }) {
  const [form, setForm] = useState(staff);
  const [tab, setTab] = useState("personal");
  // Personal + Employment + Certs are always shown; Compliance and Assigned are gated.
  const tabCols = 3 + (canViewHR ? 1 : 0) + (canAssign ? 1 : 0);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const toggleContractArea = (area) => {
    const areas = form.contract_areas || [];
    set("contract_areas", areas.includes(area) ? areas.filter(a => a !== area) : [...areas, area]);
  };

  const addReference = () => {
    set("references", [...(form.references || []), { name: "", phone: "", email: "", relationship: "", verified: false }]);
  };
  const updateRef = (i, field, val) => {
    const refs = [...(form.references || [])];
    refs[i] = { ...refs[i], [field]: val };
    set("references", refs);
  };
  const removeRef = (i) => {
    const refs = [...(form.references || [])];
    refs.splice(i, 1);
    set("references", refs);
  };

  const [uploadingIndex, setUploadingIndex] = useState(null);

  const addCert = () => {
    set("certifications", [...(form.certifications || []), { name: "", issue_date: "", expiry_date: "", status: "Current", doc_url: "" }]);
  };

  const handleCertUpload = async (i, file) => {
    setUploadingIndex(i);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateCert(i, "doc_url", file_url);
    setUploadingIndex(null);
  };
  const updateCert = (i, field, val) => {
    const certs = [...(form.certifications || [])];
    certs[i] = { ...certs[i], [field]: val };
    set("certifications", certs);
  };
  const removeCert = (i) => {
    const certs = [...(form.certifications || [])];
    certs.splice(i, 1);
    set("certifications", certs);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{form.first_name} {form.last_name}</span>
            {form.staff_type && (
              <Badge variant="outline" className={form.staff_type === "Probationary" ? "border-chart-4/30 bg-chart-4/10 text-chart-4" : "border-accent/30 bg-accent/10 text-accent"}>
                {form.staff_type}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {readOnly && (
          <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
            Read-only view — your role can view staff records but not edit them.
          </p>
        )}

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className={`grid flex-shrink-0 ${tabCols === 5 ? "grid-cols-5" : tabCols === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="personal"><User className="w-3.5 h-3.5 mr-1.5" />Personal</TabsTrigger>
            <TabsTrigger value="employment"><Briefcase className="w-3.5 h-3.5 mr-1.5" />Employment</TabsTrigger>
            {canViewHR && <TabsTrigger value="compliance"><Shield className="w-3.5 h-3.5 mr-1.5" />Compliance</TabsTrigger>}
            <TabsTrigger value="certifications"><Award className="w-3.5 h-3.5 mr-1.5" />Certs</TabsTrigger>
            {canAssign && <TabsTrigger value="assigned"><Users className="w-3.5 h-3.5 mr-1.5" />Assigned</TabsTrigger>}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">

            {/* PERSONAL TAB */}
            <TabsContent value="personal" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>First Name *</Label><Input value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} /></div>
                <div><Label>Last Name *</Label><Input value={form.last_name || ""} onChange={e => set("last_name", e.target.value)} /></div>
                <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ""} onChange={e => set("date_of_birth", e.target.value)} /></div>
                <div>
                  <Label>SSN (Last 4 digits)</Label>
                  {canEditHR ? (
                    <Input value={form.ssn_last4 || ""} maxLength={4} placeholder="####" onChange={e => set("ssn_last4", e.target.value.replace(/\D/g, ""))} />
                  ) : (
                    <div className="mt-1"><SensitiveValue value={form.ssn_last4} field="staff SSN" subject={{ type: "StaffMember", id: staff?.id, name: `${form.first_name || ""} ${form.last_name || ""}`.trim() }} canReveal={false} /></div>
                  )}
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender || ""} onValueChange={v => set("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Male","Female","Non-binary","Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marital Status</Label>
                  <Select value={form.marital_status || ""} onValueChange={v => set("marital_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["Single","Married","Divorced","Widowed","Other"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Email</Label><Input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
                <div className="col-span-2"><Label>Street Address</Label><Input value={form.address_street || ""} onChange={e => set("address_street", e.target.value)} /></div>
                <div><Label>City</Label><Input value={form.address_city || ""} onChange={e => set("address_city", e.target.value)} /></div>
                <div><Label>State</Label><Input value={form.address_state || ""} onChange={e => set("address_state", e.target.value)} maxLength={2} placeholder="e.g. UT" /></div>
                <div><Label>Zip Code</Label><Input value={form.address_zip || ""} onChange={e => set("address_zip", e.target.value)} /></div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Name</Label><Input value={form.emergency_contact_name || ""} onChange={e => set("emergency_contact_name", e.target.value)} /></div>
                  <div><Label>Relationship</Label><Input value={form.emergency_contact_relation || ""} onChange={e => set("emergency_contact_relation", e.target.value)} /></div>
                  <div><Label>Phone</Label><Input value={form.emergency_contact_phone || ""} onChange={e => set("emergency_contact_phone", e.target.value)} /></div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">References</h3>
                  <Button variant="outline" size="sm" onClick={addReference}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
                </div>
                {(form.references || []).map((ref, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg mb-2">
                    <div><Label className="text-xs">Name</Label><Input value={ref.name} onChange={e => updateRef(i, "name", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Relationship</Label><Input value={ref.relationship} onChange={e => updateRef(i, "relationship", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Phone</Label><Input value={ref.phone} onChange={e => updateRef(i, "phone", e.target.value)} className="h-8 text-sm" /></div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1"><Label className="text-xs">Email</Label><Input value={ref.email} onChange={e => updateRef(i, "email", e.target.value)} className="h-8 text-sm" /></div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRef(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Checkbox checked={ref.verified || false} onCheckedChange={v => updateRef(i, "verified", v)} id={`ref-verified-${i}`} />
                      <label htmlFor={`ref-verified-${i}`} className="text-xs text-muted-foreground">Reference verified</label>
                    </div>
                  </div>
                ))}
                {(form.references || []).length === 0 && <p className="text-xs text-muted-foreground">No references added yet.</p>}
              </div>
            </TabsContent>

            {/* EMPLOYMENT TAB */}
            <TabsContent value="employment" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Staff Type</Label>
                  <Select value={form.staff_type || "Regular"} onValueChange={v => set("staff_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Probationary">Probationary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employment Type</Label>
                  <Select value={form.employment_type || ""} onValueChange={v => set("employment_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Time">Full Time</SelectItem>
                      <SelectItem value="Part Time">Part Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Job title</Label>
                  <Select value={form.role || ""} onValueChange={v => set("role", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {["DSP","Nurse","QIDP","Supervisor","Admin","Behavioral Specialist","Mental Health Pro","Contractor","Volunteer","Non-Client Facing","Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Employee Class</Label>
                  <Select value={form.employee_class || ""} onValueChange={v => set("employee_class", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non-Exempt">Non-Exempt</SelectItem>
                      <SelectItem value="Exempt">Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1.5"><StatusBadge status={form.status || "Pending"} /></div>
                </div>
                <div>
                  <Label>App access</Label>
                  <div className="mt-1.5">
                    <Badge variant="outline" className="text-[11px]">{ACCESS_LABELS[form.app_access || "dsp"]}</Badge>
                    <p className="text-[11px] text-muted-foreground mt-1">Set in Settings &amp; Admin → Users</p>
                  </div>
                </div>
                <div><Label>Hire Date</Label><Input type="date" value={form.hire_date || ""} onChange={e => set("hire_date", e.target.value)} /></div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">Contract Areas <span className="text-muted-foreground font-normal">(select all that apply)</span></h3>
                <div className="flex flex-wrap gap-2">
                  {CONTRACT_AREAS.map(area => (
                    <button key={area} type="button" onClick={() => toggleContractArea(area)}
                      className={`text-sm px-3 py-1.5 rounded-md border font-medium transition-colors ${(form.contract_areas || []).includes(area) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary"}`}>
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox checked={form.orientation_completed || false} onCheckedChange={v => set("orientation_completed", v)} id="orientation" />
                  <label htmlFor="orientation" className="text-sm font-medium">Orientation Completed</label>
                </div>
                {form.orientation_completed && (
                  <div className="w-48"><Label className="text-xs">Orientation Date</Label><Input type="date" value={form.orientation_date || ""} onChange={e => set("orientation_date", e.target.value)} className="h-8 text-sm" /></div>
                )}
              </div>

              <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} /></div>
            </TabsContent>

            {/* COMPLIANCE TAB — HR files need the HR bundle view code */}
            {canViewHR && (
            <TabsContent value="compliance" className="mt-0 space-y-5">
...
            </TabsContent>
            )}

            {/* CERTIFICATIONS TAB */}
            <TabsContent value="certifications" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Certifications & Licenses</h3>
                <Button variant="outline" size="sm" onClick={addCert}><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(form.certifications || []).map((cert, i) => (
                  <div key={i} className="bg-muted rounded-lg p-3 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Certification Name</Label>
                      <Select value={cert.name} onValueChange={v => updateCert(i, "name", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select or type..." /></SelectTrigger>
                        <SelectContent>{CERT_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Issue Date</Label><Input type="date" value={cert.issue_date || ""} onChange={e => updateCert(i, "issue_date", e.target.value)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={cert.expiry_date || ""} onChange={e => updateCert(i, "expiry_date", e.target.value)} className="h-8 text-sm" /></div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={cert.status || "Current"} onValueChange={v => updateCert(i, "status", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Current","Expiring Soon","Expired"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Document</Label>
                        {cert.doc_url ? (
                          <div className="flex items-center gap-2 mt-1">
                            <a href={cert.doc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                              <Paperclip className="w-3 h-3" />View Document<ExternalLink className="w-3 h-3" />
                            </a>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-1" onClick={() => updateCert(i, "doc_url", "")}>Remove</Button>
                          </div>
                        ) : (
                          <label className="mt-1 flex items-center gap-2 cursor-pointer">
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={e => e.target.files?.[0] && handleCertUpload(i, e.target.files[0])} />
                            <span className="text-xs text-muted-foreground border border-dashed border-border rounded-md px-3 py-1.5 hover:border-primary hover:text-primary transition-colors flex items-center gap-1.5">
                              {uploadingIndex === i ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading...</> : <><Paperclip className="w-3 h-3" />Upload file</>}
                            </span>
                          </label>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-8 self-end" onClick={() => removeCert(i)}><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
                    </div>
                  </div>
                ))}
                {(form.certifications || []).length === 0 && <p className="text-xs text-muted-foreground">No certifications added yet.</p>}
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div><Label>Total Training Hours</Label><Input type="number" value={form.training_hours || 0} onChange={e => set("training_hours", parseFloat(e.target.value) || 0)} /></div>
              </div>
            </TabsContent>

            {/* ASSIGNED CLIENTS TAB (directory edit permission) */}
            {canAssign && (
              <TabsContent value="assigned" className="mt-0">
                {staff.id ? (
                  <AssignedClientsTab staff={staff} />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Save the staff profile first before assigning clients.</p>
                )}
              </TabsContent>
            )}
          </div>
        </Tabs>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-2">
          <Button variant="outline" onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
          {!readOnly && (
            <Button onClick={() => onSave(form)} disabled={!form.first_name || !form.last_name}>Save Profile</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}