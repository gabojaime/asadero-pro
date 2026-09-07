"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/shared/presentation/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/ui/select";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE = 10;

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

type TablePaginationProps = {
  pageIndex: number;
  pageSize: PageSizeOption;
  totalItems: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
  className?: string;
};

export function TablePagination({
  pageIndex,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = pageIndex + 1;
  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex < totalPages - 1;

  if (totalItems <= pageSize) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación de tabla"
      className={cn(
        "flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <label htmlFor="table-page-size" className="whitespace-nowrap">
          Filas por página
        </label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            onPageSizeChange(Number(value) as PageSizeOption)
          }
        >
          <SelectTrigger
            id="table-page-size"
            className="h-8 w-[4.5rem]"
            aria-label="Filas por página"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Página {currentPage} de {totalPages}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={!canGoPrevious}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={!canGoNext}
            aria-label="Página siguiente"
          >
            Siguiente
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
