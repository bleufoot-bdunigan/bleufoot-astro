const ALLOWED_SERVICES = new Set([
  "Managed Technology Services",
  "Strategic Technology Consulting",
  "Cloud & Infrastructure Management",
  "Network Services",
  "Cybersecurity Services",
  "General Technology Support"
]);

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    /*
     * Verify that the required Cloudflare environment variables exist.
     * The names of missing variables are written only to the server log.
     */
    const requiredEnvironmentVariables = [
      "TURNSTILE_SECRET_KEY",
      "RESEND_API_KEY",
      "QUOTE_FROM_EMAIL",
      "QUOTE_TO_EMAIL"
    ];

    for (const variableName of requiredEnvironmentVariables) {
      if (!env[variableName]) {
        console.error(
          `Missing required environment variable: ${variableName}`
        );

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

    /*
     * Required-field validation.
     */
    if (!name || !email || !service || !message) {
      return htmlResponse(
        "Please complete all required fields and try again.",
        400
      );
    }

    /*
     * Email validation.
     */
    if (!isValidEmail(email)) {
      return htmlResponse(
        "Please enter a valid email address.",
        400
      );
    }

    /*
     * Ensure that the submitted service is one of the choices
     * provided by the website.
     */
    if (!ALLOWED_SERVICES.has(service)) {
      return htmlResponse(
        "Please select a valid service.",
        400
      );
    }

    /*
     * Prevent excessively large submissions.
     */
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

    /*
     * Validate the Cloudflare Turnstile response.
     */
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

    /*
     * Create the plain-text email sent through Resend.
     */
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

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
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
      }
    );

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

    /*
     * Redirect successful submissions to the existing thank-you page.
     */
    return Response.redirect(
      new URL("/thank-you", request.url),
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

/*
 * Prevent the function URL from being opened directly through GET.
 */
export async function onRequestGet() {
  return htmlResponse(
    "This page only accepts form submissions.",
    405
  );
}

/*
 * Clean fields that should remain on one line.
 */
function cleanSingleLine(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/[<>]/g, "")
    .replace(/[\r\n]+/g, " ");
}

/*
 * Clean the message while preserving line breaks.
 */
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

/*
 * Verify the visitor's Cloudflare Turnstile token.
 */
async function verifyTurnstile(token, secret, remoteip) {
  if (!token || !secret) {
    return { success: false };
  }

  try {
    const formData = new FormData();

    formData.append("secret", secret);
    formData.append("response", token);

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

/*
 * Escape text before placing it in an HTML response.
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
 * Display validation and submission errors using the existing
 * Bleufoot stylesheet, cards, buttons, logo, and page colors.
 */
function htmlResponse(message, status = 200) {
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

  <link
    rel="icon"
    href="/assets/img/favicon.ico"
    sizes="any"
  >
  <link
    rel="icon"
    href="/assets/img/favicon.svg"
    type="image/svg+xml"
  >
  <link
    rel="apple-touch-icon"
    href="/assets/img/apple-touch-icon.png"
  >
  <link
    rel="manifest"
    href="/site.webmanifest"
  >
  <link
    rel="stylesheet"
    href="/assets/css/styles.css"
  >
</head>

<body>
  <header class="topbar">
    <div class="container nav">
      <a
        class="logo-link"
        href="/index.html"
        aria-label="Bleufoot Solutions home"
      >
        <img
          class="logo"
          src="/assets/img/logo.svg"
          alt="Bleufoot Solutions"
        >
      </a>
    </div>
  </header>

  <main class="section section-soft">
    <div class="container">
      <div
        class="card"
        style="max-width:760px; margin:40px auto;"
      >
        <div class="kicker">
          Message status
        </div>

        <h1 style="font-size:clamp(34px,5vw,52px);">
          We could not complete your request.
        </h1>

        <p style="font-size:17px;">
          ${safeMessage}
        </p>

        <div class="hero-actions">
          <a
            class="btn btn-primary"
            href="/quote-request.html"
          >
            Return to Request Form →
          </a>

          <a
            class="btn btn-outline-dark"
            href="/contact.html"
          >
            View Contact Information
          </a>
        </div>
      </div>
    </div>
  </main>

  <footer class="footer">
    <div class="container footer-bottom">
      <span>
        © 2026 Bleufoot Solutions. All rights reserved.
      </span>

      <span>
        Austin &amp; Central Texas
      </span>
    </div>
  </footer>
</body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}