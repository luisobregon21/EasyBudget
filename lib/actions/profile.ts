"use server";

import { getDb, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import bcrypt from "bcryptjs";
import { requireSession } from "@/lib/auth/session";

export async function updateProfileName(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const name = ((formData.get("name") as string) || "").trim();
    if (!name) return { success: false, message: "Name cannot be empty." };
    if (name.length > 80) return { success: false, message: "Name is too long." };

    await db.update(users).set({ name }).where(eq(users.id, user.id!));
    revalidatePath("/settings");
    return { success: true, message: "Name updated." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update name." };
  }
}

export async function updateProfilePassword(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();

    const current = String(formData.get("currentPassword") ?? "");
    const next = String(formData.get("newPassword") ?? "");
    const confirm = String(formData.get("confirmPassword") ?? "");

    if (!current || !next) return { success: false, message: "Both fields are required." };
    if (next.length < 8) return { success: false, message: "New password must be at least 8 characters." };
    if (next !== confirm) return { success: false, message: "New passwords don't match." };
    if (next === current) return { success: false, message: "New password must differ from the current one." };

    const [row] = await db.select({ password: users.password }).from(users).where(eq(users.id, user.id!)).limit(1);
    if (!row?.password) return { success: false, message: "Password sign-in is not set up for this account." };

    const ok = await bcrypt.compare(current, row.password);
    if (!ok) return { success: false, message: "Current password is incorrect." };

    const hashed = await bcrypt.hash(next, 12);
    await db.update(users).set({ password: hashed }).where(eq(users.id, user.id!));
    revalidatePath("/settings");
    return { success: true, message: "Password updated." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update password." };
  }
}

export async function updateProfileAvatar(
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const userId = user.id!;
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, message: "Pick an image first." };
    }

    // Find existing avatar pathname (if any) so we can delete it after replacement
    const [existing] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId)).limit(1);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const pathname = `avatars/${userId}/${Date.now()}.${ext}`;
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: file.type || undefined,
    });

    await db.update(users).set({ image: blob.url }).where(eq(users.id, userId));

    // Best-effort cleanup of the previous avatar in Blob
    if (existing?.image && existing.image.includes("blob.vercel-storage.com")) {
      const prevPathname = existing.image.split("blob.vercel-storage.com/")[1]?.split("?")[0];
      if (prevPathname) await del(prevPathname).catch(() => {});
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, message: "Avatar updated." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update avatar." };
  }
}

export async function removeProfileAvatar(): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const userId = user.id!;
    const [existing] = await db.select({ image: users.image }).from(users).where(eq(users.id, userId)).limit(1);
    if (existing?.image && existing.image.includes("blob.vercel-storage.com")) {
      const prevPathname = existing.image.split("blob.vercel-storage.com/")[1]?.split("?")[0];
      if (prevPathname) await del(prevPathname).catch(() => {});
    }
    await db.update(users).set({ image: null }).where(eq(users.id, userId));
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, message: "Avatar removed." };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove avatar." };
  }
}
