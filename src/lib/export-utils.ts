function toCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const headerLine = headers.map(escape).join(",");
  const rowLines = rows.map((row) => row.map(escape).join(","));
  return [headerLine, ...rowLines].join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(headers: string[], rows: string[][], filename: string) {
  const csv = toCSV(headers, rows);
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
}

export function exportToPDF(title: string, headers: string[], rows: string[][], filename: string) {
  const lines: string[] = [];
  lines.push(title);
  lines.push("=".repeat(title.length));
  lines.push("");
  lines.push(headers.join("  |  "));
  lines.push("-".repeat(headers.join("  |  ").length));
  rows.forEach((row) => {
    lines.push(row.join("  |  "));
  });
  lines.push("");
  lines.push(`Exported on: ${new Date().toLocaleString()}`);
  const text = lines.join("\n");
  downloadFile(text, filename, "text/plain");
}

export function leadsToExportRows(leads: import("@/types").Lead[]): [string[], string[][]] {
  const headers = ["Customer", "Mobile", "City", "Category", "Amount", "CIBIL", "Status", "Source", "Assigned To", "Created At"];
  const rows = leads.map((l) => [
    l.customerName,
    l.mobileNumber,
    l.city,
    l.loanCategory,
    l.requiredAmount || "",
    l.cibilScore || "",
    l.status,
    l.leadSource,
    l.assignedTo,
    l.createdAt,
  ]);
  return [headers, rows];
}

export function customersToExportRows(customers: import("@/types").Customer[]): [string[], string[][]] {
  const headers = ["Name", "Mobile", "Address", "PAN", "Aadhaar", "Employment", "Income", "Loan Category", "CIBIL", "Property Address", "Scheme Name", "Date Added", "Docs Collected", "Assigned To", "Created At"];
  const rows = customers.map((c) => [
    c.fullName,
    c.mobileNumber,
    c.address,
    c.panNumber || "",
    c.aadhaarNumber || "",
    c.employmentType,
    c.monthlyIncome || "",
    c.loanCategory || "",
    c.cibilScore || "",
    c.propertyAddress || "",
    c.schemeName || "",
    c.dateAdded || "",
    `${c.documents?.filter((d) => d.status === "received" || d.status === "verified").length || 0}/${c.documents?.length || 0}`,
    c.assignedTo,
    c.createdAt,
  ]);
  return [headers, rows];
}

export function applicationsToExportRows(apps: import("@/types").LoanApplication[]): [string[], string[][]] {
  const headers = ["Customer Name", "Mobile", "Category", "Lender", "Requested Amount", "CIBIL", "Status", "Application #", "Approval Amount", "Disbursement Date", "Scheme Name", "Property Address", "Completion Status", "Assigned To", "Created At"];
  const rows = apps.map((a) => [
    a.customerName,
    a.mobileNumber,
    a.loanCategory,
    a.lender,
    String(a.requestedAmount),
    a.cibilScore || "",
    a.status,
    a.applicationNumber || "",
    String(a.approvalAmount ?? ""),
    a.disbursementDate || "",
    a.schemeName || "",
    a.propertyAddress || "",
    a.completionStatus || "",
    a.assignedTo,
    a.createdAt,
  ]);
  return [headers, rows];
}

export function followUpsToExportRows(followUps: import("@/types").FollowUp[]): [string[], string[][]] {
  const headers = ["Customer", "Mobile", "Type", "Priority", "Date", "Time", "Status", "Assigned To", "Notes"];
  const rows = followUps.map((f) => [
    f.customerName,
    f.mobileNumber,
    f.type,
    f.priority,
    f.nextFollowUpDate,
    f.nextFollowUpTime,
    f.status,
    f.assignedTo,
    f.notes,
  ]);
  return [headers, rows];
}