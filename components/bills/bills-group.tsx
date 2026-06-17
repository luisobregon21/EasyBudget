import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { BILL_ICON } from "@/lib/icons";
import { MarkPaidButton } from "@/components/bills/mark-paid-button";
import { SkipButton } from "@/components/bills/skip-button";
import { FireAndForgetButton } from "@/components/ui/fire-and-forget-button";
import { deleteBill } from "@/lib/actions/bills";

type Tone = "bad" | "warn" | "good" | "neutral";

interface Bill {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  type: string;
  status?: string;
}

interface Props {
  label: string;
  bills: Bill[];
  tone: Tone;
  emptyHide?: boolean;
  dayOfMonth?: number;
  /** When provided, a "Mark paid" button appears on each non-paid row */
  monthId?: number;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TONE_ACCENT: Record<Tone, string> = {
  bad:     "#f87171",
  warn:    "#fbbf24",
  good:    "#34d399",
  neutral: "#8a7da8",
};

const TONE_BG: Record<Tone, string> = {
  bad:     "rgba(248,113,113,0.04)",
  warn:    "rgba(245,158,11,0.03)",
  good:    "rgba(52,211,153,0.03)",
  neutral: "#181028",
};

const TONE_BORDER: Record<Tone, string> = {
  bad:     "rgba(248,113,113,0.20)",
  warn:    "rgba(245,158,11,0.15)",
  good:    "rgba(52,211,153,0.15)",
  neutral: "rgba(167,139,250,0.13)",
};

export function BillsGroup({ label, bills, tone, emptyHide = false, dayOfMonth, monthId }: Props) {
  if (!bills.length && emptyHide) return null;

  const today      = dayOfMonth ?? new Date().getDate();
  const accentColor = TONE_ACCENT[tone];
  const total      = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px 6px",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: accentColor,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "#5e5279",
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          {bills.length} · {fmt(total)}
        </span>
      </div>

      <div
        style={{
          background: TONE_BG[tone],
          border: `1px solid ${TONE_BORDER[tone]}`,
          borderRadius: 12,
          padding: "4px 0",
        }}
      >
        {!bills.length && (
          <div
            style={{
              padding: 14,
              textAlign: "center",
              color: "#5e5279",
              fontSize: 11,
            }}
          >
            —
          </div>
        )}
        {bills.map((b, i) => {
          const IconCmp    = BILL_ICON[b.type] ?? BILL_ICON.other;
          const isPaid     = tone === "good";
          const isOverdue  = tone === "bad";
          const daysLate   = today - b.dueDay;

          return (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 12px",
                borderTop: i ? "1px solid rgba(167,139,250,0.13)" : "none",
                opacity: isPaid ? 0.65 : 1,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: `${accentColor}22`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  flexShrink: 0,
                }}
              >
                <IconCmp size={15} />
              </div>

              <Link
                href={`/bills/${b.id}/edit`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
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
                  {b.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#8a7da8",
                    marginTop: 1,
                    fontFamily: "var(--font-geist-mono, monospace)",
                  }}
                >
                  {isPaid
                    ? `paid day ${b.dueDay}`
                    : isOverdue
                    ? `${daysLate}d late`
                    : `due day ${b.dueDay}`}
                </div>
              </Link>

              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#ede9f6",
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontVariantNumeric: "tabular-nums",
                  textDecoration: isPaid ? "line-through" : "none",
                  opacity: isPaid ? 0.6 : 1,
                }}
              >
                {fmtDec(b.amount)}
              </div>

              {/* Mark Paid + Skip on all active (non-paid) bill rows.
                  Early payments are common (autopay landing days before due),
                  and Skip lets the user pause a subscription/utility for the month. */}
              {!isPaid && monthId !== undefined && (
                <>
                  <MarkPaidButton billId={b.id} monthId={monthId} />
                  <SkipButton billId={b.id} monthId={monthId} />
                </>
              )}

              {/* Edit + Delete affordances on every bill row */}
              <Link
                href={`/bills/${b.id}/edit`}
                aria-label={`Edit ${b.name}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 6,
                  color: "#8a7da8",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <Pencil size={13} />
              </Link>
              <FireAndForgetButton
                action={deleteBill.bind(null, b.id)}
                aria-label={`Delete ${b.name}`}
                className="p-1.5 text-muted-base hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 size={13} />
              </FireAndForgetButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
