import { IconTile } from "@/components/ui/icon-tile";
import { CheckCircle2, Calendar } from "@/lib/icons";

interface Props {
  source: string;
  date: string;
  amount: number;
  status: "arrived" | "expected";
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function EntryRow({ source, date, amount, status }: Props) {
  const arrived = status === "arrived";
  const tone    = arrived ? "good" : "warn";
  const Icon    = arrived ? CheckCircle2 : Calendar;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "11px 14px",
      }}
    >
      <IconTile icon={Icon} tone={tone} size="md" />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: "#ede9f6", fontWeight: 500 }}>{source}</div>
        <div
          style={{
            fontSize: 10,
            color: "#8a7da8",
            marginTop: 1,
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          {date}
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            fontFamily: "var(--font-geist-mono, monospace)",
            color: arrived ? "#34d399" : "#fbbf24",
          }}
        >
          {status}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: arrived ? "#34d399" : "#fbbf24",
            fontFamily: "var(--font-geist-mono, monospace)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +{fmt(amount)}
        </span>
      </div>
    </div>
  );
}
