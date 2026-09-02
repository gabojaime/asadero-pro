import type { UserRole } from "./entities";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  grill_master: "Parrillero",
  waiter: "Mesero",
};
