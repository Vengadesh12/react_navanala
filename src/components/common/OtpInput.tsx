import React, { useRef, useEffect } from "react";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  idPrefix?: string;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value = "",
  onChange,
  onComplete,
  autoFocus = true,
  disabled = false,
  hasError = false,
  idPrefix = "otp",
  className = "",
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep array of digits synced with value
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      // Focus first empty box or first box
      const firstEmptyIdx = digits.findIndex((d) => !d);
      const targetIdx = firstEmptyIdx !== -1 ? firstEmptyIdx : 0;
      inputRefs.current[targetIdx]?.focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/\D/g, "");

    if (!sanitized) {
      // User cleared the box
      const newDigits = [...digits];
      newDigits[index] = "";
      const newValue = newDigits.join("");
      onChange(newValue);
      return;
    }

    // Handle single digit or multiple (if pasted into single input)
    if (sanitized.length > 1) {
      handlePastedDigits(sanitized, index);
      return;
    }

    const char = sanitized[sanitized.length - 1];
    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join("");
    onChange(newValue);

    // Focus next box
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }

    // Trigger complete if all filled
    if (newValue.length === length && !newDigits.some((d) => !d)) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (digits[index]) {
        // Clear current digit
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      } else if (index > 0) {
        // Move to previous box and clear it
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        inputRefs.current[index - 1]?.select();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        inputRefs.current[index + 1]?.select();
      }
    } else if (e.key === "Delete") {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    }
  };

  const handlePastedDigits = (pastedText: string, startIndex = 0) => {
    const rawDigits = pastedText.replace(/\D/g, "");
    if (!rawDigits) return;

    const newDigits = [...digits];
    let writeIdx = startIndex;

    // If starting paste from box 0 or text is length >= 6, replace from 0
    if (startIndex === 0 || rawDigits.length >= length) {
      writeIdx = 0;
    }

    for (let i = 0; i < rawDigits.length && writeIdx + i < length; i++) {
      newDigits[writeIdx + i] = rawDigits[i];
    }

    const newValue = newDigits.join("");
    onChange(newValue);

    // Focus last filled box or next empty box
    const nextEmptyIdx = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmptyIdx !== -1 ? nextEmptyIdx : Math.min(length - 1, writeIdx + rawDigits.length);
    inputRefs.current[focusIdx]?.focus();

    if (newValue.length === length && !newDigits.some((d) => !d)) {
      onComplete?.(newValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    handlePastedDigits(pastedData, 0);
  };

  const handleClear = () => {
    onChange("");
    inputRefs.current[0]?.focus();
  };

  return (
    <div className={`w-full flex flex-col items-center gap-3 ${className}`}>
      {/* OTP Boxes Row */}
      <div
        className="flex items-center justify-center gap-2 sm:gap-2.5 w-full select-none"
        onPaste={handlePaste}
      >
        {digits.map((digit, idx) => {
          const isFilled = Boolean(digit);
          const isMidSplit = length === 6 && idx === 3;

          return (
            <React.Fragment key={idx}>
              {isMidSplit && (
                <div
                  className="flex items-center justify-center px-0.5 text-slate-300 font-bold select-none text-base"
                  aria-hidden="true"
                >
                  <span className="h-1 w-2.5 rounded-full bg-slate-300"></span>
                </div>
              )}
              <input
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                id={`${idPrefix}-${idx}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                autoComplete={idx === 0 ? "one-time-code" : "off"}
                disabled={disabled}
                aria-label={`Digit ${idx + 1} of ${length}`}
                onChange={(e) => handleChange(idx, e)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-xl sm:rounded-2xl border-2 transition-all duration-150 outline-none
                  ${
                    disabled
                      ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      : hasError
                      ? "border-rose-400 bg-rose-50/40 text-rose-700 ring-4 ring-rose-500/10 focus:border-rose-600 focus:ring-rose-500/20"
                      : isFilled
                      ? "border-indigo-500 bg-indigo-50/40 text-indigo-900 shadow-xs focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 focus:scale-105"
                      : "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-slate-50 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 focus:scale-105"
                  }
                `}
              />
            </React.Fragment>
          );
        })}
      </div>

      {/* Helper / Clear row */}
      <div className="flex items-center justify-between w-full max-w-xs px-1 text-[11px] text-slate-500">
        <span>
          {value.length === length ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              6 digits entered
            </span>
          ) : (
            <span>Enter the 6-digit security OTP</span>
          )}
        </span>

        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
};
