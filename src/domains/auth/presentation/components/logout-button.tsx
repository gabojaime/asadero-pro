"use client";

import { useRouter } from "next/navigation";
import { useSignOut } from "@/domains/auth/infrastructure/query-adapters";
import { Button } from "@/shared/presentation/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const signOutMutation = useSignOut();

  const logout = async () => {
    await signOutMutation.mutateAsync();
    router.push("/login");
  };

  return (
    <Button onClick={logout} disabled={signOutMutation.isPending}>
      {signOutMutation.isPending ? "Saliendo..." : "Cerrar sesión"}
    </Button>
  );
}
