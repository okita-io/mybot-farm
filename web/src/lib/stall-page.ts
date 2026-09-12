import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canDownloadStall, findStall } from "@/lib/catalog";
import { fulfillCheckoutSession } from "@/lib/checkout";
import { getStripe, hasStripeConfig } from "@/lib/stripe";
import { getUserByClerkId } from "@/lib/users";
import type { StallKind } from "@/lib/packs";

export async function loadPublicStall(slug: string, kind: StallKind) {
  const stall = await findStall(slug);
  if (!stall || stall.kind !== kind) {
    notFound();
  }

  return stall;
}

export async function stallPageState(
  slug: string,
  kind: StallKind,
  searchParams: { checkout?: string; session_id?: string },
) {
  const stall = await loadPublicStall(slug, kind);
  const { userId } = await auth();

  if (
    searchParams.checkout === "success" &&
    searchParams.session_id &&
    hasStripeConfig() &&
    userId
  ) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(
        searchParams.session_id,
      );
      if (session.metadata?.clerkUserId === userId) {
        await fulfillCheckoutSession(session);
      }
    } catch (error) {
      console.error("Checkout fulfillment on return failed:", error);
    }
  }

  const user = userId ? await getUserByClerkId(userId) : null;
  const canDownload = await canDownloadStall(stall, userId);
  const checkout: "success" | "cancel" | null =
    searchParams.checkout === "success" || searchParams.checkout === "cancel"
      ? searchParams.checkout
      : null;

  return {
    stall,
    canDownload,
    signedIn: Boolean(userId),
    checkout,
    isSeller: Boolean(user && stall.sellerUserId === user.id),
  };
}
