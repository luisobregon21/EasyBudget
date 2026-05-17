interface Props {
  text: string;
  tone: "good" | "bad";
}

const GRADIENT = "linear-gradient(90deg, #f59e0b 0%, #ec4899 100%)";

export function InsightCard({ text, tone }: Props) {
  const borderColor = tone === "good" ? "#34d399" : "#f87171";
  const labelColor  = tone === "good" ? "#34d399" : "#f87171";

  return (
    <div
      style={{
        background: "#181028",
        border: "1px solid rgba(167,139,250,0.13)",
        borderLeft: `2px solid ${borderColor}`,
        borderRadius: 8,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: labelColor,
          marginBottom: 6,
        }}
      >
        Insight
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: "#ede9f6",
          lineHeight: 1.5,
        }}
      >
        {text}
      </div>
    </div>
  );
}
