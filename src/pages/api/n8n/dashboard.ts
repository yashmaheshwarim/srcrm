import type { NextApiRequest, NextApiResponse } from "next";
import { dataService } from "@/lib/data-service";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const leads = dataService.getLeads();
  const customers = dataService.getCustomers();
  const applications = dataService.getLoanApplications();
  const followUps = dataService.getFollowUps();
  const users = dataService.getUsers();

  const today = new Date().toISOString().split("T")[0];

  const stats = {
    totalLeads: leads.length,
    totalCustomers: customers.length,
    totalApplications: applications.length,
    totalFollowUps: followUps.length,
    totalUsers: users.length,
    pendingFollowUps: followUps.filter((f) => f.status === "pending").length,
    overdueFollowUps: followUps.filter((f) => f.status === "pending" && f.nextFollowUpDate < today).length,
    todayFollowUps: followUps.filter((f) => f.nextFollowUpDate === today && f.status === "pending").length,
    approvedApplications: applications.filter((a) => a.status === "approved").length,
    disbursedApplications: applications.filter((a) => a.status === "disbursed").length,
    rejectedApplications: applications.filter((a) => a.status === "rejected").length,
    documentsPending: applications.filter((a) => a.status === "documents_pending").length,
    leadsByStatus: {} as Record<string, number>,
    applicationsByStatus: {} as Record<string, number>,
  };

  leads.forEach((l) => {
    stats.leadsByStatus[l.status] = (stats.leadsByStatus[l.status] || 0) + 1;
  });

  applications.forEach((a) => {
    stats.applicationsByStatus[a.status] = (stats.applicationsByStatus[a.status] || 0) + 1;
  });

  return res.status(200).json({ success: true, data: stats });
}
