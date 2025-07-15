import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@opencut/db";
import { waitlist } from "@opencut/db/schema";
import { nanoid } from "nanoid";
import { waitlistRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { env } from "@/env";
import { cookies } from "next/headers";
import crypto from "crypto";

const waitlistSchema = z.object({
  email: z.string().email("Invalid email format").min(1, "Email is required"),
});

const CSRF_TOKEN_NAME = "waitlist-csrf";
const TOKEN_EXPIRY = 60 * 60 * 1000;

function validateBrowserRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent") || "";
  const secFetchSite = request.headers.get("sec-fetch-site");
  const secFetchMode = request.headers.get("sec-fetch-mode");
  const secFetchDest = request.headers.get("sec-fetch-dest");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (env.NODE_ENV === "development") {
    console.log("=== Validating Browser Request ===");
    console.log("Origin:", origin);
    console.log("Referer:", referer);
    console.log("User-Agent:", userAgent);
    console.log("Sec-Fetch-Site:", secFetchSite);
    console.log("Sec-Fetch-Mode:", secFetchMode);
    console.log("Sec-Fetch-Dest:", secFetchDest);
    console.log("Content-Type:", contentType);
    console.log("Accept:", accept);
  }

  const allowedOrigins =
    env.NODE_ENV === "development" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : ["https://opencut.app", "https://www.opencut.app"];

  if (!origin || !allowedOrigins.includes(origin)) {
    console.log("Failed: Invalid origin");
    return false;
  }

  if (!referer || !referer.startsWith(origin)) {
    console.log("Failed: Invalid referer");
    return false;
  }

  const suspiciousUserAgents = [
    "curl",
    "wget",
    "postman",
    "insomnia",
    "thunder client",
    "httpie",
    "python-requests",
    "node-fetch",
    "axios",
    "scrapy",
    "httpclient",
    "okhttp",
    "libwww-perl",
    "python-urllib",
    "go-http-client",
    "java/",
    "apache-httpclient",
  ];

  const lowerUserAgent = userAgent.toLowerCase();
  if (!userAgent || suspiciousUserAgents.some((agent) => lowerUserAgent.includes(agent))) {
    console.log("Failed: Suspicious user agent");
    return false;
  }

  const hasBrowserIndicators =
    lowerUserAgent.includes("mozilla/") ||
    lowerUserAgent.includes("chrome/") ||
    lowerUserAgent.includes("safari/") ||
    lowerUserAgent.includes("firefox/") ||
    lowerUserAgent.includes("edge/");

  if (!hasBrowserIndicators) {
    console.log("Failed: No browser indicators in user agent");
    return false;
  }

  if (secFetchSite && secFetchSite !== "same-origin") {
    console.log("Failed: Invalid Sec-Fetch-Site:", secFetchSite);
    return false;
  }

  if (secFetchMode && secFetchMode !== "cors") {
    console.log("Failed: Invalid Sec-Fetch-Mode:", secFetchMode);
    return false;
  }

  if (secFetchDest && secFetchDest !== "empty") {
    console.log("Failed: Invalid Sec-Fetch-Dest:", secFetchDest);
    return false;
  }

  if (!contentType || !contentType.includes("application/json")) {
    console.log("Failed: Invalid Content-Type");
    return false;
  }

  if (!accept || (!accept.includes("application/json") && !accept.includes("*/*"))) {
    console.log("Failed: Invalid Accept header");
    return false;
  }

  console.log("Browser validation passed!");
  return true;
}

async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const clientToken = request.headers.get("x-csrf-token");
  if (!clientToken) return false;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(CSRF_TOKEN_NAME)?.value;
  if (!cookieValue) return false;

  const [token, timestamp, signature] = cookieValue.split(":");
  if (!token || !timestamp || !signature) return false;

  if (clientToken !== token) return false;

  const now = Date.now();
  const tokenTime = parseInt(timestamp);
  if (now - tokenTime > TOKEN_EXPIRY) return false;

  const expectedSignature = crypto
    .createHmac("sha256", env.BETTER_AUTH_SECRET || "fallback-secret")
    .update(`${token}:${timestamp}`)
    .digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  const identifier = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await waitlistRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  if (!validateBrowserRequest(request)) {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 1000));

    return NextResponse.json({ error: "Invalid request" }, { status: 403 });
  }

  const isValidToken = await validateCSRFToken(request);
  if (!isValidToken) {
    return NextResponse.json({ error: "Invalid security token" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = waitlistSchema.parse(body);

    const existingEmail = await db.select().from(waitlist).where(eq(waitlist.email, email.toLowerCase())).limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    await db.insert(waitlist).values({
      id: nanoid(),
      email: email.toLowerCase(),
    });

    return NextResponse.json({ message: "Successfully joined waitlist!" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    console.error("Waitlist signup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
