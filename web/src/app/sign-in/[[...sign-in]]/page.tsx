import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to mybot.farm with Clerk to list a stall, buy a paid pack, or manage Stripe payouts. Browsing free stalls does not require an account.",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <SignIn />
    </div>
  );
}
