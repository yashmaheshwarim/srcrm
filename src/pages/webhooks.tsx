import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Webhook,
  Copy,
  CheckCheck,
  ExternalLink,
  Shield,
  Code,
  Settings,
  Key,
  Bell,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WebhookEndpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
}

const webhookEndpoints: WebhookEndpoint[] = [
  { method: "POST", path: "/api/n8n/leads", description: "Create a new lead", auth: "X-API-Key header" },
  { method: "GET", path: "/api/n8n/leads", description: "Get all leads", auth: "X-API-Key header" },
  { method: "POST", path: "/api/n8n/customers", description: "Create a new customer", auth: "X-API-Key header" },
  { method: "GET", path: "/api/n8n/customers", description: "Get all customers", auth: "X-API-Key header" },
  { method: "POST", path: "/api/n8n/applications", description: "Create a new loan application", auth: "X-API-Key header" },
  { method: "GET", path: "/api/n8n/applications", description: "Get all loan applications", auth: "X-API-Key header" },
  { method: "POST", path: "/api/n8n/follow-ups", description: "Create a new follow-up", auth: "X-API-Key header" },
  { method: "GET", path: "/api/n8n/follow-ups", description: "Get all pending follow-ups", auth: "X-API-Key header" },
  { method: "GET", path: "/api/n8n/dashboard", description: "Get dashboard stats", auth: "X-API-Key header" },
  { method: "POST", path: "/api/sms/send", description: "Send an SMS via httpSMS", auth: "X-API-Key header" },
];

export default function WebhooksPage() {
  const { isAdmin } = useAuth();
  const [apiKey, setApiKey] = useState("sr-n8n-key-change-me");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(
    typeof window !== "undefined" ? localStorage.getItem("sr_n8n_webhook_url") || "" : ""
  );

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copied!", description: "Endpoint URL copied to clipboard" });
  };

  const regenerateKey = () => {
    const newKey = `sr-n8n-${Math.random().toString(36).substring(2, 15)}-${Date.now().toString(36)}`;
    setApiKey(newKey);
    toast({ title: "API Key Regenerated", description: "Make sure to update it in your n8n workflows. Note: API key is now stored in memory and will reset on page refresh." });
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-in">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-1 rounded-full gradient-primary" />
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Webhooks & Automation</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            Configure n8n automation webhooks to connect external workflows
          </p>
        </div>

        {/* API Key */}
        <div className="animate-in animate-in-delay-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label>Webhook Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                      }}
                      className="input-premium font-mono text-xs"
                      type="password"
                    />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(apiKey, -1)} className="gap-1.5 shrink-0">
                      {copiedIndex === -1 ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      Copy
                    </Button>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={regenerateKey} className="gap-1.5 shrink-0 self-end">
                  <Shield className="h-4 w-4" />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key in the <code className="bg-muted px-1 rounded">X-API-Key</code> header when calling webhook endpoints from n8n.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* n8n Connection Setup */}
        <div className="animate-in animate-in-delay-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                n8n Setup Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 rounded-xl p-5 space-y-3 border border-border/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Code className="h-4 w-4 text-primary" />
                  Step 1: Configure n8n Webhook Node
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>1. Add a <strong>Webhook</strong> node in your n8n workflow</p>
                  <p>2. Set the URL to: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{baseUrl}/api/n8n/leads</code></p>
                  <p>3. Add a Header Parameter: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">X-API-Key</code> with your secret key</p>
                  <p>4. Set the workflow to respond with <strong>Respond to Webhook</strong> node</p>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-5 space-y-3 border border-border/50">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Step 2: Trigger n8n from the App
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Configure your n8n <strong>Webhook URL</strong> in the app by setting it below:</p>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={webhookUrl}
                      onChange={(e) => {
                        setWebhookUrl(e.target.value);
                        localStorage.setItem("sr_n8n_webhook_url", e.target.value);
                      }}
                      // Webhook URL is persisted in localStorage for convenience
                      placeholder="https://your-n8n-instance.com/webhook/..."
                      className="input-premium text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(webhookUrl, -2)}
                      className="gap-1.5 shrink-0"
                    >
                      {copiedIndex === -2 ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This URL will receive event payloads when data changes in the app (e.g., new lead created).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Endpoints */}
        <div className="animate-in animate-in-delay-3">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                Available API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="table-header">Method</th>
                      <th className="table-header">Endpoint</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Auth</th>
                      <th className="table-header text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEndpoints.map((ep, i) => (
                      <tr key={ep.path} className="table-row">
                        <td className="table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                              ep.method === "GET"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {ep.method}
                          </span>
                        </td>
                        <td className="table-cell font-mono text-xs">{ep.path}</td>
                        <td className="table-cell text-muted-foreground">{ep.description}</td>
                        <td className="table-cell text-xs text-muted-foreground">{ep.auth}</td>
                        <td className="table-cell text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`${baseUrl}${ep.path}`, i)}
                            className="gap-1.5"
                          >
                            {copiedIndex === i ? (
                              <CheckCheck className="h-3.5 w-3.5" />
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Copy URL</span>
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* n8n Hosting Info */}
        <div className="animate-in animate-in-delay-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Deploy n8n
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To use n8n automation, deploy n8n on your own server or cloud. Here are quick options:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <h4 className="font-semibold text-sm mb-2">Docker (Self-hosted)</h4>
                    <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto">
                      <code>{`docker run -d \\
  --name n8n \\
  -p 5678:5678 \\
  -e WEBHOOK_URL={baseUrl}/api/n8n \\
  -e N8N_PROXY_HOPS=1 \\
  n8nio/n8n`}</code>
                    </pre>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <h4 className="font-semibold text-sm mb-2">n8n Cloud</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Sign up for n8n Cloud for a hosted solution.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://n8n.io/cloud/", "_blank")}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      n8n Cloud
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
