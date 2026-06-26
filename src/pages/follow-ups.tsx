import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Pencil, CheckCircle2, Phone, Download } from "lucide-react";
import { dataService } from "@/lib/data-service";
import { exportToCSV, exportToPDF, followUpsToExportRows } from "@/lib/export-utils";
import type { FollowUp } from "@/types";

const followUpTypes = ["Call", "WhatsApp", "Meeting", "Document Collection", "Callback"];
const priorities = ["low", "medium", "high"];


export default function FollowUpsPage() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [form, setForm] = useState<Partial<FollowUp>>({});

  const allFollowUps = useMemo(() => {
    const followUps = dataService.getFollowUps();
    return isAdmin ? followUps : followUps.filter((f) => f.assignedTo === user?.id);
  }, [isAdmin, user]);

  const filtered = useMemo(() => {
    return allFollowUps.filter(
      (f) =>
        f.customerName.toLowerCase().includes(search.toLowerCase()) ||
        f.mobileNumber.includes(search) ||
        f.notes?.toLowerCase().includes(search.toLowerCase())
    );
  }, [allFollowUps, search]);

  const openCreate = () => {
    setEditingFollowUp(null);
    setForm({
      type: "Call" as FollowUp["type"],
      priority: "medium" as FollowUp["priority"],
      status: "pending" as FollowUp["status"],
      assignedTo: user?.id || "",
    });
    setDialogOpen(true);
  };

  const openEdit = (f: FollowUp) => {
    setEditingFollowUp(f);
    setForm({ ...f });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.customerName || !form.mobileNumber || !form.nextFollowUpDate || !form.nextFollowUpTime) return;

    if (editingFollowUp) {
      dataService.updateFollowUp(editingFollowUp.id, form as Partial<FollowUp>);
    } else {
      dataService.createFollowUp({
        customerName: form.customerName || "",
        mobileNumber: form.mobileNumber || "",
        leadId: form.leadId || "",
        applicationId: form.applicationId || "",
        assignedTo: isAdmin ? (form.assignedTo || user?.id || "") : (user?.id || ""),
        type: (form.type as FollowUp["type"]) || "Call",
        notes: form.notes || "",
        nextFollowUpDate: form.nextFollowUpDate || "",
        nextFollowUpTime: form.nextFollowUpTime || "",
        priority: (form.priority as FollowUp["priority"]) || "medium",
        status: (form.status as FollowUp["status"]) || "pending",
      });
    }
    setDialogOpen(false);
    setEditingFollowUp(null);
    setForm({});
    window.location.reload();
  };

  const markCompleted = (id: string) => {
    dataService.updateFollowUp(id, { status: "completed" });
    window.location.reload();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              {isAdmin ? "All Follow-ups" : "My Follow-ups"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule and manage customer follow-ups</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = followUpsToExportRows(filtered);
              exportToCSV(headers, rows, `follow-ups-${new Date().toISOString().split("T")[0]}.csv`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const [headers, rows] = followUpsToExportRows(filtered);
              exportToPDF("Follow-ups Export", headers, rows, `follow-ups-${new Date().toISOString().split("T")[0]}.txt`);
            }} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Follow-up
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name or mobile..."
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
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Mobile</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Priority</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    {isAdmin && <th className="text-left py-3 px-2 font-medium text-muted-foreground">Jobber</th>}
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-muted-foreground">
                        No follow-ups found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((f) => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 font-medium">{f.customerName}</td>
                        <td className="py-3 px-2">{f.mobileNumber}</td>
                        <td className="py-3 px-2">{f.type}</td>
                        <td className="py-3 px-2">
                          <span className="text-xs">{f.nextFollowUpDate}</span>
                          <span className="text-xs text-muted-foreground ml-1">{f.nextFollowUpTime}</span>
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={f.priority} />
                        </td>
                        <td className="py-3 px-2">
                          <StatusBadge status={f.status} />
                        </td>
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
                            {f.status === "pending" && (
                              <Button variant="ghost" size="icon" onClick={() => markCompleted(f.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                              <Pencil className="h-3.5 w-3.5" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">{editingFollowUp ? "Edit Follow-up" : "Add Follow-up"}</DialogTitle>
            <DialogDescription>Schedule a customer follow-up</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input value={form.customerName || ""} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mobile *</Label>
                <Input value={form.mobileNumber || ""} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as FollowUp["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {followUpTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as FollowUp["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Follow-up Date *</Label>
                <Input type="date" value={form.nextFollowUpDate || ""} onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input type="time" value={form.nextFollowUpTime || ""} onChange={(e) => setForm({ ...form, nextFollowUpTime: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {dataService.getUsers().filter((u) => u.role === "jobber").map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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