"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addReceiptToCardPayment } from "@/lib/actions/card-payments";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compress";
import type { CardActivityRow } from "@/lib/actions/card-payments";

interface Props {
  payment: CardActivityRow;
  onClose: () => void;
}

export function AddReceiptSheet({ payment, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const action = addReceiptToCardPayment.bind(null, payment.id);
  const [state, formAction, pending] = useActionState(
    async (prev: unknown, fd: FormData) => {
      if (!file) return { success: false, message: "Pick a photo first." };
      const compressed = await compressImage(file);
      fd.set("receipt", compressed);
      return action(prev, fd);
    },
    undefined,
  );
  const toastedState = useRef<typeof state>(undefined);

  useEffect(() => {
    if (!state || state === toastedState.current) return;
    toastedState.current = state;
    if (state.success) {
      toast.success(state.message);
      onClose();
    } else {
      toast.error(state.message);
    }
  }, [state, onClose]);

  function pickFile(f: File | null) {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60]" onClick={onClose} />
      <div className="fixed z-[70] bg-[#1e1235] border border-accent-purple/30 shadow-2xl
        bottom-0 inset-x-0 rounded-t-2xl border-t
        md:bottom-auto md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-full md:max-w-md md:rounded-2xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-foreground font-bold text-base">Add Receipt</p>
            <p className="text-muted-base text-xs">{payment.description} · {payment.date}</p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="px-5 pb-8 space-y-4">
          {file && preview ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-bg-deep border border-accent-purple/20">
              <img src={preview} alt="receipt preview" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-xs truncate">{file.name}</p>
                <p className="text-muted-base text-[10px]">{(file.size / 1024).toFixed(0)} KB · will compress</p>
              </div>
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="text-muted-base hover:text-red-400 transition-colors"
                aria-label="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-deep border border-accent-purple/20 cursor-pointer hover:border-accent-purple/40 transition-colors">
              <ImagePlus size={16} className="text-muted-base" />
              <span className="text-muted-base text-sm">Attach a photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          <Button
            type="submit"
            disabled={pending || !file}
            className="w-full bg-gradient-to-br from-amber-400 to-pink-500 text-white font-bold py-3 rounded-xl text-base"
          >
            {pending ? "Uploading…" : "Save Receipt"}
          </Button>
        </form>
      </div>
    </>
  );
}
