export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatPriceLabel(cents: number) {
  return cents <= 0 ? "Free" : formatUsd(cents);
}

export function dollarsToCents(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}
