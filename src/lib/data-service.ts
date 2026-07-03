/* eslint-disable @typescript-eslint/no-explicit-any */

import type { User, Lead, Customer, LoanApplication, FollowUp, AuditLog, Lender, SentEmail } from "@/types";
import { getSupabaseClient } from "./supabase";

// Session state (synchronous, backed by localStorage)
let _currentUser: User | null = null;

export function getCurrentUser(): User | null {
  if (!_currentUser) {
    const stored = typeof window !== "undefined" ? localStorage.getItem("currentUser") : null;
    if (stored) {
      try { _currentUser = JSON.parse(stored); } catch { _currentUser = null; }
    }
  }
  return _currentUser;
}

export function setCurrentUser(user: User | null) {
  _currentUser = user;
  if (typeof window !== "undefined") {
    if (user) localStorage.setItem("currentUser", JSON.stringify(user));
    else localStorage.removeItem("currentUser");
  }
}

export interface SentSMS {
  id: string;
  to: string;
  toName: string;
  message: string;
  sentAt: string;
  sentBy: string;
  status: "sent" | "failed" | "delivered";
}

// ─── Supabase Client Helper ──────────────────────────────

function client() {
  const c = getSupabaseClient();
  if (!c) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  return c;
}

type TableName = "users" | "leads" | "customers" | "loan_applications" | "follow_ups" | "audit_logs" | "lenders" | "sent_emails" | "sms_messages";

function table(t: TableName) {
  return client().from(t) as any;
}

// ─── Mapping helpers ──────────────────────────────────────

