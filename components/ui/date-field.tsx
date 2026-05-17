"use client";
import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "./calendar";
import type { Matcher } from "react-day-picker";

interface Props {
  name: string;
  defaultValue?: string; // YYYY-MM-DD
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

const fromIso = parseIso;

function formatDisplay(d?: Date) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DateField({ name, defaultValue, required, minDate, maxDate, placeholder = "Select date" }: Props) {
  const [date, setDate] = useState<Date | undefined>(fromIso(defaultValue));
  const [open, setOpen] = useState(false);

  const disabled: Matcher[] = [];
  if (minDate) disabled.push({ before: minDate });
  if (maxDate) disabled.push({ after: maxDate });

  return (
    <>
      <input type="hidden" name={name} value={date ? toIso(date) : ""} required={required} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          className="w-full bg-bg-deep border border-accent-purple/20 text-foreground rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 hover:border-accent-purple/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold transition"
        >
          <span className={date ? "text-foreground" : "text-muted-base/60"}>
            {date ? formatDisplay(date) : placeholder}
          </span>
          <CalendarIcon size={16} className="text-muted-base shrink-0" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="start" sideOffset={6}>
            <Popover.Popup className="bg-bg-deep border border-accent-purple/25 rounded-2xl shadow-2xl shadow-black/60 outline-none">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  setDate(d);
                  if (d) setOpen(false);
                }}
                disabled={disabled.length ? disabled : undefined}
                defaultMonth={date ?? new Date()}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
