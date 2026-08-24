import React from "react";
import { Search } from "@mui/icons-material";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <Search sx={{ fontSize: 18 }} />
      </div>
    </div>
  );
};
