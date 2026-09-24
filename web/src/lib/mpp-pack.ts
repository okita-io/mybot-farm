import { applicationFeeCents } from "@/lib/fees";
import { jsonResponse, paymentRequiredResponse } from "@/lib/http";
import {
  getMppx,
  hasMppConfig,
  MPP_PRICE_DESCRIPTION,
  tempoSettlementMetadata,
  usdAmountFromCents,
} from "@/lib/mpp";
import type { Stall } from "@/lib/packs";
import { getUserById } from "@/lib/users";

export async function withPaidStallPayment(
  request: Request,
  stall: Stall,
  fulfill: () => Response | Promise<Response>,
) {
  const priceCents = stall.priceCents ?? 0;
  if (priceCents <= 0) {
    return fulfill();
  }

  if (!hasMppConfig()) {
    return paymentRequiredResponse(stall.slug, priceCents);
  }

  if (!stall.sellerUserId) {
    return jsonResponse(
      { error: "connect_required", slug: stall.slug },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const seller = await getUserById(stall.sellerUserId);
  if (!seller?.stripeConnectAccountId || !seller.stripeConnectTransfersActive) {
    return jsonResponse(
      { error: "connect_required", slug: stall.slug },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const amount = usdAmountFromCents(priceCents);
  const description = `${MPP_PRICE_DESCRIPTION}: ${stall.name}`;
  const feeCents = applicationFeeCents(priceCents);
  const connectAccountId = seller.stripeConnectAccountId;
  const listingMeta = {
    billed: "stall_download",
    slug: stall.slug,
    listingId: stall.listingId ?? "",
  };

  const result = await getMppx().compose(
    [
      "stripe/charge",
      {
        amount,
        description,
        connect: {
          applicationFeeAmount: feeCents,
          transferData: { destination: connectAccountId },
        },
        paymentIntentOptions: {
          metadata: listingMeta,
        },
      },
    ],
    [
      "tempo/charge",
      {
        amount,
        description,
        paymentIntentOptions: {
          metadata: tempoSettlementMetadata({
            connectAccountId,
            applicationFeeCents: feeCents,
            slug: stall.slug,
            listingId: stall.listingId ?? "",
          }),
        },
      },
    ],
  )(request);

  if (result.status === 402) {
    return result.challenge;
  }

  return result.withReceipt(await fulfill());
}
