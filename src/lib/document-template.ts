import type { DocumentItem } from "@/types";

export const BUSINESS_LOAN_DOCS = [
  "Passport Size Photo",
  "PAN Card",
  "Aadhaar Card",
  "Light Bill",
  "UDYAM Certificate",
  "GST Certificate",
  "3 Years ITR",
  "1 Year Bank Statement",
];

export const SALARIED_LOAN_DOCS = [
  "Passport Size Photo",
  "PAN Card",
  "Aadhaar Card",
  "Light Bill",
  "6 Months Salary Slips",
  "Joining Letter",
  "3 Years Form 16",
  "3 Years ITR",
  "1 Year Bank Statement",
];

export const CO_APPLICANT_DOCS = [
  "Passport Size Photo",
  "PAN Card",
  "Aadhaar Card",
];

export function generateDocumentChecklist(
  category: string,
  hasCoApplicant: boolean
): DocumentItem[] {
  const normalized = category.toLowerCase().replace(/\s+/g, "_");
  const docs = normalized === "business_loan" ? BUSINESS_LOAN_DOCS : SALARIED_LOAN_DOCS;
  const primaryDocs: DocumentItem[] = docs.map((name, idx) => ({
    id: `doc_primary_${idx}`,
    name,
    status: "pending",
    remarks: "",
    required: true,
    isCoApplicant: false,
  }));

  if (!hasCoApplicant) return primaryDocs;

  const coAppDocs: DocumentItem[] = CO_APPLICANT_DOCS.map((name, idx) => ({
    id: `doc_co_${idx}`,
    name,
    status: "pending",
    remarks: "",
    required: true,
    isCoApplicant: true,
  }));

  return [...primaryDocs, ...coAppDocs];
}

export function areAllDocumentsVerified(documents: DocumentItem[]): boolean {
  const requiredDocs = documents.filter((d) => d.required && !d.isCoApplicant);
  return requiredDocs.length > 0 && requiredDocs.every((d) => d.status === "verified");
}

export function getDocumentProgress(documents: DocumentItem[]): { verified: number; total: number } {
  const requiredDocs = documents.filter((d) => d.required && !d.isCoApplicant);
  const verified = requiredDocs.filter((d) => d.status === "verified").length;
  return { verified, total: requiredDocs.length };
}