import { useState, useEffect, useMemo } from "react";
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
import { Plus, Search, Pencil, Trash2, FileCheck, PhoneCall, Download, FilePlus, X, Filter, RefreshCw, ExternalLink, FileText } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { generateDocumentChecklist, getDocumentProgress } from "@/lib/document-template";
import { exportToCSV, exportToPDF, applicationsToExportRows } from "@/lib/export-utils";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import FileUpload from "@/components/FileUpload";
import type { LoanApplication, DocumentItem, FollowUp, Customer, Lender, StoredFileInfo } from "@/types";

const appStatuses = ["draft", "documents_pending", "ready_to_submit", "submitted", "approved", "rejected", "disbursed"];
const completionStatuses = ["pending", "completed"];
import { getLoanCategories, addLoanCategory } from "@/lib/loan-categories";

// Managed dynamically via loan-categories.ts

export default function ApplicationsPage() {
  const { user, isAdmin, allUsers: users } = useAuth();
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
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

  // Customer detail dialog
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<{ id?: string; name?: string; mobile?: string }>({});

  // Loan category management
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [allApps, setAllApps] = useState<LoanApplication[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loanCategories, setLoanCategories] = useState<string[]>([]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (name) {
      addLoanCategory(name);
      setLoanCategories(getLoanCategories());
      setNewCategoryName("");
      setNewCategoryDialog(false);
      setForm({ ...form, loanCategory: name });
    }
  };

  useEffect(() => {
    setLoanCategories(getLoanCategories());
  }, []);

  useEffect(() => {
    Promise.all([
      dataService.getLoanApplications(),
      dataService.getLenders(),
      isAdmin ? dataService.getCustomers() : Promise.resolve([] as Customer[]),
    ]).then(([apps, lndrs, custs]) => {
      setAllApps(isAdmin ? apps : apps.filter((a) => a.assignedTo === user?.id));
      setLenders(lndrs);
      if (custs) setCustomers(custs);
    });
  }, [isAdmin, user?.id]);

  const filteredApps = useMemo(() => {
    return allApps.filter((a) => {
      const matchesSearch =
        a.customerName.toLowerCase().includes(search.toLowerCase()) ||
        a.loanCategory.toLowerCase().includes(search.toLowerCase()) ||
        a.lender.toLowerCase().includes(search.toLowerCase()) ||
        a.applicationNumber?.toLowerCase().includes(search.toLowerCase()) ||
        a.schemeName?.toLowerCase().includes(search.toLowerCase()) ||
        a.mobileNumber.includes(search);
      const matchesCategory = categoryFilter === "all" || a.loanCategory === categoryFilter;
      const matchesCompletion = completionFilter === "all" || a.completionStatus === completionFilter;
      const matchesDate = !dateFilter || (a.submissionDate && a.submissionDate.startsWith(dateFilter)) || (a.createdAt && a.createdAt.startsWith(dateFilter));
      return matchesSearch && matchesCategory && matchesCompletion && matchesDate;
    });
  }, [allApps, search, categoryFilter, completionFilter, dateFilter]);

  const openCreate = () => {
    setEditingApp(null);
    setForm({
      status: "draft",
      loanCategory: loanCategories[0],
      lender: lenders[0]?.name || "",
      assignedTo: user?.id || "",
      hasCoApplicant: false,
      completionStatus: "pending",
      customerName: "",
      mobileNumber: "",
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
    const customer = customers.find((c) => c.id === app.customerId);
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

  const handleSaveFollowUp = async () => {
    if (!followUpForm.nextFollowUpDate || !followUpForm.type) return;
    await dataService.createFollowUp({
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
  };  const handleSave = async () => {
    if (!form.loanCategory || !form.requestedAmount) return;

    const loanCategory = form.loanCategory as "Business Loan" | "Salaried Loan";
    const hasCoApplicant = form.hasCoApplicant || false;

    // Auto-set status to "approved" when approval amount is entered
    // Auto-set status to "approved" when approval amount is entered
    const nonApprovedStatuses: LoanApplication["status"][] = ["draft", "under_review", "submitted", "documents_pending"];
    const effectiveStatus = form.approvalAmount
      ? (form.status && nonApprovedStatuses.includes(form.status) ? "approved" : form.status)
      : form.status;

    if (editingApp) {
      await dataService.updateApplication(editingApp.id, {
        ...form,
        status: effectiveStatus as LoanApplication["status"],
        requestedAmount: form.requestedAmount,
        approvalAmount: form.approvalAmount || undefined,
        tenure: form.tenure || undefined,
        emiAmount: form.emiAmount || undefined,
        completionStatus: (form.completionStatus as "pending" | "completed") || undefined,
      });
    } else {
      const appDocs = generateDocumentChecklist(loanCategory, hasCoApplicant);
      await dataService.createLoanApplication({
        customerId: form.customerId || "",
        customerName: form.customerName || "",
        mobileNumber: form.mobileNumber || "",
        loanCategory,
        lender: form.lender || "",
        requestedAmount: form.requestedAmount || "",
        cibilScore: form.cibilScore || undefined,
        purchaseValue: form.purchaseValue || undefined,
        saleDeedAmount: form.saleDeedAmount || undefined,
        residenceAddress: form.residenceAddress || undefined,
        officeAddress: form.officeAddress || undefined,
        applicationNumber: form.applicationNumber || "",
        submissionDate: form.submissionDate || "",
        approvalAmount: form.approvalAmount || undefined,
        disbursedAmount: form.disbursedAmount || undefined,
        disbursementDate: form.disbursementDate || "",
        rejectionReason: form.rejectionReason || "",
        tenure: form.tenure || undefined,
        emiAmount: form.emiAmount || undefined,
        assignedTo: isAdmin ? (form.assignedTo || user?.id || "") : (user?.id || ""),
        status: (effectiveStatus as LoanApplication["status"]) || "draft",
        hasCoApplicant,
        coApplicants: form.coApplicants || [],
        documents: appDocs,
        storedFiles: form.storedFiles || [],
        notes: form.notes || "",
        propertyAddress: form.propertyAddress || undefined,
        schemeName: form.schemeName || undefined,
        completionStatus: (form.completionStatus as "pending" | "completed") || "pending",
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

  const saveDocs = async () => {
    if (!selectedApp) return;
    await dataService.updateApplication(selectedApp.id, { documents: docs });
    setDocDialogOpen(false);
    setSelectedApp(null);
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      await dataService.deleteApplication(id);
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
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, category, lender, or app number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {loanCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={completionFilter} onValueChange={setCompletionFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative max-w-[160px]">
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-10"
                />
              </div>
              {dateFilter || categoryFilter !== "all" || completionFilter !== "all" ? (
                <Button variant="ghost" size="sm" onClick={() => { setDateFilter(""); setCategoryFilter("all"); setCompletionFilter("all"); }}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Lender</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Scheme</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Completion</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Docs</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">App #</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jobber</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} className="py-8 text-center text-muted-foreground">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    filteredApps.map((app) => {
                      const progress = getDocumentProgress(app.documents);
                      return (
                        <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2">
                            <button
                              onClick={() => {
                                const cust = customers.find((c) => c.id === app.customerId);
                                setSelectedCustomerInfo({
                                  id: app.customerId,
                                  name: app.customerName || cust?.fullName,
                                  mobile: app.mobileNumber,
                                });
                                setCustomerDetailOpen(true);
                              }}
                              className="font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                            >
                              <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40 group-hover:decoration-primary/60">
                                {app.customerName || customers.find((c) => c.id === app.customerId)?.fullName || "-"}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </button>
                          </td>
                          <td className="py-3 px-2">{app.loanCategory}</td>
                          <td className="py-3 px-2">{app.lender}</td>
                          <td className="py-3 px-2">{app.requestedAmount}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="py-3 px-2 text-xs">{app.schemeName || "-"}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={app.completionStatus || "pending"} />
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
                              {users.find((u) => u.id === app.assignedTo)?.fullName || app.assignedTo}
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
                <Label>Customer Name</Label>
                <Select value={form.customerId || form.customerName || ""} onValueChange={(v) => {
                  const cust = customers.find((c) => c.id === v);
                  if (cust) {
                    setForm({ ...form, customerId: cust.id, customerName: cust.fullName, mobileNumber: cust.mobileNumber });
                  } else if (v === "__custom__") {
                    setForm({ ...form, customerId: "", customerName: form.customerName || "", mobileNumber: form.mobileNumber || "" });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Select or type customer" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName} ({c.mobileNumber})</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom Entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Category</Label>
                <div className="flex gap-2">
                  <Select value={form.loanCategory} onValueChange={(v) => setForm({ ...form, loanCategory: v })}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {loanCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setNewCategoryDialog(true)} title="Add new category">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lender / Bank</Label>
                <Select value={form.lender} onValueChange={(v) => setForm({ ...form, lender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {lenders.map((l) => (
                      <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name (manual)</Label>
                <Input value={form.customerName || ""} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input value={form.mobileNumber || ""} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} placeholder="Mobile number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Requirement Amount *</Label>
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
                <Label>Residence Address</Label>
                <Input value={form.residenceAddress || ""} onChange={(e) => setForm({ ...form, residenceAddress: e.target.value })} placeholder="Residence address" />
              </div>
              <div className="space-y-2">
                <Label>Office Address</Label>
                <Input value={form.officeAddress || ""} onChange={(e) => setForm({ ...form, officeAddress: e.target.value })} placeholder="Office address" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CIBIL Score</Label>
                <Input value={form.cibilScore || ""} onChange={(e) => setForm({ ...form, cibilScore: e.target.value })} placeholder="e.g. 750" />
              </div>
            </div>
            {form.loanCategory === "Home Loan" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Value</Label>
                  <Input value={form.purchaseValue || ""} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} placeholder="e.g. 50,00,000" />
                </div>
                <div className="space-y-2">
                  <Label>Sale Deed Amount</Label>
                  <Input value={form.saleDeedAmount || ""} onChange={(e) => setForm({ ...form, saleDeedAmount: e.target.value })} placeholder="e.g. 45,00,000" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Purpose of Loan</Label>
              <Input value={form.purposeOfLoan || ""} onChange={(e) => setForm({ ...form, purposeOfLoan: e.target.value })} placeholder="e.g. Business expansion" />
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
                <Label>Approval Amount (Disbursed Amount)</Label>
                <Input value={form.approvalAmount || ""} onChange={(e) => {
                  const val = e.target.value;
                  setForm({ ...form, approvalAmount: val, disbursedAmount: val });
                }} />
              </div>
              <div className="space-y-2">
                <Label>Disbursement Amount</Label>
                <Input value={form.disbursedAmount || ""} onChange={(e) => setForm({ ...form, disbursedAmount: e.target.value })} placeholder="Auto-filled from approved amount" />
              </div>
              <div className="space-y-2">
                <Label>Disbursement Date</Label>
                <Input type="date" value={form.disbursementDate || ""} onChange={(e) => setForm({ ...form, disbursementDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Tenure (Months)</Label>
                <Input value={form.tenure || ""} onChange={(e) => setForm({ ...form, tenure: e.target.value })} placeholder="e.g. 60" />
              </div>
              <div className="space-y-2">
                <Label>EMI Amount</Label>
                <Input value={form.emiAmount || ""} onChange={(e) => setForm({ ...form, emiAmount: e.target.value })} placeholder="e.g. 25,000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input value={form.propertyAddress || ""} onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })} placeholder="Property address" />
              </div>
              <div className="space-y-2">
                <Label>Scheme Name</Label>
                <Input value={form.schemeName || ""} onChange={(e) => setForm({ ...form, schemeName: e.target.value })} placeholder="Scheme name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Completion Status</Label>
                <Select value={form.completionStatus || "pending"} onValueChange={(v) => setForm({ ...form, completionStatus: v as "pending" | "completed" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {completionStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingApp && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="coapplicant"
                    checked={form.hasCoApplicant}
                    onCheckedChange={(v) => setForm({ ...form, hasCoApplicant: v as boolean, coApplicants: v ? (form.coApplicants || [{ id: `co_${Date.now()}`, name: "", mobileNumber: "" }]) : [] })}
                  />
                  <Label htmlFor="coapplicant" className="cursor-pointer">Has Co-Applicant / Guarantor</Label>
                </div>

                {/* Co-Applicants Dynamic Fields */}
                {form.hasCoApplicant && (
                  <div className="space-y-3 pt-2 border-t">
                    <h4 className="font-semibold text-sm">Co-Applicants / Guarantors</h4>
                    {(form.coApplicants || []).map((co, idx) => (
                      <div key={co.id} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                        <div className="grid grid-cols-2 gap-3 flex-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Name of Co-Applicant</Label>
                            <Input
                              value={co.name}
                              onChange={(e) => {
                                const updated = [...(form.coApplicants || [])];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setForm({ ...form, coApplicants: updated });
                              }}
                              placeholder="Full name"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Mobile Number</Label>
                            <Input
                              value={co.mobileNumber}
                              onChange={(e) => {
                                const updated = [...(form.coApplicants || [])];
                                updated[idx] = { ...updated[idx], mobileNumber: e.target.value };
                                setForm({ ...form, coApplicants: updated });
                              }}
                              placeholder="Mobile number"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-5 h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const updated = (form.coApplicants || []).filter((_, i) => i !== idx);
                            setForm({ ...form, coApplicants: updated.length > 0 ? updated : [] });
                          }}
                          title="Remove co-applicant"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = [...(form.coApplicants || []), { id: `co_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: "", mobileNumber: "" }];
                        setForm({ ...form, coApplicants: updated });
                      }}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Another Co-Applicant
                    </Button>
                  </div>
                )}
              </>
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
                    {users.filter((u) => u.role === "jobber").map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Uploaded Files Section */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="font-semibold text-sm">Uploaded Documents (S3 Storage)</h4>
              <FileUpload
                onUploadComplete={(files) => {
                  const existing = form.storedFiles || [];
                  setForm({ ...form, storedFiles: [...existing, ...files] });
                }}
                maxFiles={10}
                maxSizeMB={50}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.doc,.docx"
              />
              {form.storedFiles && form.storedFiles.length > 0 && (
                <div className="space-y-1 mt-1">
                  {form.storedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate flex-1">
                        {f.originalName}
                      </a>
                      <span className="text-[10px]">{f.compressed ? "(compressed)" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
          <div className="flex justify-center pt-2">
            <Button variant="ghost" size="sm" onClick={() => {
              const name = prompt("Enter custom document name:");
              if (name && name.trim()) {
                setDocs([...docs, {
                  id: `doc_custom_${Date.now()}`,
                  name: name.trim(),
                  status: "pending",
                  remarks: "",
                  required: false,
                }]);
              }
            }} className="gap-1.5 text-muted-foreground">
              <FilePlus className="h-4 w-4" />
              Add Custom Document
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDocs}>Save Documents</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={newCategoryDialog} onOpenChange={setNewCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Loan Category</DialogTitle>
            <DialogDescription>Enter a name for the new loan category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Education Loan"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewCategoryDialog(false); setNewCategoryName(""); }}>Cancel</Button>
            <Button onClick={handleAddCategory}>Add</Button>
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

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        open={customerDetailOpen}
        onOpenChange={setCustomerDetailOpen}
        customerId={selectedCustomerInfo.id}
        customerName={selectedCustomerInfo.name}
        mobileNumber={selectedCustomerInfo.mobile}
      />
    </AppLayout>
  );
}