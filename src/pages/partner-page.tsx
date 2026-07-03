import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Landmark,
  Users,
  UserCircle,
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import type { LoanApplication, Customer, Lead, User } from "@/types";

export default function PartnerDashboardPage() {
  const { user, isPartner } = useAuth();
  const [allApplications, setAllApplications] = useState<LoanApplication[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      dataService.getLoanApplications(),
      dataService.getCustomers(),
      dataService.getLeads(),
    ]).then(([apps, custs, l]) => {
      setAllApplications(apps.filter((a) => a.assignedTo === user.id));
      setAllCustomers(custs.filter((c) => c.assignedTo === user.id));
      setAllLeads(l.filter((ld) => ld.assignedTo === user.id));
    });
  }, [user]);

  if (!isPartner || !user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </AppLayout>
    );
  }

  const assignedApplications = allApplications;
  const assignedCustomers = allCustomers;
  const assignedLeads = allLeads;

  return (
    <PartnerDashboardInner
      user={user}
      assignedApplications={assignedApplications}
      assignedCustomers={assignedCustomers}
      assignedLeads={assignedLeads}
    />
  );
}

function PartnerDashboardInner({
  user,
  assignedApplications,
  assignedCustomers,
  assignedLeads,
}: {
  user: User;
  assignedApplications: LoanApplication[];
  assignedCustomers: Customer[];
  assignedLeads: Lead[];
}) {
  // Customer detail dialog
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<{ id?: string; name?: string; mobile?: string }>({});

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = assignedApplications.length;
    const approved = assignedApplications.filter((a) => a.status === "approved").length;
    const rejected = assignedApplications.filter((a) => a.status === "rejected").length;
    const disbursed = assignedApplications.filter((a) => a.status === "disbursed").length;
    const pending = assignedApplications.filter(
      (a) => !["approved", "rejected", "disbursed", "closed"].includes(a.status)
    ).length;
    const documentsPending = assignedApplications.filter((a) => a.status === "documents_pending").length;
    const underReview = assignedApplications.filter((a) => a.status === "under_review").length;

    const totalRequested = assignedApplications.reduce(
      (sum, a) => sum + parseFloat(a.requestedAmount || "0"), 0
    );
    const totalApproved = assignedApplications.reduce(
      (sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0
    );
    const totalDisbursed = assignedApplications
      .filter((a) => a.status === "disbursed")
      .reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);

    return {
      totalFiles, approved, rejected, disbursed, pending,
      documentsPending, underReview,
      totalRequested, totalApproved, totalDisbursed,
      leadsCount: assignedLeads.length,
      customersCount: assignedCustomers.length,
    };
  }, [assignedApplications, assignedLeads, assignedCustomers]);

  // Document progress per application
  const appDocProgress = useMemo(() => {
    return assignedApplications.map((app) => {
      const docs = app.documents || [];
      const verified = docs.filter((d) => d.status === "verified" || d.status === "received").length;
      const total = docs.length;
      return {
        id: app.id,
        customerId: app.customerId,
        customerName: app.customerName,
        mobileNumber: app.mobileNumber,
        applicationNumber: app.applicationNumber || app.id.slice(0, 8),
        loanCategory: app.loanCategory,
        lender: app.lender,
        requestedAmount: app.requestedAmount,
        approvalAmount: app.approvalAmount,
        status: app.status,
        docsVerified: verified,
        docsTotal: total,
        docProgress: total > 0 ? Math.round((verified / total) * 100) : 0,
      };
    });
  }, [assignedApplications]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Financial Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, {user.fullName} &mdash; overview of your files and financials
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Files" value={stats.totalFiles} icon={FileText} />
          <StatCard title="Total Leads" value={stats.leadsCount} icon={UserCircle} />
          <StatCard title="Total Customers" value={stats.customersCount} icon={Users} />
          <StatCard title="Pending Files" value={stats.pending} icon={Clock} variant={stats.pending > 0 ? "warning" : "default"} />
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Requested" value={formatCurrency(stats.totalRequested)} icon={Landmark} />
          <StatCard title="Total Approved" value={formatCurrency(stats.totalApproved)} icon={CheckCircle2} variant="success" />
          <StatCard title="Total Disbursed" value={formatCurrency(stats.totalDisbursed)} icon={Wallet} variant="success" />
          <StatCard title="Rejected" value={stats.rejected} icon={XCircle} variant={stats.rejected > 0 ? "danger" : "default"} />
        </div>

        {/* Application Status Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold font-serif">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents Pending</p>
                <p className="text-2xl font-bold font-serif">{stats.documentsPending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold font-serif">{stats.underReview}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </CardContent>
          </Card>
        </div>

        {/* Application Details with Document Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">Application Files &amp; Document Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {appDocProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No applications assigned yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">App #</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Lender</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Requested</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Approved</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appDocProgress.map((app) => (
                      <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{app.applicationNumber}</td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => {
                            setSelectedCustomerInfo({
                              id: app.customerId,
                              name: app.customerName,
                              mobile: app.mobileNumber,
                            });
                            setCustomerDetailOpen(true);
                          }}
                          className="font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                        >
                          <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40 group-hover:decoration-primary/60">
                            {app.customerName || "—"}
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </button>
                      </td>
                      <td className="py-3 px-2 font-medium">{app.loanCategory}</td>
                      <td className="py-3 px-2">{app.lender}</td>
                      <td className="py-3 px-2 text-right">{app.requestedAmount}</td>
                      <td className="py-3 px-2 text-right">{app.approvalAmount || "-"}</td>
                      <td className="py-3 px-2">
                        <StatusBadge status={app.status} />
                      </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${app.docProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {app.docsVerified}/{app.docsTotal}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Count Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-serif">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approved Files</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-serif">{stats.disbursed}</p>
              <p className="text-xs text-muted-foreground">Disbursed Files</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-serif">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejected Files</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold font-serif">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending Files</p>
            </CardContent>
          </Card>
        </div>
      </div>

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
