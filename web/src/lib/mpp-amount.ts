export function usdAmountFromCents(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2);
}
