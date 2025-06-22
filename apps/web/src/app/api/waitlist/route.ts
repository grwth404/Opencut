import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { waitlistRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit check
  const identifier = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await waitlistRateLimit.limit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email.toLowerCase()))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Add to waitlist
    await db.insert(waitlist).values({
      id: nanoid(),
      email: email.toLowerCase(),
    });

    return NextResponse.json(
      { message: "Successfully joined waitlist!" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
