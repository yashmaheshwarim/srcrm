import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCircle,
  FileText,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
} from "lucide-react";
import { ExternalLink } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { CustomerDetailDialog } from "@/components/customers/CustomerDetailDialog";
import type { Lead, Customer, LoanApplication, FollowUp } from "@/types";


export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allApplications, setAllApplications] = useState<LoanApplication[]>([]);
  // Customer detail dialog
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<{ id?: string; name?: string; mobile?: string }>({});

  const [allFollowUps, setAllFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    Promise.all([
      dataService.getLeads(),
      dataService.getCustomers(),
      dataService.getLoanApplications(),
      dataService.getFollowUps(),
    ]).then(([leads, customers, apps, fups]) => {
      setAllLeads(leads);
      setAllCustomers(customers);
      setAllApplications(apps);
      setAllFollowUps(fups);
    });
  }, []);

  const leads = isAdmin ? allLeads : allLeads.filter((l) => l.assignedTo === user?.id);
  const customers = isAdmin ? allCustomers : allCustomers.filter((c) => c.assignedTo === user?.id);
  const applications = isAdmin ? allApplications : allApplications.filter((a) => a.assignedTo === user?.id);
  const followUps = isAdmin ? allFollowUps : allFollowUps.filter((f) => f.assignedTo === user?.id);

  const today = new Date().toISOString().split("T")[0];

  const overdueFollowUps = followUps.filter(
    (f) => f.status === "pending" && f.nextFollowUpDate < today
  );
  const todayFollowUps = followUps.filter((f) => f.nextFollowUpDate === today && f.status === "pending");
  const pendingDocs = applications.filter((a) => a.status === "documents_pending");

  // Approved count includes both approved and disbursed (disbursed = approved + paid out)
  const approvedApps = applications.filter((a) => a.status === "approved" || a.status === "disbursed");
  const disbursedApps = applications.filter((a) => a.status === "disbursed");
  const rejectedApps = applications.filter((a) => a.status === "rejected");

  // Calculate total approved amount = approval_amount for approved + disbursed
  const totalApprovedAmount = approvedApps.reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);
  const totalDisbursedAmount = disbursedApps.reduce((sum, a) => sum + parseFloat(a.approvalAmount || "0"), 0);

  const recentLeads = [...leads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5);
  const recentApps = [...applications].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Overview of all operations" : "Your daily overview"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Leads" value={leads.length} icon={UserCircle} />
          <StatCard title="Total Customers" value={customers.length} icon={Users} />
          <StatCard title="Applications" value={applications.length} icon={FileText} />
          <StatCard
            title="Pending Follow-ups"
            value={followUps.filter((f) => f.status === "pending").length}
            icon={ClipboardList}
            variant={overdueFollowUps.length > 0 ? "warning" : "default"}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Overdue Follow-ups"
            value={overdueFollowUps.length}
            icon={AlertCircle}
            variant={overdueFollowUps.length > 0 ? "danger" : "default"}
          />
          <StatCard
            title="Due Today"
            value={todayFollowUps.length}
            icon={Clock}
            variant={todayFollowUps.length > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Pending Documents"
            value={pendingDocs.length}
            icon={FileText}
            variant={pendingDocs.length > 0 ? "warning" : "default"}
          />
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Approved (incl. Disbursed)" value={approvedApps.length} icon={CheckCircle2} variant="success" subtitle={`₹${totalApprovedAmount.toLocaleString("en-IN")}`} />
            <StatCard title="Disbursed" value={disbursedApps.length} icon={TrendingUp} variant="success" subtitle={`₹${totalDisbursedAmount.toLocaleString("en-IN")}`} />
            <StatCard title="Rejected" value={rejectedApps.length} icon={AlertCircle} variant="danger" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No leads yet</p>
              ) : (
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <button
                          onClick={() => {
                            setSelectedCustomerInfo({ name: lead.customerName, mobile: lead.mobileNumber });
                            setCustomerDetailOpen(true);
                          }}
                          className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 group"
                        >
                          <span className="underline underline-offset-2 decoration-dotted decoration-muted-foreground/40 group-hover:decoration-primary/60">
                            {lead.customerName}
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                        </button>
                        <p className="text-xs text-muted-foreground">{lead.city} &middot; {lead.loanCategory}</p>
                      </div>
                      <StatusBadge status={lead.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {recentApps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No applications yet</p>
              ) : (
                <div className="space-y-3">
                  {recentApps.map((app) => (
                    <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{app.loanCategory}</p>
                        <p className="text-xs text-muted-foreground">
                          {app.lender} &middot; {app.requestedAmount}
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  ))}
                </div>
              )}
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