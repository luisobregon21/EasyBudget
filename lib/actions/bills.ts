"use server";
import { getDb, bills, billPayments, creditCards, expenses } from "@/lib/db";
import { and, eq, asc, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { getEffectiveDueDay } from "@/lib/bill-dates";

export async function getUserBills() {
  const user = await requireSession();
  const db = getDb();
  const rows = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      quarterlyDates: bills.quarterlyDates,
      description: bills.description,
      type: bills.type,
      creditCardId: bills.creditCardId,
      creditCardName: creditCards.name,
      reminderDaysBefore: bills.reminderDaysBefore,
      active: bills.active,
    })
    .from(bills)
    .leftJoin(creditCards, eq(bills.creditCardId, creditCards.id))
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)))
    .orderBy(asc(bills.frequency), asc(bills.renewalMonth), asc(bills.renewalDay), asc(bills.dueDay));
  return rows;
}

export async function getBillById(billId: number) {
  const user = await requireSession();
  const db = getDb();
  const rows = await db.select().from(bills)
    .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUpcomingBills(daysAhead = 7) {
  const user = await requireSession();
  const db = getDb();
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth() + 1;

  const allBills = await db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      dueDay: bills.dueDay,
      frequency: bills.frequency,
      renewalMonth: bills.renewalMonth,
      renewalDay: bills.renewalDay,
      quarterlyDates: bills.quarterlyDates,
      type: bills.type,
    })
    .from(bills)
    .where(and(eq(bills.userId, user.id!), eq(bills.active, true)));

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  return allBills.filter((b) => {
    if (b.frequency === "quarterly") {
      if (!b.quarterlyDates) return false;
      const dates: { month: number; day: number }[] = JSON.parse(b.quarterlyDates);
      return dates.some(({ month, day }) => {
        if (month !== todayMonth) return false;
        const daysUntil = day - todayDay;
        return daysUntil >= 0 && daysUntil <= daysAhead;
      });
    }
    if (b.frequency === "yearly") {
      if (b.renewalMonth !== todayMonth) return false;
      const daysUntil = (b.renewalDay ?? 1) - todayDay;
      return daysUntil >= 0 && daysUntil <= daysAhead;
    }
    const daysUntil = b.dueDay >= todayDay
      ? b.dueDay - todayDay
      : daysInMonth - todayDay + b.dueDay;
    return daysUntil <= daysAhead;
  });
}

type QuarterlyDate = { month: number; day: number };

function parseBillFormData(formData: FormData) {
  const frequency = formData.get("frequency") as "monthly" | "yearly" | "quarterly";
  const type = formData.get("type") as "utility" | "subscription" | "credit_card" | "loan" | "other";
  const creditCardIdRaw = formData.get("creditCardId") as string;
  const creditCardId = creditCardIdRaw && creditCardIdRaw !== "none"
    ? parseInt(creditCardIdRaw)
    : null;

  let quarterlyDates: string | null = null;
  if (frequency === "quarterly") {
    const dates: QuarterlyDate[] = [1, 2, 3, 4].map((n) => ({
      month: parseInt(formData.get(`q${n}Month`) as string),
      day:   parseInt(formData.get(`q${n}Day`)   as string),
    }));
    quarterlyDates = JSON.stringify(dates);
  }

  return {
    name: (formData.get("name") as string).trim(),
    amount: parseFloat(formData.get("amount") as string),
    description: (formData.get("description") as string)?.trim() || null,
    frequency,
    dueDay: frequency === "monthly" ? parseInt(formData.get("dueDay") as string) : 1,
    renewalMonth: frequency === "yearly" ? parseInt(formData.get("renewalMonth") as string) : null,
    renewalDay:   frequency === "yearly" ? parseInt(formData.get("renewalDay")   as string) : null,
    quarterlyDates,
    type,
    creditCardId,
    reminderDaysBefore: parseInt((formData.get("reminderDaysBefore") as string) || "3"),
    // Only meaningful when a credit card is tied; harmless when not (will never trigger reconciliation).
    autoCharge: formData.get("autoCharge") === "on" || formData.get("autoCharge") === "true",
    accountNumber: (formData.get("accountNumber") as string)?.trim() || null,
  };
}

export async function createBill(prevState: unknown, formData: FormData) {
  try {
    const user = await requireSession();
    if (!user) return { success: false, message: "Not authenticated" };
    const db = getDb();
    await db.insert(bills).values({ userId: user.id!, ...parseBillFormData(formData) });
    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: "Bill added" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to add bill" };
  }
}

export async function updateBill(billId: number, prevState: unknown, formData: FormData) {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.update(bills)
      .set(parseBillFormData(formData))
      .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: "Bill updated" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to update bill" };
  }
}

