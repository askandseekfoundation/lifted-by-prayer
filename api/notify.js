const NOTIFY_EMAIL = "info@askandseekfoundation.org";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    const { name, category, request } = req.body;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Lifted by Prayer <notifications@send.askandseekfoundation.org>",
        to: [NOTIFY_EMAIL],
        subject: `🙏 New Prayer Request — ${category}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FFF8F0; padding: 32px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #3D2B2B; font-size: 24px; font-weight: 400; margin: 0;">New Prayer Request</h1>
              <p style="color: #9B8585; font-size: 13px; letter-spacing: 2px; margin-top: 4px;">LIFTED BY PRAYER</p>
            </div>
            
            <div style="background-color: #FFFFFF; border-radius: 12px; padding: 24px; border: 1px solid #FCEEF2;">
              <p style="color: #9B8585; font-size: 13px; margin: 0 0 4px;">From</p>
              <p style="color: #3D2B2B; font-size: 16px; font-weight: bold; margin: 0 0 16px;">${name || "Anonymous"}</p>
              
              <p style="color: #9B8585; font-size: 13px; margin: 0 0 4px;">Category</p>
              <p style="color: #E8899F; font-size: 14px; margin: 0 0 16px;">${category}</p>
              
              <p style="color: #9B8585; font-size: 13px; margin: 0 0 4px;">Prayer Request</p>
              <p style="color: #6B5252; font-size: 15px; line-height: 1.7; margin: 0; font-style: italic;">"${request}"</p>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
              <a href="https://liftedbyprayer.org" style="display: inline-block; background-color: #F4A7BB; color: #FFFFFF; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-family: Georgia, serif; font-size: 14px;">View on Prayer Wall</a>
            </div>
            
            <p style="text-align: center; color: #9B8585; font-size: 11px; margin-top: 24px;">
              Lifted by Prayer · A Ministry of Ask & Seek Foundation<br/>
              info@askandseekfoundation.org
            </p>
          </div>
        `,
      }),
    });

    const data = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", data);
      return res.status(500).json({ error: "Failed to send email" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
