import { useMemo } from "react";
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
import { dataService } from "@/lib/data-service";


export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  const leads = useMemo(() => {
    const all = dataService.getLeads();
    return isAdmin ? all : all.filter((l) => l.assignedTo === user?.id);
  }, [isAdmin, user]);

  const customers = useMemo(() => {
    const all = dataService.getCustomers();
    return isAdmin ? all : all.filter((c) => c.assignedTo === user?.id);
  }, [isAdmin, user]);

  const applications = useMemo(() => {
    const all = dataService.getLoanApplications();
    return isAdmin ? all : all.filter((a) => a.assignedTo === user?.id);
  }, [isAdmin, user]);

  const followUps = useMemo(() => {
    const all = dataService.getFollowUps();
    return isAdmin ? all : all.filter((f) => f.assignedTo === user?.id);
  }, [isAdmin, user]);

  const today = new Date().toISOString().split("T")[0];

  const overdueFollowUps = followUps.filter(
    (f) => f.status === "pending" && f.nextFollowUpDate < today
  );
  const todayFollowUps = followUps.filter((f) => f.nextFollowUpDate === today && f.status === "pending");
  const pendingDocs = applications.filter((a) => a.status === "documents_pending");

  const approvedApps = applications.filter((a) => a.status === "approved");
  const disbursedApps = applications.filter((a) => a.status === "disbursed");
  const rejectedApps = applications.filter((a) => a.status === "rejected");

  const recentLeads = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentApps = [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

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
            <StatCard title="Approved" value={approvedApps.length} icon={CheckCircle2} variant="success" />
            <StatCard title="Disbursed" value={disbursedApps.length} icon={TrendingUp} variant="success" />
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
                        <p className="text-sm font-medium">{lead.customerName}</p>
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
    </AppLayout>
  );
}