function mapUser(r: any): User {
  return {
    id: r.id, fullName: r.full_name, email: r.email, username: r.username,
    password: r.password, mobileNumber: r.mobile_number, role: r.role,
    status: r.status, createdAt: r.created_at,
  };
}
function mapLead(r: any): Lead {
  return {
    id: r.id, customerName: r.customer_name, mobileNumber: r.mobile_number,
    city: r.city, address: r.address || undefined, residenceAddress: r.residence_address || undefined,
    officeAddress: r.office_address || undefined, loanCategory: r.loan_category,
    purposeOfLoan: r.purpose_of_loan || undefined,
    requiredAmount: r.required_amount, cibilScore: r.cibil_score || undefined,
    purchaseValue: r.purchase_value || undefined, saleDeedAmount: r.sale_deed_amount || undefined,
    leadSource: r.lead_source, assignedTo: r.assigned_to, status: r.status,
    notes: r.notes || "", createdAt: r.created_at,
    transferredFrom: r.transferred_from || undefined,
    transferredTo: r.transferred_to || undefined,
    transferStatus: r.transfer_status || undefined,
  };
}
function mapCustomer(r: any): Customer {
  const docs = typeof r.documents === "string" ? JSON.parse(r.documents) : (r.documents || []);
  const coApps = typeof r.co_applicants === "string" ? JSON.parse(r.co_applicants) : (r.co_applicants || []);
  return {
    id: r.id, fullName: r.full_name, mobileNumber: r.mobile_number,
    address: r.address || "", residenceAddress: r.residence_address || undefined,
    officeAddress: r.office_address || undefined, panNumber: r.pan_number || "",
    aadhaarNumber: r.aadhaar_number || "", employmentType: r.employment_type,
    monthlyIncome: r.monthly_income || "", existingLiabilities: r.existing_liabilities || "",
    assignedTo: r.assigned_to, notes: r.notes || "", createdAt: r.created_at,
    loanCategory: r.loan_category, purposeOfLoan: r.purpose_of_loan || undefined,
    hasCoApplicant: r.has_co_applicant, coApplicants: coApps,
    cibilScore: r.cibil_score || undefined,
    purchaseValue: r.purchase_value || undefined, saleDeedAmount: r.sale_deed_amount || undefined,
    documents: docs,
    propertyAddress: r.property_address || undefined,
    schemeName: r.scheme_name || undefined,
    dateAdded: r.date_added || undefined,
  };
}
function mapApplication(r: any): LoanApplication {
  const docs = typeof r.documents === "string" ? JSON.parse(r.documents) : (r.documents || []);
  const coApps = typeof r.co_applicants === "string" ? JSON.parse(r.co_applicants) : (r.co_applicants || []);
  return {
    id: r.id, customerId: r.customer_id || "", customerName: r.customer_name || "",
    mobileNumber: r.mobile_number || "", address: r.address || undefined,
    residenceAddress: r.residence_address || undefined, officeAddress: r.office_address || undefined,
    loanCategory: r.loan_category, purposeOfLoan: r.purpose_of_loan || undefined,
    lender: r.lender,
    requestedAmount: r.requested_amount, approvalAmount: r.approval_amount || undefined,
    disbursedAmount: r.disbursed_amount || undefined,
    interestRate: r.interest_rate || undefined, tenure: r.tenure || undefined, emiAmount: r.emi_amount || undefined,
    cibilScore: r.cibil_score || undefined,
    purchaseValue: r.purchase_value || undefined, saleDeedAmount: r.sale_deed_amount || undefined,
    status: r.status, assignedTo: r.assigned_to, documents: docs,
    notes: r.notes || "", createdAt: r.created_at,
    applicationNumber: r.application_number || undefined,
    submissionDate: r.submission_date || undefined,
    disbursementDate: r.disbursement_date || undefined,
    rejectionReason: r.rejection_reason || undefined,
    hasCoApplicant: r.has_co_applicant, coApplicants: coApps,
    propertyAddress: r.property_address || undefined,
    schemeName: r.scheme_name || undefined,
    completionStatus: r.completion_status || undefined,
  };
}
function mapFollowUp(r: any): FollowUp {
  return {
    id: r.id, customerName: r.customer_name, mobileNumber: r.mobile_number,
    address: r.address || undefined, purposeOfLoan: r.purpose_of_loan || undefined,
    leadId: r.lead_id || null, applicationId: r.application_id || null,
    type: r.type, notes: r.notes || "", nextFollowUpDate: r.next_follow_up_date,
    nextFollowUpTime: r.next_follow_up_time, priority: r.priority,
    status: r.status, assignedTo: r.assigned_to, createdAt: r.created_at,
  };
}
function mapAuditLog(r: any): AuditLog {
  return {
    id: r.id, userName: r.user_name, userRole: r.user_role, action: r.action,
    entityType: r.entity_type, entityId: r.entity_id, details: r.details || "",
    createdAt: r.created_at,
  };
}

// ─── Users ────────────────────────────────────────────────

export async function getUsers(): Promise<User[]> {
  const { data } = await table("users").select("*").order("full_name");
  return (data || []).map(mapUser);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { data } = await table("users").select("*").eq("username", username).maybeSingle();
  return data ? mapUser(data) : null;
}

export async function getUserById(id: string): Promise<User | null> {
  const { data } = await table("users").select("*").eq("id", id).maybeSingle();
  return data ? mapUser(data) : null;
}

export async function createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
  const { data, error } = await table("users")
    .insert({
      full_name: user.fullName,
      email: user.email || "",
      username: user.username,
      password: user.password,
      mobile_number: user.mobileNumber || "",
      role: user.role,
      status: user.status || "active",
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create user");
  return mapUser(data);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const db: any = {};
  if (updates.fullName !== undefined) db.full_name = updates.fullName;
  if (updates.email !== undefined) db.email = updates.email;
  if (updates.username !== undefined) db.username = updates.username;
  if (updates.password !== undefined) db.password = updates.password;
  if (updates.mobileNumber !== undefined) db.mobile_number = updates.mobileNumber;
  if (updates.role !== undefined) db.role = updates.role;
  if (updates.status !== undefined) db.status = updates.status;
  const { data } = await table("users").update(db).eq("id", id).select().single();
  return data ? mapUser(data) : null;
}

export async function deleteUser(id: string): Promise<void> {
  await table("users").delete().eq("id", id);
}

// ─── Leads ────────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const { data } = await table("leads").select("*").order("created_at", { ascending: false });
  return (data || []).map(mapLead);
}

