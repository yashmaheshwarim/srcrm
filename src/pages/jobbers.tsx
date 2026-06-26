import { useState, useMemo } from "react";
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
import { Plus, Search, Pencil, Trash2, UserCircle, Eye, Users, FileText, ClipboardList, PhoneCall } from "lucide-react";
import { dataService } from "@/lib/data-service";
import type { User } from "@/types";

export default function JobbersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJobber, setEditingJobber] = useState<User | null>(null);
  const [form, setForm] = useState<Partial<User>>({});

  // Jobber detail view state
  const [detailJobber, setDetailJobber] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "leads" | "customers" | "applications" | "followups">("overview");

  const allJobbers = useMemo(() => {
    return dataService.getUsers().filter((u) => u.role === "jobber");
  }, []);

  const filtered = useMemo(() => {
    return allJobbers.filter(
      (j) =>
        j.fullName.toLowerCase().includes(search.toLowerCase()) ||
        j.mobileNumber.includes(search) ||
        j.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [allJobbers, search]);

  const openCreate = () => {
    setEditingJobber(null);
    setForm({ role: "jobber", status: "active" });
    setDialogOpen(true);
  };

  const openEdit = (jobber: User) => {
    setEditingJobber(jobber);
    setForm({ ...jobber });
    setDialogOpen(true);
  };

  const openDetail = (jobber: User) => {
    setDetailJobber(jobber);
    setDetailTab("overview");
    setDetailOpen(true);
  };

  const handleSave = () => {
    if (!form.fullName || !form.mobileNumber || !form.username || !form.password) return;

    if (editingJobber) {
      dataService.updateUser(editingJobber.id, form as Partial<User>);
    } else {
      dataService.createUser({
        fullName: form.fullName || "",
        mobileNumber: form.mobileNumber || "",
        email: "",
        username: form.username || "",
        password: form.password || "",
        role: "jobber",
        status: (form.status as User["status"]) || "active",
      });
    }
    setDialogOpen(false);
    setEditingJobber(null);
    setForm({});
    window.location.reload();
  };

  const handleToggleStatus = (jobber: User) => {
    dataService.updateUser(jobber.id, { status: jobber.status === "active" ? "inactive" : "active" });
    window.location.reload();
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this jobber? All their data will remain but they cannot log in.")) {
      dataService.deleteUser(id);
      window.location.reload();
    }
  };

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
            <h1 className="font-serif text-2xl font-bold text-foreground">Jobber Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage jobber accounts</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Jobber
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Leads</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Apps</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No jobbers found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((j) => {
                      const leads = dataService.getLeads().filter((l) => l.assignedTo === j.id).length;
                      const apps = dataService.getLoanApplications().filter((a) => a.assignedTo === j.id).length;
                      return (
                        <tr key={j.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-2 font-medium">
                            <button
                              onClick={() => openDetail(j)}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <UserCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40">
                                {j.fullName}
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-2">{j.mobileNumber}</td>
                          <td className="py-3 px-2 font-mono text-xs">{j.username}</td>
                          <td className="py-3 px-2">
                            <StatusBadge status={j.status} />
                          </td>
                          <td className="py-3 px-2">{leads}</td>
                          <td className="py-3 px-2">{apps}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openDetail(j)} title="View Details">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(j)}>
                                {j.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(j)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(j.id)}>
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

      {/* Jobber Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-3">
              <UserCircle className="h-6 w-6 text-primary" />
              {detailJobber?.fullName}
            </DialogTitle>
            <DialogDescription>
              Jobber details and activity overview
            </DialogDescription>
          </DialogHeader>

          {detailJobber && (() => {
            const jobberLeads = dataService.getLeads().filter((l) => l.assignedTo === detailJobber.id);
            const jobberCustomers = dataService.getCustomers().filter((c) => c.assignedTo === detailJobber.id);
            const jobberApps = dataService.getLoanApplications().filter((a) => a.assignedTo === detailJobber.id);
            const jobberFollowUps = dataService.getFollowUps().filter((f) => f.assignedTo === detailJobber.id);

            const tabContent = (tab: string) => {
              switch (tab) {
                case "overview":
                  return (
                    <div className="space-y-6">
                      {/* Info cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <Users className="h-6 w-6 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold font-serif">{jobberLeads.length}</p>
                            <p className="text-xs text-muted-foreground">Leads</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <UserCircle className="h-6 w-6 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold font-serif">{jobberCustomers.length}</p>
                            <p className="text-xs text-muted-foreground">Customers</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <FileText className="h-6 w-6 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold font-serif">{jobberApps.length}</p>
                            <p className="text-xs text-muted-foreground">Applications</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <ClipboardList className="h-6 w-6 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold font-serif">{jobberFollowUps.length}</p>
                            <p className="text-xs text-muted-foreground">Follow-ups</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Jobber info */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="font-serif text-sm">Account Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Username: </span>
                              <span className="font-mono">{detailJobber.username}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Mobile: </span>
                              <span>{detailJobber.mobileNumber}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status: </span>
                              <StatusBadge status={detailJobber.status} />
                            </div>
                            <div>
                              <span className="text-muted-foreground">Created: </span>
                              <span>{new Date(detailJobber.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Recent activity summary */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="font-serif text-sm flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Recent Leads
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="max-h-40 overflow-y-auto">
                            {jobberLeads.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No leads assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {jobberLeads.slice(0, 5).map((lead) => (
                                  <div key={lead.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                                    <span>{lead.customerName}</span>
                                    <StatusBadge status={lead.status} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="font-serif text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Recent Applications
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="max-h-40 overflow-y-auto">
                            {jobberApps.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No applications assigned</p>
                            ) : (
                              <div className="space-y-2">
                                {jobberApps.slice(0, 5).map((app) => (
                                  <div key={app.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0">
                                    <span className="truncate mr-2">{app.loanCategory} - {app.lender}</span>
                                    <StatusBadge status={app.status} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Action buttons to view more */}
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDetailTab("leads")} className="gap-1.5">
                          <Users className="h-4 w-4" />
                          View All Leads ({jobberLeads.length})
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDetailTab("customers")} className="gap-1.5">
                          <UserCircle className="h-4 w-4" />
                          View All Customers ({jobberCustomers.length})
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDetailTab("applications")} className="gap-1.5">
                          <FileText className="h-4 w-4" />
                          View All Applications ({jobberApps.length})
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDetailTab("followups")} className="gap-1.5">
                          <PhoneCall className="h-4 w-4" />
                          View All Follow-ups ({jobberFollowUps.length})
                        </Button>
                      </div>
                    </div>
                  );

                case "leads":
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-semibold">Leads ({jobberLeads.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setDetailTab("overview")}>
                          Back to Overview
                        </Button>
                      </div>
                      <Card>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Customer</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Mobile</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Amount</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobberLeads.length === 0 ? (
                                <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No leads</td></tr>
                              ) : (
                                jobberLeads.map((lead) => (
                                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-3 font-medium">{lead.customerName}</td>
                                    <td className="py-2 px-3">{lead.mobileNumber}</td>
                                    <td className="py-2 px-3">{lead.loanCategory}</td>
                                    <td className="py-2 px-3">{lead.requiredAmount || "-"}</td>
                                    <td className="py-2 px-3"><StatusBadge status={lead.status} /></td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  );

                case "customers":
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-semibold">Customers ({jobberCustomers.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setDetailTab("overview")}>
                          Back to Overview
                        </Button>
                      </div>
                      <Card>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Mobile</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Employment</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Income</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobberCustomers.length === 0 ? (
                                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No customers</td></tr>
                              ) : (
                                jobberCustomers.map((c) => (
                                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-3 font-medium">{c.fullName}</td>
                                    <td className="py-2 px-3">{c.mobileNumber}</td>
                                    <td className="py-2 px-3">{c.employmentType}</td>
                                    <td className="py-2 px-3">{c.monthlyIncome || "-"}</td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  );

                case "applications":
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-semibold">Applications ({jobberApps.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setDetailTab("overview")}>
                          Back to Overview
                        </Button>
                      </div>
                      <Card>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Lender</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Amount</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobberApps.length === 0 ? (
                                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No applications</td></tr>
                              ) : (
                                jobberApps.map((app) => (
                                  <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-3 font-medium">{app.loanCategory}</td>
                                    <td className="py-2 px-3">{app.lender}</td>
                                    <td className="py-2 px-3">{app.requestedAmount}</td>
                                    <td className="py-2 px-3"><StatusBadge status={app.status} /></td>
                                    <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>
                    </div>
                  );

                case "followups":
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-semibold">Follow-ups ({jobberFollowUps.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setDetailTab("overview")}>
                          Back to Overview
                        </Button>
                      </div>
                      <Card>
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Customer</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Type</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Priority</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jobberFollowUps.length === 0 ? (
                                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No follow-ups</td></tr>
                              ) : (
                                jobberFollowUps.map((fu) => (
                                  <tr key={fu.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="py-2 px-3 font-medium">{fu.customerName}</td>
                                    <td className="py-2 px-3">{fu.type}</td>
                                    <td className="py-2 px-3 text-xs">{fu.nextFollowUpDate}</td>
                                    <td className="py-2 px-3"><StatusBadge status={fu.priority} /></td>
                                    <td className="py-2 px-3"><StatusBadge status={fu.status} /></td>
                                  </tr>
                                ))
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingJobber ? "Edit Jobber" : "Add Jobber"}</DialogTitle>
            <DialogDescription>Create a new jobber account</DialogDescription>
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
                <Label>Username *</Label>
                <Input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
    </AppLayout>
  );
}