import React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { RadixCategory, RADIX_CATEGORIES } from "../types";

interface RadarChartCompProps {
  candidateScores: Record<RadixCategory, number>;
  companyBarScores: Record<RadixCategory, number>;
  jdScores?: Record<RadixCategory, number>; // Optional 3rd layer
  title?: string;
}

export const RadarChartComp: React.FC<RadarChartCompProps> = ({
  candidateScores,
  companyBarScores,
  jdScores,
  title,
}) => {
  // Format data for Recharts
  const chartData = RADIX_CATEGORIES.map((cat) => {
    // Shorten very long categories for nicer layout
    let displayName: string = cat;
    if (cat === "Coding / Programming Fundamentals") displayName = "Coding / Fund.";
    if (cat === "Data Structures & Algorithms (DSA)") displayName = "DSA";
    if (cat === "Soft Skills / Communication") displayName = "Soft Skills";
    if (cat === "Domain & Business Knowledge") displayName = "Domain Knowledge";

    return {
      category: displayName,
      fullCategory: cat,
      Candidate: candidateScores[cat] || 0,
      "Company Bar": companyBarScores[cat] || 0,
      ...(jdScores ? { "JD Req": jdScores[cat] || 0 } : {}),
    };
  });

  // Custom premium dark tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 border border-slate-800 p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs text-xs space-y-2">
          <p className="font-sans font-bold text-slate-100">{data.fullCategory}</p>
          <div className="space-y-1 font-mono">
            {payload.map((item: any) => (
              <div key={item.name} className="flex justify-between items-center space-x-8">
                <span className="flex items-center space-x-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="text-slate-400">{item.name}:</span>
                </span>
                <span className="font-bold text-slate-100">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="radar-chart-wrapper"
      className="w-full flex flex-col items-center justify-center p-4 bg-slate-900/20 rounded-2xl border border-slate-800/40 backdrop-blur-sm"
    >
      {title && (
        <h4 className="text-sm font-sans font-semibold text-slate-300 self-start mb-2">
          {title}
        </h4>
      )}

      <div className="w-full h-[320px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500, fontFamily: "monospace" }}
            />
            
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 8 }}
              axisLine={false}
            />

            {/* Candidate Score: Electric Indigo */}
            <Radar
              name="Candidate"
              dataKey="Candidate"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.25}
              strokeWidth={2}
            />

            {/* Company Bar: Cool Gray-blue */}
            <Radar
              name="Company Bar"
              dataKey="Company Bar"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />

            {/* Specific Job requirements if present: Golden Amber */}
            {jdScores && (
              <Radar
                name="JD Required"
                dataKey="JD Req"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.12}
                strokeWidth={1.5}
              />
            )}

            <Tooltip content={<CustomTooltip />} />
            
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
