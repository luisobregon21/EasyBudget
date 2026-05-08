const BASE_URL = "https://open.er-api.com/v6/latest/USD";

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

export async function fetchRatesUsd(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < 3_600_000) return cache.rates;
  const res = await fetch(BASE_URL, { next: { revalidate: 3600 } });
  const data = await res.json();
  cache = { rates: data.rates, fetchedAt: Date.now() };
  return data.rates;
}

export async function fetchRateForCurrency(currency: string): Promise<number> {
  if (currency === "USD") return 1;
  const rates = await fetchRatesUsd();
  return rates[currency] ?? 1;
}

export async function convertToUsd(
  amount: number,
  currency: string
): Promise<{ amountUsd: number; rate: number }> {
  const rate = await fetchRateForCurrency(currency);
  return { amountUsd: amount / rate, rate };
}
