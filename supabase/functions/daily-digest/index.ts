import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SMTP_URL = Deno.env.get("SMTP_URL");
    const ENABLE_DIGEST = Deno.env.get("VITE_ENABLE_EMAIL_DIGEST") === "true";
    const EMAIL_FROM = Deno.env.get("VITE_EMAIL_FROM") || "noreply@ecoquest.app";
    const DIGEST_TO = Deno.env.get("VITE_DIGEST_TO") || "";

    if (!ENABLE_DIGEST) {
      return new Response(JSON.stringify({ message: "Email digest disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO: Query aggregated scoring for yesterday (use trip TZ)
    const summary = {
      date: new Date().toISOString().slice(0, 10),
      topChanges: [],
      newSpecies: 0,
      rarestObs: null,
      trophyWinners: [],
    };

    const emailBody = composeDigestCopy(summary);

    // Send via Resend or SMTP
    if (RESEND_API_KEY) {
      const Resend = (await import("https://esm.sh/resend@4.0.0")).Resend;
      const resend = new Resend(RESEND_API_KEY);
      const recipients = DIGEST_TO.split(",").map(e => e.trim()).filter(Boolean);
      if (recipients.length === 0) {
        console.log("No recipients configured, dry-run");
        return new Response(JSON.stringify({ message: "Dry-run: no recipients" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await resend.emails.send({
        from: EMAIL_FROM,
        to: recipients,
        subject: `EcoQuest Daily Digest - ${summary.date}`,
        html: emailBody,
      });
      console.log("Digest sent via Resend");
    } else if (SMTP_URL) {
      // TODO: Implement SMTP sending
      console.log("SMTP sending not yet implemented");
    } else {
      console.log("Dry-run: no email provider configured");
      console.log(emailBody);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in daily-digest:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function composeDigestCopy(summary: any): string {
  // TODO: Optionally use OpenAI/Anthropic for playful copy
  return `
    <html>
      <body>
        <h1>EcoQuest Daily Digest - ${summary.date}</h1>
        <p>Here's what happened yesterday:</p>
        <ul>
          <li>${summary.newSpecies} new species observed</li>
          <li>Trophy winners: ${summary.trophyWinners.join(', ') || 'None yet'}</li>
        </ul>
        <p>Keep exploring!</p>
      </body>
    </html>
  `;
}
