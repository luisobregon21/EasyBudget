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

interface Props {
  payments: Payment[];
  /** When true, render dates as "MMM D, YYYY" (activity-log style across months) */
  showMonth?: boolean;
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

function PaymentRow({ payment, showMonth = false }: { payment: Payment; showMonth?: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBillPayment(payment.id);
      if (result.success) toast.success(result.message);
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
          <span>paid {formatDate(payment.date, showMonth)}</span>
          {payment.paidLate && (
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

      {/* amount */}
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

      {/* delete (un-pay) button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        style={{
          background: "rgba(248,113,113,0.10)",
          border: "none",
          borderRadius: 6,
          width: 22,
          height: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f87171",
          cursor: pending ? "not-allowed" : "pointer",
          flexShrink: 0,
          padding: 0,
        }}
        title="Un-pay"
      >
        <X size={12} />
      </button>
    </div>
  );
}

export function PaidBillsList({ payments, showMonth = false }: Props) {
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
        No bills paid yet this month.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(52,211,153,0.03)",
        border: "1px solid rgba(52,211,153,0.15)",
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
          <PaymentRow payment={p} showMonth={showMonth} />
        </div>
      ))}
    </div>
  );
}
