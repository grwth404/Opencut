import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function getWaitlistCount() {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist);
    return result[0]?.count || 0;
  } catch (error) {
    console.error("Failed to fetch waitlist count:", error);
    return 0;
  }
}
