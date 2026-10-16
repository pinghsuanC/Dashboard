import { Check } from "lucide-react";

/** A checklist row with a green tick, for the AI section and the pricing cards. */
export const CheckItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-3">
    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15">
      <Check className="size-3 text-emerald-500" strokeWidth={3} />
    </span>
    {children}
  </li>
);
