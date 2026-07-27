const ALLOWED_SERVICES = new Set([
  "Managed Technology Services",
  "Strategic Technology Consulting",
  "Cloud & Infrastructure Management",
  "Network Services",
  "Cybersecurity Services",
  "General Technology Support"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "bleufoot.com") {
      url.hostname = "www.bleufoot.com";

      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === "/api/quote" || url.pathname === "/api/quote/") {
      if (request.method === "POST") {
        return handleQuoteSubmission(request, env);
      }

      if (request.method === "GET") {
        return htmlResponse(
          "This page only accepts form submissions.",
          405,
          { Allow: "POST" }
        );
      }

      return htmlResponse(
        "This page only accepts form submissions.",
        405,
        { Allow: "POST" }
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return new Response("API route not found.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleQuoteSubmission(request, env) {
  try {
    const requiredEnvironmentVariables = [
      "TURNSTILE_SECRET_KEY",
      "RESEND_API_KEY",
      "QUOTE_FROM_EMAIL",
      "QUOTE_TO_EMAIL"
    ];

    for (const variableName of requiredEnvironmentVariables) {
      if (!env[variableName]) {
        console.error(`Missing required environment variable: ${variableName}`);

        return htmlResponse(
          "The contact service is temporarily unavailable. Please email info@bleufoot.com directly.",
          500
        );
      }
    }

    const formData = await request.formData();

    const name = cleanSingleLine(formData.get("name"));
    const company = cleanSingleLine(formData.get("company"));
    const email = cleanSingleLine(formData.get("email"));
    const phone = cleanSingleLine(formData.get("phone"));
    const service = cleanSingleLine(formData.get("service"));
    const message = cleanMultiline(formData.get("message"));
    const turnstileToken = formData.get("cf-turnstile-response");

    if (!name || !email || !service || !message) {
      return htmlResponse(
        "Please complete all required fields and try again.",
        400
      );
    }

    if (!isValidEmail(email)) {
      return htmlResponse("Please enter a valid email address.", 400);
    }

    if (!ALLOWED_SERVICES.has(service)) {
      return htmlResponse("Please select a valid service.", 400);
    }

    if (
      name.length > 100 ||
      company.length > 150 ||
      email.length > 254 ||
      phone.length > 40 ||
      service.length > 100 ||
      message.length > 5000
    ) {
      return htmlResponse(
        "One or more fields are too long. Please shorten your response and try again.",
        400
      );
    }

    const turnstileValid = await verifyTurnstile(
      turnstileToken,
      env.TURNSTILE_SECRET_KEY,
      request.headers.get("CF-Connecting-IP")
    );

    if (!turnstileValid.success) {
      return htmlResponse(
        "Security check failed. Please return to the form and try again.",
        403
      );
    }

    const emailBody = `
New website request from Bleufoot.com

Name: ${name}
Company: ${company || "Not provided"}
Email: ${email}
Phone: ${phone || "Not provided"}
Service Interest: ${service}

Message:
${message}
`.trim();

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.QUOTE_FROM_EMAIL,
        to: [env.QUOTE_TO_EMAIL],
        reply_to: email,
        subject: `New Bleufoot website request from ${name}`,
        text: emailBody
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();

      console.error(
        `Resend returned HTTP ${resendResponse.status}:`,
        errorText
      );

      return htmlResponse(
        "Your message could not be sent. Please email info@bleufoot.com directly.",
        500
      );
    }

    return Response.redirect(
      new URL("/thank-you", request.url).toString(),
      303
    );
  } catch (error) {
    console.error("Quote form processing error:", error);

    return htmlResponse(
      "Something went wrong while processing your request. Please email info@bleufoot.com directly.",
      500
    );
  }
}

function cleanSingleLine(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/[\r\n]+/g, " ");
}

function cleanMultiline(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/[<>]/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, secret, remoteip) {
  if (!token || !secret) {
    return { success: false };
  }

  try {
    const formData = new FormData();

    formData.append("secret", secret);
    formData.append("response", String(token));

    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      console.error(
        `Turnstile verification returned HTTP ${response.status}`
      );

      return { success: false };
    }

    const outcome = await response.json();

    if (outcome.success !== true) {
      console.error(
        "Turnstile verification failed:",
        outcome["error-codes"] || []
      );
    }

    return {
      success: outcome.success === true
    };
  } catch (error) {
    console.error("Turnstile verification error:", error);

    return { success: false };
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function htmlResponse(message, status = 200, extraHeaders = {}) {
  const safeMessage = escapeHtml(message);

  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Message Status | Bleufoot Solutions</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, follow">
  <meta name="theme-color" content="#06192d">

  <link rel="icon" href="/assets/img/favicon.ico" sizes="any">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
  <header class="topbar">
    <div class="container nav">
      <a class="logo-link" href="/" aria-label="Bleufoot Solutions home">
        <img class="logo" src="/assets/img/logo.svg" alt="Bleufoot Solutions">
      </a>
    </div>
  </header>

  <main class="section section-soft">
    <div class="container">
      <div class="card" style="max-width:760px; margin:40px auto;">
        <div class="kicker">Message status</div>

        <h1 style="font-size:clamp(34px,5vw,52px);">
          We could not complete your request.
        </h1>

        <p style="font-size:17px;">${safeMessage}</p>

        <div class="hero-actions">
          <a class="btn btn-primary" href="/quote-request">
            Return to Request Form →
          </a>

          <a class="btn btn-outline-dark" href="/contact">
            View Contact Information
          </a>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container footer-bottom">
      <span>© 2026 Bleufoot Solutions. All rights reserved.</span>
      <span>Austin &amp; Central Texas</span>
    </div>
  </footer>
</body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...extraHeaders
      }
    }
  );
}
