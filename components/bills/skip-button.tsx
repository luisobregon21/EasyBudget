"use client";

import { useState } from "react";
import { toast } from "sonner";
import { skipBillForMonth } from "@/lib/actions/bills";
import { CircleSlash } from "lucide-react";

interface Props {
  billId: number;
  monthId: number;
}

export function SkipButton({ billId, monthId }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const result = await skipBillForMonth(billId, monthId);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 6,
        background: "rgba(138,125,168,0.10)",
        border: "1px solid rgba(138,125,168,0.25)",
        color: "#8a7da8",
        fontSize: 10,
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        opacity: pending ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <CircleSlash size={11} />
      Skip
    </button>
  );
}
