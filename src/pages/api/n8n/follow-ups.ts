import type { NextApiRequest, NextApiResponse } from "next";
import { dataService } from "@/lib/data-service";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method === "GET") {
    const allFollowUps = await dataService.getFollowUps();
    const followUps = allFollowUps.filter((f) => f.status === "pending");
    return res.status(200).json({ success: true, data: followUps });
  }

  if (req.method === "POST") {
    const { customerName, mobileNumber, type, notes, nextFollowUpDate, nextFollowUpTime, priority, assignedTo, leadId, applicationId } = req.body;

    if (!customerName || !mobileNumber || !nextFollowUpDate || !nextFollowUpTime) {
      return res.status(400).json({ success: false, error: "Missing required fields: customerName, mobileNumber, nextFollowUpDate, nextFollowUpTime" });
    }

    const newFollowUp = await dataService.createFollowUp({
      customerName,
      mobileNumber,
      leadId: leadId || null,
      applicationId: applicationId || null,
      type: type || "Call",
      notes: notes || "",
      nextFollowUpDate,
      nextFollowUpTime,
      priority: priority || "medium",
      status: "pending",
      assignedTo: assignedTo || "",
    });

    return res.status(201).json({ success: true, data: newFollowUp });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
