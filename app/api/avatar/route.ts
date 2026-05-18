import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { getDb, users } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function GET() {
  const user = await requireSession();
  const db = getDb();

  const [row] = await db.select({ image: users.image }).from(users).where(eq(users.id, user.id!)).limit(1);
  if (!row?.image) return new NextResponse("Not found", { status: 404 });

  // image stores a full Blob URL; derive the pathname from it.
  const pathname = row.image.split("blob.vercel-storage.com/")[1]?.split("?")[0];
  if (!pathname) return new NextResponse("Not found", { status: 404 });

  const result = await get(pathname, { access: "private" });
  if (!result?.stream) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
