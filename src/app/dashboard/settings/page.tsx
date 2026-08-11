import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResendVerificationButton } from "@/components/shared/resend-verification-button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });
  const isVerified = !!account?.emailVerified;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      {!isVerified && <ResendVerificationButton />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue={user.name ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2">
              <Input id="email" defaultValue={user.email ?? ""} disabled className="flex-1" />
              <Badge variant={isVerified ? "secondary" : "outline"}>
                {isVerified ? "Verified" : "Unverified"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Forgot your password? You can reset it from the{" "}
            <Link href="/forgot-password" className="text-primary underline underline-offset-2">
              password reset page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
