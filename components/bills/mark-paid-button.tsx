"use client";

import { useState } from "react";
import { toast } from "sonner";
import { recordBillPayment } from "@/lib/actions/bills";
import { CheckCheck } from "lucide-react";

interface Props {
  billId: number;
  monthId: number;
}

export function MarkPaidButton({ billId, monthId }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("monthId", String(monthId));
      const result = await recordBillPayment(billId, undefined, formData);
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
        background: "rgba(52,211,153,0.12)",
        border: "1px solid rgba(52,211,153,0.25)",
        color: "#34d399",
        fontSize: 10,
        fontWeight: 700,
        cursor: pending ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        flexShrink: 0,
        opacity: pending ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <CheckCheck size={11} />
      Paid
    </button>
  );
}
