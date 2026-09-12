const usdEsFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "USD",
});

export function formatMoneyUsdEs(amount: number): string {
  return usdEsFormatter.format(amount);
}
