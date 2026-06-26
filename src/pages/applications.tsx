import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, FileCheck, PhoneCall, Download } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { generateDocumentChecklist, getDocumentProgress } from "@/lib/document-template";
import { exportToCSV, exportToPDF, applicationsToExportRows } from "@/lib/export-utils";
import type { LoanApplication, DocumentItem, FollowUp } from "@/types";

const appStatuses = ["draft", "documents_pending", "ready_to_submit", "submitted", "approved", "rejected", "disbursed"];
const loanCategories = ["Business Loan", "Salaried Loan"];

export default function ApplicationsPage() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<LoanApplication | null>(null);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [form, setForm] = useState<Partial<LoanApplication>>({});

  // Follow-up dialog state
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [followUpApp, setFollowUpApp] = useState<LoanApplication | null>(null);
  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUp>>({});

  const allApps = useMemo(() => {
    const apps = dataService.getLoanApplications();
    return isAdmin ? apps : apps.filter((a) => a.assignedTo === user?.id);
  }, [isAdmin, user]);

  const filteredApps = useMemo(() => {
    return allApps.filter(
      (a) =>
        a.loanCategory.toLowerCase().includes(search.toLowerCase()) ||
        a.lender.toLowerCase().includes(search.toLowerCase()) ||
        a.applicationNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [allApps, search]);

  const openCreate = () => {
    setEditingApp(null);
    const availableLenders = dataService.getLenders();
    setForm({
      status: "draft",
      loanCategory: loanCategories[0],
      lender: availableLenders[0]?.name || "",
      assignedTo: user?.id || "",
      hasCoApplicant: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (app: LoanApplication) => {
    setEditingApp(app);
    setForm({ ...app });
    setDialogOpen(true);
  };

  const openDocs = (app: LoanApplication) => {
    setSelectedApp(app);
    setDocs([...app.documents]);
    setDocDialogOpen(true);
  };

  const openFollowUp = (app: LoanApplication) => {
    const customer = dataService.getCustomers().find((c) => c.id === app.customerId);
    setFollowUpApp(app);
    setFollowUpForm({
      customerName: customer?.fullName || "",
      mobileNumber: customer?.mobileNumber || "",
      applicationId: app.id,
      type: "Call",
      priority: "medium",
      status: "pending",
      assignedTo: app.assignedTo,
      nextFollowUpDate: new Date().toISOString().split("T")[0],
      nextFollowUpTime: "10:00",
    });
    setFollowUpDialog(true);
  };

  const handleSaveFollowUp = () => {
    if (!followUpForm.nextFollowUpDate || !followUpForm.type) return;
    dataService.createFollowUp({
      customerName: followUpApp?.customerName || "",
      mobileNumber: followUpApp?.mobileNumber || "",
      leadId: null,
      applicationId: followUpApp?.id || null,
      type: followUpForm.type as FollowUp["type"],
      notes: followUpForm.notes || "",
      nextFollowUpDate: followUpForm.nextFollowUpDate,
      nextFollowUpTime: followUpForm.nextFollowUpTime || "10:00",
      priority: followUpForm.priority as FollowUp["priority"],
      status: "pending",
      assignedTo: followUpApp?.assignedTo || user?.id || "",
    });
    setFollowUpDialog(false);
    setFollowUpApp(null);
    setFollowUpForm({});
  };

const handleSave = () => {
    if (!form.loanCategory || !form.requestedAmount) return;

    const loanCategory = form.loanCategory as "Business Loan" | "Salaried Loan";
    const hasCoApplicant = form.hasCoApplicant || false;

    if (editingApp) {
      dataService.updateApplication(editingApp.id, {
        ...form,
        requestedAmount: form.requestedAmount,
        approvalAmount: form.approvalAmount || undefined,
      });
    } else {
      const appDocs = generateDocumentChecklist(loanCategory, hasCoApplicant);
      dataService.createLoanApplication({
        customerId: form.customerId || "",
        customerName: "",
        mobileNumber: "",
        loanCategory,
        lender: form.lender || "",
        requestedAmount: form.requestedAmount || "",
        applicationNumber: form.applicationNumber || "",
        submissionDate: form.submissionDate || "",
        approvalAmount: form.approvalAmount || undefined,
        disbursementDate: form.disbursementDate || "",
        rejectionReason: form.rejectionReason || "",
        assignedTo: isAdmin ? (form.assignedTo || user?.id || "") : (user?.id || ""),
        status: (form.status as LoanApplication["status"]) || "draft",
        hasCoApplicant,
        documents: appDocs,
        notes: form.notes || "",
      });
    }
    setDialogOpen(false);
    setEditingApp(null);
    setForm({});
    window.location.reload();
  };

  const handleDocUpdate = (index: number, status: DocumentItem["status"]) => {
    const updated = [...docs];
    updated[index] = { ...updated[index], status };
    setDocs(updated);
  };

  const handleDocRemarks = (index: number, remarks: string) => {
    const updated = [...docs];
    updated[index] = { ...updated[index], remarks };
    setDocs(updated);
  };

  const saveDocs = () => {
    if (!selectedApp) return;
    dataService.updateApplication(selectedApp.id, { documents: docs });
    setDocDialogOpen(false);
    setSelectedApp(null);
    window.location.reload();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure?")) {
      dataService.deleteApplication(id);
      window.location.reload();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {isAdmin ? "All Applications" : "My Applications"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track loan applications and documents</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = applicationsToExportRows(filteredApps);
              exportToCSV(headers, rows, `applications-${new Date().toISOString().split("T")[0]}.csv`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = applicationsToExportRows(filteredApps);
              exportToPDF("Applications Export", headers, rows, `applications-${new Date().toISOString().split("T")[0]}.txt`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Application
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, lender, or app number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Lender</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Docs</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">App #</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jobber</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-muted-foreground">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => {
                      const progress = getDocumentProgress(app.documents);
                      return (
                        <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-medium">{app.loanCategory}</td>
                          <td className="py-3 px-2">{app.lender}</td>
                          <td className="py-3 px-2">{app.requestedAmount}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => openDocs(app)}
                              className="flex items-center gap-1.5 text-xs hover:underline"
                            >
                              <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                              {progress.verified}/{progress.total}
                            </button>
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{app.applicationNumber || "-"}</td>
                          {isAdmin && (
                            <td className="py-3 px-2">
                              {dataService.getUsers().find((u) => u.id === app.assignedTo)?.fullName || app.assignedTo}
                            </td>
                          )}
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openFollowUp(app)} title="Create Follow-up">
                                <PhoneCall className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(app)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(app.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingApp ? "Edit Application" : "New Application"}</DialogTitle>
            <DialogDescription>Enter loan application details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Category</Label>
                <Select value={form.loanCategory} onValueChange={(v) => setForm({ ...form, loanCategory: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {loanCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lender / Bank</Label>
                <Select value={form.lender} onValueChange={(v) => setForm({ ...form, lender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dataService.getLenders().map((l) => (
                      <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Requested Amount *</Label>
                <Input value={form.requestedAmount || ""} onChange={(e) => setForm({ ...form, requestedAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LoanApplication["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {appStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Application Number</Label>
                <Input value={form.applicationNumber || ""} onChange={(e) => setForm({ ...form, applicationNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Submission Date</Label>
                <Input type="date" value={form.submissionDate || ""} onChange={(e) => setForm({ ...form, submissionDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Approval Amount</Label>
                <Input value={form.approvalAmount || ""} onChange={(e) => setForm({ ...form, approvalAmount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Disbursement Date</Label>
                <Input type="date" value={form.disbursementDate || ""} onChange={(e) => setForm({ ...form, disbursementDate: e.target.value })} />
              </div>
            </div>
            {!editingApp && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="coapplicant"
                  checked={form.hasCoApplicant}
                  onCheckedChange={(v) => setForm({ ...form, hasCoApplicant: v as boolean })}
                />
                <Label htmlFor="coapplicant" className="cursor-pointer">Has Co-Applicant / Guarantor</Label>
              </div>
            )}
            {form.status === "rejected" && (
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Input value={form.rejectionReason || ""} onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })} />
              </div>
            )}
            {isAdmin && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dataService.getUsers().filter((u) => u.role === "jobber").map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Document Checklist</DialogTitle>
            <DialogDescription>
              {selectedApp?.loanCategory} &middot; {selectedApp?.lender}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {docs.map((doc, i) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="text-sm font-medium">{doc.name}</p>
                  {doc.remarks && <p className="text-xs text-muted-foreground">{doc.remarks}</p>}
                  <Input
                    className="mt-1.5 h-8 text-xs"
                    placeholder="Remarks..."
                    value={doc.remarks || ""}
                    onChange={(e) => handleDocRemarks(i, e.target.value)}
                  />
                </div>
                <Select value={doc.status} onValueChange={(v) => handleDocUpdate(i, v as DocumentItem["status"])}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDocs}>Save Documents</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Follow-up</DialogTitle>
            <DialogDescription>
              Schedule follow-up for application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Follow-up Type</Label>
                <Select value={followUpForm.type} onValueChange={(v) => setFollowUpForm({ ...followUpForm, type: v as FollowUp["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Call">Call</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Document Collection">Document Collection</SelectItem>
                    <SelectItem value="Callback">Callback</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={followUpForm.priority} onValueChange={(v) => setFollowUpForm({ ...followUpForm, priority: v as FollowUp["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={followUpForm.nextFollowUpDate || ""} onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={followUpForm.nextFollowUpTime || ""} onChange={(e) => setFollowUpForm({ ...followUpForm, nextFollowUpTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={followUpForm.notes || ""} onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFollowUp}>Schedule Follow-up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}