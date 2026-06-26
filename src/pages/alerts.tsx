import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Clock, Calendar, Phone, CheckCircle2, Pencil } from "lucide-react";
import { dataService } from "@/lib/data-service";
import type { FollowUp } from "@/types";

export default function AlertsPage() {
  const { user, isAdmin } = useAuth();
  const [filter, setFilter] = useState<"all" | "overdue" | "today" | "upcoming">("all");
  const [jobberFilter, setJobberFilter] = useState<string>("all");

  const allFollowUps = useMemo(() => {
    const followUps = dataService.getFollowUps();
    return isAdmin ? followUps : followUps.filter((f) => f.assignedTo === user?.id);
  }, [isAdmin, user]);

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let result = allFollowUps.filter((f) => f.status === "pending");

    if (filter === "overdue") {
      result = result.filter((f) => f.nextFollowUpDate < today);
    } else if (filter === "today") {
      result = result.filter((f) => f.nextFollowUpDate === today);
    } else if (filter === "upcoming") {
      result = result.filter((f) => f.nextFollowUpDate > today);
    }

    if (isAdmin && jobberFilter !== "all") {
      result = result.filter((f) => f.assignedTo === jobberFilter);
    }

    return result.sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate) || a.nextFollowUpTime.localeCompare(b.nextFollowUpTime));
  }, [allFollowUps, filter, jobberFilter, isAdmin, today]);

  const counts = useMemo(() => {
    const pending = allFollowUps.filter((f) => f.status === "pending");
    return {
      overdue: pending.filter((f) => f.nextFollowUpDate < today).length,
      today: pending.filter((f) => f.nextFollowUpDate === today).length,
      upcoming: pending.filter((f) => f.nextFollowUpDate > today).length,
      total: pending.length,
    };
  }, [allFollowUps, today]);

  const markCompleted = (id: string) => {
    dataService.updateFollowUp(id, { status: "completed" });
    window.location.reload();
  };

  const reschedule = (followUp: FollowUp) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    dataService.updateFollowUp(followUp.id, { nextFollowUpDate: dateStr, status: "pending" });
    window.location.reload();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Alert Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Upcoming and overdue follow-ups</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold font-serif">{counts.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Today</p>
                <p className="text-2xl font-bold font-serif">{counts.today}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold font-serif">{counts.upcoming}</p>
              </div>
              <Calendar className="h-8 w-8 text-emerald-500" />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {(["all", "overdue", "today", "upcoming"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "All Pending" : f}
              </Button>
            ))}
          </div>
          {isAdmin && (
            <Select value={jobberFilter} onValueChange={setJobberFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Jobber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jobbers</SelectItem>
                {dataService.getUsers().filter((u) => u.role === "jobber").map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-base">
              {filter === "all" ? "All Pending Follow-ups" : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Follow-ups`}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mobile</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Notes</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jobber</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-muted-foreground">
                        No follow-ups in this category
                      </td>
                    </tr>
                  ) : (
                    filtered.map((f) => {
                      const isOverdue = f.nextFollowUpDate < today;
                      const isToday = f.nextFollowUpDate === today;
                      return (
                        <tr
                          key={f.id}
                          className={`border-b last:border-0 transition-colors ${isOverdue ? "bg-red-50/50" : isToday ? "bg-amber-50/50" : ""}`}
                        >
                          <td className="py-3 px-2 font-medium">{f.customerName}</td>
                          <td className="py-3 px-2">{f.mobileNumber}</td>
                          <td className="py-3 px-2">{f.type}</td>
                          <td className="py-3 px-2">
                            <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : isToday ? "text-amber-600" : ""}`}>
                              {f.nextFollowUpDate}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">{f.nextFollowUpTime}</span>
                          </td>
                          <td className="py-3 px-2">
                            <StatusBadge status={f.priority} />
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{f.notes || "-"}</td>
                          {isAdmin && (
                            <td className="py-3 px-2">
                              {dataService.getUsers().find((u) => u.id === f.assignedTo)?.fullName || f.assignedTo}
                            </td>
                          )}
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => window.open(`tel:${f.mobileNumber}`)}>
                                <Phone className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => markCompleted(f.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => reschedule(f)}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
    </AppLayout>
  );
}