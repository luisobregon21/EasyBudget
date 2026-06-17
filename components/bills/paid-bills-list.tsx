"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteBillPayment } from "@/lib/actions/bills";
import { X } from "lucide-react";

type Payment = {
  id: number;
  billId: number;
  billName: string;
  amount: number;
  date: string;
  paidLate: boolean;
  dueDay: number;
  note: string | null;
};

type Variant = "paid" | "skipped";

interface Props {
  payments: Payment[];
  /** When true, render dates as "MMM D, YYYY" (activity-log style across months) */
  showMonth?: boolean;
  /** "skipped" = muted styling, no amount line, "skipped" label, "Un-skip" tooltip */
  variant?: Variant;
}

const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(dateStr: string, withYear = false) {
  const [y, m, d] = dateStr.split("-");
  const mAbbr = MONTH_ABBR[parseInt(m) - 1];
  const day = parseInt(d);
  if (withYear) {
    const currentYear = new Date().getFullYear();
    return parseInt(y) === currentYear ? `${mAbbr} ${day}` : `${mAbbr} ${day}, ${y}`;
  }
  return `${parseInt(m)}/${day}`;
}

function PaymentRow({
  payment,
  showMonth = false,
  variant = "paid",
}: { payment: Payment; showMonth?: boolean; variant?: Variant }) {
  const [pending, startTransition] = useTransition();
  const isSkipped = variant === "skipped";

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBillPayment(payment.id);
      if (result.success) toast.success(isSkipped ? "Un-skipped" : result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        opacity: pending ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            color: "#ede9f6",
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            opacity: isSkipped ? 0.75 : 1,
          }}
        >
          {payment.billName}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "#8a7da8",
            marginTop: 1,
            fontFamily: "var(--font-geist-mono, monospace)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>{isSkipped ? "skipped" : "paid"} {formatDate(payment.date, showMonth)}</span>
          {!isSkipped && payment.paidLate && (
            <span
              style={{
                background: "rgba(248,113,113,0.15)",
                color: "#f87171",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: "1px 5px",
                borderRadius: 4,
                textTransform: "uppercase",
              }}
            >
              late
            </span>
          )}
        </div>
      </div>

      {/* amount — hidden for skipped rows (amount is 0 and meaningless) */}
      {!isSkipped && (
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: "#ede9f6",
            fontFamily: "var(--font-geist-mono, monospace)",
            fontVariantNumeric: "tabular-nums",
            textDecoration: "line-through",
            opacity: 0.6,
          }}
        >
          {fmtDec(payment.amount)}
        </div>
      )}

      {/* delete (un-pay / un-skip) button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        style={{
          background: isSkipped ? "rgba(138,125,168,0.10)" : "rgba(248,113,113,0.10)",
          border: "none",
          borderRadius: 6,
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isSkipped ? "#8a7da8" : "#f87171",
          cursor: pending ? "not-allowed" : "pointer",
          flexShrink: 0,
          padding: 0,
        }}
        title={isSkipped ? "Un-skip" : "Un-pay"}
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function PaidBillsList({ payments, showMonth = false, variant = "paid" }: Props) {
  const isSkipped = variant === "skipped";
  if (!payments.length) {
    return (
      <div
        style={{
          padding: 14,
          textAlign: "center",
          color: "#5e5279",
          fontSize: 11,
        }}
      >
        {isSkipped
          ? "Nothing skipped this month."
          : showMonth
            ? "No paid bills yet. Tap 'Paid' on an overdue or due-this-week bill to log a payment."
            : "No bills paid yet this month."}
      </div>
    );
  }

  return (
    <div
      style={{
        background: isSkipped ? "rgba(138,125,168,0.04)" : "rgba(52,211,153,0.03)",
        border: isSkipped ? "1px solid rgba(138,125,168,0.20)" : "1px solid rgba(52,211,153,0.15)",
        borderRadius: 12,
        padding: "4px 0",
      }}
    >
      {payments.map((p, i) => (
        <div
          key={p.id}
          style={{
            borderTop: i ? "1px solid rgba(167,139,250,0.13)" : "none",
          }}
        >
          <PaymentRow payment={p} showMonth={showMonth} variant={variant} />
        </div>
      ))}
    </div>
  );
}
