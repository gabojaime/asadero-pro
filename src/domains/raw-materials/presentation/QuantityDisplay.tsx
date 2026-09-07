import type { UnitOfMeasure } from "@/domains/raw-materials/domain/entities";
import { formatQuantityWithSuffix } from "./formatters";

type QuantityDisplayProps = {
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  className?: string;
};

export function QuantityDisplay({
  quantity,
  unitOfMeasure,
  className,
}: QuantityDisplayProps) {
  return (
    <span className={className}>{formatQuantityWithSuffix(quantity, unitOfMeasure)}</span>
  );
}
