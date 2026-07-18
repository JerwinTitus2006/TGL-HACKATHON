import React from "react";
import { RadixCategory, CATEGORY_COLORS } from "../types";

interface CategoryChipProps {
  category: RadixCategory;
  className?: string;
  size?: "sm" | "md";
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  className = "",
  size = "md",
}) => {
  const styles = CATEGORY_COLORS[category] || {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
  };

  const sizeClass = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs";

  return (
    <span
      id={`chip-${category.replace(/\s+/g, "-").toLowerCase()}`}
      className={`inline-flex items-center font-mono font-medium rounded border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass} ${className}`}
    >
      {category}
    </span>
  );
};
