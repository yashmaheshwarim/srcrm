import type { NextApiRequest, NextApiResponse } from "next";
import { dataService } from "@/lib/data-service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method === "GET") {
    const leads = dataService.getLeads();
    return res.status(200).json({ success: true, data: leads });
  }

  if (req.method === "POST") {
    const { customerName, mobileNumber, city, loanCategory, requiredAmount, leadSource, assignedTo, notes } = req.body;

    if (!customerName || !mobileNumber) {
      return res.status(400).json({ success: false, error: "Missing required fields: customerName, mobileNumber" });
    }

    const newLead = dataService.addLead({
      customerName,
      mobileNumber,
      city: city || "",
      loanCategory: loanCategory || "Business Loan",
      requiredAmount: requiredAmount || "",
      leadSource: leadSource || "API",
      assignedTo: assignedTo || "",
      status: "new",
      notes: notes || "",
    });

    return res.status(201).json({ success: true, data: newLead });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
