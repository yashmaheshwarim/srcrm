import type { NextApiRequest, NextApiResponse } from "next";
import { dataService } from "@/lib/data-service";
import { generateDocumentChecklist } from "@/lib/document-template";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method === "GET") {
    const applications = dataService.getLoanApplications();
    return res.status(200).json({ success: true, data: applications });
  }

  if (req.method === "POST") {
    const { customerId, customerName, mobileNumber, loanCategory, lender, requestedAmount, assignedTo, notes, hasCoApplicant } = req.body;

    if (!loanCategory || !requestedAmount) {
      return res.status(400).json({ success: false, error: "Missing required fields: loanCategory, requestedAmount" });
    }

    const docs = generateDocumentChecklist(loanCategory as "Business Loan" | "Salaried Loan", hasCoApplicant || false);

    const newApp = dataService.createLoanApplication({
      customerId: customerId || "",
      customerName: customerName || "",
      mobileNumber: mobileNumber || "",
      loanCategory,
      lender: lender || "",
      requestedAmount,
      applicationNumber: `API-${Date.now().toString(36).toUpperCase()}`,
      assignedTo: assignedTo || "",
      status: "draft",
      documents: docs,
      notes: notes || "",
      hasCoApplicant: hasCoApplicant || false,
    });

    return res.status(201).json({ success: true, data: newApp });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