export async function addLead(lead: Omit<Lead, "id" | "createdAt">): Promise<Lead> {
  const { data, error } = await table("leads")
    .insert({
      customer_name: lead.customerName,
      mobile_number: lead.mobileNumber,
      city: lead.city,
      address: lead.address || null,
      residence_address: lead.residenceAddress || null,
      office_address: lead.officeAddress || null,
      loan_category: lead.loanCategory,
      purpose_of_loan: lead.purposeOfLoan || null,
      required_amount: lead.requiredAmount || "",
      cibil_score: lead.cibilScore || null,
      purchase_value: lead.purchaseValue || null,
      sale_deed_amount: lead.saleDeedAmount || null,
      lead_source: lead.leadSource || "",
      assigned_to: lead.assignedTo,
      status: lead.status || "new",
      notes: lead.notes || "",
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create lead");
  return mapLead(data);
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const db: any = {};
  if (updates.customerName !== undefined) db.customer_name = updates.customerName;
  if (updates.mobileNumber !== undefined) db.mobile_number = updates.mobileNumber;
  if (updates.city !== undefined) db.city = updates.city;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.residenceAddress !== undefined) db.residence_address = updates.residenceAddress;
  if (updates.officeAddress !== undefined) db.office_address = updates.officeAddress;
  if (updates.loanCategory !== undefined) db.loan_category = updates.loanCategory;
  if (updates.purposeOfLoan !== undefined) db.purpose_of_loan = updates.purposeOfLoan;
  if (updates.requiredAmount !== undefined) db.required_amount = updates.requiredAmount;
  if (updates.cibilScore !== undefined) db.cibil_score = updates.cibilScore;
  if (updates.purchaseValue !== undefined) db.purchase_value = updates.purchaseValue;
  if (updates.saleDeedAmount !== undefined) db.sale_deed_amount = updates.saleDeedAmount;
  if (updates.leadSource !== undefined) db.lead_source = updates.leadSource;
  if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
  if (updates.status !== undefined) db.status = updates.status;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.transferredFrom !== undefined) db.transferred_from = updates.transferredFrom;
  if (updates.transferredTo !== undefined) db.transferred_to = updates.transferredTo;
  if (updates.transferStatus !== undefined) db.transfer_status = updates.transferStatus;
  const { data } = await table("leads").update(db).eq("id", id).select().single();
  return data ? mapLead(data) : null;
}

export async function deleteLead(id: string): Promise<void> {
  await table("leads").delete().eq("id", id);
}

export async function transferLead(leadId: string, fromUserId: string, toUserId: string): Promise<Lead | null> {
  return updateLead(leadId, {
    transferredFrom: fromUserId,
    transferredTo: toUserId,
    transferStatus: "pending" as any,
  });
}

export async function acceptTransfer(leadId: string): Promise<Lead | null> {
  const lead = await getLeadById(leadId);
  if (!lead || lead.transferStatus !== "pending") return null;
  const targetId = lead.transferredTo;
  if (!targetId) return null;
  return updateLead(leadId, {
    assignedTo: targetId,
    transferStatus: "accepted" as any,
  });
}

export async function rejectTransfer(leadId: string): Promise<Lead | null> {
  return updateLead(leadId, {
    transferStatus: "rejected" as any,
  });
}

export async function getPendingTransfers(userId: string): Promise<Lead[]> {
  const { data } = await table("leads")
    .select("*")
    .eq("transferred_to", userId)
    .eq("transfer_status", "pending");
  return (data || []).map(mapLead);
}

async function getLeadById(id: string): Promise<Lead | null> {
  const { data } = await table("leads").select("*").eq("id", id).maybeSingle();
  return data ? mapLead(data) : null;
}

