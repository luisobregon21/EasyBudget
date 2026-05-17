import {
  Banknote, Briefcase, Calendar, Car, CheckCircle2, Coffee, CreditCard,
  Dumbbell, Film, Heart, Home as HomeIcon, Landmark, Plane, Receipt,
  ShoppingBag, ShoppingCart, Sparkles, Tag as TagIcon, UtensilsCrossed,
  Wifi, type LucideIcon,
} from "lucide-react";

export const BILL_ICON: Record<string, LucideIcon> = {
  utility:      Wifi,
  subscription: Film,
  credit_card:  CreditCard,
  loan:         Landmark,
  other:        Receipt,
};

const TAG_NAME_TO_ICON: Record<string, LucideIcon> = {
  food:           UtensilsCrossed,
  groceries:      ShoppingBag,
  dining:         UtensilsCrossed,
  restaurant:     UtensilsCrossed,
  coffee:         Coffee,
  housing:        HomeIcon,
  rent:           HomeIcon,
  utilities:      Wifi,
  subscriptions:  Film,
  transport:      Car,
  transit:        Car,
  car:            Car,
  clothes:        ShoppingCart,
  shopping:       ShoppingCart,
  "night out":    Sparkles,
  family:         Heart,
  health:         Heart,
  fitness:        Dumbbell,
  gym:            Dumbbell,
  travel:         Plane,
  savings:        Landmark,
  "savings auto": Landmark,
  banking:        Banknote,
  work:           Briefcase,
  other:          Receipt,
};

export function tagIcon(name: string | null | undefined): LucideIcon {
  if (!name) return TagIcon;
  return TAG_NAME_TO_ICON[name.toLowerCase().trim()] ?? TagIcon;
}

export const BUCKET_ICON: Record<"savings" | "bills" | "wants", LucideIcon> = {
  savings: Landmark,
  bills:   Receipt,
  wants:   Sparkles,
};

// Re-export the common ones for convenience
export { CheckCircle2, Calendar };
