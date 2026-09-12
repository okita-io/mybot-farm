const DEFAULT_PLATFORM_FEE_BPS = 1000;

export function platformFeeBps() {
  const raw = process.env.PLATFORM_FEE_BPS;
  const parsed = raw ? Number(raw) : DEFAULT_PLATFORM_FEE_BPS;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_PLATFORM_FEE_BPS;
  }

  return Math.floor(parsed);
}

export function applicationFeeCents(priceCents: number) {
  const fee = Math.round((priceCents * platformFeeBps()) / 10_000);

  if (priceCents <= 1) {
    return 0;
  }

  return Math.min(Math.max(fee, 1), priceCents - 1);
}
