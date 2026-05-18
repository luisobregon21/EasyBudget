import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { getDb, cardPayments } from "@/lib/db";
import { requireSession } from "@/lib/auth/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isFinite(id)) return new NextResponse("Bad request", { status: 400 });

  const user = await requireSession();
  const db = getDb();

  const [row] = await db
    .select({ pathname: cardPayments.receiptPathname })
    .from(cardPayments)
    .where(and(eq(cardPayments.id, id), eq(cardPayments.userId, user.id!)))
    .limit(1);

  if (!row?.pathname) return new NextResponse("Not found", { status: 404 });

  const result = await get(row.pathname, { access: "private" });
  if (!result?.stream) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(result.stream, {
    status: 200,
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
