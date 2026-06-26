import { useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Send,
  Paperclip,
  X,
  CheckCircle,
  Clock,
  Image as ImageIcon,
} from "lucide-react";

interface EmailRecord {
  id: string;
  to: string[];
  subject: string;
  body: string;
  imageAttachment?: string;
  sentAt: string;
  sentBy: string;
  status: "sent" | "draft";
}

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function EmailsPage() {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sr_emails");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  const [activeTab, setActiveTab] = useState<"compose" | "sent">("compose");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageAttachment(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageAttachment(null);
    setImageName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = () => {
    if (!recipients.trim() || !subject.trim() || !body.trim()) {
      alert("Please fill in all required fields.");
      return;
    }

    setSending(true);

    const toList = recipients
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const email: EmailRecord = {
      id: generateId(),
      to: toList,
      subject: subject.trim(),
      body: body.trim(),
      imageAttachment: imageAttachment || undefined,
      sentAt: new Date().toISOString(),
      sentBy: user?.fullName || "Admin",
      status: "sent",
    };

    setTimeout(() => {
      const updated = [email, ...sentEmails];
      setSentEmails(updated);
      localStorage.setItem("sr_emails", JSON.stringify(updated));

      setRecipients("");
      setSubject("");
      setBody("");
      removeImage();
      setSending(false);
      setActiveTab("sent");
    }, 800);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold">Email Composer</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send bulk emails to customers with custom content
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === "compose" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("compose")}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Compose
          </Button>
          <Button
            variant={activeTab === "sent" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("sent")}
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Sent ({sentEmails.length})
          </Button>
        </div>

        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">New Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipients">
                      Recipients <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="recipients"
                      placeholder="Enter email addresses separated by commas or new lines..."
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {recipients
                        .split(/[\n,;]+/)
                        .filter((e) => e.trim().length > 0).length}{" "}
                      recipient(s) detected
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="subject"
                      placeholder="Enter email subject..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">
                      Message Body <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="body"
                      placeholder="Write your message here..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image Attachment</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="h-4 w-4 mr-1.5" />
                        Attach Image
                      </Button>
                      {imageName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{imageName}</span>
                          <button
                            onClick={removeImage}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {imageAttachment && (
                      <div className="mt-2 relative inline-block">
                        <Image
                          src={imageAttachment}
                          alt="Attachment preview"
                          width={400}
                          height={300}
                          className="max-h-48 rounded-md border object-contain"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-serif text-base">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md p-4 bg-white space-y-3">
                    <div className="border-b pb-2">
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="text-sm font-medium">
                        {subject || <span className="text-muted-foreground italic">No subject</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Body</p>
                      <div className="text-sm whitespace-pre-wrap">
                        {body || (
                          <span className="text-muted-foreground italic">No content</span>
                        )}
                      </div>
                    </div>
                    {imageAttachment && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Attachment</p>
                        <Image
                          src={imageAttachment}
                          alt="Preview"
                          width={300}
                          height={200}
                          className="max-h-32 rounded-md object-contain"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-serif text-base">Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Use commas, semicolons, or new lines to separate multiple email addresses.</p>
                  <p>Maximum image size: 5MB.</p>
                  <p>All sent emails are saved in the Sent folder.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "sent" && (
          <div className="space-y-4">
            {sentEmails.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No emails sent yet.</p>
                </CardContent>
              </Card>
            ) : (
              sentEmails.map((email) => (
                <Card key={email.id} className="glass-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          <p className="font-medium text-sm truncate">{email.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          To: {email.to.slice(0, 3).join(", ")}
                          {email.to.length > 3 && ` +${email.to.length - 3} more`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sent by {email.sentBy} on{" "}
                          {new Date(email.sentAt).toLocaleString()}
                        </p>
                      </div>
                      {email.imageAttachment && (
                        <div className="shrink-0 ml-4">
                          <Image
                            src={email.imageAttachment}
                            alt="Attachment"
                            width={64}
                            height={64}
                            className="h-16 w-16 object-cover rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                        {email.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}