import React from "react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  sublabel?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  color?: "indigo" | "emerald" | "amber" | "blue" | "purple" | "rose";
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  note,
  sublabel,
  icon,
  iconBgColor,
  color,
  className = "",
}) => {
  // Infer color from iconBgColor if color prop not explicitly set
  const themeColor = color || (
    iconBgColor?.includes("emerald") ? "emerald" :
    iconBgColor?.includes("indigo") ? "indigo" :
    iconBgColor?.includes("purple") ? "purple" :
    iconBgColor?.includes("amber") ? "amber" :
    iconBgColor?.includes("rose") ? "rose" :
    iconBgColor?.includes("blue") ? "blue" : "indigo"
  );

  const themeStyles = {
    indigo: {
      card: "border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700",
      label: "text-indigo-700 dark:text-indigo-400",
      note: "text-indigo-600 dark:text-indigo-400",
      badge: "bg-indigo-500 text-white shadow-md shadow-indigo-500/25",
    },
    emerald: {
      card: "border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700",
      label: "text-emerald-700 dark:text-emerald-400",
      note: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500 text-white shadow-md shadow-emerald-500/25",
    },
    amber: {
      card: "border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-amber-300 dark:hover:border-amber-700",
      label: "text-amber-700 dark:text-amber-400",
      note: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500 text-white shadow-md shadow-amber-500/25",
    },
    blue: {
      card: "border-blue-200/70 dark:border-blue-900/60 bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-blue-300 dark:hover:border-blue-700",
      label: "text-blue-700 dark:text-blue-400",
      note: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-500 text-white shadow-md shadow-blue-500/25",
    },
    purple: {
      card: "border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-purple-300 dark:hover:border-purple-700",
      label: "text-purple-700 dark:text-purple-400",
      note: "text-purple-600 dark:text-purple-400",
      badge: "bg-purple-500 text-white shadow-md shadow-purple-500/25",
    },
    rose: {
      card: "border-rose-200/70 dark:border-rose-900/60 bg-gradient-to-br from-rose-500/10 via-white to-white dark:from-rose-500/15 dark:via-slate-900 dark:to-slate-900 hover:border-rose-300 dark:hover:border-rose-700",
      label: "text-rose-700 dark:text-rose-400",
      note: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-500 text-white shadow-md shadow-rose-500/25",
    },
  }[themeColor];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${themeStyles.card} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1 min-w-0 flex-1 pr-3">
          <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${themeStyles.label}`}>
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              {value}
            </span>
            {sublabel && (
              <span className={`text-xs font-medium ${themeStyles.note}`}>
                {sublabel}
              </span>
            )}
          </div>
          {note && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {note}
            </p>
          )}
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${themeStyles.badge}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
