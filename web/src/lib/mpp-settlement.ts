export const TEMPO_CONNECT_ACCOUNT_META = "connect_account_id";
export const TEMPO_APP_FEE_META = "application_fee_cents";

const TEMPO_TOKEN_DECIMALS = 6;

/** Convert Tempo TIP-20 raw units (6 decimals) to Stripe USD cents. */
export function tempoRawAmountToCents(rawAmount: string) {
  return Math.round(Number(rawAmount) / 10 ** (TEMPO_TOKEN_DECIMALS - 2));
}

export function tempoSettlementMetadata(input: {
  connectAccountId: string;
  applicationFeeCents: number;
  slug: string;
  listingId: string;
}) {
  return {
    product: "mybot.farm",
    billed: "stall_download",
    slug: input.slug,
    listingId: input.listingId,
    [TEMPO_CONNECT_ACCOUNT_META]: input.connectAccountId,
    [TEMPO_APP_FEE_META]: String(input.applicationFeeCents),
  };
}

export function parseTempoSettlementMetadata(
  metadata: Record<string, string> | undefined,
): { connectAccountId: string; applicationFeeCents: number } | null {
  if (!metadata) {
    return null;
  }
  const connectAccountId = metadata[TEMPO_CONNECT_ACCOUNT_META]?.trim() ?? "";
  const feeRaw = metadata[TEMPO_APP_FEE_META]?.trim() ?? "";
  const applicationFeeCents = Number(feeRaw);
  if (!connectAccountId || !Number.isFinite(applicationFeeCents) || applicationFeeCents < 0) {
    return null;
  }
  return { connectAccountId, applicationFeeCents: Math.floor(applicationFeeCents) };
}

export function buildTempoConnectPaymentIntent(input: {
  rawAmount: string;
  reference: string;
  metadata: Record<string, string>;
  connectAccountId: string;
  applicationFeeCents: number;
}) {
  const amountCents = tempoRawAmountToCents(input.rawAmount);
  return {
    amountCents,
    createParams: {
      amount: amountCents,
      currency: "usd",
      confirm: true,
      payment_method_data: { type: "crypto" as const },
      payment_method_types: ["crypto"],
      payment_method_options: {
        crypto: {
          mode: "transaction_verification",
          transaction_verification_options: {
            network: "tempo",
            transaction_hash: input.reference,
          },
        },
      },
      metadata: input.metadata,
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.connectAccountId },
    },
    idempotencyKey: input.reference,
  };
}