// ─── Customers ────────────────────────────────────────────

export async function getCustomers(): Promise<Customer[]> {
  const { data } = await table("customers").select("*").order("created_at", { ascending: false });
  return (data || []).map(mapCustomer);
}

export async function addCustomer(customer: Omit<Customer, "id" | "createdAt">): Promise<Customer> {
  const { data, error } = await table("customers")
    .insert({
      full_name: customer.fullName,
      mobile_number: customer.mobileNumber,
      address: customer.address || "",
      residence_address: customer.residenceAddress || null,
      office_address: customer.officeAddress || null,
      pan_number: customer.panNumber || "",
      aadhaar_number: customer.aadhaarNumber || "",
      employment_type: customer.employmentType,
      monthly_income: customer.monthlyIncome || "",
      existing_liabilities: customer.existingLiabilities || "",
      assigned_to: customer.assignedTo,
      notes: customer.notes || "",
      loan_category: customer.loanCategory || null,
      purpose_of_loan: customer.purposeOfLoan || null,
      has_co_applicant: customer.hasCoApplicant || false,
      co_applicants: JSON.stringify(customer.coApplicants || []),
      cibil_score: customer.cibilScore || null,
      purchase_value: customer.purchaseValue || null,
      sale_deed_amount: customer.saleDeedAmount || null,
      documents: JSON.stringify(customer.documents || []),
      property_address: customer.propertyAddress || null,
      scheme_name: customer.schemeName || null,
      date_added: customer.dateAdded || null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create customer");
  return mapCustomer(data);
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  const db: any = {};
  if (updates.fullName !== undefined) db.full_name = updates.fullName;
  if (updates.mobileNumber !== undefined) db.mobile_number = updates.mobileNumber;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.residenceAddress !== undefined) db.residence_address = updates.residenceAddress;
  if (updates.officeAddress !== undefined) db.office_address = updates.officeAddress;
  if (updates.panNumber !== undefined) db.pan_number = updates.panNumber;
  if (updates.aadhaarNumber !== undefined) db.aadhaar_number = updates.aadhaarNumber;
  if (updates.employmentType !== undefined) db.employment_type = updates.employmentType;
  if (updates.monthlyIncome !== undefined) db.monthly_income = updates.monthlyIncome;
  if (updates.existingLiabilities !== undefined) db.existing_liabilities = updates.existingLiabilities;
  if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.loanCategory !== undefined) db.loan_category = updates.loanCategory;
  if (updates.purposeOfLoan !== undefined) db.purpose_of_loan = updates.purposeOfLoan;
  if (updates.hasCoApplicant !== undefined) db.has_co_applicant = updates.hasCoApplicant;
  if (updates.coApplicants !== undefined) db.co_applicants = JSON.stringify(updates.coApplicants);
  if (updates.cibilScore !== undefined) db.cibil_score = updates.cibilScore;
  if (updates.purchaseValue !== undefined) db.purchase_value = updates.purchaseValue;
  if (updates.saleDeedAmount !== undefined) db.sale_deed_amount = updates.saleDeedAmount;
  if (updates.documents !== undefined) db.documents = JSON.stringify(updates.documents);
  if (updates.propertyAddress !== undefined) db.property_address = updates.propertyAddress;
  if (updates.schemeName !== undefined) db.scheme_name = updates.schemeName;
  if (updates.dateAdded !== undefined) db.date_added = updates.dateAdded;
  const { data } = await table("customers").update(db).eq("id", id).select().single();
  return data ? mapCustomer(data) : null;
}

export async function deleteCustomer(id: string): Promise<void> {
  await table("customers").delete().eq("id", id);
}

// ─── Loan Applications ────────────────────────────────────

export async function getApplications(): Promise<LoanApplication[]> {
  return getLoanApplications();
}

