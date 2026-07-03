import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserCircle,
  Phone,
  FileText,
  Banknote,
  Building2,
  MapPin,
  Briefcase,
  BadgeIndianRupee,
  CreditCard,
  Fingerprint,
  Users,
  FileCheck,
  AlertCircle,
  Hash,
} from "lucide-react";
import { dataService } from "@/lib/data-service";
import type { Customer } from "@/types";

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  customerName?: string;
  mobileNumber?: string;
}

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  mobileNumber,
}: CustomerDetailDialogProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    dataService.getCustomers().then((allCustomers) => {
      let found: Customer | null = null;

      if (customerId) {
        found = allCustomers.find((c) => c.id === customerId) || null;
      }

      if (!found && customerName) {
        found = allCustomers.find(
          (c) =>
            c.fullName.toLowerCase() === customerName.toLowerCase() ||
            (mobileNumber && c.mobileNumber === mobileNumber)
        ) || null;
      }

      if (!found && mobileNumber) {
        found = allCustomers.find((c) => c.mobileNumber === mobileNumber) || null;
      }

      if (!found) {
        found = allCustomers.find(
          (c) => c.fullName.toLowerCase().includes((customerName || "").toLowerCase())
        ) || null;
      }

      setCustomer(found);
      setNotFound(!found);
      setLoading(false);
    });
  }, [open, customerId, customerName, mobileNumber]);

  const docCount = customer?.documents?.length || 0;
  const docVerified = customer?.documents?.filter((d) => d.status === "verified").length || 0;
  const docReceived = customer?.documents?.filter((d) => d.status === "received" || d.status === "verified").length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-primary" />
            {customer?.fullName || customerName || "Customer Details"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Full customer profile and documents"
              : notFound
              ? "No customer record found"
              : "Loading customer details..."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center py-12 space-y-3">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No customer record found for this name.</p>
            {customerName && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Name: {customerName}</p>
                {mobileNumber && <p>Mobile: {mobileNumber}</p>}
              </div>
            )}
          </div>
        )}

        {!loading && customer && (
          <div className="space-y-6 py-2">
            {/* Quick Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <Phone className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Mobile</p>
                  <p className="text-sm font-medium">{customer.mobileNumber}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Briefcase className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Employment</p>
                  <p className="text-sm font-medium">{customer.employmentType}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <BadgeIndianRupee className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-sm font-medium">{customer.monthlyIncome || "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Documents</p>
                  <p className="text-sm font-medium">{docReceived}/{docCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Personal Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-sm flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">PAN:</span>
                    <span className="font-mono">{customer.panNumber || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Aadhaar:</span>
                    <span className="font-mono">{customer.aadhaarNumber || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">CIBIL:</span>
                    <span>{customer.cibilScore || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Employment:</span>
                    <span>{customer.employmentType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BadgeIndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Income:</span>
                    <span>{customer.monthlyIncome || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Liabilities:</span>
                    <span>{customer.existingLiabilities || "—"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(customer.residenceAddress || customer.address) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Residence Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{customer.residenceAddress || customer.address}</p>
                  </CardContent>
                </Card>
              )}
              {customer.officeAddress && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-serif text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Office Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{customer.officeAddress}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Loan Info */}
            {(customer.loanCategory || customer.purposeOfLoan || customer.schemeName || customer.propertyAddress) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Loan Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {customer.loanCategory && (
                      <div>
                        <span className="text-muted-foreground">Category:</span> {customer.loanCategory}
                      </div>
                    )}
                    {customer.purposeOfLoan && (
                      <div>
                        <span className="text-muted-foreground">Purpose:</span> {customer.purposeOfLoan}
                      </div>
                    )}
                    {customer.schemeName && (
                      <div>
                        <span className="text-muted-foreground">Scheme:</span> {customer.schemeName}
                      </div>
                    )}
                    {customer.propertyAddress && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Property:</span> {customer.propertyAddress}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Co-Applicants */}
            {customer.coApplicants && customer.coApplicants.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Co-Applicants / Guarantors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customer.coApplicants.map((co) => (
                      <div key={co.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                        <UserCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{co.name || "Unnamed"}</span>
                        <span className="text-sm text-muted-foreground">{co.mobileNumber}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {customer.documents && customer.documents.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Documents ({docVerified}/{docCount} verified)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {customer.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm border ${
                          doc.status === "verified"
                            ? "border-emerald-200 bg-emerald-50/30"
                            : doc.status === "received"
                            ? "border-blue-200 bg-blue-50/30"
                            : "border-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{doc.name}</span>
                          {doc.isCoApplicant && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              Co-App
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === "verified" && <FileCheck className="h-3.5 w-3.5 text-emerald-500" />}
                          {doc.remarks && (
                            <span className="text-xs text-muted-foreground">{doc.remarks}</span>
                          )}
                          <span className={`text-xs capitalize ${
                            doc.status === "verified"
                              ? "text-emerald-600"
                              : doc.status === "received"
                              ? "text-blue-600"
                              : "text-muted-foreground"
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
