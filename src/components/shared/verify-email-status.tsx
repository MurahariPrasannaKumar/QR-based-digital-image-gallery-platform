"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "pending" | "success" | "error";

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    const oobCode = searchParams.get("oobCode");
    if (!oobCode) {
      setStatus("error");
      return;
    }
    applyActionCode(getFirebaseAuth(), oobCode)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [searchParams]);

  if (status === "pending") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Verifying your email…</p>
        </CardContent>
      </Card>
    );
  }

  const verified = status === "success";

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div
          className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${
            verified ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}
        >
          {verified ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
        </div>
        <CardTitle className="text-xl">
          {verified ? "Email verified" : "Verification failed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          {verified
            ? "Your email address has been confirmed."
            : "This link is invalid or has expired. You can request a new one from your account settings."}
        </p>
        <Button className="w-full" render={<Link href={verified ? "/dashboard" : "/login"} />}>
          {verified ? "Go to Dashboard" : "Back to Sign In"}
        </Button>
      </CardContent>
    </Card>
  );
}
