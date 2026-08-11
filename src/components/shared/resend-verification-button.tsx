"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ResendVerificationButton() {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setIsSending(true);
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to send verification email.");
        return;
      }
      setSent(true);
      toast.success("Verification email sent.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Alert>
      <MailWarning className="h-4 w-4" />
      <AlertTitle>Email not verified</AlertTitle>
      <AlertDescription>
        <p>Verify your email address to make sure you can recover your account.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={isSending || sent}
          onClick={handleResend}
        >
          {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
          {sent ? "Email sent" : "Resend verification email"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
