/**
 * RTL integration — order-kitchen-queue
 *
 * Query keys: ['menu-items', merchantId], ['active-orders', merchantId]
 * Currency display: Intl es-ES USD (e.g. 24,00 US$)
 * Fake in-memory repos via OrdersTestProviders (no Supabase client in presentation tests)
 */
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { SessionProfile } from "@/domains/auth/domain/entities";
import {
  AREPA_ID,
  TEST_MERCHANT_ID,
  YUCA_ID,
} from "../infrastructure/testing/menu-catalog-fixture";
import { KitchenQueueView } from "./KitchenQueueView";
import { ORDER_COPY } from "./copy";
import { OrderRegistryView } from "./OrderRegistryView";
import { renderWithOrderProviders } from "./testing/render-with-order-providers";

const waiterProfile: SessionProfile = {
  userId: "55555555-5555-4555-8555-555555555555",
  email: "waiter@test.com",
  merchantId: TEST_MERCHANT_ID,
  merchantName: "Test Asadero",
  fullName: "Waiter User",
  role: "waiter",
  isOnboarded: true,
};

const grillMasterProfile: SessionProfile = {
  ...waiterProfile,
  userId: "66666666-6666-4666-8666-666666666666",
  role: "grill_master",
};

async function pickSide(label: string, sideName: string) {
  const field = screen.getByText(label).closest("div");
  if (!field) {
    throw new Error(`Missing side field: ${label}`);
  }

  await userEvent.selectOptions(
    within(field).getByRole("combobox"),
    sideName,
  );
}

function expectUsdAmount(amount: number) {
  const formatted = amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "USD",
  });
  expect(
    screen.getAllByText((_, element) =>
      element?.textContent?.replace(/\s/g, " ") === formatted.replace(/\s/g, " "),
    ).length,
  ).toBeGreaterThan(0);
}

async function clickSendToKitchen() {
  const buttons = screen.getAllByRole("button", {
    name: ORDER_COPY.sendToKitchen,
  });
  await userEvent.click(buttons[buttons.length - 1]!);
}

async function addBeefHalfKgWithSides() {
  await userEvent.click(
    await screen.findByRole("button", { name: /Beef 1\/2 kg/i }),
  );
  await pickSide(ORDER_COPY.sideSlot1, "Yuca");
  await pickSide(ORDER_COPY.sideSlot2, "Arepa");
  await userEvent.click(
    screen.getByRole("button", { name: ORDER_COPY.confirmAdd }),
  );
}

describe("order-kitchen-flow integration", () => {
  it("submits a takeaway order and shows it in the kitchen queue", async () => {
    const { repos, queryClient } = renderWithOrderProviders(
      <OrderRegistryView />,
      { profile: waiterProfile },
    );

    await userEvent.click(
      screen.getByRole("button", { name: ORDER_COPY.serviceTakeOut }),
    );
    await addBeefHalfKgWithSides();

    expectUsdAmount(24);

    await clickSendToKitchen();

    await waitFor(() => {
      expect(repos.getOrdersSnapshot()).toHaveLength(1);
    });

    const snapshot = repos.getOrdersSnapshot()[0]!;
    expect(snapshot.serviceType).toBe("take_out");
    expect(snapshot.deliveryFee).toBe(0);
    expect(snapshot.deliveryZone).toBeNull();
    expect(snapshot.totalAmount).toBe(24);
    expect(snapshot.lines[0]?.sides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sideMenuItemId: YUCA_ID, sideName: "Yuca" }),
        expect.objectContaining({ sideMenuItemId: AREPA_ID, sideName: "Arepa" }),
      ]),
    );

    cleanup();
    renderWithOrderProviders(<KitchenQueueView />, {
      profile: grillMasterProfile,
      repos,
      queryClient,
    });

    expect(await screen.findByText(ORDER_COPY.serviceTakeOut)).toBeInTheDocument();
    expect(screen.getByText(/1x Beef 1\/2 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/Yuca · Arepa/i)).toBeInTheDocument();
  });

  it("submits a delivery order with zone and manual fee", async () => {
    const { repos, queryClient } = renderWithOrderProviders(
      <OrderRegistryView />,
      { profile: waiterProfile },
    );

    await userEvent.click(
      screen.getByRole("button", { name: ORDER_COPY.serviceDelivery }),
    );
    await userEvent.type(
      screen.getByLabelText(ORDER_COPY.deliveryZoneLabel),
      "Las Mercedes",
    );
    const feeInput = screen.getByLabelText(ORDER_COPY.deliveryFeeLabel);
    await userEvent.click(feeInput);
    await userEvent.type(feeInput, "4,5");
    await userEvent.tab();
    await addBeefHalfKgWithSides();

    expectUsdAmount(28.5);

    await clickSendToKitchen();

    await waitFor(() => {
      expect(repos.getOrdersSnapshot()).toHaveLength(1);
    });

    const snapshot = repos.getOrdersSnapshot()[0]!;
    expect(snapshot.serviceType).toBe("delivery");
    expect(snapshot.deliveryZone).toBe("Las Mercedes");
    expect(snapshot.deliveryFee).toBe(4.5);
    expect(snapshot.totalAmount).toBe(28.5);

    cleanup();
    renderWithOrderProviders(<KitchenQueueView />, {
      profile: grillMasterProfile,
      repos,
      queryClient,
    });

    expect(await screen.findByText(ORDER_COPY.serviceDelivery)).toBeInTheDocument();
    expect(screen.getByText("Las Mercedes")).toBeInTheDocument();
    expectUsdAmount(4.5);
  });

  it("marks an active ticket ready and removes it from the queue", async () => {
    const { repos, queryClient } = renderWithOrderProviders(
      <OrderRegistryView />,
      { profile: waiterProfile },
    );

    await addBeefHalfKgWithSides();
    await clickSendToKitchen();

    await waitFor(() => {
      expect(repos.getOrdersSnapshot()).toHaveLength(1);
    });

    cleanup();
    renderWithOrderProviders(<KitchenQueueView />, {
      profile: grillMasterProfile,
      repos,
      queryClient,
    });

    await userEvent.click(
      await screen.findByRole("button", { name: ORDER_COPY.markReady }),
    );

    await waitFor(() => {
      expect(screen.queryByText(/1x Beef 1\/2 kg/i)).not.toBeInTheDocument();
    });

    const snapshot = repos.getOrdersSnapshot()[0]!;
    expect(snapshot.status).toBe("served");
    expect(snapshot.readyAt).not.toBeNull();
    expect(repos.getOrdersSnapshot().filter((order) => order.status === "pending")).toHaveLength(0);
  });
});
