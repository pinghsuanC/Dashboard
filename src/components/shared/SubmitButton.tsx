"use client";

import { useActionForm } from "@/components/shared/ActionForm";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel: string;
}

export const SubmitButton = ({ children, pendingLabel }: SubmitButtonProps) => {
  const { pending } = useActionForm();

  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
};