export async function getLoanApplications(): Promise<LoanApplication[]> {
  const { data } = await table("loan_applications").select("*").order("created_at", { ascending: false });
  return (data || []).map(mapApplication);
}

export async function createLoanApplication(app: Omit<LoanApplication, "id" | "createdAt">): Promise<LoanApplication> {
  const { data, error } = await table("loan_applications")
    .insert({
      customer_id: app.customerId || "",
      customer_name: app.customerName || "",
      mobile_number: app.mobileNumber || "",
      address: app.address || null,
      residence_address: app.residenceAddress || null,
      office_address: app.officeAddress || null,
      loan_category: app.loanCategory,
      purpose_of_loan: app.purposeOfLoan || null,
      lender: app.lender,
      requested_amount: app.requestedAmount,
      approval_amount: app.approvalAmount || null,
      disbursed_amount: app.disbursedAmount || null,
      interest_rate: app.interestRate || null,
      tenure: app.tenure || null,
      emi_amount: app.emiAmount || null,
      cibil_score: app.cibilScore || null,
      purchase_value: app.purchaseValue || null,
      sale_deed_amount: app.saleDeedAmount || null,
      status: app.status || "draft",
      property_address: app.propertyAddress || null,
      scheme_name: app.schemeName || null,
      completion_status: app.completionStatus || null,
      assigned_to: app.assignedTo,
      documents: JSON.stringify(app.documents || []),
      notes: app.notes || "",
      application_number: app.applicationNumber || null,
      submission_date: app.submissionDate || null,
      disbursement_date: app.disbursementDate || null,
      rejection_reason: app.rejectionReason || null,
      has_co_applicant: app.hasCoApplicant || false,
      co_applicants: JSON.stringify(app.coApplicants || []),
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create application");
  return mapApplication(data);
}

export async function addApplication(app: Omit<LoanApplication, "id" | "createdAt">): Promise<LoanApplication> {
  return createLoanApplication(app);
}

export async function updateApplication(id: string, updates: Partial<LoanApplication>): Promise<LoanApplication | null> {
  const db: any = {};
  if (updates.customerId !== undefined) db.customer_id = updates.customerId;
  if (updates.customerName !== undefined) db.customer_name = updates.customerName;
  if (updates.mobileNumber !== undefined) db.mobile_number = updates.mobileNumber;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.residenceAddress !== undefined) db.residence_address = updates.residenceAddress;
  if (updates.officeAddress !== undefined) db.office_address = updates.officeAddress;
  if (updates.loanCategory !== undefined) db.loan_category = updates.loanCategory;
  if (updates.purposeOfLoan !== undefined) db.purpose_of_loan = updates.purposeOfLoan;
  if (updates.lender !== undefined) db.lender = updates.lender;
  if (updates.requestedAmount !== undefined) db.requested_amount = updates.requestedAmount;
  if (updates.approvalAmount !== undefined) db.approval_amount = updates.approvalAmount || null;
  if (updates.disbursedAmount !== undefined) db.disbursed_amount = updates.disbursedAmount || null;
  if (updates.interestRate !== undefined) db.interest_rate = updates.interestRate || null;
  if (updates.tenure !== undefined) db.tenure = updates.tenure || null;
  if (updates.emiAmount !== undefined) db.emi_amount = updates.emiAmount || null;
  if (updates.cibilScore !== undefined) db.cibil_score = updates.cibilScore;
  if (updates.purchaseValue !== undefined) db.purchase_value = updates.purchaseValue;
  if (updates.saleDeedAmount !== undefined) db.sale_deed_amount = updates.saleDeedAmount;
  if (updates.status !== undefined) db.status = updates.status;
  if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
  if (updates.documents !== undefined) db.documents = JSON.stringify(updates.documents);
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.applicationNumber !== undefined) db.application_number = updates.applicationNumber || null;
  if (updates.submissionDate !== undefined) db.submission_date = updates.submissionDate || null;
  if (updates.disbursementDate !== undefined) db.disbursement_date = updates.disbursementDate || null;
  if (updates.rejectionReason !== undefined) db.rejection_reason = updates.rejectionReason || null;
  if (updates.hasCoApplicant !== undefined) db.has_co_applicant = updates.hasCoApplicant;
  if (updates.coApplicants !== undefined) db.co_applicants = JSON.stringify(updates.coApplicants);
  if (updates.propertyAddress !== undefined) db.property_address = updates.propertyAddress;
  if (updates.schemeName !== undefined) db.scheme_name = updates.schemeName;
  if (updates.completionStatus !== undefined) db.completion_status = updates.completionStatus;
  const { data } = await table("loan_applications").update(db).eq("id", id).select().single();
  return data ? mapApplication(data) : null;
}

