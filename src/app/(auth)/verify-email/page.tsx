import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { consumeVerificationToken } from "@/lib/verification-tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verify Email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = token ? await verifyToken(token) : false;

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

async function verifyToken(token: string): Promise<boolean> {
  const record = await consumeVerificationToken(token, "EMAIL_VERIFICATION");
  if (!record) return false;

  await db.user.updateMany({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });
  return true;
}
