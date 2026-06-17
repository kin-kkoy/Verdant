"use client";

import { useFormStatus } from "react-dom";

// Shows a pending state while a server-action form submits (e.g. signing in).
export default function SubmitButton({
  children,
  pendingLabel,
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn lg"
      type="submit"
      disabled={pending}
      style={{ width: "100%", justifyContent: "center" }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
