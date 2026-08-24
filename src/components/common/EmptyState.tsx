import React from "react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  actionIcon,
  className = "",
}) => {
  return (
    <div className={`p-12 text-center ${className}`}>
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="mt-3 text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 mt-4"
          type="button"
        >
          {actionIcon}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
