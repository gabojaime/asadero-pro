import { z } from "zod";
import type { Cart, CartLine, MenuItem, MvpServiceType } from "./entities";
import { OrderError } from "./errors";

const cartSideSchema = z.object({
  slot: z.union([z.literal(1), z.literal(2)]),
  sideMenuItemId: z.string().uuid(),
});

const cartLineSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  sides: z.array(cartSideSchema),
});

export const mvpServiceTypeSchema = z.enum(["take_out", "delivery"]);

export const cartSchema = z.object({
  serviceType: mvpServiceTypeSchema,
  deliveryFee: z.number().nonnegative(),
  deliveryZone: z.string().trim().max(100).nullable(),
  tableNumber: z.null(),
  lines: z.array(cartLineSchema).min(1),
});

export const markOrderReadySchema = z.object({
  orderId: z.string().uuid(),
});

function findMenuItem(catalog: MenuItem[], menuItemId: string): MenuItem | undefined {
  return catalog.find((item) => item.id === menuItemId);
}

function validateMeatPlateSides(
  line: CartLine,
  menuItem: MenuItem,
  catalog: MenuItem[],
): void {
  if (menuItem.itemKind !== "meat_plate") {
    return;
  }

  if (line.sides.length !== 2) {
    throw new OrderError("validation_failed", "Cada plato de carne requiere dos contornos.", {
      sides: "Selecciona dos contornos.",
    });
  }

  const slots = new Set(line.sides.map((side) => side.slot));
  if (slots.size !== 2) {
    throw new OrderError("validation_failed", "Cada plato de carne requiere dos contornos.", {
      sides: "Selecciona dos contornos.",
    });
  }

  for (const side of line.sides) {
    const sideItem = findMenuItem(catalog, side.sideMenuItemId);
    if (!sideItem || sideItem.itemKind !== "side") {
      throw new OrderError("validation_failed", "Contorno inválido.", {
        sides: "Selecciona un contorno válido.",
      });
    }
  }
}

function validateDrinkLine(line: CartLine, menuItem: MenuItem): void {
  if (menuItem.itemKind === "drink" && line.sides.length > 0) {
    throw new OrderError("validation_failed", "Las bebidas no llevan contornos.", {
      sides: "Las bebidas no llevan contornos.",
    });
  }
}

function validateDeliveryRules(cart: Cart): void {
  if (cart.serviceType === "delivery") {
    if (cart.deliveryFee < 0) {
      throw new OrderError(
        "validation_failed",
        "Ingresa el costo de envío.",
        { deliveryFee: "Ingresa el costo de envío." },
      );
    }
    return;
  }

  if (cart.deliveryFee !== 0) {
    throw new OrderError(
      "validation_failed",
      "Para llevar no puede incluir costo de envío.",
      { deliveryFee: "Para llevar no incluye envío." },
    );
  }

  if (cart.deliveryZone) {
    throw new OrderError(
      "validation_failed",
      "Para llevar no puede incluir zona de entrega.",
      { deliveryZone: "Para llevar no incluye zona." },
    );
  }
}

export function validateCartForSubmit(cart: Cart, catalog: MenuItem[]): Cart {
  const parsed = cartSchema.safeParse(cart);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path) {
        fieldErrors[path] = issue.message;
      }
    }

    throw new OrderError(
      "validation_failed",
      "Revisa los datos del pedido.",
      fieldErrors,
    );
  }

  validateDeliveryRules(parsed.data);

  for (const line of parsed.data.lines) {
    const menuItem = findMenuItem(catalog, line.menuItemId);
    if (!menuItem || !menuItem.isActive) {
      throw new OrderError("validation_failed", "Artículo de menú inválido.", {
        menuItemId: "Artículo no disponible.",
      });
    }

    validateDrinkLine(line, menuItem);
    validateMeatPlateSides(line, menuItem, catalog);
  }

  return parsed.data;
}

export function parseMvpServiceType(value: string): MvpServiceType {
  return mvpServiceTypeSchema.parse(value);
}
