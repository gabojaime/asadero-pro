"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { Label } from "@/shared/presentation/ui/label";
import { Switch } from "@/shared/presentation/ui/switch";
import { useSidebar } from "@/shared/presentation/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/presentation/ui/tooltip";

export function ThemeSwitcher() {
  const switchId = useId();
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { state, isMobile } = useSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const isIconCollapsed = !isMobile && state === "collapsed";

  const handleCheckedChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  const switchControl = (
    <Switch
      id={switchId}
      checked={isDark}
      onCheckedChange={handleCheckedChange}
      disabled={!mounted}
      aria-label={isIconCollapsed ? "Modo oscuro" : undefined}
    />
  );

  if (isIconCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center">{switchControl}</div>
        </TooltipTrigger>
        <TooltipContent side="right">Modo oscuro</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Label
        htmlFor={switchId}
        className="cursor-pointer text-sm font-normal text-muted-foreground"
      >
        Modo oscuro
      </Label>
      {switchControl}
    </div>
  );
}