export async function deleteBill(billId: number) {
  try {
    const user = await requireSession();
    const db = getDb();
    await db.update(bills).set({ active: false })
      .where(and(eq(bills.id, billId), eq(bills.userId, user.id!)));
    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: "Bill removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove bill" };
  }
}

// ── Bill payments ─────────────────────────────────────────────────────────────

export async function recordBillPayment(
  billId: number,
  prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();

    const bill = await getBillById(billId);
    if (!bill) return { success: false, message: "Bill not found" };

    const monthId = parseInt(formData.get("monthId") as string);
    const amountRaw = formData.get("amount") as string;
    const amount = amountRaw ? parseFloat(amountRaw) : bill.amount;
    const dateStr = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
    const note = (formData.get("note") as string)?.trim() || null;

    // paidLate: day of payment > bill's dueDay for that month
    const payDay = parseInt(dateStr.split("-")[2], 10);
    const paidLate = payDay > bill.dueDay;

    await db.insert(billPayments).values({
      userId: user.id!,
      billId,
      monthId,
      amount,
      date: dateStr,
      paidLate,
      note,
    });

    // If this bill is tied to a credit card, auto-log a matching expense so
    // the card balance + expenses ledger reflect reality. Idempotent per (bill, month).
    if (bill.creditCardId) {
      const [existing] = await db.select({ id: expenses.id }).from(expenses)
        .where(and(
          eq(expenses.userId, user.id!),
          eq(expenses.billId, billId),
          eq(expenses.monthId, monthId),
        ))
        .limit(1);

      if (!existing) {
        const [card] = await db.select().from(creditCards)
          .where(eq(creditCards.id, bill.creditCardId))
          .limit(1);
        const paymentMethod: "credit_card" | "debit" =
          card?.type === "credit" ? "credit_card" : "debit";

        await db.insert(expenses).values({
          userId:          user.id!,
          monthId,
          amount,
          currency:        "USD",
          amountUsd:       amount,
          exchangeRate:    1,
          description:     bill.name,
          date:            dateStr,
          paymentMethod,
          paymentMethodId: bill.creditCardId,
          bucket:          "bills",
          tagId:           null,
          tripId:          null,
          billId,
        });
        revalidatePath("/payments");
        revalidatePath("/expenses");
      }
    }

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: `${bill.name} marked as paid` };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to record payment" };
  }
}

export async function getBillPaymentsForMonth(monthId: number) {
  const user = await requireSession();
  const db = getDb();
  const rows = await db
    .select({
      id:       billPayments.id,
      billId:   billPayments.billId,
      billName: bills.name,
      amount:   billPayments.amount,
      date:     billPayments.date,
      paidLate: billPayments.paidLate,
      skipped:  billPayments.skipped,
      dueDay:   bills.dueDay,
      note:     billPayments.note,
    })
    .from(billPayments)
    .innerJoin(bills, eq(billPayments.billId, bills.id))
    .where(and(eq(billPayments.monthId, monthId), eq(billPayments.userId, user.id!)))
    .orderBy(asc(billPayments.date));
  return rows;
}

/** Activity-log style: all paid bills across all months, most recent first. */
export async function getBillPaymentHistory(limit = 50) {
  const user = await requireSession();
  const db = getDb();
  const rows = await db
    .select({
      id:       billPayments.id,
      billId:   billPayments.billId,
      billName: bills.name,
      billType: bills.type,
      amount:   billPayments.amount,
      date:     billPayments.date,
      paidLate: billPayments.paidLate,
      dueDay:   bills.dueDay,
      note:     billPayments.note,
    })
    .from(billPayments)
    .innerJoin(bills, eq(billPayments.billId, bills.id))
    .where(eq(billPayments.userId, user.id!))
    .orderBy(desc(billPayments.date))
    .limit(limit);
  return rows;
}

export async function deleteBillPayment(paymentId: number): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();

    // Look up the payment first so we know which bill+month to clean up.
    const [payment] = await db.select({
      billId:  billPayments.billId,
      monthId: billPayments.monthId,
    }).from(billPayments)
      .where(and(eq(billPayments.id, paymentId), eq(billPayments.userId, user.id!)))
      .limit(1);

    await db.delete(billPayments)
      .where(and(eq(billPayments.id, paymentId), eq(billPayments.userId, user.id!)));

    // Roll back the auto-logged expense, if any. Safe to run unconditionally:
    // expenses without a matching billId+monthId are untouched.
    if (payment) {
      await db.delete(expenses).where(and(
        eq(expenses.userId, user.id!),
        eq(expenses.billId, payment.billId),
        eq(expenses.monthId, payment.monthId),
      ));
      revalidatePath("/payments");
      revalidatePath("/expenses");
    }

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: "Payment removed" };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to remove payment" };
  }
}

