"use client";

import { useMemo, useState } from "react";
import { useSession } from "@/domains/auth/presentation/providers/session-context";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import {
  addLineToCart,
  removeLine,
  setDeliveryFee,
  setDeliveryZone,
  setServiceType,
  updateLineQuantity,
} from "../domain/cart";
import { createEmptyCart, type Cart, type MenuItem } from "../domain/entities";
import { OrderError } from "../domain/errors";
import {
  useMenuItems,
  useSubmitOrder,
} from "../infrastructure/query-adapters";
import { CartPanel } from "./CartPanel";
import { DeliveryDetailsFields } from "./DeliveryDetailsFields";
import { MeatPlateSidePicker } from "./MeatPlateSidePicker";
import { MenuCatalogPanel } from "./MenuCatalogPanel";
import { ORDER_COPY } from "./copy";
import { ServiceTypeSelector } from "./ServiceTypeSelector";
import { Skeleton } from "@/shared/presentation/ui/skeleton";
import { useOrdersTestContext } from "../infrastructure/testing/orders-test-context";

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

export function OrderRegistryView() {
  const session = useSession();
  const testContext = useOrdersTestContext();
  const profile = testContext?.profile ?? toSessionProfile(session);
  const merchantId = profile.merchantId;

  const [cart, setCart] = useState<Cart>(createEmptyCart());
  const [selectedMeat, setSelectedMeat] = useState<MenuItem | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const menuQuery = useMenuItems(merchantId);
  const submitMutation = useSubmitOrder(profile);

  const menuItems = useMemo(
    () => (menuQuery.data ?? []) as MenuItem[],
    [menuQuery.data],
  );
  const sideItems = useMemo(
    () => menuItems.filter((item) => item.itemKind === "side"),
    [menuItems],
  );

  const menuNames = useMemo(
    () =>
      Object.fromEntries(menuItems.map((item) => [item.id, item.name])),
    [menuItems],
  );
  const menuWeightLabels = useMemo(
    () =>
      Object.fromEntries(
        menuItems.map((item) => [item.id, item.weightLabel]),
      ),
    [menuItems],
  );
  const sideNames = useMemo(
    () => Object.fromEntries(sideItems.map((item) => [item.id, item.name])),
    [sideItems],
  );

  const handleAddSimpleItem = (item: MenuItem) => {
    setCart((current) =>
      addLineToCart(current, {
        menuItemId: item.id,
        quantity: 1,
        unitPrice: item.price,
        sides: [],
      }),
    );
  };

  const handleConfirmMeat = (sideIds: { slot1: string; slot2: string }) => {
    if (!selectedMeat) {
      return;
    }

    setCart((current) =>
      addLineToCart(current, {
        menuItemId: selectedMeat.id,
        quantity: 1,
        unitPrice: selectedMeat.price,
        sides: [
          { slot: 1, sideMenuItemId: sideIds.slot1 },
          { slot: 2, sideMenuItemId: sideIds.slot2 },
        ],
      }),
    );
    setSelectedMeat(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setFeeError(null);
    setStatusMessage(null);

    if (cart.serviceType === "delivery" && cart.deliveryFee < 0) {
      setFeeError(ORDER_COPY.deliveryFeeRequired);
      return;
    }

    try {
      await submitMutation.mutateAsync(cart);
      setCart(createEmptyCart());
      setStatusMessage(ORDER_COPY.submitSuccess);
    } catch (error) {
      if (error instanceof OrderError) {
        setSubmitError(error.message);
        if (error.fieldErrors?.deliveryFee) {
          setFeeError(error.fieldErrors.deliveryFee);
        }
        return;
      }

      if (error instanceof Error) {
        setSubmitError(error.message);
        return;
      }

      setSubmitError(ORDER_COPY.submitError);
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-6 p-6 pb-0">
        <div>
          <h1 className="text-[28px] font-semibold leading-8 tracking-tight">
            {ORDER_COPY.registryTitle}
          </h1>
          {statusMessage ? (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {statusMessage}
            </p>
          ) : null}
        </div>

        <ServiceTypeSelector
          value={cart.serviceType}
          onChange={(serviceType) =>
            setCart((current) => setServiceType(current, serviceType))
          }
        />

        {cart.serviceType === "delivery" ? (
          <DeliveryDetailsFields
            deliveryZone={cart.deliveryZone}
            deliveryFee={cart.deliveryFee}
            feeError={feeError}
            onZoneChange={(value) =>
              setCart((current) =>
                setDeliveryZone(current, value.trim() ? value.trim() : null),
              )
            }
            onFeeChange={(value) =>
              setCart((current) => setDeliveryFee(current, value))
            }
          />
        ) : null}

        {menuQuery.isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : menuQuery.isError ? (
          <p className="text-[13px] text-primary">
            No se pudo cargar el menú.
          </p>
        ) : (
          <MenuCatalogPanel
            items={menuItems}
            onAddMeat={setSelectedMeat}
            onAddSimpleItem={handleAddSimpleItem}
          />
        )}
      </div>

      <CartPanel
        cart={cart}
        menuNames={menuNames}
        menuWeightLabels={menuWeightLabels}
        sideNames={sideNames}
        isSubmitting={submitMutation.isPending}
        submitError={submitError}
        onIncrement={(lineIndex) =>
          setCart((current) =>
            updateLineQuantity(
              current,
              lineIndex,
              current.lines[lineIndex]!.quantity + 1,
            ),
          )
        }
        onDecrement={(lineIndex) =>
          setCart((current) =>
            updateLineQuantity(
              current,
              lineIndex,
              current.lines[lineIndex]!.quantity - 1,
            ),
          )
        }
        onRemove={(lineIndex) =>
          setCart((current) => removeLine(current, lineIndex))
        }
        onSubmit={() => void handleSubmit()}
      />

      <MeatPlateSidePicker
        open={Boolean(selectedMeat)}
        menuItem={selectedMeat}
        sides={sideItems as MenuItem[]}
        onClose={() => setSelectedMeat(null)}
        onConfirm={handleConfirmMeat}
      />
    </div>
  );
}
