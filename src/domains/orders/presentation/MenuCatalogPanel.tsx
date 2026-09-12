"use client";

import type { MenuItem } from "../domain/entities";
import { ORDER_COPY } from "./copy";
import { formatMoneyUsdEs } from "./format-money";
import { Button } from "@/shared/presentation/ui/button";

type MenuCatalogPanelProps = {
  items: MenuItem[];
  onAddMeat: (item: MenuItem) => void;
  onAddSimpleItem: (item: MenuItem) => void;
};

function groupLabel(group: string): string {
  switch (group) {
    case "beef":
      return ORDER_COPY.beef;
    case "pork":
      return ORDER_COPY.pork;
    case "chicken":
      return ORDER_COPY.chicken;
    default:
      return group;
  }
}

export function MenuCatalogPanel({
  items,
  onAddMeat,
  onAddSimpleItem,
}: MenuCatalogPanelProps) {
  const meatItems = items.filter((item) => item.itemKind === "meat_plate");
  const drinkItems = items.filter((item) => item.itemKind === "drink");

  const meatGroups = meatItems.reduce<Record<string, MenuItem[]>>(
    (groups, item) => {
      const key = item.proteinGroup ?? "other";
      groups[key] = [...(groups[key] ?? []), item];
      return groups;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(meatGroups).map(([group, groupItems]) => (
        <section key={group} className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold tracking-tight">
            {groupLabel(group)}
          </h2>
          <div className="grid gap-2">
            {groupItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-between px-4 py-3 text-left"
                onClick={() => onAddMeat(item)}
              >
                <span>
                  <span className="block text-[15px] font-semibold">
                    {item.name}
                  </span>
                  {item.weightLabel ? (
                    <span className="block text-[13px] text-muted-foreground">
                      {item.weightLabel}
                    </span>
                  ) : null}
                </span>
                <span className="text-[15px] font-semibold">
                  {formatMoneyUsdEs(item.price)}
                </span>
              </Button>
            ))}
          </div>
        </section>
      ))}

      {drinkItems.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-[20px] font-semibold tracking-tight">
            {ORDER_COPY.drinks}
          </h2>
          <div className="grid gap-2">
            {drinkItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-between px-4 py-3 text-left"
                onClick={() => onAddSimpleItem(item)}
              >
                <span className="text-[15px] font-semibold">{item.name}</span>
                <span className="text-[15px] font-semibold">
                  {formatMoneyUsdEs(item.price)}
                </span>
              </Button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
