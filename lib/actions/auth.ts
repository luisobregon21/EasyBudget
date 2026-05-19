"use server";

import { getDb, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterInput = z.infer<typeof registerSchema>;

export type RegisterResult =
  | { success: true; user: { id: string; email: string } }
  | { success: false; message: string };

export async function registerUser(data: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const db = getDb();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (existing) {
      return { success: false, message: "An account with this email already exists" };
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12);

    const [user] = await db
      .insert(users)
      .values({ name: parsed.data.name, email: parsed.data.email, password: hashed })
      .returning({ id: users.id, email: users.email });

    return { success: true, user };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Registration failed" };
  }
}
