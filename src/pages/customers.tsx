import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Plus, Search, Pencil, Trash2, PhoneCall, FileText, Download, FilePlus, FileUp, UserPlus, X } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { BUSINESS_LOAN_DOCS, SALARIED_LOAN_DOCS, CO_APPLICANT_DOCS } from "@/lib/document-template";
import { exportToCSV, exportToPDF, customersToExportRows } from "@/lib/export-utils";
import { getLoanCategories, addLoanCategory } from "@/lib/loan-categories";
import type { Customer, FollowUp } from "@/types";

const employmentTypes = ["Salaried", "Self-Employed", "Business Owner", "Professional", "Other"];
export default function CustomersPage() {
  const { user, isAdmin, allUsers: users } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});

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

  // Convert to Application dialog
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingCustomer, setConvertingCustomer] = useState<Customer | null>(null);
  const [convertForm, setConvertForm] = useState<{
    lender: string;
    requestedAmount: string;
    applicationNumber: string;
    notes: string;
  }>({ lender: "", requestedAmount: "", applicationNumber: "", notes: "" });

  // Follow-up dialog state
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [followUpCustomer, setFollowUpCustomer] = useState<Customer | null>(null);
  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUp>>({});

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [lenders, setLenders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    Promise.all([
      dataService.getCustomers(),
      dataService.getLenders(),
    ]).then(([customers, lndrs]) => {
      setAllCustomers(isAdmin ? customers : customers.filter((c) => c.assignedTo === user?.id));
      setLenders(lndrs);
    });
  }, [isAdmin, user?.id]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(search.toLowerCase()) ||
        c.mobileNumber.includes(search) ||
        c.panNumber?.toLowerCase().includes(search.toLowerCase())
    );
  }, [allCustomers, search]);

  const openCreate = () => {
    setEditingCustomer(null);
    setForm({
      employmentType: employmentTypes[0] as Customer["employmentType"],
      loanCategory: loanCategories[0] as Customer["loanCategory"],
      assignedTo: user?.id || "",
      hasCoApplicant: false,
      documents: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({ ...customer });
    setDialogOpen(true);
  };

  const openFollowUp = (customer: Customer) => {
    setFollowUpCustomer(customer);
    setFollowUpForm({
      customerName: customer.fullName,
      mobileNumber: customer.mobileNumber,
      type: "Call",
      priority: "medium",
      status: "pending",
      assignedTo: customer.assignedTo,
      nextFollowUpDate: new Date().toISOString().split("T")[0],
      nextFollowUpTime: "10:00",
    });
    setFollowUpDialog(true);
  };

  const handleSaveFollowUp = async () => {
    if (!followUpForm.nextFollowUpDate || !followUpForm.type) return;
    await dataService.createFollowUp({
      customerName: followUpCustomer?.fullName || "",
      mobileNumber: followUpCustomer?.mobileNumber || "",
      leadId: null,
      applicationId: null,
      type: followUpForm.type as FollowUp["type"],
      notes: followUpForm.notes || "",
      nextFollowUpDate: followUpForm.nextFollowUpDate,
      nextFollowUpTime: followUpForm.nextFollowUpTime || "10:00",
      priority: followUpForm.priority as FollowUp["priority"],
      status: "pending",
      assignedTo: followUpCustomer?.assignedTo || user?.id || "",
    });
    setFollowUpDialog(false);
    setFollowUpCustomer(null);
    setFollowUpForm({});
  };

  const getDocList = (category?: string, hasCoApplicant?: boolean): string[] => {
    let docs: string[] = [];
    if (category === "Business Loan") docs = [...BUSINESS_LOAN_DOCS];
    else if (category === "Salaried Loan") docs = [...SALARIED_LOAN_DOCS];
    else docs = [...BUSINESS_LOAN_DOCS];
    if (hasCoApplicant) docs = [...docs, ...CO_APPLICANT_DOCS];
    return docs;
  };

  const toggleDoc = (docName: string) => {
    const current = form.documents || [];
    const exists = current.find((d) => d.name === docName);
    if (exists) {
      setForm({ ...form, documents: current.filter((d) => d.name !== docName) });
    } else {
      setForm({
        ...form,
        documents: [...current, { id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: docName, status: "received", remarks: "" }],
      });
    }
  };

  const isDocChecked = (docName: string): boolean => {
    return (form.documents || []).some((d) => d.name === docName);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.mobileNumber) return;

    if (editingCustomer) {
      await dataService.updateCustomer(editingCustomer.id, form as Partial<Customer>);
    } else {
      await dataService.addCustomer({
        fullName: form.fullName || "",
        mobileNumber: form.mobileNumber || "",
        address: form.address || "",
        panNumber: form.panNumber || "",
        aadhaarNumber: form.aadhaarNumber || "",
        employmentType: (form.employmentType as Customer["employmentType"]) || "Salaried",
        monthlyIncome: form.monthlyIncome || "",
        existingLiabilities: form.existingLiabilities || "",
        notes: form.notes || "",
        assignedTo: isAdmin ? (form.assignedTo || user?.id || "") : (user?.id || ""),
        loanCategory: form.loanCategory || undefined,
        hasCoApplicant: form.hasCoApplicant || false,
        documents: form.documents || [],
        propertyAddress: form.propertyAddress || undefined,
        schemeName: form.schemeName || undefined,
        dateAdded: form.dateAdded || undefined,
      });
    }
    setDialogOpen(false);
    setEditingCustomer(null);
    setForm({});
    window.location.reload();
  };

  const convertToApplication = (customer: Customer) => {
    setConvertingCustomer(customer);
    setConvertForm({
      lender: "",
      requestedAmount: "",
      applicationNumber: "",
      notes: customer.notes || "",
    });
    setConvertDialogOpen(true);
  };

  const handleConvertSave = async () => {
    if (!convertingCustomer) return;
    try {
      const loanCategories = getLoanCategories();
      await dataService.createLoanApplication({
        customerId: convertingCustomer.id,
        customerName: convertingCustomer.fullName,
        mobileNumber: convertingCustomer.mobileNumber,
        address: convertingCustomer.address || undefined,
        residenceAddress: convertingCustomer.residenceAddress,
        officeAddress: convertingCustomer.officeAddress,
        loanCategory: convertingCustomer.loanCategory || loanCategories[0],
        purposeOfLoan: convertingCustomer.purposeOfLoan,
        lender: convertForm.lender,
        requestedAmount: convertForm.requestedAmount,
        cibilScore: convertingCustomer.cibilScore,
        purchaseValue: convertingCustomer.purchaseValue,
        saleDeedAmount: convertingCustomer.saleDeedAmount,
        status: "draft",
        assignedTo: convertingCustomer.assignedTo,
        documents: [],
        notes: convertForm.notes || "",
        hasCoApplicant: convertingCustomer.hasCoApplicant || false,
        coApplicants: convertingCustomer.coApplicants || [],
        applicationNumber: convertForm.applicationNumber || "",
      });
      setConvertDialogOpen(false);
      setConvertingCustomer(null);
      window.location.reload();
    } catch (err) {
      alert("Failed to create application: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      await dataService.deleteCustomer(id);
      window.location.reload();
    }
  };

  const docList = getDocList(form.loanCategory, form.hasCoApplicant);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {isAdmin ? "All Customers" : "My Customers"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Customer records and profiles</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = customersToExportRows(filteredCustomers);
              exportToCSV(headers, rows, `customers-${new Date().toISOString().split("T")[0]}.csv`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = customersToExportRows(filteredCustomers);
              exportToPDF("Customers Export", headers, rows, `customers-${new Date().toISOString().split("T")[0]}.txt`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or PAN..."
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mobile</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Employment</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Income</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Loan Category</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Co-Apps</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Docs</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Assigned</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-muted-foreground">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{c.fullName}</td>
                        <td className="py-3 px-2">{c.mobileNumber}</td>
                        <td className="py-3 px-2">{c.employmentType}</td>
                        <td className="py-3 px-2">{c.monthlyIncome || "-"}</td>
                        <td className="py-3 px-2">{c.loanCategory || "-"}</td>
                        <td className="py-3 px-2 text-xs">
                          {c.coApplicants && c.coApplicants.length > 0 ? (
                            <span className="flex flex-col gap-0.5">
                              {c.coApplicants.map((co) => (
                                <span key={co.id} className="truncate max-w-[120px]">{co.name || "Unnamed"}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {c.documents && c.documents.length > 0 ? (
                            <span className="flex items-center gap-1 text-xs">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              {c.documents.filter((d) => d.status === "received" || d.status === "verified").length}/{c.documents.length}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-2">
                            {users.find((u) => u.id === c.assignedTo)?.fullName || c.assignedTo}
                          </td>
                        )}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openFollowUp(c)} title="Create Follow-up">
                              <PhoneCall className="h-3.5 w-3.5 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => convertToApplication(c)} title="Create Application">
                              <FileUp className="h-3.5 w-3.5 text-emerald-500" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
            <DialogDescription>Customer profile details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={form.fullName || ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mobile *</Label>
                <Input value={form.mobileNumber || ""} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
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
            <div className="space-y-2">
              <Label>Purpose of Loan</Label>
              <Input value={form.purposeOfLoan || ""} onChange={(e) => setForm({ ...form, purposeOfLoan: e.target.value })} placeholder="e.g. Business expansion" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PAN Number</Label>
                <Input value={form.panNumber || ""} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input value={form.aadhaarNumber || ""} onChange={(e) => setForm({ ...form, aadhaarNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v as Customer["employmentType"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Income</Label>
                <Input value={form.monthlyIncome || ""} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} placeholder="e.g. 50,000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Existing Liabilities</Label>
              <Input value={form.existingLiabilities || ""} onChange={(e) => setForm({ ...form, existingLiabilities: e.target.value })} placeholder="EMIs, loans, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CIBIL Score</Label>
                <Input value={form.cibilScore || ""} onChange={(e) => setForm({ ...form, cibilScore: e.target.value })} placeholder="e.g. 750" />
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
                <Label>Date Added (DD-MM-YYYY)</Label>
                <Input value={form.dateAdded || ""} onChange={(e) => setForm({ ...form, dateAdded: e.target.value })} placeholder="DD-MM-YYYY" />
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
                <Label>Loan Category</Label>
                <div className="flex gap-2">
                  <Select value={form.loanCategory} onValueChange={(v) => setForm({ ...form, loanCategory: v as Customer["loanCategory"], documents: [] })}>
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
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="coapplicant"
                  checked={form.hasCoApplicant}
                  onCheckedChange={(v) => setForm({ ...form, hasCoApplicant: v as boolean, coApplicants: v ? (form.coApplicants || [{ id: `co_${Date.now()}`, name: "", mobileNumber: "" }]) : [], documents: [] })}
                />
                <Label htmlFor="coapplicant" className="cursor-pointer text-sm">Has Co-Applicant / Guarantor</Label>
              </div>
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

            {/* Document Checklist */}
            {form.loanCategory && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-semibold text-sm">Documents Collected</h4>
                <div className="space-y-2">
                  {/* Primary Documents (excluding co-applicant docs) */}
                  {docList
                    .filter((doc) => !CO_APPLICANT_DOCS.includes(doc))
                    .map((doc) => (
                      <div key={doc} className="flex items-center gap-2">
                        <Checkbox
                          id={`doc_${doc}`}
                          checked={isDocChecked(doc)}
                          onCheckedChange={() => toggleDoc(doc)}
                        />
                        <Label htmlFor={`doc_${doc}`} className="cursor-pointer text-sm font-normal">{doc}</Label>
                      </div>
                    ))}
                  {/* Co-Applicant Documents section - shown below co-applicant fields when hasCoApplicant */}
                  {form.hasCoApplicant && (
                    <div className="mt-3 pt-2 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Co-Applicant / Guarantor Documents</h5>
                      {CO_APPLICANT_DOCS.map((doc) => (
                        <div key={doc} className="flex items-center gap-2">
                          <Checkbox
                            id={`doc_co_${doc}`}
                            checked={isDocChecked(doc)}
                            onCheckedChange={() => toggleDoc(doc)}
                          />
                          <Label htmlFor={`doc_co_${doc}`} className="cursor-pointer text-sm font-normal">{doc}</Label>
                        </div>
                      ))}
                    </div>
                  )}
                    <div className="mt-3 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => {
                        const name = prompt("Enter document name:");
                        if (name && name.trim()) {
                          const current = form.documents || [];
                          setForm({
                            ...form,
                            documents: [...current, { id: `doc_custom_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, name: name.trim(), status: "received", remarks: "" }],
                          });
                        }
                      }} className="gap-1.5 text-muted-foreground">
                        <FilePlus className="h-4 w-4" />
                        Add Custom Document
                      </Button>
                    </div>
                </div>
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

      {/* Convert to Application Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Loan Application</DialogTitle>
            <DialogDescription>
              Enter application details for {convertingCustomer?.fullName} (customer record will be kept)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {convertingCustomer && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p><span className="text-muted-foreground">Customer: </span>{convertingCustomer.fullName}</p>
                <p><span className="text-muted-foreground">Mobile: </span>{convertingCustomer.mobileNumber}</p>
                <p><span className="text-muted-foreground">Category: </span>{convertingCustomer.loanCategory || "-"}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lender / Bank *</Label>
                <Select value={convertForm.lender} onValueChange={(v) => setConvertForm({ ...convertForm, lender: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lender..." /></SelectTrigger>
                  <SelectContent>
                    {lenders.map((l) => (
                      <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Requirement Amount *</Label>
                <Input value={convertForm.requestedAmount} onChange={(e) => setConvertForm({ ...convertForm, requestedAmount: e.target.value })} placeholder="e.g. 5,00,000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Application Number</Label>
                <Input value={convertForm.applicationNumber} onChange={(e) => setConvertForm({ ...convertForm, applicationNumber: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConvertDialogOpen(false); setConvertingCustomer(null); }}>Cancel</Button>
            <Button onClick={handleConvertSave} disabled={!convertForm.lender || !convertForm.requestedAmount}>Create Application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Create Follow-up</DialogTitle>
            <DialogDescription>
              Schedule follow-up for {followUpCustomer?.fullName}
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
    </AppLayout>
  );
}