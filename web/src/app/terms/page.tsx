import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { termsPageLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Creators own the agents and teams they list. The farm keeps 10% of each sale and is not responsible for how a pack behaves after someone installs it.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms | ${site.name}`,
    description:
      "You own your pack. The farm keeps 10%. Creators are responsible for agent and team behavior after a buyer installs it.",
    url: "/terms",
    images: [siteOgImage],
  },
};

export default function TermsPage() {
  return (
    <>
      <JsonLd data={termsPageLd} />
      <ContentPage
        kicker="Terms of use"
        title="You own the pack. We host the stall."
        lead="mybot.farm does not claim ownership of the agents or teams you submit. The farm keeps 10% of each sale as a hosting fee. The creator is responsible for how that agent or team behaves once a buyer installs it."
      >
        <ContentSection title="The short version">
          <ul>
            <li>
              Listings belong to the person or team who created them. The farm
              does not take title to your pack.
            </li>
            <li>
              If a stall sells, mybot.farm collects 10% of the listing price.
              The rest goes to the creator through Stripe.
            </li>
            <li>
              The creator is responsible for the agent or team: what it does,
              what it says, and what happens after someone downloads it.
            </li>
            <li>
              The farm claims no responsibility for how an installed agent or
              team behaves in the buyer’s runtime.
            </li>
          </ul>
          <p>
            Last updated September 12, 2026. Plain language on purpose. Privacy
            and cookies are on the <Link href="/privacy">Privacy</Link> page.
          </p>
        </ContentSection>

        <ContentSection title="Who owns a listing">
          <p>
            When you publish an agent or a team, you keep ownership of that
            work. mybot.farm does not claim copyright, trademark, or other
            ownership of your submission. You grant the farm only the license
            it needs to host the stall, show the listing, and deliver a copy to
            someone who is allowed to download it (free seed packs, or a paid
            purchase).
          </p>
          <p>
            You must have the right to list what you post. Do not paste a pack
            you do not own or are not allowed to share. Secrets, private URLs,
            and other people’s data should already be scrubbed.
          </p>
        </ContentSection>

        <ContentSection title="The 10% hosting fee">
          <p>
            Paid stalls check out on mybot.farm. Stripe processes the payment.
            The farm keeps <strong>10% of the listing price</strong> as a
            hosting fee. The remaining 90% is owed to the creator, minus
            Stripe’s own processing fees, through Stripe Connect.
          </p>
          <p>
            Seed stalls from the farm stay free. Listing a pack is not a sale
            of the creator’s IP to mybot.farm — it is a stall on a market.
          </p>
        </ContentSection>

        <ContentSection title="Who is responsible for the agent or team">
          <p>
            The creator of the agent or team — the person or group who listed
            it — is responsible for its design, its instructions, its tools,
            and its behavior. That includes what it does after a buyer
            installs a copy in Grok Bot, Hermes, OpenClaw, or any other
            runtime.
          </p>
          <p>
            mybot.farm hosts files and a checkout. We do not operate the agent
            on the buyer’s machine. We do not supervise chats, tool calls, or
            side effects once the pack is in use. We claim{" "}
            <strong>no responsibility</strong> for how an agent or team
            behaves, what it outputs, what it buys, what it deletes, what it
            tells someone, or any harm that follows from using a downloaded
            copy.
          </p>
          <p>
            Buyers use packs at their own risk. Read the stall, scrub your own
            secrets, and keep keys off the table. Third-party runtimes (Grok
            Bot, Hermes, and the rest) have their own terms; those are not
            ours.
          </p>
        </ContentSection>

        <ContentSection title="Accounts and payments">
          <p>
            Optional accounts are provided by Clerk. Payments and payouts are
            provided by Stripe. Their terms and privacy policies apply to those
            flows. See <Link href="/privacy">Privacy</Link> for how we treat
            that data, including cookies.
          </p>
        </ContentSection>

        <ContentSection title="Acceptable stalls">
          <p>
            Do not list malware, packs designed to steal credentials, or
            content you do not have the right to share. Signed-in visitors can
            report a stall as illegal, harmful, corrupt, or unusable. The farm
            can take a stall down if it is unlawful, abusive, broken, or a
            secret leak. Taking a stall down is not an admission that we
            reviewed or endorse what remains.
          </p>
        </ContentSection>

        <ContentSection title="Links">
          <ul>
            <li>
              <Link href="/privacy">Privacy and cookies</Link>
            </li>
            <li>
              <Link href="/sell">Sell a stall</Link>
            </li>
            <li>
              <Link href="/about">About the farm</Link>
            </li>
            <li>
              <Link href="/catalog">Open stalls</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
