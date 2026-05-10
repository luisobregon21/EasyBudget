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

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.parse(data);

  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.email))
    .limit(1);

  if (existing) throw new Error("An account with this email already exists");

  const hashed = await bcrypt.hash(parsed.password, 12);

  const [user] = await db
    .insert(users)
    .values({ name: parsed.name, email: parsed.email, password: hashed })
    .returning({ id: users.id, email: users.email });

  return user;
}
