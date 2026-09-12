"use client";

import { useEffect, useState } from "react";
import type { OrderDto } from "../infrastructure/query-adapters";
import { ORDER_COPY, KITCHEN_SLA_MINUTES } from "./copy";
import { formatMoneyUsdEs } from "./format-money";
import { Badge } from "@/shared/presentation/ui/badge";
import { Button } from "@/shared/presentation/ui/button";
import { cn } from "@/lib/utils";

type KitchenOrderCardProps = {
  order: OrderDto;
  index: number;
  canMarkReady: boolean;
  isMarking: boolean;
  onMarkReady: (orderId: string) => void;
};

function formatElapsed(sentToKitchenAt: string): string {
  const elapsedMs = Date.now() - new Date(sentToKitchenAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isSlaBreached(sentToKitchenAt: string): boolean {
  const elapsedMinutes =
    (Date.now() - new Date(sentToKitchenAt).getTime()) / 60000;
  return elapsedMinutes > KITCHEN_SLA_MINUTES;
}

function serviceLabel(serviceType: string): string {
  return serviceType === "delivery"
    ? ORDER_COPY.serviceDelivery
    : ORDER_COPY.serviceTakeOut;
}

export function KitchenOrderCard({
  order,
  index,
  canMarkReady,
  isMarking,
  onMarkReady,
}: KitchenOrderCardProps) {
  const [elapsed, setElapsed] = useState(() =>
    formatElapsed(order.sentToKitchenAt),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(formatElapsed(order.sentToKitchenAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [order.sentToKitchenAt]);

  const slaBreached = isSlaBreached(order.sentToKitchenAt);

  return (
    <article
      className={cn(
        "grid gap-4 border border-border p-4 md:grid-cols-[180px_1fr_auto] md:items-center",
        index % 2 === 0 ? "bg-card" : "bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-2">
        <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/10">
          {serviceLabel(order.serviceType)}
        </Badge>
        {order.serviceType === "delivery" ? (
          <div className="text-[13px] text-muted-foreground">
            {order.deliveryZone ? <p>{order.deliveryZone}</p> : null}
            <p>{formatMoneyUsdEs(order.deliveryFee)}</p>
          </div>
        ) : null}
      </div>

      <ul className="list-disc space-y-2 pl-5 text-[15px]">
        {order.lines.map((line) => (
          <li key={line.id}>
            <span className="font-semibold">
              {line.quantity}x {line.name}
            </span>
            {line.sides.length > 0 ? (
              <p className="text-[13px] text-muted-foreground">
                {line.sides
                  .slice()
                  .sort((left, right) => left.slot - right.slot)
                  .map((side) => side.sideName)
                  .join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-start gap-3 md:items-end">
        <p
          className={cn(
            "text-[20px] font-semibold tabular-nums",
            slaBreached ? "text-primary" : "text-foreground",
          )}
        >
          {elapsed}
        </p>
        {canMarkReady ? (
          <Button
            type="button"
            className="min-h-11"
            disabled={isMarking}
            onClick={() => onMarkReady(order.id)}
          >
            {ORDER_COPY.markReady}
          </Button>
        ) : null}
      </div>
    </article>
  );
}
