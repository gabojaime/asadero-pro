import { WasteError } from "../domain/errors";

export function mapOperationalWasteRpcError(error: {
  message?: string;
  code?: string;
}): never {
  const message = error.message ?? "";

  if (message.includes("forbidden")) {
    throw new WasteError(
      "forbidden",
      "No tienes permiso para registrar mermas.",
    );
  }

  if (message.includes("not_found")) {
    throw new WasteError("not_found", "Insumo no encontrado.");
  }

  if (message.includes("validation_failed")) {
    throw new WasteError("validation_failed", "Revisa kilos y motivo.");
  }

  if (message.includes("not_authenticated")) {
    throw new WasteError("forbidden", "Sesión inválida.");
  }

  throw new WasteError("unknown", "No se pudo registrar la merma.");
}
