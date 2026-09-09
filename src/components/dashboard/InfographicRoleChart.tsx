import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldOutlined,
  PersonOutline,
  AssignmentOutlined,
  KeyOutlined,
  SecurityOutlined,
  GroupOutlined,
} from "@mui/icons-material";
import type { DashboardRoleDistributionItem } from "../../types";

interface InfographicRoleChartProps {
  data: DashboardRoleDistributionItem[];
  totalUsers?: number;
  className?: string;
}

// NavaNala Brand Accent Colors (matching Sidebar strip under NavaNala Technologies):
// #2563EB (Royal Blue), #16A34A (Emerald Green), #F59E0B (Amber Gold), #E53935 (Crimson Red), #8B5CF6 (Purple), #06B6D4 (Cyan)
const NAVANALA_BRAND_COLORS = [
  "#2563EB", // Royal Blue
  "#16A34A", // Emerald Green
  "#F59E0B", // Amber Gold
  "#E53935", // Crimson Red
  "#8B5CF6", // Purple
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

const ROLE_ICONS = [
  <PersonOutline key="person" sx={{ fontSize: 16 }} />,
  <ShieldOutlined key="shield" sx={{ fontSize: 16 }} />,
  <AssignmentOutlined key="task" sx={{ fontSize: 16 }} />,
  <KeyOutlined key="key" sx={{ fontSize: 16 }} />,
  <GroupOutlined key="group" sx={{ fontSize: 16 }} />,
  <SecurityOutlined key="sec" sx={{ fontSize: 16 }} />,
];

export const InfographicRoleChart: React.FC<InfographicRoleChartProps> = ({
  data,
  totalUsers = 0,
  className = "",
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter out any 0-count items and calculate total count
  const validItems = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter((item) => item.count > 0);
  }, [data]);

  const totalCount = useMemo(() => {
    return validItems.reduce((acc, item) => acc + item.count, 0) || totalUsers || 1;
  }, [validItems, totalUsers]);

  // Center coordinates and baseline radii in SVG viewBox (360 x 300)
  const cx = 180;
  const cy = 150;
  const rHole = 28; // Inner clean hub
  const rCollar = 48; // Center elevated collar ring outer radius
  const rSliceInner = 42; // Slices tuck under collar for 3D layered depth

  // Variable radius calculation:
  // Slices with higher percentage extend farther outward
  const computedSlices = useMemo(() => {
    if (validItems.length === 0) return [];

    let accumulatedAngle = 0;

    return validItems.map((item, idx) => {
      const slicePercentage = (item.count / totalCount) * 100;
      const angleSpan = (item.count / totalCount) * 360;

      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angleSpan;
      accumulatedAngle = endAngle;

      const midAngle = startAngle + angleSpan / 2;

      // Variable outer radius: Slices stick out based on proportion
      // Max radius = 118, Min radius = 78
      const rOut = Math.min(Math.max(78 + (slicePercentage / 100) * 78, 80), 118);

      // SVG Donut slice path coordinates
      // Angles converted from degrees to radians, starting at top (-90 deg)
      const a1 = ((startAngle - 90) * Math.PI) / 180;
      const a2 = ((endAngle - 90) * Math.PI) / 180;
      const aMid = ((midAngle - 90) * Math.PI) / 180;

      const x1 = cx + rOut * Math.cos(a1);
      const y1 = cy + rOut * Math.sin(a1);
      const x2 = cx + rOut * Math.cos(a2);
      const y2 = cy + rOut * Math.sin(a2);

      const x3 = cx + rSliceInner * Math.cos(a2);
      const y3 = cy + rSliceInner * Math.sin(a2);
      const x4 = cx + rSliceInner * Math.cos(a1);
      const y4 = cy + rSliceInner * Math.sin(a1);

      const largeArcFlag = angleSpan > 180 ? 1 : 0;

      // Path data for the variable radius donut sector
      const pathData = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${rSliceInner} ${rSliceInner} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

      // Percentage text position inside the slice body
      const rText = rSliceInner + (rOut - rSliceInner) * 0.52;
      const textX = cx + rText * Math.cos(aMid);
      const textY = cy + rText * Math.sin(aMid);

      const color = NAVANALA_BRAND_COLORS[idx % NAVANALA_BRAND_COLORS.length];
      const icon = ROLE_ICONS[idx % ROLE_ICONS.length];

      return {
        ...item,
        idx,
        slicePercentage,
        startAngle,
        endAngle,
        midAngle,
        rOut,
        pathData,
        textX,
        textY,
        color,
        icon,
      };
    });
  }, [validItems, totalCount]);

  const activeItem = hoveredIdx !== null ? computedSlices[hoveredIdx] : null;

  if (validItems.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
        No active roles configured.
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* Clean SVG Infographic Chart (Pointer lines removed as requested) */}
      <div className="relative w-full max-w-[360px] aspect-[360/300] overflow-visible">
        <svg
          viewBox="0 0 360 300"
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Center Dark Collar Shadow for authentic 3D depth */}
            <filter id="centerCollarShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
            </filter>

            {/* Subtle glow for hovered slice */}
            <filter id="sliceHoverGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.22" />
            </filter>
          </defs>

          {/* LAYER 1: Variable-Radius Slices with NavaNala Brand Colors */}
          <g>
            {computedSlices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              return (
                <path
                  key={`slice-${slice.name}-${slice.idx}`}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth={computedSlices.length > 1 ? 2.5 : 0}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: isHovered ? "url(#sliceHoverGlow) brightness(1.08)" : "none",
                    transform: isHovered ? "scale(1.04)" : "scale(1)",
                    transformOrigin: `${cx}px ${cy}px`,
                    opacity: hoveredIdx === null || isHovered ? 1 : 0.65,
                  }}
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </g>

          {/* LAYER 2: In-Slice Bold White Percentage Labels */}
          <g className="pointer-events-none">
            {computedSlices.map((slice) => {
              if (slice.slicePercentage < 6) return null; // Prevent crowding on tiny slices
              return (
                <text
                  key={`pct-${slice.name}-${slice.idx}`}
                  x={slice.textX}
                  y={slice.textY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  className="font-black text-[13px] drop-shadow-md select-none tracking-tight"
                  style={{
                    fontWeight: 800,
                  }}
                >
                  {Math.round(slice.slicePercentage)}%
                </text>
              );
            })}
          </g>

          {/* LAYER 3: Elevated Center Collar Ring with Authentic Drop Shadow */}
          <g filter="url(#centerCollarShadow)">
            {/* Outer Deep Slate / Navy Collar Ring */}
            <circle
              cx={cx}
              cy={cy}
              r={rCollar}
              fill="#1e293b"
              className="dark:fill-[#0f172a]"
            />

            {/* Inner White / Dark Core Hub */}
            <circle
              cx={cx}
              cy={cy}
              r={rHole}
              fill="#ffffff"
              className="dark:fill-[#1e293b]"
            />
          </g>

          {/* LAYER 4: Center Core Text (Active Users Count / Hovered Detail) */}
          <g className="pointer-events-none">
            {activeItem ? (
              <>
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-900 dark:fill-slate-100 font-extrabold text-[15px]"
                >
                  {activeItem.count}
                </text>
                <text
                  x={cx}
                  y={cy + 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-500 dark:fill-slate-400 font-bold text-[8px] uppercase tracking-wider"
                >
                  {Math.round(activeItem.slicePercentage)}%
                </text>
              </>
            ) : (
              <>
                <text
                  x={cx}
                  y={cy - 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-900 dark:fill-slate-100 font-black text-[17px]"
                >
                  {totalCount}
                </text>
                <text
                  x={cx}
                  y={cy + 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-slate-400 dark:fill-slate-500 font-bold text-[7px] uppercase tracking-widest"
                >
                  USERS
                </text>
              </>
            )}
          </g>
        </svg>
      </div>

      {/* Roles Breakdown Cards in NavaNala Brand Colors */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {computedSlices.map((item) => {
          const isHovered = hoveredIdx === item.idx;
          return (
            <Link
              key={`legend-${item.name}-${item.idx}`}
              to="/roles"
              onMouseEnter={() => setHoveredIdx(item.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                isHovered
                  ? "bg-slate-50 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 shadow-xs scale-[1.02]"
                  : "bg-transparent border-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              }`}
              title={`Configure ${item.name} role`}
            >
              {/* Role Category Icon Badge in NavaNala Brand Color */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-xs"
                style={{ backgroundColor: item.color }}
              >
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-bold truncate ${
                      isHovered ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {item.name}
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 shrink-0">
                    {Math.round(item.slicePercentage)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {item.count} {item.count === 1 ? "user" : "users"}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
export default InfographicRoleChart;
