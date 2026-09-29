"use client";

import { createContext, startTransition, useActionState, useContext } from "react";

import type { FormAction, FormState } from "@/types/forms";

interface ActionFormContextValue {
  state: FormState;
  pending: boolean;
}

const ActionFormContext = createContext<ActionFormContextValue>({ state: {}, pending: false });

/** The surrounding `ActionForm`'s result and pending flag, for field-level islands. */
export const useActionForm = () => useContext(ActionFormContext);

interface ActionFormProps {
  action: FormAction;
  className?: string;
  children: React.ReactNode;
}

/**
 * The one client boundary a server-rendered form needs. The page passes a
 * server action and server-rendered fields as children; this holds the
 * action's result so `FormField`, `FormError` and `SubmitButton` can show it.
 *
 * `onSubmit` dispatches the action itself instead of letting React run the
 * form `action`, because React resets uncontrolled fields after a form
 * action — a failed sign-in would wipe the email. Before hydration the plain
 * `action` attribute still submits, so the form works without JS.
 */
export const ActionForm = ({ action, className, children }: ActionFormProps) => {
  const [state, formAction, pending] = useActionState(action, {});

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <ActionFormContext value={{ state, pending }}>
      <form action={formAction} onSubmit={handleSubmit} className={className}>
        {children}
      </form>
    </ActionFormContext>
  );
};
