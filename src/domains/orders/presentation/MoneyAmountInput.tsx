"use client";

import { useState } from "react";
import { Input } from "@/shared/presentation/ui/input";
import {
  formatMoneyUsdEs,
  parseMoneyInputEs,
  toEditableMoneyAmount,
} from "./format-money";

type MoneyAmountInputProps = {
  id: string;
  value: number;
  onChange: (value: number) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function MoneyAmountInput({
  id,
  value,
  onChange,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: MoneyAmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const displayValue = isFocused
    ? draft
    : value > 0
      ? formatMoneyUsdEs(value)
      : "";

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={displayValue}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onFocus={() => {
        setIsFocused(true);
        setDraft(toEditableMoneyAmount(value));
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = parseMoneyInputEs(draft);
        onChange(parsed);
        setDraft("");
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        onChange(parseMoneyInputEs(nextDraft));
      }}
    />
  );
}
