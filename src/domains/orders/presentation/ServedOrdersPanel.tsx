"use client";

import { useState } from "react";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import { useSession } from "@/domains/auth/presentation/providers/session-provider";
import { formatMoneyUsdEs } from "@/domains/orders/presentation/format-money";
import type { OrderDto } from "@/domains/orders/infrastructure/order-dtos";
import {
  useCompleteOrder,
  useServedOrders,
} from "@/domains/orders/infrastructure/order-completion-adapters";
import { Button } from "@/shared/presentation/ui/button";
import { Skeleton } from "@/shared/presentation/ui/skeleton";

function toSessionProfile(
  session: ReturnType<typeof useSession>,
): SessionProfile {
  return {
    userId: session.userId,
    email: session.email,
    merchantId: session.merchantId,
    merchantName: session.merchantName,
    fullName: session.fullName,
    role: session.role,
    isOnboarded: true,
  };
}

function canCompleteOrders(role: SessionProfile["role"]): boolean {
  return role === "waiter" || role === "admin";
}

function ServedOrderRow({
  order,
  profile,
}: {
  order: OrderDto;
  profile: SessionProfile;
}) {
  const completeMutation = useCompleteOrder(profile);
  const [message, setMessage] = useState<string | null>(null);

  const handleComplete = async () => {
    setMessage(null);
    try {
      const result = await completeMutation.mutateAsync(order.id);
      if (result.partialDeduction) {
        setMessage(
          "Pedido completado con stock insuficiente para algunos insumos.",
        );
        return;
      }

      setMessage("Pedido completado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo completar el pedido.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Pedido #{order.id.slice(0, 8)}</p>
        <p className="text-sm text-muted-foreground">
          {order.lines.length} línea(s) · {formatMoneyUsdEs(order.totalAmount)}
        </p>
        {message ? <p className="mt-2 text-sm text-primary">{message}</p> : null}
      </div>
      <Button
        type="button"
        onClick={() => void handleComplete()}
        disabled={completeMutation.isPending}
      >
        {completeMutation.isPending ? "Completando…" : "Completar pedido"}
      </Button>
    </div>
  );
}

export function ServedOrdersPanel() {
  const session = useSession();
  const profile = toSessionProfile(session);
  const servedQuery = useServedOrders(session.merchantId);

  if (!canCompleteOrders(profile.role)) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 border-t border-border px-6 pb-6 pt-8">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Pedidos servidos
        </h2>
        <p className="text-sm text-muted-foreground">
          Completa pedidos listos para descontar insumos del inventario.
        </p>
      </div>

      {servedQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : servedQuery.isError ? (
        <p className="text-sm text-destructive">
          No se pudieron cargar los pedidos servidos.
        </p>
      ) : servedQuery.data && servedQuery.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {servedQuery.data.map((order) => (
            <ServedOrderRow key={order.id} order={order} profile={profile} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay pedidos servidos pendientes de completar.
        </p>
      )}
    </section>
  );
}
