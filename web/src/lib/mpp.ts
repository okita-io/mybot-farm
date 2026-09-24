import crypto from "node:crypto";
import Stripe from "stripe";
import { Mppx, stripe } from "mppx/server";
import {
  buildTempoConnectPaymentIntent,
  parseTempoSettlementMetadata,
} from "@/lib/mpp-settlement";

export const MPP_MIN_USD = "0.50";
export const MPP_PRICE_USD = MPP_MIN_USD;
export const MPP_PRICE_DESCRIPTION = "mybot.farm paid stall download";

export { usdAmountFromCents } from "@/lib/mpp-amount";

export {
  buildTempoConnectPaymentIntent,
  parseTempoSettlementMetadata,
  tempoRawAmountToCents,
  tempoSettlementMetadata,
  TEMPO_APP_FEE_META,
  TEMPO_CONNECT_ACCOUNT_META,
} from "@/lib/mpp-settlement";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function getMppStripeSecretKey() {
  return process.env.STRIPE_MPP_SECRET_KEY || requiredEnv("STRIPE_SECRET_KEY");
}

export function hasMppConfig() {
  return Boolean(
    (process.env.STRIPE_MPP_SECRET_KEY || process.env.STRIPE_SECRET_KEY) &&
      process.env.STRIPE_PROFILE_ID &&
      process.env.TEMPO_DEPOSIT_ADDRESS,
  );
}

function createTempoConnectRecorder(client: Stripe) {
  return async (params: {
    receipt?: { reference?: string } | null;
    request?: { amount?: string } | null;
    requestInput?: {
      paymentIntentOptions?:
        | { metadata?: Record<string, string> }
        | ((...args: unknown[]) => unknown)
        | undefined;
    };
  }) => {
    const reference = params.receipt?.reference;
    const rawAmount = params.request?.amount;
    if (!reference || !rawAmount) {
      return;
    }

    const optionsInput = params.requestInput?.paymentIntentOptions;
    const options =
      typeof optionsInput === "function" ? undefined : optionsInput;
    const metadata = {
      product: "mybot.farm",
      billed: "stall_download",
      ...(options?.metadata ?? {}),
    };
    const settlement = parseTempoSettlementMetadata(metadata);
    if (!settlement) {
      console.error(
        "[mpp] tempo payment missing connect settlement metadata; skipping PI recording",
      );
      return;
    }

    const built = buildTempoConnectPaymentIntent({
      rawAmount,
      reference,
      metadata,
      connectAccountId: settlement.connectAccountId,
      applicationFeeCents: settlement.applicationFeeCents,
    });

    if (built.amountCents < 1) {
      console.warn(
        `[mpp] skipping Tempo PI: ${rawAmount} raw units rounds to ${built.amountCents} cents`,
      );
      return;
    }

    try {
      await client.paymentIntents.create(
        built.createParams as Stripe.PaymentIntentCreateParams,
        {
          idempotencyKey: built.idempotencyKey,
        },
      );
    } catch (error) {
      console.error("[mpp] failed to record Tempo payment with Connect:", error);
    }
  };
}

function createMppx() {
  const secretKey = getMppStripeSecretKey();
  const mppSecretKey = crypto
    .createHmac("sha256", secretKey)
    .update("mpp-challenge-signing")
    .digest("base64");

  const stripeClient = new Stripe(secretKey, {
    appInfo: {
      name: "mybot.farm/machine-payments",
      url: "https://mybot.farm",
      version: "0.1.0",
    },
  });

  const depositAddress = requiredEnv("TEMPO_DEPOSIT_ADDRESS");
  const stripeMachinePayments = stripe.create({
    client: stripeClient,
    networkId: requiredEnv("STRIPE_PROFILE_ID"),
    livemode: !secretKey.includes("_test_"),
    depositAddresses: {
      tempo: depositAddress,
    },
    metadata: {
      product: "mybot.farm",
      billed: "stall_download",
    },
  });

  // Override Tempo onPaymentSuccess so Connect destination/fee land on the
  // recorded crypto PaymentIntent (mppx only applies create-time connect).
  // Runtime accepts onPaymentSuccess via ...rest; published types omit it.
  const tempoMethod = stripeMachinePayments.tempo.charge({
    recipient: depositAddress as never,
    onPaymentSuccess: createTempoConnectRecorder(stripeClient),
  } as Parameters<typeof stripeMachinePayments.tempo.charge>[0]);

  return Mppx.create({
    methods: [tempoMethod, stripeMachinePayments.spt.charge()],
    secretKey: mppSecretKey,
  });
}

type FarmMppx = ReturnType<typeof createMppx>;
let mppx: FarmMppx | undefined;

export function getMppx(): FarmMppx {
  mppx ??= createMppx();
  return mppx;
}

export function paidCharge(options?: {
  amount?: string;
  description?: string;
}) {
  return getMppx().charge({
    amount: options?.amount ?? MPP_MIN_USD,
    description: options?.description ?? MPP_PRICE_DESCRIPTION,
  });
}
