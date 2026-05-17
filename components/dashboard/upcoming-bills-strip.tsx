import { BILL_ICON } from "@/lib/icons";

type BillStatus = "overdue" | "due-soon" | "upcoming" | "paid";

type Bill = {
  id: number;
  name: string;
  amount: number;
  dueDay: number;
  type: string;
  status?: BillStatus;
};

interface Props {
  bills: Bill[];
  dayOfMonth?: number;
}

const fmtDec = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function UpcomingBillsStrip({ bills, dayOfMonth }: Props) {
  if (bills.length === 0) return null;
  const today = dayOfMonth ?? new Date().getDate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 4px",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1,
            color: "#5e5279",
            textTransform: "uppercase",
          }}
        >
          Upcoming bills
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {bills.map((b) => {
          const IconCmp = BILL_ICON[b.type] ?? BILL_ICON.other;
          const derivedStatus: BillStatus = b.status ?? (b.dueDay < today ? "overdue" : b.dueDay <= today + 3 ? "due-soon" : "upcoming");
          const isOverdue = derivedStatus === "overdue";
          const daysLate  = today - b.dueDay;
          const daysAhead = b.dueDay - today;

          return (
            <div
              key={b.id}
              style={{
                minWidth: 132,
                padding: 11,
                background: isOverdue ? "rgba(248,113,113,0.06)" : "#181028",
                border: `1px solid ${isOverdue ? "rgba(248,113,113,0.25)" : "rgba(167,139,250,0.13)"}`,
                borderRadius: 12,
                flexShrink: 0,
              }}
            >
              <IconCmp size={15} color={isOverdue ? "#f87171" : "#8a7da8"} />
              <div
                style={{
                  fontSize: 11,
                  color: "#ede9f6",
                  marginTop: 6,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {b.name.split("—")[0].trim()}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#ede9f6",
                  marginTop: 2,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtDec(b.amount)}
              </div>
              <div
                style={{
                  fontSize: 9.5,
                  color: isOverdue ? "#f87171" : "#5e5279",
                  marginTop: 3,
                  fontFamily: "var(--font-geist-mono, monospace)",
                }}
              >
                {isOverdue ? `${daysLate}d late` : `in ${daysAhead}d`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
