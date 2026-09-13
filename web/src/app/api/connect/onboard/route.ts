import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createConnectDashboardLink, createConnectOnboardingLink, ensureConnectAccount, isConnectCountry, refreshConnectStatus } from "@/lib/connect";
import { appOrigin } from "@/lib/origin";
import { hasStripeConfig } from "@/lib/stripe";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

async function onboardingResponse(request: Request, country = "us") {
  if (!hasStripeConfig()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "email_required", message: "Add an email to your account before connecting Stripe." },
      { status: 400 },
    );
  }

  if (!isConnectCountry(country)) {
    return NextResponse.json({ error: "unsupported_country" }, { status: 400 });
  }

  const origin = appOrigin(request);
  const accountId = await ensureConnectAccount(
    user,
    {
      id: user.clerkUserId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    },
    country,
  );

  const status = await refreshConnectStatus(accountId);
  const url = await createConnectOnboardingLink({
    accountId,
    returnUrl: `${origin}/sell?connect=return`,
    refreshUrl: `${origin}/api/connect/onboard`,
  });

  return { url, transfersActive: status.transfersActive };
}

export async function GET(request: Request) {
  const { userId } = await auth();
  const origin = appOrigin(request);

  if (!userId) {
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set("redirect_url", `${origin}/sell`);
    return NextResponse.redirect(signIn);
  }

  try {
    const result = await onboardingResponse(request);
    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Connect onboard GET failed:", error);
    return NextResponse.redirect(`${origin}/sell?connect=error`);
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => ({}));
    const country =
      body && typeof body === "object" && "country" in body && typeof body.country === "string"
        ? body.country.toLowerCase()
        : "us";
    const dashboard =
      body && typeof body === "object" && "dashboard" in body && body.dashboard === true;

    const user = await requireAppUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (dashboard) {
      if (!user.stripeConnectAccountId || !user.stripeConnectTransfersActive) {
        return NextResponse.json({ error: "not_ready" }, { status: 409 });
      }

      const url = await createConnectDashboardLink(user.stripeConnectAccountId);
      return NextResponse.json({ url });
    }

    const result = await onboardingResponse(request, country);
    if (result instanceof NextResponse) {
      return result;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Connect onboard POST failed:", error);
    return NextResponse.json({ error: "onboard_failed" }, { status: 500 });
  }
}
