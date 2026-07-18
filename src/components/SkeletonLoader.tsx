import React from "react";

interface SkeletonLoaderProps {
  title?: string;
  subtitle?: string;
  linesCount?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  title = "Analyzing profile...",
  subtitle = "Leveraging Gemini Pro reasoning to extract signals",
  linesCount = 4,
}) => {
  return (
    <div
      id="skeleton-loader-container"
      className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-xl backdrop-blur-md space-y-6 animate-pulse"
    >
      <div className="space-y-2">
        <div className="h-5 bg-slate-800/80 rounded w-1/3"></div>
        <p className="text-xs text-slate-400 font-mono italic animate-pulse">
          {title}... {subtitle}
        </p>
      </div>

      <div className="space-y-3">
        {Array.from({ length: linesCount }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-800/50 rounded"
            style={{ width: `${100 - i * 15}%` }}
          ></div>
        ))}
      </div>

      <div className="flex space-x-3 pt-2">
        <div className="h-8 bg-indigo-950/40 rounded-xl border border-indigo-900/20 w-24"></div>
        <div className="h-8 bg-slate-800/40 rounded-xl w-32"></div>
      </div>
    </div>
  );
};
