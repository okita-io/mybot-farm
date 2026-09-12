import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { ConnectDashboardButton, ConnectOnboardButton } from "@/components/connect-onboard";
import { ContentPage, ContentSection } from "@/components/content-page";
import { SellForm } from "@/components/sell-form";
import { Button } from "@/components/ui/button";
import { refreshConnectStatus } from "@/lib/connect";
import { listSellerListings } from "@/lib/listings";
import { formatUsd } from "@/lib/money";
import { stallPagePath } from "@/lib/packs";
import { site } from "@/lib/site";
import { getUserByClerkId, requireAppUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell an agent or team",
  description:
    "Connect Stripe, post a scrubbed agent or team pack, set a price, and sell it on mybot.farm. The farm keeps 10% for hosting.",
  alternates: { canonical: "/sell" },
  openGraph: {
    title: `Sell an agent or team | ${site.name}`,
    description:
      "List a scrubbed GAF pack on mybot.farm. Buyers check out on the farm; you get paid through Stripe. The farm keeps 10%.",
    url: "/sell",
  },
};

export default async function SellPage({ searchParams }: PageProps<"/sell">) {
  const query = await searchParams;
  const user = await requireAppUser();
  const connectStatus = query.connect === "return" ? "return" : query.connect === "error" ? "error" : null;

  if (!user) {
    return (
      <ContentPage
        kicker="Sell"
        title="List an agent or team"
        lead="Sign in, connect Stripe payouts, then post a scrubbed pack with a price. The farm hosts the stall and keeps 10% of each sale."
      >
        <SignInButton mode="modal" forceRedirectUrl="/sell" fallbackRedirectUrl="/sell">
          <Button type="button" size="lg" className="h-11 rounded-full px-5">
            Sign in to sell
          </Button>
        </SignInButton>
      </ContentPage>
    );
  }

  if (user.stripeConnectAccountId && connectStatus === "return") {
    await refreshConnectStatus(user.stripeConnectAccountId).catch((error) => {
      console.error("Connect return refresh failed:", error);
    });
  }

  const seller = (await getUserByClerkId(user.clerkUserId)) ?? user;
  const ready = Boolean(
    seller.stripeConnectAccountId && seller.stripeConnectTransfersActive,
  );
  const listings = ready ? await listSellerListings(seller.id) : [];

  return (
    <ContentPage
      kicker="Sell"
      title="Post a stall, set a price"
      lead="Buyers check out on mybot.farm. Stripe sends the rest to you. The farm keeps 10% for hosting the pack — not the author’s computer, logins, or chat history."
    >
      {connectStatus === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          Stripe onboarding could not continue. Try Connect again.
        </p>
      ) : null}

      <ContentSection title="Payouts">
        {ready ? (
          <div className="space-y-4">
            <p>Stripe payouts are active. Open the dashboard to see transfers, or list a new stall below.</p>
            <ConnectDashboardButton />
          </div>
        ) : seller.stripeConnectAccountId ? (
          <div className="space-y-4">
            <p>
              Stripe still needs a bit more information before you can get paid.
              Continue onboarding, then come back here.
            </p>
            <ConnectOnboardButton label="Continue Stripe onboarding" />
          </div>
        ) : (
          <div className="space-y-4">
            <p>
              Connect a Stripe Express account so the farm can send you 90% of
              each sale. Onboarding is hosted by Stripe.
            </p>
            <ConnectOnboardButton />
          </div>
        )}
      </ContentSection>

      {ready ? (
        <>
          {listings.length ? (
            <ContentSection title="Your stalls">
              <ul>
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <Link
                      href={stallPagePath({
                        kind: listing.kind === "team" ? "team" : "agent",
                        slug: listing.slug,
                      })}
                    >
                      {listing.name}
                    </Link>
                    {` — ${formatUsd(listing.priceCents)}${listing.published ? "" : " (unpublished)"}`}
                  </li>
                ))}
              </ul>
            </ContentSection>
          ) : null}

          <ContentSection title="New stall">
            <p>
              Scrub keys, private URLs, and customer data first. The pack you
              paste is what buyers download. Hermes authors:{" "}
              <Link href="/how-to#hermes-share">export, then run scrub.py</Link>{" "}
              before you translate or paste a GAF pack.
            </p>
            <SellForm />
          </ContentSection>
        </>
      ) : null}
    </ContentPage>
  );
}
