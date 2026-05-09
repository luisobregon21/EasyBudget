"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  action: () => Promise<{ success: boolean; message: string }>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FireAndForgetButton({ action, children, className, disabled }: Props) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      const result = await action();
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
      disabled={disabled || pending}
      className={className}
    >
      {children}
    </button>
  );
}
