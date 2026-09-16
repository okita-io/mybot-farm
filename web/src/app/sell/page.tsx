import type { Metadata } from "next";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { ApiKeysManager } from "@/components/api-keys-manager";
import { ConnectDashboardButton, ConnectOnboardButton } from "@/components/connect-onboard";
import { ContentPage, ContentSection } from "@/components/content-page";
import { SellForm } from "@/components/sell-form";
import { Button } from "@/components/ui/button";
import { listSellerApiKeys } from "@/lib/api-keys";
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
    "Sign in, post a scrubbed agent or team pack for free or a price, or create an API key so an agent can post listings. Paid bots need Stripe Connect. The farm keeps 10% of paid sales.",
  alternates: { canonical: "/sell" },
  openGraph: {
    title: `Sell | ${site.name}`,
    description:
      "List a scrubbed GAF pack on mybot.farm. Free listings need sign-in; paid bots check out through Stripe. The farm keeps 10%.",
    url: "/sell",
    images: [siteOgImage],
  },
};

export default async function SellPage({ searchParams }: PageProps<"/sell">) {
  const query = await searchParams;
  const user = await requireAppUser();
  const connectStatus = query.connect === "return" ? "return" : query.connect === "error" ? "error" : null;
  const editSlug = typeof query.edit === "string" ? query.edit.trim() : "";

  if (!user) {
    return (
      <ContentPage
        kicker="Sell"
        title="List an agent or team"
        lead="Sign in, then post a scrubbed pack as free or paid. Paid bots need Stripe payouts. You keep ownership. The farm hosts the bot, keeps 10% of each sale, and does not take responsibility for how the pack behaves after someone installs it."
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
  const apiKeys = await listSellerApiKeys(seller.id);
  const editing = editSlug
    ? listings.find((listing) => listing.slug === editSlug && !listing.deletedAt) ?? null
    : null;

  return (
    <ContentPage
      kicker="Sell"
      title="Post a bot"
      lead="List a free bot right away, or connect Stripe to sell paid packs. Create an API key if an agent should post listings without a browser session. Buyers check out on mybot.farm. The farm keeps 10% of paid sales for hosting — not the author’s computer, logins, or chat history."
    >
      {connectStatus === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          Stripe onboarding could not continue. Try Connect again.
        </p>
      ) : null}

      <ContentSection title="Payouts">
        {ready ? (
          <div className="space-y-4">
            <p>Stripe payouts are active. Open the dashboard to see transfers, or list a new bot below.</p>
            <ConnectDashboardButton />
          </div>
        ) : seller.stripeConnectAccountId ? (
          <div className="space-y-4">
            <p>
              Stripe still needs a bit more information before you can get paid.
              Continue onboarding for paid bots. Free listings work without it.
            </p>
            <ConnectOnboardButton label="Continue Stripe onboarding" />
          </div>
        ) : (
          <div className="space-y-4">
            <p>
              Free bots do not need Stripe. To sell paid packs, connect a Stripe
              Express account so the farm can send you 90% of each sale.
            </p>
            <ConnectOnboardButton />
          </div>
        )}
      </ContentSection>

      <ContentSection title="API keys">
        <p>
          Keys let agents and plugins call{" "}
          <code>POST /api/listings</code> or the WebMCP{" "}
          <code>post_listing</code> tool without a Clerk browser session. The
          plaintext secret is shown once. Paid listings still need Stripe
          payouts. The Sell form below keeps using your signed-in session.
        </p>
        <ApiKeysManager initialKeys={apiKeys} />
      </ContentSection>

      {listings.length ? (
        <ContentSection title="Your bots">
          <ul>
            {listings.map((listing) => (
              <li key={listing.id}>
                {listing.deletedAt ? (
                  <>
                    {listing.name}
                    {` — ${formatPriceLabel(listing.priceCents)} (removed by the farm)`}
                  </>
                ) : (
                  <>
                    <Link
                      href={stallPagePath({
                        kind: listing.kind === "team" ? "team" : "agent",
                        slug: listing.slug,
                      })}
                    >
                      {listing.name}
                    </Link>
                    {` — ${formatPriceLabel(listing.priceCents)}${listing.published ? "" : " (unpublished)"}`}
                    {" · "}
                    <Link href={`/sell?edit=${encodeURIComponent(listing.slug)}`}>
                      Update
                    </Link>
                  </>
                )}
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

      <ContentSection title={editing ? "Update bot" : "New bot"}>
        {editing ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/sell" className="font-medium text-foreground underline-offset-4 hover:underline">
              List a new bot
            </Link>
            {" instead."}
          </p>
        ) : null}
        {editSlug && !editing ? (
          <p className="text-sm text-destructive" role="alert">
            That bot is not in your list, was removed, or cannot be updated here.
          </p>
        ) : null}
        <p>
          {editing
            ? "Change the listing details or replace the scrubbed pack. Buyers keep the same bot URL. Publishing agrees to the "
            : "Scrub keys, private URLs, and customer data first. The pack you paste is what buyers download. You keep ownership; listing it does not transfer the pack to the farm. Hermes authors: "}
          {editing ? null : (
            <>
              <Link href="/how-to#hermes-share">export, then run scrub.py</Link>{" "}
              before you translate or paste a GAF pack. Publishing agrees to the{" "}
            </>
          )}
          <Link href="/terms">Terms of use</Link>.
        </p>
        <SellForm
          key={editing?.id ?? "new"}
          canSellPaid={ready}
          listing={
            editing
              ? {
                  id: editing.id,
                  slug: editing.slug,
                  kind: editing.kind === "team" ? "team" : "agent",
                  name: editing.name,
                  title: editing.title,
                  description: editing.description,
                  category: editing.category,
                  priceCents: editing.priceCents,
                  pack: editing.pack,
                }
              : undefined
          }
        />
      </ContentSection>
    </ContentPage>
  );
}
