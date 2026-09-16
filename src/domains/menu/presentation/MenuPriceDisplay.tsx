import { formatMoneyUsdEs } from "@/domains/orders/presentation/format-money";

type MenuPriceDisplayProps = {
  amount: number;
  className?: string;
};

export function MenuPriceDisplay({ amount, className }: MenuPriceDisplayProps) {
  return (
    <span className={className}>{formatMoneyUsdEs(amount)}</span>
  );
}