/**
 * Mark a bill as skipped for a given month. Idempotent: re-skipping is a no-op.
 * Skipped rows have amount=0 so they don't pollute spend totals, and they block
 * auto-charge reconciliation from posting an expense for that bill+month.
 */
export async function skipBillForMonth(
  billId: number,
  monthId: number,
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await requireSession();
    const db = getDb();
    const userId = user.id!;

    const [bill] = await db.select({ name: bills.name })
      .from(bills)
      .where(and(eq(bills.id, billId), eq(bills.userId, userId)))
      .limit(1);
    if (!bill) return { success: false, message: "Bill not found" };

    const [existing] = await db.select({ id: billPayments.id, skipped: billPayments.skipped })
      .from(billPayments)
      .where(and(
        eq(billPayments.userId, userId),
        eq(billPayments.billId, billId),
        eq(billPayments.monthId, monthId),
      ))
      .limit(1);

    if (existing) {
      // Already has a payment for this month — only convert to skipped if
      // it's not already a (real) payment.
      if (existing.skipped) {
        return { success: true, message: `${bill.name} already skipped` };
      }
      return { success: false, message: `${bill.name} already has a payment this month` };
    }

    const today = new Date().toISOString().slice(0, 10);
    await db.insert(billPayments).values({
      userId,
      billId,
      monthId,
      amount: 0,
      date: today,
      paidLate: false,
      skipped: true,
      note: null,
    });

    revalidatePath("/bills");
    revalidatePath("/");
    return { success: true, message: `${bill.name} skipped this month` };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Failed to skip bill" };
  }
}

/**
 * For each active auto-charge bill whose effective due day has been reached this
 * month and which doesn't yet have a bill_payment for the month, post the
 * expense + bill_payment. Idempotent — safe to call on every request.
 *
 * Returns the count of bills materialized.
 */
export async function reconcileAutoChargedBills(
  monthId: number,
  year: number,
  month: number,
): Promise<number> {
  const user = await requireSession();
  const userId = user.id!;
  const db = getDb();

  // Pull all active auto-charge bills with a credit card attached. Cheap query.
  const candidates = await db.select().from(bills).where(and(
    eq(bills.userId, userId),
    eq(bills.active, true),
    eq(bills.autoCharge, true),
  ));
  if (candidates.length === 0) return 0;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = today.getDate();

  let materializedCount = 0;
  for (const bill of candidates) {
    if (!bill.creditCardId) continue;

    const effectiveDay = getEffectiveDueDay(bill, month);
    if (effectiveDay == null) continue;

    // Only post when we've actually reached the due day in the current month.
    // For past months we always post (the charge has already happened by now).
    // For future months we never post.
    if (today.getFullYear() < year || (today.getFullYear() === year && today.getMonth() + 1 < month)) {
      continue;
    }
    if (isCurrentMonth && effectiveDay > todayDay) continue;

    // Dedupe: skip if a bill_payment already exists for this (bill, month).
    const [existing] = await db.select({ id: billPayments.id }).from(billPayments)
      .where(and(
        eq(billPayments.userId, userId),
        eq(billPayments.billId, bill.id),
        eq(billPayments.monthId, monthId),
      ))
      .limit(1);
    if (existing) continue;

    // Date the expense to the effective due day, clamped to today if needed (avoid future dates).
    const dayClamped = isCurrentMonth ? Math.min(effectiveDay, todayDay) : effectiveDay;
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayClamped).padStart(2, "0")}`;

    const [card] = await db.select().from(creditCards)
      .where(eq(creditCards.id, bill.creditCardId))
      .limit(1);
    const paymentMethod: "credit_card" | "debit" = card?.type === "credit" ? "credit_card" : "debit";

    await db.insert(billPayments).values({
      userId,
      billId: bill.id,
      monthId,
      amount: bill.amount,
      date: dateStr,
      paidLate: false,
      note: "Auto-charged",
    });

    await db.insert(expenses).values({
      userId,
      monthId,
      amount: bill.amount,
      currency: "USD",
      amountUsd: bill.amount,
      exchangeRate: 1,
      description: bill.name,
      date: dateStr,
      paymentMethod,
      paymentMethodId: bill.creditCardId,
      bucket: "bills",
      tagId: null,
      tripId: null,
      billId: bill.id,
    });

    materializedCount++;
  }

  // NOTE: deliberately no revalidatePath() here. This function is invoked from
  // a Server Component (the app layout), and revalidatePath during render is
  // forbidden in Next.js 16. The layout's own downstream queries see the newly
  // materialized rows in the same request because they run after this call.
  // Subsequent user-triggered mutations (Mark Paid, delete) revalidate themselves.
  return materializedCount;
}
