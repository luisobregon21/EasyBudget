import { NextRequest, NextResponse } from "next/server";
import { fetchRateForCurrency } from "@/lib/exchange-rate";
import { auth } from "@/lib/auth/config";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currency = req.nextUrl.searchParams.get("currency") ?? "USD";
  const rate = await fetchRateForCurrency(currency);
  return NextResponse.json({ currency, rate });
}
