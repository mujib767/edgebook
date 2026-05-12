export interface TradeInput {
  trade_type: "Long" | "Short";
  lot_size: number;
  entry_price: number;
  exit_price: number;
}

export function calcPnl({ trade_type, lot_size, entry_price, exit_price }: TradeInput) {
  const direction = trade_type === "Long" ? 1 : -1;
  const pnl = (exit_price - entry_price) * direction * lot_size;
  const pnl_percent =
    entry_price > 0
      ? ((exit_price - entry_price) / entry_price) * 100 * direction
      : 0;
  let status: "Win" | "Loss" | "Breakeven" = "Breakeven";
  if (pnl > 0.0001) status = "Win";
  else if (pnl < -0.0001) status = "Loss";
  return { pnl, pnl_percent, status };
}

export function fmtMoney(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function pnlClass(n: number) {
  if (n > 0) return "text-profit";
  if (n < 0) return "text-loss";
  return "text-muted-foreground";
}

export const ASSET_TYPES = ["Forex", "Crypto", "Stocks", "Futures", "Indices"] as const;
export const MISTAKES = [
  "FOMO",
  "Revenge Trading",
  "Early Exit",
  "Late Entry",
  "No Stop Loss",
  "Overtrading",
  "Other",
] as const;
export const EMOTIONS = ["Calm", "Anxious", "Confident", "Fearful", "Greedy"] as const;
export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"] as const;
