import React from "react";

export interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = "Loading...",
  size = "md",
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-3",
    lg: "h-14 w-14 border-4",
  };

  const content = (
    <div className="text-center p-6">
      <div
        className={`mx-auto mb-3 animate-spin rounded-full border-indigo-600 border-t-transparent ${sizeClasses[size]}`}
      />
      {message && <p className="text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 animate-spin rounded-full border-indigo-500 border-t-transparent ${sizeClasses[size]}`}
          />
          <p className="text-sm font-medium text-slate-400">{message}</p>
        </div>
      </div>
    );
  }

  return <div className="flex min-h-[240px] items-center justify-center">{content}</div>;
};
