import type { NextApiRequest, NextApiResponse } from "next";
import { sendSMS } from "@/lib/sms-service";

type ResponseData = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: `Method ${req.method} Not Allowed` });
  }

  // Verify API key for external access
  const apiKey = req.headers["x-api-key"] as string;
  const expectedKey = process.env.N8N_API_KEY || "";

  if (apiKey && expectedKey && apiKey !== expectedKey) {
    return res.status(401).json({ success: false, error: "Invalid API key" });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ success: false, error: "Missing required fields: to, message" });
  }

  // Basic phone number validation
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  if (!phoneRegex.test(to.replace(/[\s\-\(\)]/g, ""))) {
    return res.status(400).json({ success: false, error: "Invalid phone number format" });
  }

  if (message.length > 1600) {
    return res.status(400).json({ success: false, error: "Message too long (max 1600 characters)" });
  }

  try {
    const result = await sendSMS({
      to: to.trim(),
      message: message.trim(),
    });

    if (result.success) {
      return res.status(200).json({ success: true, messageId: result.messageId });
    } else {
      return res.status(502).json({ success: false, error: result.error || "Failed to send SMS" });
    }
  } catch (error) {
    console.error("[SMS API] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
