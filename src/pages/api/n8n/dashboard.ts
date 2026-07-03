/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseClient } from "@/lib/supabase";

// Simple in-memory cache
let cache: { data: any; expiry: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "sr-n8n-key-change-me";

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing X-API-Key header" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Return cached response if fresh
  if (cache && cache.expiry > Date.now()) {
    return res.status(200).json({ success: true, data: cache.data, cached: true });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ success: false, error: "Supabase not configured" });
  }

  try {
    // Use aggregate queries instead of fetching all rows
    const [
      { count: totalLeads },
      { count: totalCustomers },
      { count: totalApplications },
      { count: totalFollowUps },
      { count: totalUsers },
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("loan_applications").select("*", { count: "exact", head: true }),
      supabase.from("follow_ups").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
    ]);

    // Fetch minimal data for status breakdowns
    const [{ data: leadStatuses }, { data: appStatuses }, { data: followUpStatuses }] = await Promise.all([
      supabase.from("leads").select("status"),
      supabase.from("loan_applications").select("status"),
      supabase.from("follow_ups").select("status, next_follow_up_date"),
    ]);

    const today = new Date().toISOString().split("T")[0];

    const leadsByStatus: Record<string, number> = {};
    (leadStatuses || []).forEach((l: any) => {
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
    });

    const applicationsByStatus: Record<string, number> = {};
    let documentsPending = 0;
    let approvedApplications = 0;
    let disbursedApplications = 0;
    let rejectedApplications = 0;
    (appStatuses || []).forEach((a: any) => {
      applicationsByStatus[a.status] = (applicationsByStatus[a.status] || 0) + 1;
      if (a.status === "documents_pending") documentsPending++;
      if (a.status === "approved") approvedApplications++;
      if (a.status === "disbursed") disbursedApplications++;
      if (a.status === "rejected") rejectedApplications++;
    });

    let pendingFollowUps = 0;
    let overdueFollowUps = 0;
    let todayFollowUps = 0;
    (followUpStatuses || []).forEach((f: any) => {
      if (f.status === "pending") {
        pendingFollowUps++;
        if (f.next_follow_up_date < today) overdueFollowUps++;
        if (f.next_follow_up_date === today) todayFollowUps++;
      }
    });

    const stats = {
      totalLeads: totalLeads || 0,
      totalCustomers: totalCustomers || 0,
      totalApplications: totalApplications || 0,
      totalFollowUps: totalFollowUps || 0,
      totalUsers: totalUsers || 0,
      pendingFollowUps,
      overdueFollowUps,
      todayFollowUps,
      approvedApplications,
      disbursedApplications,
      rejectedApplications,
      documentsPending,
      leadsByStatus,
      applicationsByStatus,
    };

    // Cache the response
    cache = { data: stats, expiry: Date.now() + CACHE_TTL };

    return res.status(200).json({ success: true, data: stats, cached: false });
  } catch {
    return res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
  }
}

