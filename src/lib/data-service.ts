import type { User, Lead, Customer, LoanApplication, FollowUp, AuditLog, Lender, SentEmail } from "@/types";

// Seed data
let demoUsers: User[] = [
  {
    id: "user_1",
    fullName: "Admin User",
    email: "admin@srcrm.com",
    username: "admin",
    password: "admin123",
    mobileNumber: "9999999999",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
  },
  {
    id: "user_2",
    fullName: "Jobber User",
    email: "jobber@srcrm.com",
    username: "jobber",
    password: "jobber123",
    mobileNumber: "9876543210",
    role: "jobber",
    status: "active",
    createdAt: new Date().toISOString(),
  },
];

let currentUser: User | null = null;
let leads: Lead[] = [];
let customers: Customer[] = [];
let applications: LoanApplication[] = [];
let followUps: FollowUp[] = [];
const auditLogs: AuditLog[] = [];
let lenders: Lender[] = [
  { id: "lender_1", name: "HDFC Bank" },
  { id: "lender_2", name: "ICICI Bank" },
  { id: "lender_3", name: "SBI" },
  { id: "lender_4", name: "Axis Bank" },
  { id: "lender_5", name: "Kotak Mahindra" },
];
const sentEmails: SentEmail[] = [];
let idCounter = 100;

function genId(prefix: string): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

