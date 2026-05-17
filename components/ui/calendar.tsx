"use client";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Calendar(props: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={0}
      {...props}
      classNames={{
        root: "p-3 text-foreground font-sans select-none",
        months: "flex flex-col gap-3",
        month: "space-y-2",
        month_caption: "flex items-center justify-center h-9 relative",
        caption_label: "text-sm font-semibold tracking-wide text-foreground",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous:
          "h-8 w-8 rounded-full flex items-center justify-center text-muted-base hover:text-foreground hover:bg-white/10 transition",
        button_next:
          "h-8 w-8 rounded-full flex items-center justify-center text-muted-base hover:text-foreground hover:bg-white/10 transition",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 h-7 text-[10px] font-bold uppercase tracking-widest text-muted-base/70 flex items-center justify-center",
        week: "flex w-full mt-1",
        day: "w-9 h-9 flex items-center justify-center text-sm",
        day_button:
          "w-9 h-9 rounded-full flex items-center justify-center text-sm text-foreground hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold",
        today:
          "[&_button]:ring-1 [&_button]:ring-accent-purple/60 [&_button]:font-semibold",
        selected:
          "[&_button]:bg-gradient-to-br [&_button]:from-amber-400 [&_button]:to-pink-500 [&_button]:text-white [&_button]:font-bold [&_button]:shadow-md [&_button]:shadow-amber-500/30 [&_button]:hover:opacity-95",
        outside: "[&_button]:text-muted-base/40",
        disabled: "[&_button]:opacity-30 [&_button]:cursor-not-allowed",
        hidden: "invisible",
        ...(props.classNames ?? {}),
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />,
        ...(props.components ?? {}),
      }}
    />
  );
}
