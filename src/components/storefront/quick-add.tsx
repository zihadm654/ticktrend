"use client";
import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { LoaderCircle } from "lucide-react";
import { useCart } from "./cart-provider";

/**
 * Card shortcut: adds the option the card shows, qty 1, and opens the bag.
 * A round icon at rest; widens (clip-path, see `.quick-add`) to name the option.
 */
export function QuickAdd({
  variantId,
  price,
  name,
  option,
}: {
  variantId: string;
  price: number;
  name: string;
  option: string;
}) {
  const cart = useCart();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="quick-add"
      aria-label={`Add ${name}, ${option} to bag`}
      disabled={!cart.ready || cart.busy}
      onClick={async () => {
        setPending(true);
        try {
          await cart.add({ variantId, qty: 1, price });
        } finally {
          setPending(false);
        }
      }}
    >
      <span className="quick-add-label" aria-hidden>
        Add {option}
      </span>
      <span className="quick-add-icon" aria-hidden>
        {pending ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} weight="bold" />}
      </span>
    </button>
  );
}
