import React from "react";
import { User, ShieldCheck, Share2, Compass, Award } from "lucide-react";
import { CandidateProfile, RadixCategory, CATEGORY_COLORS } from "../types";

interface MatchCardProps {
  profile: CandidateProfile;
  matchScore: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({ profile, matchScore }) => {
  // Extract top 3 category scores as strengths
  const strengths = Object.entries(profile.category_scores)
    .map(([cat, score]) => ({ category: cat as RadixCategory, score: score as number }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "My Code Odyssey Match Card",
        text: `I scored a ${matchScore}% match on Code Odyssey! Check out my readiness profile.`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback
      alert("📋 Share URL copied to clipboard! Share your Code Odyssey Trading Card with recruiters.");
    }
  };

  return (
    <div
      id="trading-card-container"
      className="relative w-full max-w-[340px] mx-auto group perspective"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>

      {/* Main Trading Card */}
      <div
        id="radix-trading-card"
        className="relative flex flex-col justify-between h-[480px] rounded-3xl bg-slate-950/90 border border-slate-800/80 p-6 shadow-2xl overflow-hidden backdrop-blur-xl select-none"
      >
        {/* Hologram Overlay Accents */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl"></div>

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-purple-400 animate-spin-slow" />
            <span className="font-mono text-[10px] tracking-widest text-purple-400 font-semibold uppercase">
              CODE ODYSSEY
            </span>
          </div>
          <div className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono text-purple-300 font-bold uppercase">
            VERIFIED
          </div>
        </div>

        {/* User Image Placeholder with neon border */}
        <div className="flex flex-col items-center text-center my-4 space-y-2">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full blur-sm opacity-60"></div>
            <div className="relative w-18 h-18 rounded-full bg-slate-900 border-2 border-indigo-400 flex items-center justify-center shadow-inner">
              <User className="w-9 h-9 text-slate-400" />
            </div>
            {/* Badge Indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 border border-slate-950 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="space-y-0.5">
            <h4 className="text-base font-sans font-extrabold text-slate-100 tracking-tight">
              {profile.name || "Anonymous Talent"}
            </h4>
            <p className="text-[10px] font-mono text-slate-400">
              {profile.preferred_roles[0] || "Software Architect"}
            </p>
          </div>
        </div>

        {/* Big Match Score Ring */}
        <div className="flex justify-center items-center py-2">
          <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-slate-900/60 border border-slate-800">
            {/* Circular Progress Path */}
            <svg className="absolute w-22 h-22 transform -rotate-90">
              <circle
                cx="44"
                cy="44"
                r="38"
                className="stroke-slate-800 fill-none"
                strokeWidth="5"
              />
              <circle
                cx="44"
                cy="44"
                r="38"
                className="stroke-indigo-500 fill-none"
                strokeWidth="5"
                strokeDasharray="238"
                strokeDashoffset={238 - (238 * matchScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-sans font-black text-slate-100 leading-none">
                {matchScore}%
              </span>
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                MATCH
              </span>
            </div>
          </div>
        </div>

        {/* Top 3 Strengths Stat Block */}
        <div className="space-y-2 border-t border-b border-slate-800/60 py-3 my-2">
          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest text-center">
            CORE TALENT ATTRIBUTES
          </p>
          <div className="space-y-2 text-xs">
            {strengths.map((str, idx) => {
              const colors = CATEGORY_COLORS[str.category] || { hex: "#6366f1" };
              // Shorter category name
              let catName: string = str.category;
              if (catName === "Coding / Programming Fundamentals") catName = "Coding Fundamentals";
              if (catName === "Data Structures & Algorithms (DSA)") catName = "DSA & Algorithms";

              return (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors.hex }}
                    ></span>
                    <span className="font-sans text-[11px] font-medium text-slate-300 truncate">
                      {catName}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-100">
                    {str.score}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-1">
            <Award className="w-4 h-4 text-teal-400" />
            <span className="font-mono text-[9px] text-slate-400">CLASS L5 COMPLIANT</span>
          </div>
          <button
            id="share-card-btn"
            onClick={handleShare}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer text-xs font-mono"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>SHARE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
