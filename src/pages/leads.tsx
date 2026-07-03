import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Pencil, Trash2, Filter, PhoneCall, Download, ArrowRightLeft, Check, X, UserPlus, ExternalLink } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { exportToCSV, exportToPDF, leadsToExportRows } from "@/lib/export-utils";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import { getLoanCategories, addLoanCategory } from "@/lib/loan-categories";
import type { Lead, FollowUp, Customer } from "@/types";

const leadStatuses = ["new", "contacted", "documents_pending", "submitted", "approved", "rejected", "disbursed", "lost"];
const leadSources = ["Referral", "Walk-in", "Social Media", "Website", "Phone Inquiry", "Broker", "Other"];
export default function LeadsPage() {
  const { user, isAdmin, allUsers: users } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Partial<Lead>>({});

  // Transfer dialog state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferringLead, setTransferringLead] = useState<Lead | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>("");

  // Convert to Customer dialog
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertForm, setConvertForm] = useState<{
    panNumber: string;
    aadhaarNumber: string;
    employmentType: string;
    monthlyIncome: string;
    existingLiabilities: string;
  }>({ panNumber: "", aadhaarNumber: "", employmentType: "Salaried", monthlyIncome: "", existingLiabilities: "" });

  // Customer detail dialog
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<{ id?: string; name?: string; mobile?: string }>({});

  // Loan category management
  const [loanCategories, setLoanCategories] = useState<string[]>(() => getLoanCategories());
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (name) {
      addLoanCategory(name);
      setLoanCategories(getLoanCategories());
      setNewCategoryName("");
      setNewCategoryDialog(false);
    }
  };

  // Follow-up dialog state
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUp>>({});

  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  useEffect(() => {
    dataService.getLeads().then(setAllLeads);
  }, []);

  // For jobbers: only their owned leads (excluding pending transfers out, or accepted transfers out)
  const myLeads = useMemo(() => {
    if (isAdmin) return allLeads;
    return allLeads.filter(
      (l) =>
        l.assignedTo === user?.id &&
        // Exclude if the lead was transferred away by this user and is still pending
        !(l.transferredFrom === user?.id && l.transferredTo && l.transferredTo !== user?.id && l.transferStatus === "pending")
    );
  }, [allLeads, isAdmin, user]);

  // Incoming transfers for jobbers
  const [incomingTransfers, setIncomingTransfers] = useState<Lead[]>([]);

  useEffect(() => {
    if (!user || isAdmin) {
      setIncomingTransfers([]);
      return;
    }
    dataService.getPendingTransfers(user.id).then(setIncomingTransfers);
  }, [user, isAdmin]);

  const filteredLeads = useMemo(() => {
    return myLeads.filter((l) => {
      const matchesSearch =
        l.customerName.toLowerCase().includes(search.toLowerCase()) ||
        l.mobileNumber.includes(search) ||
        l.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myLeads, search, statusFilter]);

  const openTransfer = (lead: Lead) => {
    setTransferringLead(lead);
    setTransferTargetId("");
    setTransferDialogOpen(true);
  };

  const handleTransfer = async () => {
    if (!transferringLead || !transferTargetId || !user) return;
    await dataService.transferLead(transferringLead.id, user.id, transferTargetId);
    setTransferDialogOpen(false);
    setTransferringLead(null);
    setTransferTargetId("");
    window.location.reload();
  };

  const handleAcceptTransfer = async (leadId: string) => {
    await dataService.acceptTransfer(leadId);
    window.location.reload();
  };

  const handleRejectTransfer = async (leadId: string) => {
    await dataService.rejectTransfer(leadId);
    window.location.reload();
  };

  const openCreate = () => {
    setEditingLead(null);
    setForm({
      status: "new",
      loanCategory: loanCategories[0],
      leadSource: leadSources[0],
      assignedTo: user?.id || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({ ...lead });
    setDialogOpen(true);
  };

  const openFollowUp = (lead: Lead) => {
    setFollowUpLead(lead);
    setFollowUpForm({
      customerName: lead.customerName,
      mobileNumber: lead.mobileNumber,
      leadId: lead.id,
      type: "Call",
      priority: "medium",
      status: "pending",
      assignedTo: lead.assignedTo,
      nextFollowUpDate: new Date().toISOString().split("T")[0],
      nextFollowUpTime: "10:00",
    });
    setFollowUpDialog(true);
  };

  const handleSaveFollowUp = async () => {
    if (!followUpForm.nextFollowUpDate || !followUpForm.type) return;
    await dataService.createFollowUp({
      customerName: followUpLead?.customerName || "",
      mobileNumber: followUpLead?.mobileNumber || "",
      leadId: followUpLead?.id || null,
      applicationId: null,
      type: followUpForm.type as FollowUp["type"],
      notes: followUpForm.notes || "",
      nextFollowUpDate: followUpForm.nextFollowUpDate,
      nextFollowUpTime: followUpForm.nextFollowUpTime || "10:00",
      priority: followUpForm.priority as FollowUp["priority"],
      status: "pending",
      assignedTo: followUpLead?.assignedTo || user?.id || "",
    });
    setFollowUpDialog(false);
    setFollowUpLead(null);
    setFollowUpForm({});
  };

  const handleSave = async () => {
    if (!form.customerName || !form.mobileNumber || !form.city || !form.loanCategory) return;

    if (editingLead) {
      await dataService.updateLead(editingLead.id, form as Partial<Lead>);
    } else {
      await dataService.addLead({
        customerName: form.customerName || "",
        mobileNumber: form.mobileNumber || "",
        city: form.city || "",
        loanCategory: form.loanCategory || "",
        requiredAmount: form.requiredAmount || "",
        leadSource: form.leadSource || "",
        assignedTo: isAdmin ? (form.assignedTo || user?.id || "") : (user?.id || ""),
        status: (form.status as Lead["status"]) || "new",
        notes: form.notes || "",
      });
    }
    setDialogOpen(false);
    setEditingLead(null);
    setForm({});
    window.location.reload();
  };

  const convertToCustomer = (lead: Lead) => {
    setConvertingLead(lead);
    setConvertForm({
      panNumber: "",
      aadhaarNumber: "",
      employmentType: "Salaried",
      monthlyIncome: "",
      existingLiabilities: "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvertSave = async () => {
    if (!convertingLead) return;
    try {
      await dataService.addCustomer({
        fullName: convertingLead.customerName,
        mobileNumber: convertingLead.mobileNumber,
        address: convertingLead.address || "",
        residenceAddress: convertingLead.residenceAddress,
        officeAddress: convertingLead.officeAddress,
        panNumber: convertForm.panNumber || "",
        aadhaarNumber: convertForm.aadhaarNumber || "",
        employmentType: convertForm.employmentType as Customer["employmentType"],
        monthlyIncome: convertForm.monthlyIncome || "",
        existingLiabilities: convertForm.existingLiabilities || "",
        notes: convertingLead.notes || "",
        assignedTo: convertingLead.assignedTo,
        loanCategory: convertingLead.loanCategory,
        purposeOfLoan: convertingLead.purposeOfLoan,
        hasCoApplicant: false,
        documents: [],
      });
      setConvertDialogOpen(false);
      setConvertingLead(null);
      window.location.reload();
    } catch (err) {
      alert("Failed to convert lead to customer: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      await dataService.deleteLead(id);
      window.location.reload();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {isAdmin ? "All Leads" : "My Leads"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track lead pipeline</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = leadsToExportRows(filteredLeads);
              exportToCSV(headers, rows, `leads-${new Date().toISOString().split("T")[0]}.csv`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = leadsToExportRows(filteredLeads);
              exportToPDF("Leads Export", headers, rows, `leads-${new Date().toISOString().split("T")[0]}.txt`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Incoming Transfers Section (for jobbers) */}
        {!isAdmin && incomingTransfers.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-sm flex items-center gap-2 text-primary">
                <ArrowRightLeft className="h-4 w-4" />
                Incoming Lead Transfers ({incomingTransfers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incomingTransfers.map((lead) => {
                  const fromUser = users.find((u) => u.id === lead.transferredFrom);
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{lead.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          Transferred by {fromUser?.fullName || "Unknown"}
                          {lead.loanCategory && ` · ${lead.loanCategory}`}
                          {lead.requiredAmount && ` · ₹${lead.requiredAmount}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5"
                          onClick={() => handleAcceptTransfer(lead.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleRejectTransfer(lead.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, mobile, or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {leadStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mobile</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">City</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Source</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Assigned</th>}
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Transferred</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 10 : 8} className="py-8 text-center text-muted-foreground">
                        No leads found
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isOwnLead = lead.assignedTo === user?.id;
                      const transferredFromUser = lead.transferredFrom
                        ? users.find((u) => u.id === lead.transferredFrom)
                        : null;
                      return (
                      <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                            <button
                              onClick={() => {
                                setSelectedCustomerInfo({
                                  name: lead.customerName,
                                  mobile: lead.mobileNumber,
                                });
                                setCustomerDetailOpen(true);
                              }}
                              className="font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                            >
                              <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40 group-hover:decoration-primary/60">
                                {lead.customerName}
                              </span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                            </button>
                          </td>
                        <td className="py-3 px-2">{lead.mobileNumber}</td>
                        <td className="py-3 px-2">{lead.city}</td>
                        <td className="py-3 px-2">{lead.loanCategory}</td>
                        <td className="py-3 px-2">{lead.requiredAmount || "-"}</td>
                        <td className="py-3 px-2">
                          <StatusBadge status={lead.status} />
                        </td>
                        <td className="py-3 px-2">{lead.leadSource}</td>
                        {isAdmin && (
                          <td className="py-3 px-2">
                            {users.find((u) => u.id === lead.assignedTo)?.fullName || lead.assignedTo}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="py-3 px-2">
                            {lead.transferredFrom ? (
                              <div className="flex items-center gap-1.5">
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">
                                  {lead.transferStatus === "accepted"
                                    ? `Transferred by ${transferredFromUser?.fullName || "Unknown"} to ${users.find((u) => u.id === lead.assignedTo)?.fullName || lead.assignedTo}`
                                    : lead.transferStatus === "pending"
                                    ? `Pending from ${transferredFromUser?.fullName || "Unknown"}`
                                    : lead.transferStatus === "rejected"
                                    ? `Rejected (from ${transferredFromUser?.fullName || "Unknown"})`
                                    : "-"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!isAdmin && isOwnLead && (
                              <Button variant="ghost" size="icon" onClick={() => openTransfer(lead)} title="Transfer Lead">
                                <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openFollowUp(lead)} title="Create Follow-up">
                              <PhoneCall className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => convertToCustomer(lead)} title="Convert to Customer">
                              <UserPlus className="h-3.5 w-3.5 text-emerald-500" />
                            </Button>
                            {(isAdmin || isOwnLead) && (
                              <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
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

      {/* Lead Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>Fill in the lead details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={form.customerName || ""} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <Input value={form.mobileNumber || ""} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City *</Label>
                <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
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
              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select value={form.leadSource} onValueChange={(v) => setForm({ ...form, leadSource: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadSources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Requirement Amount</Label>
                <Input value={form.requiredAmount || ""} onChange={(e) => setForm({ ...form, requiredAmount: e.target.value })} placeholder="e.g. 5,00,000" />
              </div>
              <div className="space-y-2">
                <Label>CIBIL Score</Label>
                <Input value={form.cibilScore || ""} onChange={(e) => setForm({ ...form, cibilScore: e.target.value })} placeholder="e.g. 750" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purpose of Loan</Label>
                <Input value={form.purposeOfLoan || ""} onChange={(e) => setForm({ ...form, purposeOfLoan: e.target.value })} placeholder="e.g. Business expansion" />
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Lead["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leadStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Customer Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Convert Lead to Customer</DialogTitle>
            <DialogDescription>
              Add missing details to convert {convertingLead?.customerName} to a customer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {convertingLead && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="text-muted-foreground">Lead: </span>{convertingLead.customerName}</p>
                <p><span className="text-muted-foreground">Mobile: </span>{convertingLead.mobileNumber}</p>
                <p><span className="text-muted-foreground">Category: </span>{convertingLead.loanCategory}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input value={convertForm.panNumber} onChange={(e) => setConvertForm({ ...convertForm, panNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input value={convertForm.aadhaarNumber} onChange={(e) => setConvertForm({ ...convertForm, aadhaarNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={convertForm.employmentType} onValueChange={(v) => setConvertForm({ ...convertForm, employmentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Salaried", "Self-Employed", "Business Owner", "Professional", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Income</Label>
                <Input value={convertForm.monthlyIncome} onChange={(e) => setConvertForm({ ...convertForm, monthlyIncome: e.target.value })} placeholder="e.g. 50,000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Existing Liabilities</Label>
              <Input value={convertForm.existingLiabilities} onChange={(e) => setConvertForm({ ...convertForm, existingLiabilities: e.target.value })} placeholder="EMIs, loans, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConvertDialogOpen(false); setConvertingLead(null); }}>Cancel</Button>
            <Button onClick={handleConvertSave}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Transfer Lead</DialogTitle>
            <DialogDescription>
              Transfer {transferringLead?.customerName} to another jobber
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Transfer To</Label>
              <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                <SelectTrigger><SelectValue placeholder="Select a jobber..." /></SelectTrigger>
                <SelectContent>
                  {users.filter((u) => u.role === "jobber" && u.id !== user?.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {transferringLead && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="text-muted-foreground">Customer: </span>{transferringLead.customerName}</p>
                <p><span className="text-muted-foreground">Category: </span>{transferringLead.loanCategory}</p>
                <p><span className="text-muted-foreground">Amount: </span>{transferringLead.requiredAmount || "-"}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={!transferTargetId}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Follow-up</DialogTitle>
            <DialogDescription>
              Schedule follow-up for {followUpLead?.customerName}
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