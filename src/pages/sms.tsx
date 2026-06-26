import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Send,
  Phone,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCircle,
  History,
} from "lucide-react";
import { dataService } from "@/lib/data-service";
import { toast } from "@/hooks/use-toast";

interface SentSMS {
  id: string;
  to: string;
  toName: string;
  message: string;
  sentAt: string;
  sentBy: string;
  status: "sent" | "failed" | "delivered";
}

type SendTarget = "single" | "all-leads" | "all-customers";

export default function SMSPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [sendTarget, setSendTarget] = useState<SendTarget>("single");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentSMS[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sr_sms_history");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const leads = useMemo(() => dataService.getLeads(), []);
  const customers = useMemo(() => dataService.getCustomers(), []);

  const handleSend = async () => {
    if (sendTarget === "single" && !phoneNumber.trim()) {
      toast({ title: "Error", description: "Please enter a phone number", variant: "destructive" });
      return;
    }

    if (!message.trim()) {
      toast({ title: "Error", description: "Please enter a message", variant: "destructive" });
      return;
    }

    setSending(true);

    // Determine recipients
    let recipients: { phone: string; name: string }[] = [];
    if (sendTarget === "single") {
      recipients = [{ phone: phoneNumber.trim(), name: phoneNumber.trim() }];
    } else if (sendTarget === "all-leads") {
      recipients = leads.map((l) => ({ phone: l.mobileNumber, name: l.customerName }));
    } else if (sendTarget === "all-customers") {
      recipients = customers.map((c) => ({ phone: c.mobileNumber, name: c.fullName }));
    }

    // Deduplicate
    recipients = recipients.filter((r, i, arr) => arr.findIndex((x) => x.phone === r.phone) === i);

    let sent = 0;
    let failed = 0;

    // Simulate sending via API
    for (const recipient of recipients) {
      try {
        const response = await fetch("/api/sms/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipient.phone,
            message: message.trim(),
            toName: recipient.name,
          }),
        });

        if (response.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Small delay between sends
      await new Promise((r) => setTimeout(r, 100));
    }

    // Save to history
    const smsRecords: SentSMS[] = recipients.map((r) => ({
      id: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      to: r.phone,
      toName: r.name,
      message: message.trim(),
      sentAt: new Date().toISOString(),
      sentBy: user?.fullName || "Unknown",
      status: "sent" as const,
    }));

    const updated = [...smsRecords, ...sentMessages];
    setSentMessages(updated);
    localStorage.setItem("sr_sms_history", JSON.stringify(updated));

    setSending(false);
    setPhoneNumber("");
    setMessage("");

    toast({
      title: "SMS Sent",
      description: `${sent} message(s) sent successfully${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-in">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-1 rounded-full gradient-primary" />
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">SMS Messaging</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Send SMS messages to customers and leads via httpSMS gateway
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 animate-in animate-in-delay-1">
          <Button
            variant={activeTab === "compose" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("compose")}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            Compose
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("history")}
            className="gap-1.5"
          >
            <History className="h-4 w-4" />
            History ({sentMessages.length})
          </Button>
        </div>

        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="animate-in animate-in-delay-1">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      New SMS Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Send Target */}
                    <div className="space-y-2">
                      <Label>Send To</Label>
                      <Select value={sendTarget} onValueChange={(v) => setSendTarget(v as SendTarget)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Single Phone Number
                            </div>
                          </SelectItem>
                          {isAdmin && (
                            <>
                              <SelectItem value="all-leads">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  All Leads ({leads.length})
                                </div>
                              </SelectItem>
                              <SelectItem value="all-customers">
                                <div className="flex items-center gap-2">
                                  <UserCircle className="h-4 w-4" />
                                  All Customers ({customers.length})
                                </div>
                              </SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Phone Number (single mode) */}
                    {sendTarget === "single" && (
                      <div className="space-y-2">
                        <Label>Phone Number *</Label>
                        <Input
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. +919876543210"
                          className="input-premium"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter phone number with country code (e.g. +91 for India)
                        </p>
                      </div>
                    )}

                    {/* Bulk info */}
                    {sendTarget !== "single" && (
                      <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4 text-sm">
                          <p className="font-medium mb-1">Bulk Send</p>
                          <p className="text-muted-foreground">
                            This will send SMS to{" "}
                            {sendTarget === "all-leads"
                              ? `${leads.length} lead(s)`
                              : `${customers.length} customer(s)`}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Message */}
                    <div className="space-y-2">
                      <Label>Message *</Label>
                      <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your SMS message here..."
                        rows={5}
                        className="input-premium resize-none"
                        maxLength={160}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {message.length}/160 characters
                        </p>
                        {message.length > 140 && (
                          <p className="text-xs text-warning flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Will be split into multiple messages
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-full sm:w-auto gap-2"
                    >
                      {sending ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send SMS
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="animate-in animate-in-delay-2">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-base">Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Total Sent</span>
                      <span className="text-lg font-heading font-bold">{sentMessages.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Leads</span>
                      <span className="text-lg font-heading font-bold">{leads.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">Customers</span>
                      <span className="text-lg font-heading font-bold">{customers.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="animate-in animate-in-delay-3">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-base">Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>• Use international format: +91XXXXXXXXXX</p>
                    <p>• Max 160 characters per SMS</p>
                    <p>• Longer messages are split automatically</p>
                    <p>• SMS gateway powered by httpSMS</p>
                    <p>• Requires Android phone with httpSMS app</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-in animate-in-delay-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Message History</CardTitle>
              </CardHeader>
              <CardContent>
                {sentMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No messages sent yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentMessages.map((sms) => (
                      <div
                        key={sms.id}
                        className="flex items-start gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center shrink-0">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{sms.toName}</p>
                              <p className="text-xs text-muted-foreground">{sms.to}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(sms.sentAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm mt-2 text-foreground/80 bg-muted/30 p-3 rounded-lg">
                            {sms.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent by {sms.sentBy}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
