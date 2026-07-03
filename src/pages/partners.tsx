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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UserCircle,
  Eye,
  FileText,
  Wallet,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import type { User, Lead, Customer, LoanApplication } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PartnersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  // Customer detail dialog
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<{ id?: string; name?: string; mobile?: string }>({});

  // Partner detail view state
  const [detailPartner, setDetailPartner] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "applications">("overview");

  const [allPartners, setAllPartners] = useState<User[]>([]);
  const [allApps, setAllApps] = useState<LoanApplication[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    Promise.all([
      dataService.getUsers(),
      dataService.getLoanApplications(),
      dataService.getLeads(),
      dataService.getCustomers(),
    ]).then(([users, apps, leads, custs]) => {
      setAllPartners(users.filter((u) => u.role === "partner"));
      setAllApps(apps);
      setAllLeads(leads);
      setAllCustomers(custs);
    });
  }, []);

  const filtered = useMemo(() => {
    return allPartners.filter(
      (p) =>
        p.fullName.toLowerCase().includes(search.toLowerCase()) ||
        p.mobileNumber?.includes(search) ||
        p.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [allPartners, search]);

  const openCreate = () => {
    setEditingPartner(null);
    setForm({ role: "partner", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (partner: User) => {
    setEditingPartner(partner);
    setForm({ ...partner });
    setDialogOpen(true);
  };

  const openDetail = (partner: User) => {
    setDetailPartner(partner);
    setDetailTab("overview");
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.fullName || !form.mobileNumber || !form.username || !form.password) return;

    if (editingPartner) {
      await dataService.updateUser(editingPartner.id, form as Partial<User>);
    } else {
      await dataService.createUser({
        fullName: form.fullName || "",
        mobileNumber: form.mobileNumber || "",
        email: "",
        username: form.username || "",
        password: form.password || "",
        role: "partner",
        status: (form.status as User["status"]) || "active",
      });
    }
    setDialogOpen(false);
    setEditingPartner(null);
    setForm({});
    window.location.reload();
  };

  const handleToggleStatus = async (partner: User) => {
    await dataService.updateUser(partner.id, { status: partner.status === "active" ? "inactive" : "active" });
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this partner account? All their data will remain but they cannot log in.")) {
      await dataService.deleteUser(id);
      window.location.reload();
    }
  };

  // Compute partner stats for the list view
  const partnerStats = useMemo(() => {
    const stats: Record<string, { apps: number; leads: number; customers: number }> = {};
    allPartners.forEach((p) => {
      stats[p.id] = {
        apps: allApps.filter((a) => a.assignedTo === p.id).length,
        leads: allLeads.filter((l) => l.assignedTo === p.id).length,
        customers: allCustomers.filter((c) => c.assignedTo === p.id).length,
      };
    });
    return stats;
  }, [allPartners, allApps, allLeads, allCustomers]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Partner Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage 3rd party Financial Service accounts
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Partner
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, or username..."
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Username</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Files</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Leads</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customers</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No partners found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => {
                      const stats = partnerStats[p.id] || { apps: 0, leads: 0, customers: 0 };
                      return (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-medium">
                            <button
                              onClick={() => openDetail(p)}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40">
                                {p.fullName}
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-2">{p.mobileNumber}</td>
                          <td className="py-3 px-2 font-mono text-xs">{p.username}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 px-2">{stats.apps}</td>
                          <td className="py-3 px-2">{stats.leads}</td>
                          <td className="py-3 px-2">{stats.customers}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openDetail(p)} title="View Details">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(p)}>
                                {p.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
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

      {/* Partner Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-3">
              <UserCircle className="h-6 w-6 text-primary" />
              {detailPartner?.fullName}
            </DialogTitle>
            <DialogDescription>
              Financial Service Partner — performance and file overview
            </DialogDescription>
          </DialogHeader>

          {detailPartner && (() => {
            const partnerApps = allApps.filter((a) => a.assignedTo === detailPartner.id);
            const partnerLeads = allLeads.filter((l) => l.assignedTo === detailPartner.id);
            const partnerCustomers = allCustomers.filter((c) => c.assignedTo === detailPartner.id);

            const totalRequested = partnerApps.reduce((s, a) => s + parseFloat(a.requestedAmount || "0"), 0);
            const totalApproved = partnerApps.reduce((s, a) => s + parseFloat(a.approvalAmount || "0"), 0);
            const totalDisbursed = partnerApps
              .filter((a) => a.status === "disbursed")
              .reduce((s, a) => s + parseFloat(a.approvalAmount || "0"), 0);
            const approvedCount = partnerApps.filter((a) => a.status === "approved").length;
            const disbursedCount = partnerApps.filter((a) => a.status === "disbursed").length;
            const rejectedCount = partnerApps.filter((a) => a.status === "rejected").length;
            const pendingCount = partnerApps.filter(
              (a) => !["approved", "rejected", "disbursed", "closed"].includes(a.status)
            ).length;

            const documentStats = partnerApps.reduce(
              (acc, app) => {
                const docs = app.documents || [];
                const verified = docs.filter((d) => d.status === "verified" || d.status === "received").length;
                return {
                  totalDocs: acc.totalDocs + docs.length,
                  verifiedDocs: acc.verifiedDocs + verified,
                };
              },
              { totalDocs: 0, verifiedDocs: 0 }
            );

            const tabContent = (tab: string) => {
              switch (tab) {
                case "overview":
                  return (
                    <div className="space-y-6">
                      {/* Financial Stats Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <FileText className="h-6 w-6 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold font-serif">{partnerApps.length}</p>
                            <p className="text-xs text-muted-foreground">Total Files</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
                            <p className="text-2xl font-bold font-serif">{approvedCount}</p>
                            <p className="text-xs text-muted-foreground">Approved</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Wallet className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                            <p className="text-2xl font-bold font-serif">{disbursedCount}</p>
                            <p className="text-xs text-muted-foreground">Disbursed</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <XCircle className="h-6 w-6 mx-auto mb-1 text-red-500" />
                            <p className="text-2xl font-bold font-serif">{rejectedCount}</p>
                            <p className="text-xs text-muted-foreground">Rejected</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Financial Amounts Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Requested</p>
                            <p className="text-xl font-bold font-serif">{formatCurrency(totalRequested)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Approved</p>
                            <p className="text-xl font-bold font-serif text-emerald-600">{formatCurrency(totalApproved)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Total Disbursed</p>
                            <p className="text-xl font-bold font-serif text-blue-600">{formatCurrency(totalDisbursed)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Additional Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Card className="border-l-4 border-l-amber-500">
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Pending Files</p>
                            <p className="text-lg font-bold">{pendingCount}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-purple-500">
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Leads</p>
                            <p className="text-lg font-bold">{partnerLeads.length}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-teal-500">
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Customers</p>
                            <p className="text-lg font-bold">{partnerCustomers.length}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-indigo-500">
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">Docs Collected</p>
                            <p className="text-lg font-bold">
                              {documentStats.totalDocs > 0
                                ? `${Math.round((documentStats.verifiedDocs / documentStats.totalDocs) * 100)}%`
                                : "—"}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Account info */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="font-serif text-sm">Account Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Username: </span>
                              <span className="font-mono">{detailPartner.username}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Mobile: </span>
                              <span>{detailPartner.mobileNumber}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <StatusBadge status={detailPartner.status} />
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created: </span>
                              <span>{new Date(detailPartner.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* View Applications Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailTab("applications")}
                        className="gap-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        View All Files ({partnerApps.length})
                      </Button>
                    </div>
                  );

                case "applications":
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-semibold">All Files ({partnerApps.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setDetailTab("overview")}>
                          Back to Overview
                        </Button>
                      </div>

                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <Card className="bg-emerald-50/50">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Total Amount</p>
                            <p className="text-sm font-bold">{formatCurrency(totalRequested)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-blue-50/50">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Approved Amount</p>
                            <p className="text-sm font-bold text-emerald-700">{formatCurrency(totalApproved)}</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-indigo-50/50">
                          <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Disbursed Amount</p>
                            <p className="text-sm font-bold text-blue-700">{formatCurrency(totalDisbursed)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Customer</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Lender</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Requested</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Approved</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Docs</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {partnerApps.length === 0 ? (
                                <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No files</td></tr>
                              ) : (
                                partnerApps.map((app) => {
                                  const docs = app.documents || [];
                                  const verifiedDocs = docs.filter((d) => d.status === "verified" || d.status === "received").length;
                                  const docProgress = docs.length > 0 ? Math.round((verifiedDocs / docs.length) * 100) : 0;
                                  const cust = partnerCustomers.find((c) => c.id === app.customerId);
                                  return (
                                    <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                                      <td className="py-2 px-3">
                                        <button
                                          onClick={() => {
                                            setSelectedCustomerInfo({
                                              id: app.customerId,
                                              name: cust?.fullName || app.customerName,
                                              mobile: app.mobileNumber,
                                            });
                                            setCustomerDetailOpen(true);
                                          }}
                                          className="font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                                        >
                                          <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40 group-hover:decoration-primary/60">
                                            {cust?.fullName || app.customerName || "—"}
                                          </span>
                                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                                        </button>
                                      </td>
                                      <td className="py-2 px-3 font-medium">{app.loanCategory}</td>
                                      <td className="py-2 px-3">{app.lender}</td>
                                      <td className="py-2 px-3 text-right">{app.requestedAmount}</td>
                                      <td className="py-2 px-3 text-right">{app.approvalAmount || "-"}</td>
                                      <td className="py-2 px-3"><StatusBadge status={app.status} /></td>
                                      <td className="py-2 px-3">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div
                                              className="h-full bg-primary rounded-full"
                                              style={{ width: `${docProgress}%` }}
                                            />
                                          </div>
                                          <span className="text-xs text-muted-foreground">{verifiedDocs}/{docs.length}</span>
                                        </div>
                                      </td>
                                      <td className="py-2 px-3 text-xs text-muted-foreground">
                                        {new Date(app.createdAt).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  );

                default:
                  return null;
              }
            };

            return (
              <div className="py-2">
                {tabContent(detailTab)}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingPartner ? "Edit Partner" : "Add Partner"}
            </DialogTitle>
            <DialogDescription>
              {editingPartner
                ? "Update financial service partner account"
                : "Create a new 3rd party financial service account"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.fullName || ""}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. ABC Finance"
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile *</Label>
                <Input
                  value={form.mobileNumber || ""}
                  onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={form.username || ""}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. abc_finance"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={form.password || ""}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Set a secure password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
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
