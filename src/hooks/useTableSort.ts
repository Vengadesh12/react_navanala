import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface UseTableSortOptions<T> {
  data: T[];
  initialSortKey?: string;
  initialDirection?: SortDirection;
  getSortValue?: (item: T, sortKey: string) => any;
}

export interface UseTableSortResult<T> {
  sortKey: string;
  sortDirection: SortDirection;
  setSortKey: (key: string) => void;
  setSortDirection: (direction: SortDirection) => void;
  handleSort: (key: string) => void;
  sortedData: T[];
}

export function useTableSort<T>({
  data,
  initialSortKey = "",
  initialDirection = "asc",
  getSortValue,
}: UseTableSortOptions<T>): UseTableSortResult<T> {
  const [sortKey, setSortKey] = useState<string>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !Array.isArray(data) || data.length === 0) {
      return data;
    }

    return [...data].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (getSortValue) {
        valA = getSortValue(a, sortKey);
        valB = getSortValue(b, sortKey);
      } else {
        valA = (a as any)[sortKey];
        valB = (b as any)[sortKey];
      }

      // Handle null or undefined values: push them to the end
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Handle Booleans
      if (typeof valA === "boolean" && typeof valB === "boolean") {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Handle Numbers
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      // Handle numeric strings e.g. "123"
      if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && typeof valA !== "object" && typeof valB !== "object" && valA !== "" && valB !== "") {
        const numA = Number(valA);
        const numB = Number(valB);
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Handle Date values or ISO date strings
      if (valA instanceof Date && valB instanceof Date) {
        return sortDirection === "asc" ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime();
      }

      // Check if string looks like an ISO date or standard date
      const isDateStr = (s: any) => typeof s === "string" && s.length >= 10 && !isNaN(Date.parse(s)) && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(s);
      if (isDateStr(valA) && isDateStr(valB)) {
        const timeA = Date.parse(valA);
        const timeB = Date.parse(valB);
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }

      // Default string comparison (case-insensitive)
      const strA = String(valA).toLowerCase().trim();
      const strB = String(valB).toLowerCase().trim();

      const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDirection, getSortValue]);

  return {
    sortKey,
    sortDirection,
    setSortKey,
    setSortDirection,
    handleSort,
    sortedData,
  };
}