export async function deleteApplication(id: string): Promise<void> {
  await table("loan_applications").delete().eq("id", id);
}

// ─── Follow Ups ───────────────────────────────────────────

export async function getFollowUps(): Promise<FollowUp[]> {
  const { data } = await table("follow_ups").select("*").order("next_follow_up_date");
  return (data || []).map(mapFollowUp);
}

export async function createFollowUp(fu: Omit<FollowUp, "id" | "createdAt">): Promise<FollowUp> {
  const { data, error } = await table("follow_ups")
    .insert({
      customer_name: fu.customerName,
      mobile_number: fu.mobileNumber,
      address: fu.address || null,
      purpose_of_loan: fu.purposeOfLoan || null,
      lead_id: fu.leadId || null,
      application_id: fu.applicationId || null,
      type: fu.type,
      notes: fu.notes || "",
      next_follow_up_date: fu.nextFollowUpDate,
      next_follow_up_time: fu.nextFollowUpTime || "10:00",
      priority: fu.priority || "medium",
      status: fu.status || "pending",
      assigned_to: fu.assignedTo,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create follow-up");
  return mapFollowUp(data);
}

export async function addFollowUp(fu: Omit<FollowUp, "id" | "createdAt">): Promise<FollowUp> {
  return createFollowUp(fu);
}

export async function updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp | null> {
  const db: any = {};
  if (updates.customerName !== undefined) db.customer_name = updates.customerName;
  if (updates.mobileNumber !== undefined) db.mobile_number = updates.mobileNumber;
  if (updates.address !== undefined) db.address = updates.address;
  if (updates.purposeOfLoan !== undefined) db.purpose_of_loan = updates.purposeOfLoan;
  if (updates.leadId !== undefined) db.lead_id = updates.leadId;
  if (updates.applicationId !== undefined) db.application_id = updates.applicationId;
  if (updates.type !== undefined) db.type = updates.type;
  if (updates.notes !== undefined) db.notes = updates.notes;
  if (updates.nextFollowUpDate !== undefined) db.next_follow_up_date = updates.nextFollowUpDate;
  if (updates.nextFollowUpTime !== undefined) db.next_follow_up_time = updates.nextFollowUpTime;
  if (updates.priority !== undefined) db.priority = updates.priority;
  if (updates.status !== undefined) db.status = updates.status;
  if (updates.assignedTo !== undefined) db.assigned_to = updates.assignedTo;
  const { data } = await table("follow_ups").update(db).eq("id", id).select().single();
  return data ? mapFollowUp(data) : null;
}

export async function deleteFollowUp(id: string): Promise<void> {
  await table("follow_ups").delete().eq("id", id);
}

// ─── Audit Logs ───────────────────────────────────────────

export async function getAuditLogs(): Promise<AuditLog[]> {
  const { data } = await table("audit_logs").select("*").order("created_at", { ascending: false });
  return (data || []).map(mapAuditLog);
}

export async function addAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog> {
  const { data, error } = await table("audit_logs")
    .insert({
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityId,
      details: log.details || "",
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to create audit log");
  return mapAuditLog(data);
}

// ─── Lenders ──────────────────────────────────────────────

export async function getLenders(): Promise<Lender[]> {
  const { data } = await table("lenders").select("*").order("name");
  return (data || []).map((r: any) => ({ id: r.id, name: r.name }));
}

export async function createLender(data: { name: string }): Promise<Lender> {
  const { data: result, error } = await table("lenders")
    .insert({ name: data.name })
    .select()
    .single();
  if (error || !result) throw new Error(error?.message || "Failed to create lender");
  return { id: result.id, name: result.name };
}

export async function updateLender(id: string, updates: Partial<Lender>): Promise<Lender | null> {
  const db: any = {};
  if (updates.name !== undefined) db.name = updates.name;
  const { data } = await table("lenders").update(db).eq("id", id).select().single();
  return data ? { id: data.id, name: data.name } : null;
}

export async function deleteLender(id: string): Promise<void> {
  await table("lenders").delete().eq("id", id);
}

// ─── Sent Emails ──────────────────────────────────────────

export async function getSentEmails(): Promise<SentEmail[]> {
  const { data } = await table("sent_emails").select("*").order("sent_at", { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.id,
    recipients: Array.isArray(r.recipients) ? r.recipients : JSON.parse(r.recipients || "[]"),
    subject: r.subject,
    body: r.body,
    hasAttachment: r.has_attachment,
    sentAt: r.sent_at,
    sentBy: r.sent_by,
  }));
}

export async function addSentEmail(email: Omit<SentEmail, "id">): Promise<SentEmail> {
  const { data, error } = await table("sent_emails")
    .insert({
      recipients: JSON.stringify(email.recipients),
      subject: email.subject,
      body: email.body,
      has_attachment: email.hasAttachment || false,
      sent_at: email.sentAt,
      sent_by: email.sentBy,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to save email");
  return {
    id: data.id,
    recipients: Array.isArray(data.recipients) ? data.recipients : JSON.parse(data.recipients || "[]"),
    subject: data.subject,
    body: data.body,
    hasAttachment: data.has_attachment,
    sentAt: data.sent_at,
    sentBy: data.sent_by,
  };
}

// ─── SMS Messages ─────────────────────────────────────────

export async function getSMSMessages(): Promise<SentSMS[]> {
  const { data } = await table("sms_messages").select("*").order("sent_at", { ascending: false });
  return (data || []).map((r: any) => ({
    id: r.id,
    to: r.to_phone,
    toName: r.to_name,
    message: r.message,
    sentAt: r.sent_at,
    sentBy: r.sent_by,
    status: r.status as SentSMS["status"],
  }));
}

export async function addSMSMessage(sms: Omit<SentSMS, "id">): Promise<SentSMS> {
  const { data, error } = await table("sms_messages")
    .insert({
      to_phone: sms.to,
      to_name: sms.toName,
      message: sms.message,
      sent_at: sms.sentAt,
      sent_by: sms.sentBy,
      status: sms.status || "sent",
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message || "Failed to save SMS");
  return {
    id: data.id,
    to: data.to_phone,
    toName: data.to_name,
    message: data.message,
    sentAt: data.sent_at,
    sentBy: data.sent_by,
    status: data.status,
  };
}

// ─── Data Service Object (for backwards compat with import { dataService }) ──

export const dataService = {
  getUsers, getUserByUsername, getUserById, createUser, updateUser, deleteUser,
  getLeads, addLead, updateLead, deleteLead,
  transferLead, acceptTransfer, rejectTransfer, getPendingTransfers,
  getCustomers, addCustomer, updateCustomer, deleteCustomer,
  getApplications, getLoanApplications, createLoanApplication, addApplication, updateApplication, deleteApplication,
  getFollowUps, createFollowUp, addFollowUp, updateFollowUp, deleteFollowUp,
  getAuditLogs, addAuditLog,
  getLenders, createLender, updateLender, deleteLender,
  getSentEmails, addSentEmail,
  getSMSMessages, addSMSMessage,
};
