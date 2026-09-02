import React from "react";
import { ArrowUpward, ArrowDownward, UnfoldMore } from "@mui/icons-material";
import type { SortDirection } from "../../hooks/useTableSort";

export interface SortableHeaderProps {
  sortKey: string;
  currentSortKey?: string;
  currentSortDirection?: SortDirection;
  onSort: (key: string) => void;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  sortKey,
  currentSortKey,
  currentSortDirection = "asc",
  onSort,
  children,
  align = "left",
  className = "",
}) => {
  const isActive = currentSortKey === sortKey;

  const alignClasses =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
      ? "justify-center text-center"
      : "justify-start text-left";

  return (
    <th
      className={`px-5 py-3.5 select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <button
        type="button"
        className={`group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] transition-colors cursor-pointer w-full ${alignClasses} ${
          isActive
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        title={`Sort by ${typeof children === "string" ? children : sortKey}`}
      >
        <span>{children}</span>
        <span
          className={`grid h-4 w-4 place-items-center rounded transition-all ${
            isActive
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
              : "text-slate-400/60 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
          }`}
        >
          {isActive ? (
            currentSortDirection === "asc" ? (
              <ArrowUpward sx={{ fontSize: 13 }} />
            ) : (
              <ArrowDownward sx={{ fontSize: 13 }} />
            )
          ) : (
            <UnfoldMore sx={{ fontSize: 13 }} />
          )}
        </span>
      </button>
    </th>
  );
};
