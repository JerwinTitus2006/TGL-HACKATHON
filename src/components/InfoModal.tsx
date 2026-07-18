import React from "react";
import { X, ShieldAlert, Award, Star, Compass } from "lucide-react";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="radix-info-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="radix-info-modal-card"
        className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <Compass className="w-6 h-6 text-purple-400 animate-spin-slow" />
            <h3 className="text-xl font-sans font-semibold text-slate-100 tracking-tight">
              How Code Odyssey Scores You
            </h3>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm leading-relaxed">
          <p>
            Welcome to <strong className="text-slate-100 bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">Code Odyssey</strong>. We designed this tool 
            specifically to put control back into the hands of candidates. Instead of a standard 
            black-box applicant tracking system (ATS) rejecting you, we provide a completely transparent, 
            interactive analysis of your readiness for top-tier technology roles across 12 star dimensions.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 space-y-2">
              <div className="flex items-center space-x-2 text-purple-400 font-semibold font-sans">
                <Star className="w-4 h-4" />
                <h4>The 12-Skillset Framework</h4>
              </div>
              <p className="text-xs text-slate-400">
                We assess your background across 12 core technical and professional dimensions, ensuring 
                your soft skills and domain expertise count just as much as your programming fundamentals.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/50 space-y-2">
              <div className="flex items-center space-x-2 text-pink-400 font-semibold font-sans">
                <Award className="w-4 h-4" />
                <h4>Overall Readiness (0-100)</h4>
              </div>
              <p className="text-xs text-slate-400">
                Determined by matching your skill proficiencies (1-5) converted to a 100-point scale against 
                the **Company Bar** (average required skill levels of all active listings at that company).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/30 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold font-sans">
              <ShieldAlert className="w-4.5 h-4.5" />
              <h4>Fuzzy & Semantic Match Engine</h4>
            </div>
            <p className="text-xs text-slate-300">
              Traditional ATS keywords force candidates to guess synonyms. Our **Gemini-powered semantic 
              match engine** performs conceptual comparison:
            </p>
            <ul className="list-disc pl-5 text-[11px] text-slate-400 space-y-1">
              <li>Syntactic matches: "NodeJS" automatically matches "Node.js" or "Node".</li>
              <li>Conceptual matches: "AWS Certified" is mapped to general Cloud competency.</li>
              <li>Equivalent matches: "PostgreSQL" and "Spanner" are cross-referenced as relational databases.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-slate-100 font-semibold font-sans">Understanding Gaps</h4>
            <p className="text-xs text-slate-400">
              When a skill is flagged as missing, we differentiate between **Must-Haves** (vital for the core 
              activities of the job) and **Nice-to-Haves** (supporting systems). Each gap includes a tailored 
              practical task or study recommendation to help you level up.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/60 text-center">
          <button
            id="modal-understand-btn"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-150"
          >
            I Understand, Let's Go
          </button>
        </div>
      </div>
    </div>
  );
};
