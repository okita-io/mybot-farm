import crypto from "node:crypto";
import Stripe from "stripe";
import { Mppx, stripe } from "mppx/server";

export const MPP_MIN_USD = "0.50";
export const MPP_PRICE_USD = MPP_MIN_USD;
export const MPP_PRICE_DESCRIPTION = "mybot.farm paid stall download";

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

export function usdAmountFromCents(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}

let mppx: ReturnType<typeof Mppx.create> | undefined;

export function getMppx() {
  if (mppx) {
    return mppx;
  }

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

  const stripeMachinePayments = stripe.create({
    client: stripeClient,
    networkId: requiredEnv("STRIPE_PROFILE_ID"),
    livemode: !secretKey.includes("_test_"),
    depositAddresses: {
      tempo: requiredEnv("TEMPO_DEPOSIT_ADDRESS"),
    },
    metadata: {
      product: "mybot.farm",
      billed: "stall_download",
    },
  });

  mppx = Mppx.create({
    methods: stripeMachinePayments.defaultMethods(),
    secretKey: mppSecretKey,
  });

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
