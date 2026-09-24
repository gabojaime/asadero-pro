"use client";

import { ORDER_COPY } from "./copy";
import { Input } from "@/shared/presentation/ui/input";
import { Label } from "@/shared/presentation/ui/label";

type CustomerContactFieldsProps = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
};

export function CustomerContactFields({
  firstName,
  lastName,
  phone,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
}: CustomerContactFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <p className="text-[13px] font-semibold tracking-wide sm:col-span-3">
        {ORDER_COPY.customerSectionTitle}
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-first-name">{ORDER_COPY.customerFirstName}</Label>
        <Input
          id="customer-first-name"
          value={firstName ?? ""}
          onChange={(event) => onFirstNameChange(event.target.value)}
          className="min-h-11"
          autoComplete="given-name"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-last-name">{ORDER_COPY.customerLastName}</Label>
        <Input
          id="customer-last-name"
          value={lastName ?? ""}
          onChange={(event) => onLastNameChange(event.target.value)}
          className="min-h-11"
          autoComplete="family-name"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-phone">{ORDER_COPY.customerPhone}</Label>
        <Input
          id="customer-phone"
          value={phone ?? ""}
          onChange={(event) => onPhoneChange(event.target.value)}
          className="min-h-11"
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
    </div>
  );
}
