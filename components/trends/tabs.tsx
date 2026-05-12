"use client";
import { useState } from "react";

export type TabId = "overview" | "categories" | "trips";

interface Props {
  overview: React.ReactNode;
  categories: React.ReactNode;
  trips: React.ReactNode;
}

export function Tabs({ overview, categories, trips }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <>
      <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-accent-purple/20 p-1">
        <TabBtn label="Overview"   active={tab === "overview"}   onClick={() => setTab("overview")} />
        <TabBtn label="Categories" active={tab === "categories"} onClick={() => setTab("categories")} />
        <TabBtn label="Trips"      active={tab === "trips"}      onClick={() => setTab("trips")} />
      </div>
      <div className="mt-5">
        {tab === "overview" && overview}
        {tab === "categories" && categories}
        {tab === "trips" && trips}
      </div>
    </>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active ? "bg-accent-purple text-white" : "text-muted-base hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
