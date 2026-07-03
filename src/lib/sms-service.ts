/**
 * httpSMS SMS Service
 * 
 * Uses httpSMS (https://github.com/NdoleStudio/httpsms) to send SMS
 * through an Android phone gateway.
 * 
 * Setup:
 * 1. Install the httpSMS app on an Android phone
 * 2. Create an account at https://httpsms.com
 * 3. Get your API key and phone ID
 * 4. Set the environment variables:
 *    - HTTPSMS_API_KEY: Your httpSMS API key
 *    - HTTPSMS_PHONE_ID: Your registered Android phone ID
 *    - HTTPSMS_WEBHOOK_SECRET: Secret for verifying incoming webhooks
 */

interface SMSSendOptions {
  to: string;
  message: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SMSConfig {
  apiKey: string;
  phoneId: string;
  enabled: boolean;
}

function getConfig(): SMSConfig {
  return {
    apiKey: process.env.HTTPSMS_API_KEY || "",
    phoneId: process.env.HTTPSMS_PHONE_ID || "",
    enabled: !!(process.env.HTTPSMS_API_KEY && process.env.HTTPSMS_PHONE_ID),
  };
}

/**
 * Send an SMS via the httpSMS API
 * Uses the REST API at https://api.httpsms.com/v1/messages/send
 */
export async function sendSMS({ to, message }: SMSSendOptions): Promise<SMSResponse> {
  const config = getConfig();

  if (!config.enabled) {
    // Fallback: log the SMS and return success (for development/demo)
    console.log("[SMS] httpSMS not configured. Would send:", { to, message });
    return {
      success: true,
      messageId: `demo_${Date.now()}`,
    };
  }

  try {
    const response = await fetch("https://api.httpsms.com/v1/messages/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        from: config.phoneId,
        to,
        content: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        error: `httpSMS API error (${response.status}): ${errorData}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data?.data?.id || `sms_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown SMS error",
    };
  }
}

/**
 * Send bulk SMS to multiple recipients
 */
export async function sendBulkSMS(
  messages: SMSSendOptions[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const msg of messages) {
    try {
      const result = await sendSMS(msg);
      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    } catch (error) {
      failed++;
      errors.push(error instanceof Error ? error.message : "Unknown error");
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return { sent, failed, errors };
}

/**
 * Verify an incoming webhook from httpSMS
 * TODO: Implement HMAC verification in production
 */
export function verifyWebhookSignature(): boolean {
  return true;
}
