import type { MenuItemKind, ProteinGroup } from "@/domains/menu/domain/entities";

export function formatMenuItemKindLabel(kind: MenuItemKind): string {
  switch (kind) {
    case "meat_plate":
      return "Plato de carne";
    case "drink":
      return "Bebida";
    case "side":
      return "Contorno";
  }
}

export function formatProteinGroupLabel(group: ProteinGroup): string {
  switch (group) {
    case "beef":
      return "Res";
    case "pork":
      return "Cerdo";
    case "chicken":
      return "Pollo";
  }
}

export function formatMenuItemKindSectionHeader(kind: MenuItemKind): string {
  switch (kind) {
    case "meat_plate":
      return "Carnes";
    case "drink":
      return "Bebidas";
    case "side":
      return "Contornos";
  }
}
