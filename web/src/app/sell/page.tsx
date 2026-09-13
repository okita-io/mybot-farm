import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { ConnectDashboardButton, ConnectOnboardButton } from "@/components/connect-onboard";
import { ContentPage, ContentSection } from "@/components/content-page";
import { SellForm } from "@/components/sell-form";
import { Button } from "@/components/ui/button";
import { refreshConnectStatus } from "@/lib/connect";
import { listSellerListings } from "@/lib/listings";
import { formatPriceLabel } from "@/lib/money";
import { stallPagePath } from "@/lib/packs";
import { site, siteOgImage } from "@/lib/site";
import { authorHref, getUserByClerkId, requireAppUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sell",
  description:
    "Sign in, post a scrubbed agent or team pack for free or a price, and sell it on mybot.farm. Paid stalls need Stripe Connect. The farm keeps 10% of paid sales.",
  alternates: { canonical: "/sell" },
  openGraph: {
    title: `Sell | ${site.name}`,
    description:
      "List a scrubbed GAF pack on mybot.farm. Free listings need sign-in; paid stalls check out through Stripe. The farm keeps 10%.",
    url: "/sell",
    images: [siteOgImage],
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
        lead="Sign in, then post a scrubbed pack as free or paid. Paid stalls need Stripe payouts. You keep ownership. The farm hosts the stall, keeps 10% of each sale, and does not take responsibility for how the pack behaves after someone installs it."
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
  const listings = await listSellerListings(seller.id);

  return (
    <ContentPage
      kicker="Sell"
      title="Post a stall"
      lead="List a free stall right away, or connect Stripe to sell paid packs. Buyers check out on mybot.farm. The farm keeps 10% of paid sales for hosting — not the author’s computer, logins, or chat history."
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
              Continue onboarding for paid stalls. Free listings work without it.
            </p>
            <ConnectOnboardButton label="Continue Stripe onboarding" />
          </div>
        ) : (
          <div className="space-y-4">
            <p>
              Free stalls do not need Stripe. To sell paid packs, connect a Stripe
              Express account so the farm can send you 90% of each sale.
            </p>
            <ConnectOnboardButton />
          </div>
        )}
      </ContentSection>

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
                {` — ${formatPriceLabel(listing.priceCents)}${listing.published ? "" : " (unpublished)"}`}
              </li>
            ))}
          </ul>
          {seller.username ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Public profile:{" "}
              <Link
                href={authorHref(seller.username)}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /authors/{seller.username}
              </Link>
            </p>
          ) : null}
        </ContentSection>
      ) : null}

      <ContentSection title="New stall">
        <p>
          Scrub keys, private URLs, and customer data first. The pack you
          paste is what buyers download. You keep ownership; listing it
          does not transfer the pack to the farm. Hermes authors:{" "}
          <Link href="/how-to#hermes-share">export, then run scrub.py</Link>{" "}
          before you translate or paste a GAF pack. Publishing agrees to the{" "}
          <Link href="/terms">Terms of use</Link>.
        </p>
        <SellForm canSellPaid={ready} />
      </ContentSection>
    </ContentPage>
  );
}
