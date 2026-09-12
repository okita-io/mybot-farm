import { getStripe } from "@/lib/stripe";
import {
  linkConnectAccount,
  setConnectTransfersActive,
  type ClerkUserInput,
} from "@/lib/users";
import type { users } from "@/lib/db/schema";

const CONNECT_COUNTRIES = [
  "us",
  "gb",
  "ca",
  "au",
  "ie",
  "de",
  "fr",
  "nl",
  "es",
  "it",
  "nz",
  "sg",
] as const;

type UserRow = typeof users.$inferSelect;

export function isConnectCountry(value: string): value is (typeof CONNECT_COUNTRIES)[number] {
  return CONNECT_COUNTRIES.includes(value as (typeof CONNECT_COUNTRIES)[number]);
}

export function recipientTransfersActive(account: {
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string };
        };
      };
    };
  };
}) {
  return (
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active"
  );
}

export async function retrieveConnectAccount(accountId: string) {
  const stripe = getStripe();
  return stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
}

export async function refreshConnectStatus(accountId: string) {
  const account = await retrieveConnectAccount(accountId);
  const active = recipientTransfersActive(account);
  await setConnectTransfersActive(accountId, active);
  return { account, transfersActive: active };
}

export async function ensureConnectAccount(
  user: UserRow,
  clerk: ClerkUserInput,
  country: string,
) {
  if (user.stripeConnectAccountId) {
    return user.stripeConnectAccountId;
  }

  if (!isConnectCountry(country)) {
    throw new Error("unsupported_country");
  }

  const stripe = getStripe();
  const displayName =
    [clerk.firstName, clerk.lastName].filter(Boolean).join(" ") ||
    clerk.email ||
    "mybot.farm seller";

  const account = await stripe.v2.core.accounts.create({
    contact_email: clerk.email ?? undefined,
    display_name: displayName,
    dashboard: "express",
    identity: {
      country,
    },
    defaults: {
      responsibilities: {
        fees_collector: "application",
        losses_collector: "application",
      },
    },
    configuration: {
      recipient: {
        capabilities: {
          stripe_balance: {
            stripe_transfers: { requested: true },
          },
        },
      },
    },
    metadata: {
      clerkUserId: clerk.id,
      userId: user.id,
    },
  });

  await linkConnectAccount(clerk.id, account.id, recipientTransfersActive(account));
  return account.id;
}

export async function createConnectOnboardingLink(input: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
  existing: boolean;
}) {
  const stripe = getStripe();
  const type = input.existing ? "account_update" : "account_onboarding";
  const useCase =
    type === "account_update"
      ? {
          type: "account_update" as const,
          account_update: {
            configurations: ["recipient" as const],
            refresh_url: input.refreshUrl,
            return_url: input.returnUrl,
          },
        }
      : {
          type: "account_onboarding" as const,
          account_onboarding: {
            configurations: ["recipient" as const],
            refresh_url: input.refreshUrl,
            return_url: input.returnUrl,
          },
        };

  const link = await stripe.v2.core.accountLinks.create({
    account: input.accountId,
    use_case: useCase,
  });

  return link.url;
}

export async function createConnectDashboardLink(accountId: string) {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
