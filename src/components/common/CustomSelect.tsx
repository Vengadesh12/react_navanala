import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

export interface CustomSelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}

export interface CustomSelectProps {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  options?: CustomSelectOption[];
  children?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
  menuClassName?: string;
  icon?: ReactNode;
  title?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
}

/**
 * Extracts options from children (<option> elements) if options prop is not provided.
 */
function extractOptionsFromChildren(children: ReactNode): CustomSelectOption[] {
  const result: CustomSelectOption[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    if (child.type === "option") {
      const childProps = child.props as {
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        className?: string;
      };
      result.push({
        value: childProps.value !== undefined ? childProps.value : String(childProps.children ?? ""),
        label: childProps.children ?? String(childProps.value ?? ""),
        disabled: Boolean(childProps.disabled),
        className: childProps.className,
      });
    } else if (child.props && (child.props as any).children) {
      result.push(...extractOptionsFromChildren((child.props as any).children));
    }
  });

  return result;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id: explicitId,
  name,
  value: controlledValue,
  defaultValue,
  options: directOptions,
  children,
  placeholder,
  disabled = false,
  required = false,
  size = "md",
  fullWidth = false,
  className = "",
  menuClassName = "",
  icon,
  title,
  onChange,
  onValueChange,
}) => {
  const autoId = useId();
  const id = explicitId || autoId;

  // Extract options either from prop or children
  const options = directOptions || (children ? extractOptionsFromChildren(children) : []);

  // Internal state for uncontrolled or controlled fallback
  const [internalValue, setInternalValue] = useState<string | number>(() => {
    if (controlledValue !== undefined) return controlledValue;
    if (defaultValue !== undefined) return defaultValue;
    if (options.length > 0 && !placeholder) return options[0].value;
    return "";
  });

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

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

  // Find currently selected option
  const selectedOption = options.find(
    (opt) => String(opt.value) === String(currentValue)
  );

  // Position calculation for portal floating menu
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuEstimatedHeight = Math.min(options.length * 40 + 20, 300);
    const shouldFlip = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    const width = Math.max(rect.width, 160);
    let left = rect.left;

    // Boundary protection for right side of window
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    setCoords({
      top: shouldFlip ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      placement: shouldFlip ? "top" : "bottom",
    });
  }, [options.length]);

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

  // Sync highlighted item with current selected option when opened
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => String(opt.value) === String(currentValue));
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, currentValue, options]);

  // Value change handler
  const handleSelect = (option: CustomSelectOption) => {
    if (option.disabled) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }

    setIsOpen(false);

    // Call onValueChange callback if provided
    onValueChange?.(String(option.value));

    // Dispatch compatible synthetic change event
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || "",
          value: String(option.value),
          id,
        },
        currentTarget: {
          name: name || "",
          value: String(option.value),
          id,
        },
        persist: () => {},
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;

      onChange(syntheticEvent);
    }
  };

  // Keyboard navigation
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
        setHighlightedIndex((prev) => {
          let next = prev + 1;
          while (next < options.length && options[next].disabled) {
            next++;
          }
          return next < options.length ? next : prev;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && options[next].disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Size styling tokens
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs min-h-[30px]",
    md: "px-3.5 py-2 text-xs min-h-[36px]",
    lg: "px-4 py-2.5 text-sm min-h-[42px]",
  }[size];

  // Trigger container styles
  return (
    <div
      className={`relative inline-block text-left ${fullWidth ? "w-full" : ""}`}
      style={{ verticalAlign: "middle" }}
    >
      {/* Hidden input for form serialization */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue ?? ""}
          required={required}
        />
      )}

      {/* Main trigger button matching the reference image */}
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`group flex items-center justify-between gap-2.5 rounded-xl border bg-white font-medium text-slate-700 shadow-2xs transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-900 dark:text-slate-200 ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : ""} ${sizeStyles} ${
          fullWidth ? "w-full" : ""
        } ${className}`}
      >
        <div className="flex items-center gap-2 truncate text-left">
          {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder || "Select option"}
          </span>
        </div>

        {/* Arrow/Chevron: Points UP when open (as shown in image), DOWN when closed */}
        <span className="shrink-0 text-slate-400 transition-transform duration-150 dark:text-slate-400">
          {isOpen ? (
            <KeyboardArrowUp sx={{ fontSize: size === "sm" ? 16 : 18 }} />
          ) : (
            <KeyboardArrowDown sx={{ fontSize: size === "sm" ? 16 : 18 }} />
          )}
        </span>
      </button>

      {/* Portal-rendered floating popover menu */}
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
            className={`max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/5 transition-all focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40 ${menuClassName}`}
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs text-slate-400 dark:text-slate-500">
                No options available
              </div>
            ) : (
              options.map((option, index) => {
                const isSelected = String(option.value) === String(currentValue);
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={String(option.value) + index}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                    className={`relative flex items-center rounded-xl py-2 px-2.5 text-left text-xs transition-colors cursor-pointer select-none ${
                      option.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? isHighlighted
                          ? "bg-blue-100/70 text-blue-700 font-semibold dark:bg-blue-900/50 dark:text-blue-300"
                          : "bg-blue-50/90 text-blue-600 font-semibold dark:bg-blue-900/30 dark:text-blue-400"
                        : isHighlighted
                        ? "bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-200 font-normal"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60 font-normal"
                    }`}
                  >
                    {/* Left Checkmark Slot: Checkmark on left for selected option, empty space for others so all labels line up */}
                    <span className="flex h-4 w-5 shrink-0 items-center justify-center mr-1 text-blue-600 dark:text-blue-400">
                      {isSelected && (
                        <Check sx={{ fontSize: 16, fontWeight: 700 }} />
                      )}
                    </span>

                    {/* Option Label */}
                    <span className="truncate flex-1">{option.label}</span>
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default CustomSelect;
