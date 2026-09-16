import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Check, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled";

export interface InvoiceStatusConfig {
  value: InvoiceStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
  menuItemClass: string;
  activeItemClass: string;
}

export const INVOICE_STATUS_CONFIGS: Record<InvoiceStatus, InvoiceStatusConfig> = {
  Paid: {
    value: "Paid",
    label: "Paid",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-300/80 hover:bg-emerald-100/70 hover:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 dark:hover:bg-emerald-950/60",
    dotClass: "bg-emerald-500 shadow-xs shadow-emerald-500/50",
    menuItemClass:
      "text-emerald-700 hover:bg-emerald-50/80 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
    activeItemClass:
      "bg-emerald-100/80 text-emerald-800 font-bold dark:bg-emerald-900/50 dark:text-emerald-200",
  },
  Pending: {
    value: "Pending",
    label: "Pending",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-300/80 hover:bg-amber-100/70 hover:border-amber-400 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60 dark:hover:bg-amber-950/60",
    dotClass: "bg-amber-500 shadow-xs shadow-amber-500/50",
    menuItemClass:
      "text-amber-700 hover:bg-amber-50/80 dark:text-amber-300 dark:hover:bg-amber-950/40",
    activeItemClass:
      "bg-amber-100/80 text-amber-800 font-bold dark:bg-amber-900/50 dark:text-amber-200",
  },
  Overdue: {
    value: "Overdue",
    label: "Overdue",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-300/80 hover:bg-rose-100/70 hover:border-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/60 dark:hover:bg-rose-950/60",
    dotClass: "bg-rose-500 shadow-xs shadow-rose-500/50",
    menuItemClass:
      "text-rose-700 hover:bg-rose-50/80 dark:text-rose-300 dark:hover:bg-rose-950/40",
    activeItemClass:
      "bg-rose-100/80 text-rose-800 font-bold dark:bg-rose-900/50 dark:text-rose-200",
  },
  Draft: {
    value: "Draft",
    label: "Draft",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-300/80 hover:bg-slate-200/70 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/80",
    dotClass: "bg-slate-400 shadow-xs shadow-slate-400/50",
    menuItemClass:
      "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
    activeItemClass:
      "bg-slate-200/80 text-slate-900 font-bold dark:bg-slate-700/80 dark:text-white",
  },
  Cancelled: {
    value: "Cancelled",
    label: "Cancelled",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-300/80 hover:bg-zinc-200/70 hover:border-zinc-400 dark:bg-zinc-800/90 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700/80",
    dotClass: "bg-zinc-400 shadow-xs shadow-zinc-400/50",
    menuItemClass:
      "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
    activeItemClass:
      "bg-zinc-200/80 text-zinc-900 font-bold dark:bg-zinc-700/80 dark:text-white",
  },
};

const ALL_STATUSES: InvoiceStatus[] = ["Paid", "Pending", "Overdue", "Draft", "Cancelled"];

export interface InvoiceStatusSelectProps {
  id?: string;
  value: string;
  onChange: (newStatus: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
  title?: string;
}

export const InvoiceStatusSelect: React.FC<InvoiceStatusSelectProps> = ({
  id: explicitId,
  value,
  onChange,
  disabled = false,
  size = "sm",
  className = "",
  fullWidth = false,
  title,
}) => {
  const autoId = useId();
  const id = explicitId || autoId;

  // Normalized status lookup (case-insensitive fallback)
  const normalizedKey = (
    ALL_STATUSES.find((s) => s.toLowerCase() === (value || "").toLowerCase()) || "Draft"
  ) as InvoiceStatus;

  const currentConfig = INVOICE_STATUS_CONFIGS[normalizedKey] || INVOICE_STATUS_CONFIGS.Draft;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({
    top: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuEstimatedHeight = ALL_STATUSES.length * 40 + 20;
    const shouldFlip = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    const width = Math.max(rect.width, 140);
    let left = rect.left;

    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    setCoords({
      top: shouldFlip ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      placement: shouldFlip ? "top" : "bottom",
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const handleScroll = () => updateCoords();
      const handleResize = () => updateCoords();

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, updateCoords]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const idx = ALL_STATUSES.findIndex((s) => s.toLowerCase() === normalizedKey.toLowerCase());
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, normalizedKey]);

  const handleSelect = (statusVal: InvoiceStatus) => {
    setIsOpen(false);
    if (statusVal.toLowerCase() !== (value || "").toLowerCase()) {
      onChange(statusVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1 < ALL_STATUSES.length ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < ALL_STATUSES.length) {
          handleSelect(ALL_STATUSES[highlightedIndex]);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-1 text-xs min-h-[28px]"
      : "px-3.5 py-1.5 text-xs min-h-[34px]";

  return (
    <div
      className={`relative inline-block text-left ${fullWidth ? "w-full" : ""}`}
      style={{ verticalAlign: "middle" }}
    >
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        title={title || `Status: ${currentConfig.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`group inline-flex items-center justify-between gap-1.5 rounded-full border font-semibold shadow-2xs transition-all duration-150 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500/30 ${
          currentConfig.badgeClass
        } ${sizeClasses} ${fullWidth ? "w-full" : ""} ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        } ${className}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className={`h-2 w-2 shrink-0 rounded-full ${currentConfig.dotClass}`} />
          <span className="truncate tracking-wide">{currentConfig.label}</span>
        </span>

        <span className="shrink-0 opacity-70 transition-transform duration-150 group-hover:opacity-100">
          {isOpen ? (
            <KeyboardArrowUp sx={{ fontSize: 16 }} />
          ) : (
            <KeyboardArrowDown sx={{ fontSize: 16 }} />
          )}
        </span>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-labelledby={id}
            style={{
              position: "fixed",
              top: coords.placement === "top" ? undefined : `${coords.top}px`,
              bottom:
                coords.placement === "top"
                  ? `${window.innerHeight - coords.top}px`
                  : undefined,
              left: `${coords.left}px`,
              minWidth: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 transition-all focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/50"
          >
            {ALL_STATUSES.map((statusItem, index) => {
              const cfg = INVOICE_STATUS_CONFIGS[statusItem];
              const isSelected = statusItem.toLowerCase() === normalizedKey.toLowerCase();
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={statusItem}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(statusItem)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`relative flex items-center justify-between rounded-xl py-1.5 px-2.5 text-xs transition-colors cursor-pointer select-none ${
                    isSelected
                      ? cfg.activeItemClass
                      : isHighlighted
                      ? "bg-slate-100 dark:bg-slate-800/80 font-medium"
                      : cfg.menuItemClass
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dotClass}`} />
                    <span className="truncate font-semibold">{cfg.label}</span>
                  </span>

                  <span className="shrink-0 text-current ml-2">
                    {isSelected && <Check sx={{ fontSize: 15, fontWeight: 700 }} />}
                  </span>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
