import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "indigo" | "purple";
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-rose-50 text-rose-700 border-rose-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  icon,
  pulse = false,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {pulse && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            variant === "success"
              ? "bg-emerald-500 animate-pulse"
              : variant === "danger"
              ? "bg-rose-500"
              : variant === "warning"
              ? "bg-amber-500"
              : "bg-indigo-500"
          }`}
        />
      )}
      {icon}
      <span>{children}</span>
    </span>
  );
};
