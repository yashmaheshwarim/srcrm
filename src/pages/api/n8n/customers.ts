import type { NextApiRequest, NextApiResponse } from "next";
import { dataService } from "@/lib/data-service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method === "GET") {
    const customers = dataService.getCustomers();
    return res.status(200).json({ success: true, data: customers });
  }

  if (req.method === "POST") {
    const { fullName, mobileNumber, address, panNumber, aadhaarNumber, employmentType, monthlyIncome, existingLiabilities, assignedTo, loanCategory, notes } = req.body;

    if (!fullName || !mobileNumber) {
      return res.status(400).json({ success: false, error: "Missing required fields: fullName, mobileNumber" });
    }

    const newCustomer = dataService.addCustomer({
      fullName,
      mobileNumber,
      address: address || "",
      panNumber: panNumber || "",
      aadhaarNumber: aadhaarNumber || "",
      employmentType: employmentType || "Salaried",
      monthlyIncome: monthlyIncome || "",
      existingLiabilities: existingLiabilities || "",
      notes: notes || "",
      assignedTo: assignedTo || "",
      loanCategory: (loanCategory as "Business Loan" | "Salaried Loan") || undefined,
      hasCoApplicant: false,
      documents: [],
    });

    return res.status(201).json({ success: true, data: newCustomer });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