export function seedDemoData() {
  // Initialize with some demo data if empty
  if (leads.length === 0) {
    leads = [
      {
        id: genId("lead"),
        customerName: "Rahul Sharma",
        mobileNumber: "9876543210",
        city: "Mumbai",
        loanCategory: "Business Loan",
        requiredAmount: "500000",
        leadSource: "Website",
        assignedTo: "jobber",
        status: "new",
        notes: "",
        createdAt: new Date().toISOString(),
      },
      {
        id: genId("lead"),
        customerName: "Priya Patel",
        mobileNumber: "9876543211",
        city: "Delhi",
        loanCategory: "Salaried Loan",
        requiredAmount: "300000",
        leadSource: "Reference",
        assignedTo: "jobber",
        status: "contacted",
        notes: "Called and shared requirements",
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

const dataService = {
  getUsers: () => [...demoUsers] as User[],
  getUserByUsername: (username: string) => demoUsers.find((u) => u.username === username) || null,
  getLeads: () => [...leads],
  addLead: (lead: Omit<Lead, "id" | "createdAt">) => {
    const newLead: Lead = { ...lead, id: genId("lead"), createdAt: new Date().toISOString() };
    leads.push(newLead);
    return newLead;
  },
  updateLead: (id: string, updates: Partial<Lead>) => {
    const idx = leads.findIndex((l) => l.id === id);
    if (idx !== -1) {
      leads[idx] = { ...leads[idx], ...updates };
      return leads[idx];
    }
    return null;
  },
  deleteLead: (id: string) => {
    leads = leads.filter((l) => l.id !== id);
  },

  // Lead transfer system
  transferLead: (leadId: string, fromUserId: string, toUserId: string) => {
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx !== -1) {
      leads[idx] = {
        ...leads[idx],
        transferredFrom: fromUserId,
        transferredTo: toUserId,
        transferStatus: "pending",
        // Keep assignedTo as original owner until accepted
      };
      return leads[idx];
    }
    return null;
  },

  acceptTransfer: (leadId: string) => {
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx !== -1 && leads[idx].transferStatus === "pending") {
      const targetId = leads[idx].transferredTo;
      if (targetId) {
        leads[idx] = {
          ...leads[idx],
          assignedTo: targetId,
          transferStatus: "accepted",
        };
        return leads[idx];
      }
    }
    return null;
  },

  rejectTransfer: (leadId: string) => {
    const idx = leads.findIndex((l) => l.id === leadId);
    if (idx !== -1 && leads[idx].transferStatus === "pending") {
      leads[idx] = {
        ...leads[idx],
        transferStatus: "rejected",
        // Keep assignedTo as original owner
      };
      return leads[idx];
    }
    return null;
  },

  getPendingTransfers: (userId: string) => {
    return leads.filter((l) => l.transferredTo === userId && l.transferStatus === "pending");
  },
  getCustomers: () => [...customers],
  addCustomer: (customer: Omit<Customer, "id" | "createdAt">) => {
    const newCustomer: Customer = { ...customer, id: genId("cust"), createdAt: new Date().toISOString() };
    customers.push(newCustomer);
    return newCustomer;
  },
  updateCustomer: (id: string, updates: Partial<Customer>) => {
    const idx = customers.findIndex((c) => c.id === id);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], ...updates };
      return customers[idx];
    }
    return null;
  },
  deleteCustomer: (id: string) => {
    customers = customers.filter((c) => c.id !== id);
  },
  getApplications: () => [...applications],
  getLoanApplications: () => [...applications],
  createLoanApplication: (app: Omit<LoanApplication, "id" | "createdAt">) => {
    const newApp: LoanApplication = { ...app, id: genId("app"), createdAt: new Date().toISOString() };
    applications.push(newApp);
    return newApp;
  },
  addApplication: (app: Omit<LoanApplication, "id" | "createdAt">) => {
    const newApp: LoanApplication = { ...app, id: genId("app"), createdAt: new Date().toISOString() };
    applications.push(newApp);
    return newApp;
  },
  updateApplication: (id: string, updates: Partial<LoanApplication>) => {
    const idx = applications.findIndex((a) => a.id === id);
    if (idx !== -1) {
      applications[idx] = { ...applications[idx], ...updates };
      return applications[idx];
    }
    return null;
  },
  deleteApplication: (id: string) => {
    applications = applications.filter((a) => a.id !== id);
  },
  getFollowUps: () => [...followUps],
  createFollowUp: (fu: Omit<FollowUp, "id" | "createdAt">) => {
    const newFu: FollowUp = { ...fu, id: genId("fu"), createdAt: new Date().toISOString() };
    followUps.push(newFu);
    return newFu;
  },
  addFollowUp: (fu: Omit<FollowUp, "id" | "createdAt">) => {
    const newFu: FollowUp = { ...fu, id: genId("fu"), createdAt: new Date().toISOString() };
    followUps.push(newFu);
    return newFu;
  },
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => {
    const idx = followUps.findIndex((f) => f.id === id);
    if (idx !== -1) {
      followUps[idx] = { ...followUps[idx], ...updates };
      return followUps[idx];
    }
    return null;
  },
  deleteFollowUp: (id: string) => {
    followUps = followUps.filter((f) => f.id !== id);
  },
  getAuditLogs: () => [...auditLogs],
  addAuditLog: (log: Omit<AuditLog, "id">) => {
    const newLog: AuditLog = { ...log, id: genId("log") };
    auditLogs.push(newLog);
    return newLog;
  },
  getLenders: () => [...lenders],
  getSentEmails: () => [...sentEmails],
  addSentEmail: (email: Omit<SentEmail, "id">) => {
    const newEmail: SentEmail = { ...email, id: genId("email") };
    sentEmails.push(newEmail);
    return newEmail;
  },
  createUser: (user: Omit<User, "id" | "createdAt">) => {
    const newUser: User = { ...user, id: genId("user"), createdAt: new Date().toISOString() };
    demoUsers.push(newUser);
    return newUser;
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const idx = demoUsers.findIndex((u) => u.id === id);
    if (idx !== -1) {
      demoUsers[idx] = { ...demoUsers[idx], ...updates };
      return demoUsers[idx];
    }
    return null;
  },
  deleteUser: (id: string) => {
    demoUsers = demoUsers.filter((u) => u.id !== id);
  },
};

export function getCurrentUser(): User | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("sr_current_user");
    if (stored) {
      try {
        return JSON.parse(stored) as User;
      } catch {
        return null;
      }
    }
  }
  return currentUser;
}

export function setCurrentUser(user: User | null) {
  currentUser = user;
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem("sr_current_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("sr_current_user");
    }
  }
}

export function getUserByUsername(username: string): User | undefined {
  return demoUsers.find((u) => u.username === username);
}

export function createLender(data: { name: string }): Lender {
  const lender: Lender = { id: genId("lender"), name: data.name };
  lenders.push(lender);
  return lender;
}

export function updateLender(id: string, data: Partial<Lender>): Lender | null {
  const idx = lenders.findIndex((l) => l.id === id);
  if (idx !== -1) {
    lenders[idx] = { ...lenders[idx], ...data };
    return lenders[idx];
  }
  return null;
}

export function deleteLender(id: string) {
  lenders = lenders.filter((l) => l.id !== id);
}

export { dataService };