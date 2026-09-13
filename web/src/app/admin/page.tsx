import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import { AdminFlagQueue } from "@/components/admin-flag-queue";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { listOpenFlagGroups, listRecentTakedowns } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  description: "Review flagged stalls on mybot.farm.",
  robots: { index: false, follow: false },
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default async function AdminPage() {
  const admin = await requireAdmin();

  if (!admin.user) {
    return (
      <ContentPage
        kicker="Admin"
        title="Review reports"
        lead="Sign in with an admin account to review flagged stalls and remove bad listings."
      >
        <SignInButton mode="modal" forceRedirectUrl="/admin" fallbackRedirectUrl="/admin">
          <Button type="button" size="lg" className="h-11 rounded-full px-5">
            Sign in
          </Button>
        </SignInButton>
      </ContentPage>
    );
  }

  if (!admin.ok) {
    return (
      <ContentPage
        kicker="Admin"
        title="Not an admin"
        lead="This queue is only for emails listed in ADMIN_EMAILS."
      >
        <p>You are signed in, but this account cannot moderate stalls.</p>
      </ContentPage>
    );
  }

  const [groups, takedowns] = await Promise.all([
    listOpenFlagGroups(),
    listRecentTakedowns(),
  ]);

  return (
    <ContentPage
      kicker="Admin"
      title="Flagged stalls"
      lead="Reports from signed-in users land here. Remove a stall to take it off the catalog and stop downloads. Dismiss reports if the listing is fine."
    >
      <ContentSection title="Open reports">
        <AdminFlagQueue groups={groups} />
      </ContentSection>
      {takedowns.length ? (
        <ContentSection title="Recently removed">
          <ul>
            {takedowns.map((item) => (
              <li key={`${item.slug}-${item.createdAt}`}>
                {item.name} ({item.slug}) — {formatWhen(item.createdAt)}
                {item.adminUsername ? ` by ${item.adminUsername}` : null}
                {item.note ? ` · ${item.note}` : null}
              </li>
            ))}
          </ul>
        </ContentSection>
      ) : null}
    </ContentPage>
  );
}
