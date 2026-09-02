"use client";

import { useState } from "react";
import { useCreateStaffUser } from "@/domains/auth/infrastructure/query-adapters";
import { ROLE_LABELS } from "@/domains/auth/domain/role-labels";
import type { UserRole } from "@/domains/auth/domain/entities";
import { Button } from "@/shared/presentation/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/presentation/ui/card";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";

const STAFF_ROLES: UserRole[] = ["admin", "grill_master", "waiter"];

export function CreateStaffUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("waiter");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createStaffMutation = useCreateStaffUser();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      await createStaffMutation.mutateAsync({
        email,
        password,
        fullName,
        role,
      });

      setSuccessMessage("Usuario creado correctamente.");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("waiter");
    } catch (caughtError: unknown) {
      const mutationError = caughtError as {
        message?: string;
        fieldErrors?: Record<string, string>;
      };

      setError(mutationError.message ?? "No se pudo crear el usuario.");
      setFieldErrors(mutationError.fieldErrors ?? {});
    }
  };

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Crear usuario del personal</CardTitle>
        <CardDescription>
          Registra miembros del equipo con acceso a tu negocio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-email">Correo electrónico</Label>
            <Input
              id="staff-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-password">Contraseña</Label>
            <Input
              id="staff-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-full-name">Nombre completo</Label>
            <Input
              id="staff-full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName ? (
              <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-role">Rol</Label>
            <select
              id="staff-role"
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STAFF_ROLES.map((staffRole) => (
                <option key={staffRole} value={staffRole}>
                  {ROLE_LABELS[staffRole]}
                </option>
              ))}
            </select>
            {fieldErrors.role ? (
              <p className="text-sm text-destructive">{fieldErrors.role}</p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p role="status" className="text-sm text-primary">
              {successMessage}
            </p>
          ) : null}
          <Button type="submit" disabled={createStaffMutation.isPending}>
            {createStaffMutation.isPending ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
