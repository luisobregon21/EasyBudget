"use server";
// Re-exports credit-cards actions under the payment-methods name.
// The underlying table is still called credit_cards (kept to avoid FK migration complexity).
export {
  getCreditCards,
  getPaymentMethods,
  createCreditCard,
  deleteCreditCard,
} from "@/lib/actions/credit-cards";
