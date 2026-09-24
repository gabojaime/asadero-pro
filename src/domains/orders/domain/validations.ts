import { z } from "zod";
import type { Cart, CartLine, MenuItem, MvpServiceType } from "./entities";
import { OrderError } from "./errors";
import {
  DEFAULT_MERCHANT_TIMEZONE,
  getScheduledWindowBoundsUtc,
  SCHEDULED_MAX_CALENDAR_DAYS,
  SCHEDULED_MIN_LEAD_MINUTES,
} from "./merchant-local-time";

export { SCHEDULED_MAX_CALENDAR_DAYS, SCHEDULED_MIN_LEAD_MINUTES };

const customerPhonePattern = /^[\d+\-\s()]{7,20}$/;

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

const fulfillmentTimingSchema = z.enum(["immediate", "scheduled"]);

function parseReadyByAt(value: unknown): Date | null {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export const cartSchema = z.object({
  serviceType: mvpServiceTypeSchema,
  fulfillmentTiming: fulfillmentTimingSchema,
  readyByAt: z.preprocess(parseReadyByAt, z.date().nullable()),
  customerFirstName: z.string().trim().max(80).nullable(),
  customerLastName: z.string().trim().max(80).nullable(),
  customerPhone: z.string().trim().max(20).nullable(),
  deliveryFee: z.number().nonnegative(),
  deliveryZone: z.string().trim().max(100).nullable(),
  tableNumber: z.null(),
  lines: z.array(cartLineSchema).min(1),
});

export type ValidateCartOptions = {
  now?: Date;
  merchantTimezone?: string;
};

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

function validateFulfillmentRules(
  cart: Cart,
  now: Date,
  merchantTimezone: string,
): void {
  if (cart.fulfillmentTiming === "immediate") {
    if (cart.readyByAt != null) {
      throw new OrderError(
        "validation_failed",
        "Entrega inmediata no requiere hora de listo.",
        { readyByAt: "Quita la hora programada." },
      );
    }
    return;
  }

  if (cart.readyByAt == null) {
    throw new OrderError(
      "validation_failed",
      "Indica cuándo debe estar listo el pedido.",
      { readyByAt: "Selecciona fecha y hora." },
    );
  }

  const minReadyByMs = now.getTime() + SCHEDULED_MIN_LEAD_MINUTES * 60_000;
  if (cart.readyByAt.getTime() < minReadyByMs) {
    throw new OrderError(
      "validation_failed",
      "La hora programada debe ser al menos 5 minutos después.",
      { readyByAt: "Elige una hora al menos 5 minutos después." },
    );
  }

  const { maxReadyByUtc } = getScheduledWindowBoundsUtc(
    merchantTimezone,
    now,
    SCHEDULED_MAX_CALENDAR_DAYS,
  );
  if (cart.readyByAt.getTime() > maxReadyByUtc.getTime()) {
    throw new OrderError(
      "validation_failed",
      "La hora programada no puede ser más de 7 días adelante.",
      { readyByAt: "Elige una fecha dentro de los próximos 7 días." },
    );
  }
}

function validateCustomerFields(cart: Cart): void {
  const fields: Array<{
    key: "customerFirstName" | "customerLastName" | "customerPhone";
    value: string | null;
    message: string;
  }> = [
    {
      key: "customerFirstName",
      value: cart.customerFirstName,
      message: "Nombre inválido.",
    },
    {
      key: "customerLastName",
      value: cart.customerLastName,
      message: "Apellido inválido.",
    },
    {
      key: "customerPhone",
      value: cart.customerPhone,
      message: "Teléfono inválido.",
    },
  ];

  for (const field of fields) {
    const trimmed = field.value?.trim() ?? "";
    if (!trimmed) {
      continue;
    }

    if (field.key === "customerPhone") {
      if (!customerPhonePattern.test(trimmed)) {
        throw new OrderError("validation_failed", field.message, {
          [field.key]: field.message,
        });
      }
      continue;
    }

    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new OrderError("validation_failed", field.message, {
        [field.key]: field.message,
      });
    }
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

export function validateCartForSubmit(
  cart: Cart,
  catalog: MenuItem[],
  options: ValidateCartOptions = {},
): Cart {
  const now = options.now ?? new Date();
  const merchantTimezone = options.merchantTimezone ?? DEFAULT_MERCHANT_TIMEZONE;

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
  validateFulfillmentRules(parsed.data, now, merchantTimezone);
  validateCustomerFields(parsed.data);

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

  return {
    ...parsed.data,
    customerFirstName: trimOptionalName(parsed.data.customerFirstName),
    customerLastName: trimOptionalName(parsed.data.customerLastName),
    customerPhone: trimOptionalName(parsed.data.customerPhone),
  };
}

function trimOptionalName(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseMvpServiceType(value: string): MvpServiceType {
  return mvpServiceTypeSchema.parse(value);
}
