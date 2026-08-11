import Link from "next/link";
import {
  QrCode,
  Upload,
  FolderPlus,
  Share2,
  Images,
  Download,
  Smartphone,
  ShieldCheck,
  UserX,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants";

const steps = [
  { number: "01", title: "Upload Photos", description: "Select JPG or PNG images from your device.", icon: Upload },
  { number: "02", title: "Create Gallery", description: "Name your gallery and choose who can view it.", icon: FolderPlus },
  { number: "03", title: "Generate QR", description: "Get a unique, scannable QR code instantly.", icon: QrCode },
  { number: "04", title: "Share QR", description: "Print it, send it, or post it anywhere.", icon: Share2 },
  { number: "05", title: "View & Download", description: "Anyone can view and download photos, no account needed.", icon: Images },
];

const features = [
  { title: "JPG / PNG support", description: "Upload the formats you already use, validated on every upload.", icon: Images },
  { title: "QR sharing", description: "Every gallery gets a high-resolution, print-ready QR code.", icon: QrCode },
  { title: "Mobile-first galleries", description: "A fast, responsive viewing experience on any device.", icon: Smartphone },
  { title: "Individual downloads", description: "Visitors can save any photo in its original quality.", icon: Download },
  { title: "Download all", description: "One tap downloads every photo in a gallery as a ZIP.", icon: Download },
  { title: "Secure galleries", description: "Only you can manage, edit, or delete your galleries.", icon: ShieldCheck },
  { title: "Password protection", description: "Lock a gallery behind a password when you need privacy.", icon: ShieldCheck },
  { title: "No visitor account required", description: "Anyone with the link or QR code can view instantly.", icon: UserX },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" render={<Link href="/login" />}>
              Sign In
            </Button>
            <Button render={<Link href="/register" />}>Get Started</Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Create. Share. Scan.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            Turn your photos into a beautiful QR-powered gallery. Upload once, share a single QR
            code, and let anyone view or download your photos instantly.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" render={<Link href="/register" />}>
              Create Gallery
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" render={<Link href="#how-it-works" />}>
              View Demo
            </Button>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">How It Works</h2>
              <p className="mt-3 text-muted-foreground">
                From upload to sharing, five simple steps.
              </p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {steps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold tracking-wide text-primary">{step.number}</p>
                  <h3 className="mt-1 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Everything you need</h2>
              <p className="mt-3 text-muted-foreground">
                A focused feature set for sharing photos, without the bloat.
              </p>
            </div>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight">
              Ready to share your first gallery?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Free to start. No credit card required.
            </p>
            <div className="mt-8">
              <Button size="lg" render={<Link href="/register" />}>
                Create Your First Gallery
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <nav className="flex gap-4">
            <Link href="/login" className="hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground">
              Get Started
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
