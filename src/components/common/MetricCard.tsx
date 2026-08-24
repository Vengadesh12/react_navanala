import React from "react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  note,
  icon,
  iconBgColor = "bg-indigo-50 text-indigo-600",
  className = "",
}) => {
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${className}`}
    >
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${iconBgColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">
          {value}
        </div>
        {note && <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">{note}</div>}
      </div>
    </div>
  );
};
