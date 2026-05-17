"use client";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { CheckCircle2, Calendar } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateIncomeEntry } from "@/lib/actions/income";

type Status = "arrived" | "expected" | "might_arrive";

interface ViewProps {
  mode: "view";
  id: number;
  source: string;
  date: string;
  amount: number;
  status: Status;
  onEdit: () => void;
}

interface EditProps {
  mode: "edit";
  id: number;
  source: string;
  date: string;
  amount: number;
  status: Status;
  onDone: () => void;
}

type Props = ViewProps | EditProps;

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

const STATUS_COLOR: Record<Status, string> = {
  arrived:     "#34d399",
  expected:    "#fbbf24",
  might_arrive: "#8a7da8",
};

const STATUS_LABEL: Record<Status, string> = {
  arrived:     "arrived",
  expected:    "expected",
  might_arrive: "might arrive",
};

export function EntryRow(props: Props) {
  if (props.mode === "edit") return <EditRow {...props} />;
  return <ViewRow {...props} />;
}

function ViewRow({ source, date, amount, status, onEdit }: ViewProps) {
  const arrived = status === "arrived";
  const Icon    = arrived ? CheckCircle2 : Calendar;
  const tone    = arrived ? "good" : "warn";
  const color   = STATUS_COLOR[status];

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
            color,
          }}
        >
          {STATUS_LABEL[status]}
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color,
            fontFamily: "var(--font-geist-mono, monospace)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +{fmt(amount)}
        </span>
      </div>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${source}`}
        style={{
          padding: "6px",
          color: "#5e5279",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}

function EditRow({ id, source, date, amount, status, onDone }: EditProps) {
  const action = updateIncomeEntry.bind(null, id);
  const [state, formAction, pending] = useActionState(action, undefined);
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      onDone();
    } else {
      toast.error(state.message);
    }
  }, [state, onDone]);

  return (
    <form action={formAction} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="space-y-1">
          <Label htmlFor={`name-${id}`} className="text-muted-base text-[10px] uppercase tracking-widest">Name</Label>
          <Input
            id={`name-${id}`}
            name="name"
            required
            defaultValue={source}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`amount-${id}`} className="text-muted-base text-[10px] uppercase tracking-widest">Amount</Label>
          <Input
            id={`amount-${id}`}
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            defaultValue={amount}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="space-y-1">
          <Label htmlFor={`date-${id}`} className="text-muted-base text-[10px] uppercase tracking-widest">Expected date</Label>
          <Input
            id={`date-${id}`}
            name="expectedDate"
            type="date"
            defaultValue={date}
            className="bg-bg-deep border-accent-purple/20 text-foreground"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-muted-base text-[10px] uppercase tracking-widest">Status</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["expected", "arrived", "might_arrive"] as Status[]).map((s) => (
              <StatusRadio key={s} value={s} defaultSelected={status} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button type="button" onClick={onDone} variant="ghost" className="text-muted-base">
          Cancel
        </Button>
        <Button type="submit" disabled={pending} className="bg-gradient-brand text-white font-bold">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function StatusRadio({ value, defaultSelected }: { value: Status; defaultSelected: Status }) {
  const label: Record<Status, string> = {
    expected:     "Expected",
    arrived:      "Arrived",
    might_arrive: "Maybe",
  };
  const id = `status-radio-${value}`;
  return (
    <label htmlFor={id} style={{ cursor: "pointer", fontSize: 10 }}>
      <input
        type="radio"
        id={id}
        name="status"
        value={value}
        defaultChecked={value === defaultSelected}
        className="peer sr-only"
      />
      <span
        className="peer-checked:text-foreground peer-checked:font-bold text-muted-base"
        style={{ fontSize: 10 }}
      >
        {label[value]}
      </span>
    </label>
  );
}
