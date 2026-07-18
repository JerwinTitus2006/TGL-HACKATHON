import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { RadixCategory, CATEGORY_COLORS } from "../types";

interface GapItem {
  category: RadixCategory;
  gap: number; // negative value means deficiency (e.g. -30)
}

interface SkillGapBarChartProps {
  gaps: GapItem[];
}

export const SkillGapBarChart: React.FC<SkillGapBarChartProps> = ({ gaps }) => {
  // We only care about DEFICIENCIES (where gap < 0).
  // Let's filter for negative gaps, sort by biggest absolute gap first, and format them.
  const chartData = gaps
    .filter((g) => g.gap < 0)
    .map((g) => {
      const absGap = Math.abs(g.gap);
      const colorHex = CATEGORY_COLORS[g.category]?.hex || "#6366f1";

      // Shorten category names
      let shortName = g.category;
      if (g.category === "Coding / Programming Fundamentals") shortName = "Coding";
      if (g.category === "Data Structures & Algorithms (DSA)") shortName = "DSA";
      if (g.category === "Soft Skills / Communication") shortName = "Soft Skills";
      if (g.category === "Domain & Business Knowledge") shortName = "Domain";

      return {
        category: shortName,
        fullName: g.category,
        gapPercent: absGap,
        color: colorHex,
      };
    })
    .sort((a, b) => b.gapPercent - a.gapPercent); // Largest gap first

  // If there are no gaps, render a nice completion state!
  if (chartData.length === 0) {
    return (
      <div
        id="no-gaps-state"
        className="flex flex-col items-center justify-center p-8 border border-emerald-500/10 bg-emerald-500/5 rounded-2xl text-center space-y-2"
      >
        <span className="text-2xl">🎉</span>
        <p className="font-sans font-semibold text-emerald-400">Perfect Alignment!</p>
        <p className="text-xs text-slate-400">
          Your skills meet or exceed the benchmarks in all 12 categories. No major gaps to close!
        </p>
      </div>
    );
  }

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg shadow-xl text-xs">
          <p className="font-sans font-bold text-slate-200">{data.fullName}</p>
          <p className="font-mono text-rose-400 mt-1">
            Deficiency: <span className="font-bold">-{data.gapPercent}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="gap-bar-chart-container" className="w-full space-y-2">
      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest">
        Skill Gaps to Close (Deficiency magnitude)
      </h4>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid stroke="#1e293b" horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 9 }}
              stroke="#334155"
            />
            <YAxis
              type="category"
              dataKey="category"
              tick={{ fill: "#94a3b8", fontSize: 9, fontFamily: "monospace" }}
              stroke="#334155"
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1e293b", opacity: 0.2 }} />
            <Bar dataKey="gapPercent" radius={[0, 4, 4, 0]} barSize={12}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
