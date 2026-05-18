"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateCardPayment, deleteCardPayment } from "@/lib/actions/card-payments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image-compress";
import type { CardActivityRow } from "@/lib/actions/card-payments";

interface Props {
  payment: CardActivityRow;
  onClose: () => void;
}

export function EditPaymentSheet({ payment, onClose }: Props) {
  // Freeze defaults on mount so re-renders from useActionState don't re-trigger
  // Base UI's "default value changed" warning.
  const [initialAmount] = useState(() => Math.abs(payment.amount).toFixed(2));
  const [initialDate] = useState(payment.date);
  const [initialNote] = useState(() => payment.description === "Payment" ? "" : payment.description);
  const [newReceipt, setNewReceipt] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [deleting, startDelete] = useTransition();

  const action = updateCardPayment.bind(null, payment.id);
  const [state, formAction, pending] = useActionState(
    async (prev: unknown, fd: FormData) => {
      if (newReceipt) {
        const compressed = await compressImage(newReceipt);
        fd.set("receipt", compressed);
      } else {
        fd.delete("receipt");
      }
      if (removeReceipt) fd.set("removeReceipt", "1");
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

  function pickReceipt(file: File | null) {
    setNewReceipt(file);
    if (newPreview) URL.revokeObjectURL(newPreview);
    setNewPreview(file ? URL.createObjectURL(file) : null);
  }

  useEffect(() => () => { if (newPreview) URL.revokeObjectURL(newPreview); }, [newPreview]);

  function handleDelete() {
    if (!confirm("Delete this payment? Receipt image will also be removed.")) return;
    startDelete(async () => {
      const result = await deleteCardPayment(payment.id);
      if (result.success) {
        toast.success(result.message);
        onClose();
      } else {
        toast.error(result.message);
      }
    });
  }

  const hadReceipt = !!payment.receiptUrl;
  const existingReceiptVisible = hadReceipt && !removeReceipt && !newReceipt;

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
          <p className="text-foreground font-bold text-base">Edit Payment</p>
          <button type="button" onClick={onClose} className="text-muted-base hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="px-5 pb-8 space-y-4">
          <div className="text-center">
            <p className="text-muted-base text-[10px] uppercase tracking-widest mb-2">Amount</p>
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={initialAmount}
              className="bg-bg-deep border-accent-purple/20 text-foreground text-2xl font-black text-center"
            />
          </div>

          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Date</p>
            <Input
              name="date"
              type="date"
              defaultValue={initialDate}
              required
              className="bg-bg-deep border-accent-purple/20 text-foreground"
            />
          </div>

          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Note</p>
            <Input
              name="note"
              type="text"
              defaultValue={initialNote}
              placeholder="e.g. January statement payment"
              className="bg-bg-deep border-accent-purple/20 text-foreground"
            />
          </div>

          <div className="space-y-1">
            <p className="text-muted-base text-[10px] uppercase tracking-widest">Receipt</p>
            {existingReceiptVisible && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-bg-deep border border-accent-purple/20">
                <img
                  src={`/api/receipts/${payment.id}`}
                  alt="receipt"
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs">Current receipt</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveReceipt(true)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                  aria-label="Remove receipt"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            {newReceipt && newPreview && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-bg-deep border border-accent-purple/20">
                <img src={newPreview} alt="receipt preview" className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs truncate">{newReceipt.name}</p>
                  <p className="text-muted-base text-[10px]">
                    {(newReceipt.size / 1024).toFixed(0)} KB · will compress
                    {hadReceipt && " · replaces current"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => pickReceipt(null)}
                  className="text-muted-base hover:text-red-400 transition-colors"
                  aria-label="Discard new receipt"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
            {!existingReceiptVisible && !newReceipt && (
              <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-deep border border-accent-purple/20 cursor-pointer hover:border-accent-purple/40 transition-colors">
                <ImagePlus size={16} className="text-muted-base" />
                <span className="text-muted-base text-sm">
                  {hadReceipt ? "Add a new photo" : "Attach a photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    pickReceipt(e.target.files?.[0] ?? null);
                    setRemoveReceipt(false);
                  }}
                />
              </label>
            )}
            {removeReceipt && (
              <button
                type="button"
                onClick={() => setRemoveReceipt(false)}
                className="text-xs text-muted-base underline mt-1"
              >
                Undo remove
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting || pending}
              variant="ghost"
              className="text-red-400 hover:text-red-300"
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
            <div className="flex-1" />
            <Button
              type="submit"
              disabled={pending || deleting}
              className="bg-gradient-to-br from-amber-400 to-pink-500 text-white font-bold"
            >
              {pending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
