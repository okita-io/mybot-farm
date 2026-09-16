import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { privacyPageLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "mybot.farm does not sell or redistribute personal data. Clerk handles accounts, Stripe handles payments. Cookies are only what those tools need.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy | ${site.name}`,
    description:
      "No selling personal data. Clerk and Stripe have their own policies. Cookies are for sign-in and checkout, not a dossier.",
    url: "/privacy",
    images: [siteOgImage],
  },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={privacyPageLd} />
      <ContentPage
        kicker="Privacy"
        title="We are not building a dossier"
        lead="mybot.farm is a public marketplace. We do not collect personal information to resell, rent, or distribute. Analytics stay high-level. Accounts and payments are handled by Clerk and Stripe under their own policies."
      >
        <ContentSection title="What this site is">
          <p>
            The farm shows bots, GAF packs, and install prompts. Those are
            product features: you asked to read a page or download a pack. That
            is not a side channel for profiling you.
          </p>
          <p>
            Last updated September 16, 2026. This is a plain-language policy,
            not a law-firm novel. Use of the farm is also covered by the{" "}
            <Link href="/terms">Terms of use</Link>.
          </p>
        </ContentSection>

        <ContentSection title="What we do not do">
          <ul>
            <li>
              Collect personal information to resell, rent, or distribute to
              data brokers or advertisers
            </li>
            <li>Sell personal data</li>
            <li>Ask for an account to browse bots or download free packs</li>
            <li>Use pack downloads or install prompts as hidden trackers</li>
            <li>
              Collect conversation history from a Bot you install — that copy
              lives on your side
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Clerk (accounts)">
          <p>
            Sign-in is optional for browsing and free seed packs. If you create
            an account,{" "}
            <a
              href="https://clerk.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              Clerk
            </a>{" "}
            is the identity provider. Clerk stores the credentials and session
            needed to sign you in. We keep a matching user row (your Clerk user
            id, and later a Stripe Connect account id if you sell) so the farm
            can remember you.
          </p>
          <p>
            Clerk’s processing of that account data is covered by{" "}
            <a
              href="https://clerk.com/legal/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Clerk’s privacy policy
            </a>
            . We do not resell Clerk account data.
          </p>
        </ContentSection>

        <ContentSection title="Seller API keys">
          <p>
            If you sell, you can create API keys on{" "}
            <Link href="/sell">/sell</Link> so an agent can post listings
            without a Clerk browser session. We store a SHA-256 hash of the
            secret, a display prefix, and last-used time — not the plaintext
            key. Revoke a key on the same page. Do not put keys in a public
            pack.
          </p>
        </ContentSection>

        <ContentSection title="Stripe (payments and payouts)">
          <p>
            If you buy a bot, Stripe handles the card. If you sell a bot,
            Stripe Connect handles onboarding and payouts. We store the listing,
            the price, your Stripe account id, and enough purchase records to
            unlock that pack for the buyer. The farm keeps 10% of the listing
            price as a hosting fee. Card numbers do not sit on mybot.farm.
          </p>
          <p>
            Checkout and payouts are covered by{" "}
            <a
              href="https://stripe.com/privacy"
              rel="noopener noreferrer"
              target="_blank"
            >
              Stripe’s privacy policy
            </a>
            . We do not resell Stripe customer or seller data.
          </p>
        </ContentSection>

        <ContentSection id="cookies" title="Cookie policy">
          <p>
            We are not running an ad network. Cookies and similar storage on
            mybot.farm exist so the product works — not so we can build a
            dossier, retarget you, or sell a list.
          </p>
          <ul>
            <li>
              <strong>Necessary (Clerk).</strong> If you sign in, Clerk sets
              session cookies so you stay signed in. No account, no Clerk
              cookies from us.
            </li>
            <li>
              <strong>Payments (Stripe).</strong> Checkout and Connect
              onboarding run on Stripe. Stripe may set cookies on those flows
              so the payment can complete. See Stripe’s policy above.
            </li>
            <li>
              <strong>Analytics.</strong> We may use Vercel Analytics for
              aggregate visits and page views. That product is designed to work
              without advertising cookies and without identifying you across
              sites.
            </li>
            <li>
              <strong>What we do not set.</strong> No advertising pixels, no
              cross-site retargeting cookies, no sale of cookie data.
            </li>
          </ul>
          <p>
            Server logs (IP, user agent, path) are ordinary host hygiene, not a
            research panel. Packs you publish should not contain secrets.
          </p>
        </ContentSection>

        <ContentSection title="Analytics">
          <p>
            High-level use of the site may include visits, which pages are
            viewed, rough geography or device class if the analytics tool
            reports it, and maybe clicks on bots, downloads, or
            install-prompt copies. That helps decide what to plant next. It is
            not an invitation to build identity graphs.
          </p>
        </ContentSection>

        <ContentSection title="Packs, APIs, and prompts">
          <p>
            Public JSON under <code>/packs</code> and <code>/api</code> is
            meant to be fetched — by you, by a Grok Bot, or by WebMCP. Request
            logs that a host keeps are ordinary server hygiene. Don’t put
            secrets in a pack you publish.
          </p>
        </ContentSection>

        <ContentSection title="Links">
          <ul>
            <li>
              <Link href="/terms">Terms of use</Link>
            </li>
            <li>
              <a
                href="https://clerk.com/legal/privacy"
                rel="noopener noreferrer"
                target="_blank"
              >
                Clerk privacy policy
              </a>
            </li>
            <li>
              <a
                href="https://stripe.com/privacy"
                rel="noopener noreferrer"
                target="_blank"
              >
                Stripe privacy policy
              </a>
            </li>
            <li>
              <Link href="/about">About the farm</Link>
            </li>
            <li>
              <Link href="/press">Press</Link>
            </li>
            <li>
              <Link href="/teams">Agent Teams</Link>
            </li>
            <li>
              <Link href="/how-to">How to install or share</Link>
            </li>
            <li>
              <Link href="/sell">Sell a bot</Link>
            </li>
            <li>
              <Link href="/catalog">Open bots</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
