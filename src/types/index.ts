export type UserRole = "admin" | "jobber";

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
  mobileNumber?: string;
  role: UserRole;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Lead {
  id: string;
  customerName: string;
  mobileNumber: string;
  city: string;
  loanCategory: string;
  requiredAmount: string;
  leadSource: string;
  assignedTo: string;
  status: "new" | "contacted" | "documents_pending" | "submitted" | "approved" | "rejected" | "disbursed" | "lost";
  notes: string;
  createdAt: string;
  // Lead transfer fields
  transferredFrom?: string;
  transferredTo?: string;
  transferStatus?: "pending" | "accepted" | "rejected";
}

export interface DocumentItem {
  id: string;
  name: string;
  status: "pending" | "received" | "verified" | "rejected";
  remarks: string;
  required?: boolean;
  isCoApplicant?: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  mobileNumber: string;
  address: string;
  panNumber: string;
  aadhaarNumber: string;
  employmentType: "Salaried" | "Self-Employed" | "Business Owner" | "Professional" | "Other";
  monthlyIncome: string;
  existingLiabilities: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  loanCategory?: "Business Loan" | "Salaried Loan";
  hasCoApplicant?: boolean;
  documents?: DocumentItem[];
}

export type LoanApplicationStatus = "draft" | "submitted" | "documents_pending" | "under_review" | "approved" | "rejected" | "disbursed" | "closed";

export interface LoanApplication {
  id: string;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  loanCategory: string;
  lender: string;
  requestedAmount: string;
  approvalAmount?: string;
  interestRate?: string;
  tenure?: string;
  status: LoanApplicationStatus;
  assignedTo: string;
  documents: DocumentItem[];
  notes: string;
  createdAt: string;
  applicationNumber?: string;
  submissionDate?: string;
  disbursementDate?: string;
  rejectionReason?: string;
  hasCoApplicant?: boolean;
}

export type FollowUpType = "Call" | "WhatsApp" | "Meeting" | "Document Collection" | "Callback";
export type FollowUpPriority = "low" | "medium" | "high";
export type FollowUpStatus = "pending" | "completed" | "rescheduled";

export interface FollowUp {
  id: string;
  customerName: string;
  mobileNumber: string;
  leadId: string | null;
  applicationId: string | null;
  type: FollowUpType;
  notes: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
  priority: FollowUpPriority;
  status: FollowUpStatus;
  assignedTo: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface Lender {
  id: string;
  name: string;
}

export interface SentEmail {
  id: string;
  recipients: string[];
  subject: string;
  body: string;
  hasAttachment: boolean;
  sentAt: string;
  sentBy: string;
}

export type LoanCategory = {
  id: string;
  name: string;
  documents: string[];
  coApplicantDocuments: string[];
};