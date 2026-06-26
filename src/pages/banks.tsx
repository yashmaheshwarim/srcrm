import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Landmark,
  FileText,
  CheckCircle,
  XCircle,
  Wallet,
  Search,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Percent,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { dataService, createLender, updateLender, deleteLender } from "@/lib/data-service";
import type { Lender } from "@/types";

type BankDetailView = "list" | "detail";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BanksPage() {
  const [search, setSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [view, setView] = useState<BankDetailView>("list");

  // Bank CRUD dialogs
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Lender | null>(null);
  const [bankForm, setBankForm] = useState<Partial<Lender>>({});

  const applications = dataService.getLoanApplications();
  const lenders = dataService.getLenders();
  const customers = dataService.getCustomers();

  const bankStats = useMemo(() => {
    const stats = lenders.map((lender) => {
      const apps = applications.filter((a) => a.lender === lender.name);
      const totalFiles = apps.length;
      const approved = apps.filter((a) => a.status === "approved").length;
      const rejected = apps.filter((a) => a.status === "rejected").length;
      const disbursed = apps.filter((a) => a.status === "disbursed").length;
      const pending = apps.filter(
        (a) => !["approved", "rejected", "disbursed"].includes(a.status)
      ).length;
      const totalRequested = apps.reduce((sum, a) => sum + parseFloat(a.requestedAmount || "0"), 0);
      const totalApproved = apps.reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);
      const totalDisbursed = apps
        .filter((a) => a.status === "disbursed")
        .reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);
      const successRate = totalFiles > 0 ? Math.round(((approved + disbursed) / totalFiles) * 100) : 0;

      return {
        lender,
        totalFiles,
        approved,
        rejected,
        disbursed,
        pending,
        totalRequested,
        totalApproved,
        totalDisbursed,
        successRate,
        applications: apps,
      };
    });

    if (search) {
      return stats.filter((s) => s.lender.name.toLowerCase().includes(search.toLowerCase()));
    }
    return stats;
  }, [applications, lenders, search]);

  const overallStats = useMemo(() => {
    const totalFiles = applications.length;
    const approved = applications.filter((a) => a.status === "approved").length;
    const rejected = applications.filter((a) => a.status === "rejected").length;
    const disbursed = applications.filter((a) => a.status === "disbursed").length;
    const pending = applications.filter(
      (a) => !["approved", "rejected", "disbursed"].includes(a.status)
    ).length;
    const totalRequested = applications.reduce((sum, a) => sum + parseFloat(a.requestedAmount || "0"), 0);
    const totalApproved = applications.reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);
    const totalDisbursed = applications
      .filter((a) => a.status === "disbursed")
      .reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);

    return {
      totalFiles,
      approved,
      rejected,
      disbursed,
      pending,
      totalRequested,
      totalApproved,
      totalDisbursed,
    };
  }, [applications]);

  const selectedBankData = bankStats.find((b) => b.lender.id === selectedBank);

  const openCreateBank = () => {
    setEditingBank(null);
    setBankForm({ name: "" });
    setBankDialogOpen(true);
  };

  const openEditBank = (lender: Lender, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBank(lender);
    setBankForm({ ...lender });
    setBankDialogOpen(true);
  };

  const handleSaveBank = () => {
    if (!bankForm.name) return;
    if (editingBank) {
      updateLender(editingBank.id, bankForm);
    } else {
      createLender({ name: bankForm.name });
    }
    setBankDialogOpen(false);
    setEditingBank(null);
    setBankForm({});
    window.location.reload();
  };

  const handleDeleteBank = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this bank? All applications linked to it will remain but may show unknown lender.")) {
      deleteLender(id);
      window.location.reload();
    }
  };

  if (view === "detail" && selectedBankData) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Banks
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold">{selectedBankData.lender.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedBankData.totalFiles} total files · {selectedBankData.successRate}% success rate
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Files"
              value={selectedBankData.totalFiles}
              icon={FileText}
              variant="default"
            />
            <StatCard
              title="Approved"
              value={selectedBankData.approved}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Rejected"
              value={selectedBankData.rejected}
              icon={XCircle}
              variant="danger"
            />
            <StatCard
              title="Disbursed"
              value={selectedBankData.disbursed}
              icon={Wallet}
              variant="success"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Requested</p>
                <p className="text-2xl font-serif font-bold">
                  {formatCurrency(selectedBankData.totalRequested)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Approved</p>
                <p className="text-2xl font-serif font-bold">
                  {formatCurrency(selectedBankData.totalApproved)}
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Total Disbursed</p>
                <p className="text-2xl font-serif font-bold">
                  {formatCurrency(selectedBankData.totalDisbursed)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg">All Applications</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">App #</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Requested</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Approved</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBankData.applications.map((app) => {
                    const customer = customers.find((c) => c.id === app.customerId);
                    return (
                      <tr key={app.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2.5 px-3 font-mono text-xs">{app.applicationNumber || app.id.slice(0, 8)}</td>
                        <td className="py-2.5 px-3">{customer?.fullName || "Unknown"}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{app.loanCategory}</td>
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(parseFloat(app.requestedAmount || "0"))}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {app.approvalAmount
                            ? formatCurrency(parseFloat(app.approvalAmount))
                            : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {app.submissionDate ? new Date(app.submissionDate).toLocaleDateString() : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold">Banks & Lenders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Overview of all lender relationships and loan performance
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search banks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreateBank} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Bank
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Files"
            value={overallStats.totalFiles}
            icon={FileText}
            subtitle="Across all banks"
          />
          <StatCard
            title="Approved"
            value={overallStats.approved}
            icon={CheckCircle}
            variant="success"
            subtitle="Approved applications"
          />
          <StatCard
            title="Rejected"
            value={overallStats.rejected}
            icon={XCircle}
            variant="danger"
            subtitle="Rejected applications"
          />
          <StatCard
            title="Disbursed"
            value={overallStats.disbursed}
            icon={Wallet}
            variant="success"
            subtitle="Disbursed loans"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Requested</p>
                  <p className="text-2xl font-serif font-bold mt-1">
                    {formatCurrency(overallStats.totalRequested)}
                  </p>
                </div>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  <p className="text-2xl font-serif font-bold mt-1">
                    {formatCurrency(overallStats.totalApproved)}
                  </p>
                </div>
                <Percent className="h-5 w-5 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Disbursed</p>
                  <p className="text-2xl font-serif font-bold mt-1">
                    {formatCurrency(overallStats.totalDisbursed)}
                  </p>
                </div>
                <TrendingDown className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankStats.map((bank) => (
            <Card
              key={bank.lender.id}
              className="glass-card cursor-pointer hover:shadow-md transition-shadow relative group"
              onClick={() => {
                setSelectedBank(bank.lender.id);
                setView("detail");
              }}
            >
              <CardContent className="p-5">
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => openEditBank(bank.lender, e)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDeleteBank(bank.lender.id, e)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                <div className="flex items-start justify-between mb-4 pr-16">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Landmark className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{bank.lender.name}</h3>
                      <p className="text-xs text-muted-foreground">{bank.totalFiles} files</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Success</p>
                    <p className="text-sm font-bold text-emerald-600">{bank.successRate}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-md bg-slate-50">
                    <p className="text-lg font-bold">{bank.totalFiles}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                  </div>
                  <div className="p-2 rounded-md bg-emerald-50">
                    <p className="text-lg font-bold text-emerald-700">{bank.approved}</p>
                    <p className="text-[10px] text-emerald-600 uppercase">Approved</p>
                  </div>
                  <div className="p-2 rounded-md bg-red-50">
                    <p className="text-lg font-bold text-red-700">{bank.rejected}</p>
                    <p className="text-[10px] text-red-600 uppercase">Rejected</p>
                  </div>
                  <div className="p-2 rounded-md bg-amber-50">
                    <p className="text-lg font-bold text-amber-700">{bank.pending}</p>
                    <p className="text-[10px] text-amber-600 uppercase">Pending</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Requested: {new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(bank.totalRequested)}
                  </span>
                  <span className="text-muted-foreground">
                    Approved: {new Intl.NumberFormat("en-IN", { notation: "compact", compactDisplay: "short" }).format(bank.totalApproved)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {bankStats.length === 0 && (
          <div className="text-center py-12">
            <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No banks found.</p>
          </div>
        )}
      </div>

      {/* Bank CRUD Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingBank ? "Edit Bank" : "Add Bank"}</DialogTitle>
            <DialogDescription>Enter the bank or lender name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Bank Name *</Label>
              <Input
                value={bankForm.name || ""}
                onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })}
                placeholder="e.g. HDFC Bank"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBank}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}