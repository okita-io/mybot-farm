import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a mybot.farm account with Clerk to sell a stall or unlock a paid pack. We do not sell personal data. See Privacy and Terms.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <SignUp />
    </div>
  );
}
