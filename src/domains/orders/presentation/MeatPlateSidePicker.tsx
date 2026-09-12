"use client";

import { useState } from "react";
import type { MenuItem } from "../domain/entities";
import { ORDER_COPY } from "./copy";
import { formatMoneyUsdEs } from "./format-money";
import { Button } from "@/shared/presentation/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/ui/dialog";
import { Label } from "@/shared/presentation/ui/label";

type MeatPlateSidePickerProps = {
  open: boolean;
  menuItem: MenuItem | null;
  sides: MenuItem[];
  onClose: () => void;
  onConfirm: (sideIds: { slot1: string; slot2: string }) => void;
};

export function MeatPlateSidePicker({
  open,
  menuItem,
  sides,
  onClose,
  onConfirm,
}: MeatPlateSidePickerProps) {
  const [slot1, setSlot1] = useState<string>("");
  const [slot2, setSlot2] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!slot1 || !slot2) {
      setError("Selecciona dos contornos.");
      return;
    }

    setError(null);
    onConfirm({ slot1, slot2 });
    setSlot1("");
    setSlot2("");
  };

  const handleClose = () => {
    setError(null);
    setSlot1("");
    setSlot2("");
    onClose();
  };

  if (!menuItem) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ORDER_COPY.meatSidesTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <p className="text-[15px] font-semibold">{menuItem.name}</p>
            <p className="text-[13px] text-muted-foreground">
              {menuItem.weightLabel} · {formatMoneyUsdEs(menuItem.price)}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="side-slot-1">{ORDER_COPY.sideSlot1}</Label>
            <select
              id="side-slot-1"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-[15px]"
              value={slot1}
              onChange={(event) => setSlot1(event.target.value)}
            >
              <option value="">Selecciona</option>
              {sides.map((side) => (
                <option key={`slot1-${side.id}`} value={side.id}>
                  {side.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="side-slot-2">{ORDER_COPY.sideSlot2}</Label>
            <select
              id="side-slot-2"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-[15px]"
              value={slot2}
              onChange={(event) => setSlot2(event.target.value)}
            >
              <option value="">Selecciona</option>
              {sides.map((side) => (
                <option key={`slot2-${side.id}`} value={side.id}>
                  {side.name}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-[13px] text-primary">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {ORDER_COPY.cancel}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {ORDER_COPY.confirmAdd}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
