import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Briefcase,
  User,
  ShieldCheck,
  Award,
  Sparkles,
  Compass,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Download,
  Upload,
  Cpu,
  RefreshCw,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ExternalLink,
  BookOpen,
  LogOut
} from "lucide-react";
import confetti from "canvas-confetti";

import {
  RadixCategory,
  RADIX_CATEGORIES,
  JobDescription,
  CandidateProfile,
  TalentCheckResult,
  SkillMatchResult,
  CandidateSkill,
  Hackathon,
  Certification,
  CATEGORY_COLORS
} from "./types";
import { dataStore, SAMPLE_RESUMES } from "./dataStore";
import { CategoryChip } from "./components/CategoryChip";
import { InfoModal } from "./components/InfoModal";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { RadarChartComp } from "./components/RadarChartComp";
import { SkillGapBarChart } from "./components/SkillGapBarChart";
import { MatchCard } from "./components/MatchCard";
import { CosmicAuth } from "./components/CosmicAuth";

// ----------------------------------------------------------------------
// CIRCULAR PROGRESS GAUGE COMPONENT
// ----------------------------------------------------------------------
const CircularProgressGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  let strokeColor = "#ef4444"; // Red
  let borderGlow = "shadow-[0_0_20px_rgba(239,68,68,0.15)] border-red-500/20";
  let bgGradient = "from-red-500/5 to-transparent";

  if (score >= 40 && score <= 70) {
    strokeColor = "#f59e0b"; // Amber
    borderGlow = "shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/20";
    bgGradient = "from-amber-500/5 to-transparent";
  } else if (score > 70) {
    strokeColor = "#10b981"; // Emerald
    borderGlow = "shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/20";
    bgGradient = "from-emerald-500/5 to-transparent";
  }

  return (
    <div
      id={`gauge-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`relative flex flex-col items-center justify-center p-6 rounded-3xl border bg-gradient-to-b ${bgGradient} ${borderGlow} backdrop-blur-md w-44 h-44 mx-auto`}
    >
      <svg className="w-32 h-32 transform -rotate-90">
        <circle cx="64" cy="64" r="56" className="stroke-slate-900 fill-none" strokeWidth="6" />
        <circle
          cx="64"
          cy="64"
          r="56"
          className="fill-none transition-all duration-1000 ease-out"
          strokeWidth="8"
          strokeDasharray="351.8"
          strokeDashoffset={351.8 - (351.8 * score) / 100}
          strokeLinecap="round"
          stroke={strokeColor}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-display font-black text-slate-100 leading-none">
          {score}
        </span>
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-1.5">
          {label}
        </span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN APPLICATION COMPONENT
// ----------------------------------------------------------------------
export default function App() {
  // Navigation Steps
  const STEPS = [
    { label: "Upload Resume", icon: FileText, desc: "Paste & parse your background" },
    { label: "Job Description", icon: Briefcase, desc: "Paste or select target JD" },
    { label: "Profile Builder", icon: User, desc: "Refine & enrich competencies" },
    { label: "Talent Check", icon: ShieldCheck, desc: "Benchmark against standards" },
    { label: "Skill Match", icon: Award, desc: "Semantic keyword alignment" },
    { label: "Final Results", icon: Sparkles, desc: "Comprehensive dashboard" },
  ];

  const [activeStep, setActiveStep] = useState(0);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(() => {
    const saved = localStorage.getItem("code_odyssey_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Core States
  const [profile, setProfile] = useState<CandidateProfile>(dataStore.getProfile());
  const [jds, setJds] = useState<JobDescription[]>(dataStore.getJDs());
  const [activeJdId, setActiveJdId] = useState<string>(dataStore.getActiveJDId());
  
  // Results States
  const [talentCheckResult, setTalentCheckResult] = useState<TalentCheckResult | null>(
    dataStore.getTalentCheckResult()
  );
  const [skillMatchResult, setSkillMatchResult] = useState<SkillMatchResult | null>(
    dataStore.getSkillMatchResult()
  );

  // UI Support States
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [savePulse, setSavePulse] = useState(false);
  const [activeResumeSample, setActiveResumeSample] = useState<number | null>(null);
  
  // Drag and drop states
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isDraggingJd, setIsDraggingJd] = useState(false);

  // Input text field states
  const [resumeText, setResumeText] = useState("");
  const [customJdText, setCustomJdText] = useState("");
  const [isCustomJdActive, setIsCustomJdActive] = useState(false);

  // Extraction Loaders
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingJd, setLoadingJd] = useState(false);
  const [loadingTalentCheck, setLoadingTalentCheck] = useState(false);
  const [loadingSkillMatch, setLoadingSkillMatch] = useState(false);
  
  // Warnings or Fallback notifications
  const [apiNotice, setApiNotice] = useState<{ type: "success" | "warning" | "info"; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File loading helper supporting direct raw text & structured profile json files
  const loadFileContent = (file: File, target: "resume" | "jd") => {
    const reader = new FileReader();
    
    if (file.name.endsWith(".json")) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (target === "resume") {
            if (parsed.name && Array.isArray(parsed.skills)) {
              triggerAutosave(parsed);
              setApiNotice({ type: "success", message: `Successfully loaded Profile configuration from '${file.name}'!` });
            } else {
              setResumeText(JSON.stringify(parsed, null, 2));
              setApiNotice({ type: "success", message: `Extracted text payload from '${file.name}' JSON.` });
            }
          } else {
            setCustomJdText(JSON.stringify(parsed, null, 2));
            setApiNotice({ type: "success", message: `Extracted job description from '${file.name}' JSON.` });
          }
        } catch (err) {
          if (target === "resume") setResumeText(e.target?.result as string);
          else setCustomJdText(e.target?.result as string);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
      // Best-effort smart text reading fallback
      reader.onload = (e) => {
        const rawContent = e.target?.result as string;
        // Clean up binary characters to make plain text human readable
        const cleanedText = rawContent
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (target === "resume") {
          setResumeText(cleanedText.slice(0, 15000));
          setActiveResumeSample(null);
          setApiNotice({
            type: "info",
            message: `Best-effort raw stream text extracted from '${file.name}'. Please review/format below before extracting.`
          });
        } else {
          setCustomJdText(cleanedText.slice(0, 15000));
          setApiNotice({
            type: "info",
            message: `Best-effort raw stream text extracted from '${file.name}'. Please review/format below before analyzing.`
          });
        }
      };
      reader.readAsText(file);
    } else {
      // Standard raw txt or md file
      reader.onload = (e) => {
        const textContent = e.target?.result as string;
        if (target === "resume") {
          setResumeText(textContent);
          setActiveResumeSample(null);
          setApiNotice({ type: "success", message: `Loaded resume contents from '${file.name}' successfully.` });
        } else {
          setCustomJdText(textContent);
          setApiNotice({ type: "success", message: `Loaded job description contents from '${file.name}' successfully.` });
        }
      };
      reader.readAsText(file);
    }
  };

  // Initialize data stores on load
  useEffect(() => {
    dataStore.initialize();
    setProfile(dataStore.getProfile());
    setJds(dataStore.getJDs());
    setActiveJdId(dataStore.getActiveJDId());
    
    // Auto-load some sample text for the resume step to make it easier
    setResumeText(SAMPLE_RESUMES[0].text);
    setActiveResumeSample(0);
  }, []);

  // Autosave profile with visual feedback pulse
  const triggerAutosave = (newProfile: CandidateProfile) => {
    const saved = dataStore.saveProfile(newProfile);
    setProfile(saved);
    setSavePulse(true);
    setTimeout(() => setSavePulse(false), 1200);
  };

  // Trigger celebration confetti on high readiness scores
  useEffect(() => {
    if (activeStep === 5 && talentCheckResult && talentCheckResult.overall_readiness >= 85) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#10b981", "#06b6d4", "#f59e0b"],
      });
    }
  }, [activeStep, talentCheckResult]);

  // Active Job Description accessor
  const activeJd = jds.find((j) => j.id === activeJdId) || jds[0] || null;

  // Calculate Company Bar benchmark averages based on loaded JDs
  const companyBarScores = (() => {
    const bar: Record<RadixCategory, number> = {
      "Coding / Programming Fundamentals": 60,
      "Data Structures & Algorithms (DSA)": 60,
      "System Design": 60,
      "Cloud & DevOps": 60,
      "Databases": 60,
      "Frontend Engineering": 60,
      "Backend Engineering": 60,
      "AI / ML": 60,
      "Testing & QA": 60,
      "Security": 60,
      "Soft Skills / Communication": 60,
      "Domain & Business Knowledge": 60,
    };

    if (!activeJd) return bar;

    // Filter JDs belonging to the same company
    const relatedJds = jds.filter(
      (j) => j.company.toLowerCase() === activeJd.company.toLowerCase()
    );

    const counts: Record<RadixCategory, { sum: number; count: number }> = {} as any;
    RADIX_CATEGORIES.forEach((cat) => {
      counts[cat] = { sum: 0, count: 0 };
    });

    relatedJds.forEach((jd) => {
      jd.required_skills.forEach((s) => {
        if (counts[s.category]) {
          counts[s.category].sum += s.min_proficiency;
          counts[s.category].count += 1;
        }
      });
    });

    RADIX_CATEGORIES.forEach((cat) => {
      const stat = counts[cat];
      if (stat.count > 0) {
        // scale 1-5 to percentage (1 -> 20, 5 -> 100)
        bar[cat] = Math.round((stat.sum / stat.count) * 20);
      } else {
        bar[cat] = 55; // default sensible baseline
      }
    });

    return bar;
  })();

  // ----------------------------------------------------------------------
  // API PROCESSOR CALLS (with graceful try/catch and intelligent fallback)
  // ----------------------------------------------------------------------

  // 1. Parse Resume
  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setLoadingResume(true);
    setApiNotice(null);

    try {
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to parse resume");

      // Merge backend parsed resume data with existing profile fields
      const newProfile: CandidateProfile = {
        ...profile,
        name: data.result.name || "Parsed Candidate",
        preferred_roles: data.result.preferred_roles || ["Software Engineer"],
        skills: data.result.skills || [],
        hackathons: data.result.hackathons || [],
        certifications: data.result.certifications || [],
      };

      triggerAutosave(newProfile);

      if (data.isFallback) {
        setApiNotice({
          type: "warning",
          message: "Local extraction activated: Gemini API key missing, mapped skills via keyword scanner.",
        });
      } else {
        setApiNotice({
          type: "success",
          message: "Success: Resume parsed successfully with Gemini 2.5 Flash!",
        });
      }

      // Automatically move to the next step
      setTimeout(() => {
        setActiveStep(1);
        setApiNotice(null);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setApiNotice({
        type: "warning",
        message: `Parsing failure: ${err.message || "Unknown error"}. Triggering manual profile.`,
      });
    } finally {
      setLoadingResume(false);
    }
  };

  // 2. Extract JD
  const handleExtractJD = async () => {
    if (!customJdText.trim()) return;
    setLoadingJd(true);
    setApiNotice(null);

    try {
      const response = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: customJdText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to analyze JD");

      const newJd: JobDescription = {
        ...data.result,
        id: `jd-custom-${Date.now()}`,
      };

      // Save custom JD to local list
      const updatedJds = dataStore.saveJD(newJd);
      setJds(updatedJds);
      dataStore.setActiveJDId(newJd.id);
      setActiveJdId(newJd.id);
      setIsCustomJdActive(false);
      setCustomJdText("");

      if (data.isFallback) {
        setApiNotice({
          type: "warning",
          message: "Local extraction: Gemini key unavailable, extracted competencies using keyword dictionary.",
        });
      } else {
        setApiNotice({
          type: "success",
          message: "Success: Job description analyzed successfully via Gemini!",
        });
      }

      setTimeout(() => {
        setActiveStep(2); // move to profile builder to review mapping
        setApiNotice(null);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setApiNotice({
        type: "warning",
        message: `JD Extraction failed: ${err.message || "Please check connection"}.`,
      });
    } finally {
      setLoadingJd(false);
    }
  };

  // 3. Compute Talent Check
  const handleRunTalentCheck = async () => {
    setLoadingTalentCheck(true);
    setApiNotice(null);

    try {
      const response = await fetch("/api/talent-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          companyBar: companyBarScores,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed talent audit");

      setTalentCheckResult(data.result);
      dataStore.saveTalentCheckResult(data.result);

      if (data.isFallback) {
        setApiNotice({
          type: "info",
          message: "Talent benchmarks calculated using local matching parameters.",
        });
      }

    } catch (err: any) {
      console.error(err);
      setApiNotice({
        type: "warning",
        message: "Failed to perform AI audit. Please try again later.",
      });
    } finally {
      setLoadingTalentCheck(false);
    }
  };

  // 4. Compute Skill Match
  const handleRunSkillMatch = async () => {
    if (!activeJd) return;
    setLoadingSkillMatch(true);
    setApiNotice(null);

    try {
      const response = await fetch("/api/skill-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          jd: activeJd,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed semantic alignment review");

      setSkillMatchResult(data.result);
      dataStore.saveSkillMatchResult(data.result);

      if (data.isFallback) {
        setApiNotice({
          type: "info",
          message: "Fuzzy semantic alignment completed using local text maps.",
        });
      }

    } catch (err: any) {
      console.error(err);
      setApiNotice({
        type: "warning",
        message: "Skill matching service unavailable.",
      });
    } finally {
      setLoadingSkillMatch(false);
    }
  };

  // ----------------------------------------------------------------------
  // PROFILE CONSTRUCTORS / UTILITIES
  // ----------------------------------------------------------------------

  // JSON Profile Export
  const handleExportProfile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${profile.name.toLowerCase().replace(/\s+/g, "_") || "radix"}_profile.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // JSON Profile Import
  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.name && Array.isArray(parsed.skills)) {
          triggerAutosave(parsed);
          setApiNotice({ type: "success", message: "Success: Profile uploaded and loaded successfully!" });
        } else {
          throw new Error("Invalid schema structure");
        }
      } catch (err) {
        setApiNotice({ type: "warning", message: "Invalid JSON format: Profile must match CandidateProfile schema." });
      }
    };
    fileReader.readAsText(file);
  };

  // Edit fields helper
  const handleUpdateName = (name: string) => {
    triggerAutosave({ ...profile, name });
  };

  const handleUpdateRoles = (rolesString: string) => {
    const preferred_roles = rolesString.split(",").map((r) => r.trim()).filter(Boolean);
    triggerAutosave({ ...profile, preferred_roles });
  };

  const handleAddSkill = (skill: string, category: RadixCategory, proficiency: number) => {
    const cleanSkill = skill.trim();
    if (!cleanSkill) return;

    // Check if skill already exists
    if (profile.skills.some((s) => s.skill.toLowerCase() === cleanSkill.toLowerCase())) return;

    const newSkill: CandidateSkill = {
      skill: cleanSkill,
      category,
      proficiency,
      source: "self-reported",
    };

    triggerAutosave({
      ...profile,
      skills: [...profile.skills, newSkill],
    });
  };

  const handleRemoveSkill = (skillName: string) => {
    triggerAutosave({
      ...profile,
      skills: profile.skills.filter((s) => s.skill !== skillName),
    });
  };

  const handleAddHackathon = (name: string, year: number, description: string) => {
    if (!name.trim()) return;
    const newHack: Hackathon = { name: name.trim(), year, description: description.trim() };
    triggerAutosave({
      ...profile,
      hackathons: [...profile.hackathons, newHack],
    });
  };

  const handleRemoveHackathon = (index: number) => {
    triggerAutosave({
      ...profile,
      hackathons: profile.hackathons.filter((_, i) => i !== index),
    });
  };

  const handleAddCert = (name: string, issuer: string, year: number) => {
    if (!name.trim()) return;
    const newCert: Certification = { name: name.trim(), issuer: issuer.trim(), year };
    triggerAutosave({
      ...profile,
      certifications: [...profile.certifications, newCert],
    });
  };

  const handleRemoveCert = (index: number) => {
    triggerAutosave({
      ...profile,
      certifications: profile.certifications.filter((_, i) => i !== index),
    });
  };

  if (!currentUser) {
    return <CosmicAuth onAuthSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#030014] cosmic-grid text-slate-100 flex flex-col font-sans select-none pb-12 antialiased relative">
      {/* Background Decorative Mesh Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[600px] bg-pink-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="sticky top-0 z-40 bg-[#030014]/80 backdrop-blur-md border-b border-purple-500/15 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Compass className="w-5.5 h-5.5 text-white animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold tracking-tight bg-gradient-to-r from-purple-200 via-purple-400 to-pink-300 bg-clip-text text-transparent">
              Code Odyssey
            </h1>
            <p className="text-[9px] font-mono text-purple-400 tracking-widest font-bold">
              THE COSMIC CANDIDATE MATCH ENGINE
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* User Coordinates Indicator */}
          <div className="hidden md:flex items-center space-x-2 bg-purple-500/5 border border-purple-500/15 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center font-black text-[9px] text-white">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "E"}
            </div>
            <span className="font-mono text-purple-200 text-[10px] max-w-[120px] truncate">
              {currentUser?.name || "Explorer"}
            </span>
          </div>

          {/* Saved Badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-purple-500/15 text-xs backdrop-blur-md">
            <span className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${savePulse ? "animate-ping" : ""}`}></span>
            <span className="text-[10px] font-mono text-slate-400">Autosaved</span>
          </div>

          <button
            id="how-it-works-btn"
            onClick={() => setInfoModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">How it works</span>
          </button>

          {/* Disconnect coordinates */}
          <button
            onClick={() => {
              localStorage.removeItem("code_odyssey_user");
              setCurrentUser(null);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all duration-150 cursor-pointer"
            title="Disconnect Cosmic coordinates"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="font-semibold hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </header>

      {/* Top Level Step Notification Banner */}
      {apiNotice && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div
            className={`p-3 rounded-xl border flex items-center space-x-3 text-xs ${
              apiNotice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : apiNotice.type === "warning"
                ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                : "bg-purple-500/10 border-purple-500/25 text-purple-400"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="font-mono">{apiNotice.message}</p>
          </div>
        </div>
      )}

      {/* STEPPER CONTAINER (Fluidly Responsive) */}
      <div className="max-w-7xl mx-auto w-full px-6 mt-6">
        <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0 select-none">
          {/* Mobile Step Indicator */}
          <div className="flex md:hidden items-center justify-between w-full">
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
              Step {activeStep + 1} of {STEPS.length}
            </span>
            <span className="font-sans font-bold text-slate-100 text-sm">
              {STEPS[activeStep].label}
            </span>
          </div>
          <div className="md:hidden w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full transition-all duration-300"
              style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
            ></div>
          </div>

          {/* Desktop Stepper */}
          <div className="hidden md:flex items-center justify-between w-full relative">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isCompleted = idx < activeStep;
              const isActive = idx === activeStep;

              return (
                <button
                  key={idx}
                  id={`step-bubble-${idx}`}
                  onClick={() => setActiveStep(idx)}
                  className="flex items-center space-x-3.5 z-10 text-left cursor-pointer group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500 border border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        : isActive
                        ? "bg-purple-600 border border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-slate-900 border border-slate-800 text-slate-500 group-hover:border-slate-700 group-hover:text-slate-400"
                    }`}
                  >
                    {isCompleted ? <FileCheck className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  <div className="hidden lg:block">
                    <p
                      className={`text-xs font-bold leading-none ${
                        isActive ? "text-purple-400 font-extrabold" : isCompleted ? "text-slate-300 font-medium" : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500 mt-0.5 max-w-[110px] truncate">
                      {step.desc}
                    </p>
                  </div>
                </button>
              );
            })}
            {/* Connecting progress line */}
            <div className="absolute top-5 left-4 right-4 h-[1px] bg-slate-800 -z-0"></div>
            <div
              className="absolute top-5 left-4 h-[1px] bg-gradient-to-r from-emerald-500 to-purple-500 -z-0 transition-all duration-500"
              style={{ width: `${(activeStep / (STEPS.length - 1)) * 95}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* CORE WORKSPACE CONTENT PANEL */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 mt-6 grid grid-cols-1 gap-6 animate-fade-in">
        
        {/* ================================================================== */}
        {/* STEP 0: RESUME UPLOAD / PARSER */}
        {/* ================================================================== */}
        {activeStep === 0 && (
          <div className="glass-panel-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold text-purple-400 uppercase tracking-widest">
                VERIFIABLE PROFILE EXTRACTION
              </span>
              <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                Welcome, {currentUser?.name || "Explorer"}! Scan Your Cosmic Competencies
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                Upload your CV/Resume or paste your technical background below. Our Gemini 2.5 Flash processor will extract your skills, 
                categorize them into the 12 star dimensions, and calibrate initial baseline proficiencies.
              </p>
            </div>

            {/* Quick-Seed Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                OR TESTING PRE-SEEDED HIGHLIGHTS
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_RESUMES.map((r, idx) => (
                  <button
                    key={idx}
                    id={`seed-resume-btn-${idx}`}
                    onClick={() => {
                      setResumeText(r.text);
                      setActiveResumeSample(idx);
                      setApiNotice({ type: "info", message: `Loaded ${r.name.split(" - ")[0]}. Click 'Extract competencies' below to parse.` });
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all duration-150 ${
                      activeResumeSample === idx
                        ? "bg-indigo-600/20 border-indigo-400 text-indigo-300"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    🚀 Load {r.name.split(" - ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Text Input Block with drag-and-drop zone */}
              <div className="lg:col-span-2 space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingResume(true);
                  }}
                  onDragLeave={() => setIsDraggingResume(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingResume(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) loadFileContent(file, "resume");
                  }}
                  className={`relative rounded-2xl border-2 border-dashed p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDraggingResume
                      ? "border-purple-400 bg-purple-500/10 scale-[1.01] shadow-[0_0_25px_rgba(168,85,247,0.2)]"
                      : "border-slate-800 bg-slate-950/40 hover:border-purple-500/30 hover:bg-slate-950/60"
                  }`}
                >
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) loadFileContent(file, "resume");
                    }}
                    accept=".txt,.md,.json,.pdf,.docx"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">
                    Drag and drop your CV/Resume file here, or click to browse
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Supports PDF, DOCX, TXT, MD, or JSON files
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                      Or Edit / Paste Resume Raw Text
                    </label>
                    {resumeText && (
                      <button
                        onClick={() => {
                          setResumeText("");
                          setActiveResumeSample(null);
                        }}
                        className="text-[10px] font-mono text-rose-400 hover:underline"
                      >
                        Clear Text
                      </button>
                    )}
                  </div>
                  <textarea
                    id="resume-text-input"
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setActiveResumeSample(null);
                    }}
                    placeholder="Paste resume text or plain text CV profile here..."
                    className="w-full h-64 rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500/80 transition-colors leading-relaxed"
                  ></textarea>
                </div>
              </div>

              {/* Extraction Summary Preview */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-900 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="font-mono text-xs uppercase tracking-wider">Parser Status</span>
                  </div>
                  
                  {loadingResume ? (
                    <div className="space-y-3 animate-pulse pt-2">
                      <div className="h-4 bg-slate-900 rounded w-2/3"></div>
                      <div className="h-4 bg-slate-900 rounded w-full"></div>
                      <div className="h-4 bg-slate-900 rounded w-5/6"></div>
                      <p className="text-[10px] font-mono text-indigo-400 mt-2 italic">
                        Gemini-2.5-Flash parsing...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="p-3 bg-indigo-950/20 border border-indigo-900/20 rounded-xl space-y-1">
                        <p className="font-sans font-bold text-slate-200">Currently Loaded Profile:</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {profile.name || "Default Mock Profile"} ({profile.skills.length} extracted skills)
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-sans font-bold text-slate-300">Pre-inferred Roles:</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.preferred_roles.map((r, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-slate-900 text-[10px] font-mono text-slate-400">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <button
                    id="parse-resume-btn"
                    onClick={handleParseResume}
                    disabled={loadingResume || !resumeText.trim()}
                    className="w-full py-3.5 rounded-xl text-xs font-sans font-bold bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loadingResume ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>CONSULTING GEMINI FLASH...</span>
                      </>
                    ) : (
                      <>
                        <Cpu className="w-4 h-4" />
                        <span>EXTRACT COMPETENCIES</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 1: SELECT / UPLOAD JD */}
        {/* ================================================================== */}
        {activeStep === 1 && (
          <div className="glass-panel-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                TARGET BENCHMARK ALIGNMENT
              </span>
              <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                Select or Upload Target Job Description
              </h2>
              <p className="text-sm text-slate-400 max-w-2xl">
                Choose one of our pre-seeded premium tech job posts from the index, or paste your 
                own custom target description.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seed JDs list */}
              <div className="lg:col-span-2 space-y-4">
                <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Seeded Enterprise Job Benchmarks
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {jds.filter(j => j.id.startsWith("jd-")).map((item) => {
                    const isActive = activeJdId === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`seed-jd-card-${item.id}`}
                        onClick={() => {
                          dataStore.setActiveJDId(item.id);
                          setActiveJdId(item.id);
                        }}
                        className={`text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-indigo-600/10 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                            : "bg-slate-900/50 border-slate-900 text-slate-400 hover:border-slate-800"
                        }`}
                      >
                        <p className="font-mono text-[10px] text-indigo-400 font-bold uppercase">
                          {item.company}
                        </p>
                        <h4 className="text-sm font-sans font-bold text-slate-100 mt-1 line-clamp-1">
                          {item.role_title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{item.seniority}</p>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">{item.required_skills.length} skills mapped</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Switch to Custom JD Form */}
                <div className="pt-4">
                  <div className="flex items-center justify-between">
                    <button
                      id="toggle-custom-jd-btn"
                      onClick={() => setIsCustomJdActive(!isCustomJdActive)}
                      className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 active:scale-95 transition-all"
                    >
                      {isCustomJdActive ? "Cancel Custom Upload" : "➕ Paste Custom Job Description"}
                    </button>
                  </div>

                  {isCustomJdActive && (
                    <div className="mt-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-sm font-sans font-bold text-slate-200">Custom Target Analyst</h4>
                        <p className="text-xs text-slate-400">
                          Drop a job description file below or paste raw text from LinkedIn, Indeed, or career sites.
                        </p>
                      </div>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingJd(true);
                        }}
                        onDragLeave={() => setIsDraggingJd(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingJd(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) loadFileContent(file, "jd");
                        }}
                        className={`relative rounded-xl border-2 border-dashed p-6 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
                          isDraggingJd
                            ? "border-purple-400 bg-purple-500/10 scale-[1.01] shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                            : "border-slate-800 bg-slate-950/40 hover:border-purple-500/30 hover:bg-slate-950/60"
                        }`}
                      >
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) loadFileContent(file, "jd");
                          }}
                          accept=".txt,.md,.json,.pdf,.docx"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-300">
                          Drag and drop JD file here, or click to browse
                        </p>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                          Supports PDF, DOCX, TXT, MD, or JSON files
                        </p>
                      </div>

                      <textarea
                        id="custom-jd-input"
                        value={customJdText}
                        onChange={(e) => setCustomJdText(e.target.value)}
                        placeholder="Or paste Job Description text here..."
                        className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500"
                      ></textarea>
                      <button
                        id="submit-custom-jd-btn"
                        onClick={handleExtractJD}
                        disabled={loadingJd || !customJdText.trim()}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-all flex items-center space-x-2"
                      >
                        {loadingJd ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>ANALYZING...</span>
                          </>
                        ) : (
                          <span>ANALYZE JOB REQUIREMENTS</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapped Skills Preview */}
              <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-900 space-y-4">
                <div className="border-b border-slate-900 pb-3">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                    ACTIVE TARGET ROLE REQUIREMENTS
                  </span>
                  <h3 className="text-lg font-sans font-extrabold text-slate-100 tracking-tight mt-1">
                    {activeJd ? activeJd.role_title : "Select a JD"}
                  </h3>
                  <p className="text-xs text-indigo-400 font-mono mt-0.5">
                    {activeJd ? activeJd.company : "Corporate"} • {activeJd ? activeJd.seniority : "L5"}
                  </p>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-72 pr-1">
                  {activeJd ? (
                    activeJd.required_skills.map((s, i) => (
                      <div key={i} className="flex flex-col space-y-1 p-2 rounded-lg bg-slate-900/30 border border-slate-900">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-sans font-bold text-slate-200">{s.skill}</span>
                          <span
                            className={`font-mono text-[9px] uppercase font-bold ${
                              s.importance === "must-have" ? "text-rose-400" : "text-amber-400"
                            }`}
                          >
                            {s.importance}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <CategoryChip category={s.category} size="sm" />
                          <span className="text-slate-500">Min Prof: {s.min_proficiency}/5</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No active job loaded.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-900">
                  <button
                    id="confirm-jd-next-btn"
                    onClick={() => setActiveStep(2)}
                    className="w-full py-2.5 rounded-xl text-xs font-sans font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all flex items-center justify-center space-x-1.5 cursor-pointer text-white"
                  >
                    <span>GO TO PROFILE BUILDER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 2: PROFILE BUILDER */}
        {/* ================================================================== */}
        {activeStep === 2 && (
          <div className="glass-panel-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  CONFIRM & RE-CALIBRATE CREDENTIALS
                </span>
                <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                  Talent Profile Builder
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl">
                  Enrich and review your extracted signals. Any manual adjustments will auto-recalculate your 
                  aggregate average scores instantly.
                </p>
              </div>

              {/* Import/Export buttons */}
              <div className="flex items-center space-x-2">
                <button
                  id="export-profile-btn"
                  onClick={handleExportProfile}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-700 active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download profile.json</span>
                </button>
                <button
                  id="import-profile-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-slate-100 hover:border-slate-700 active:scale-95 transition-all flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload profile.json</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportProfile}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Core Information & Skills Panel */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                      Full Name
                    </label>
                    <input
                      id="profile-name-input"
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleUpdateName(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  {/* Preferred roles */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                      Preferred Roles (comma separated)
                    </label>
                    <input
                      id="profile-roles-input"
                      type="text"
                      value={profile.preferred_roles.join(", ")}
                      onChange={(e) => handleUpdateRoles(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Add new skill form */}
                <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-900 space-y-3">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-semibold">
                    Add Custom Skill Competency
                  </h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const skill = (form.elements.namedItem("skill") as HTMLInputElement).value;
                      const cat = (form.elements.namedItem("category") as HTMLSelectElement).value as RadixCategory;
                      const prof = parseInt((form.elements.namedItem("prof") as HTMLInputElement).value);
                      handleAddSkill(skill, cat, prof);
                      form.reset();
                    }}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3"
                  >
                    <input
                      name="skill"
                      type="text"
                      placeholder="e.g. Docker, Python, REST"
                      required
                      className="md:col-span-4 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      name="category"
                      required
                      className="md:col-span-4 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    >
                      {RADIX_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <input
                      name="prof"
                      type="number"
                      min="1"
                      max="5"
                      defaultValue="3"
                      required
                      className="md:col-span-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="md:col-span-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                    >
                      ADD
                    </button>
                  </form>
                </div>

                {/* Mapped skill list with delete buttons */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                    Extracted & Added Technical Skills ({profile.skills.length})
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {profile.skills.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-900 group"
                      >
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-200 truncate">{s.skill}</h5>
                          <div className="mt-1 flex items-center space-x-2">
                            <CategoryChip category={s.category} size="sm" />
                            <span className="text-[10px] font-mono text-slate-500">
                              Prof: {s.proficiency}/5
                            </span>
                          </div>
                        </div>
                        <button
                          id={`remove-skill-btn-${s.skill.replace(/\s+/g, "-").toLowerCase()}`}
                          onClick={() => handleRemoveSkill(s.skill)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Certifications and Hackathons */}
              <div className="space-y-6">
                {/* Certifications Card */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono text-xs uppercase tracking-wider">Certifications</span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const name = (form.elements.namedItem("name") as HTMLInputElement).value;
                      const issuer = (form.elements.namedItem("issuer") as HTMLInputElement).value;
                      const year = parseInt((form.elements.namedItem("year") as HTMLInputElement).value);
                      handleAddCert(name, issuer, year);
                      form.reset();
                    }}
                    className="grid grid-cols-1 gap-2 border-b border-slate-900 pb-4"
                  >
                    <input
                      name="name"
                      type="text"
                      placeholder="AWS Certified Developer"
                      required
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="issuer"
                        type="text"
                        placeholder="Amazon"
                        required
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                      />
                      <input
                        name="year"
                        type="number"
                        min="2010"
                        max="2030"
                        defaultValue="2025"
                        required
                        className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:border-slate-700 cursor-pointer"
                    >
                      + ADD CERTIFICATE
                    </button>
                  </form>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {profile.certifications.map((c, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/40 border border-slate-900">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{c.name}</p>
                          <p className="text-[10px] font-mono text-slate-500">
                            {c.issuer} • {c.year}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveCert(i)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hackathons Card */}
                <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Compass className="w-4 h-4 text-teal-400" />
                    <span className="font-mono text-xs uppercase tracking-wider">Hackathons</span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const name = (form.elements.namedItem("name") as HTMLInputElement).value;
                      const desc = (form.elements.namedItem("desc") as HTMLInputElement).value;
                      const year = parseInt((form.elements.namedItem("year") as HTMLInputElement).value);
                      handleAddHackathon(name, year, desc);
                      form.reset();
                    }}
                    className="grid grid-cols-1 gap-2 border-b border-slate-900 pb-4"
                  >
                    <input
                      name="name"
                      type="text"
                      placeholder="Global AI Hackathon"
                      required
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                    />
                    <input
                      name="desc"
                      type="text"
                      placeholder="Built real-time resume scorer"
                      required
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                    />
                    <input
                      name="year"
                      type="number"
                      min="2010"
                      max="2030"
                      defaultValue="2025"
                      required
                      className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-[11px] font-mono focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 text-teal-400 hover:text-teal-300 hover:border-slate-700 cursor-pointer"
                    >
                      + ADD HACKATHON
                    </button>
                  </form>

                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {profile.hackathons.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/40 border border-slate-900">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{h.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 line-clamp-1">
                            {h.year} • {h.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveHackathon(i)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    id="run-audit-btn"
                    onClick={() => {
                      setActiveStep(3);
                      handleRunTalentCheck();
                    }}
                    className="w-full py-3 rounded-2xl text-xs font-sans font-extrabold bg-gradient-to-r from-indigo-600 to-teal-500 text-white hover:opacity-90 active:scale-98 transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer"
                  >
                    <span>RUN TALENT AUDIT</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 3: TALENT CHECK */}
        {/* ================================================================== */}
        {activeStep === 3 && (
          <div className="glass-panel-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                  BENCHMARK GAP ANALYSIS
                </span>
                <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                  Talent Benchmarking Check
                </h2>
                <p className="text-sm text-slate-400 max-w-xl">
                  Compare your composite skill score ratios against the **{activeJd ? activeJd.company : "Enterprise"} Standards Bar**.
                </p>
              </div>

              <button
                id="re-run-audit-btn"
                onClick={handleRunTalentCheck}
                disabled={loadingTalentCheck}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-slate-100 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTalentCheck ? "animate-spin" : ""}`} />
                <span>Re-run Audit</span>
              </button>
            </div>

            {loadingTalentCheck ? (
              <SkeletonLoader
                title="Triggering Talent Gap Auditor"
                subtitle="Comparing 12 category quotients against corporate benchmarks via Gemini 2.5 Pro..."
                linesCount={6}
              />
            ) : talentCheckResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Overall Readiness Gauge & Radar */}
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 text-center space-y-4">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Aggregate Readiness Score
                    </h4>
                    <CircularProgressGauge score={talentCheckResult.overall_readiness} label="READINESS RATIO" />
                    <p className="text-xs text-slate-400 italic">
                      A higher ratio indicates closer symmetry across must-have technical bands.
                    </p>
                  </div>

                  {/* Quick visual details */}
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-3">
                    <h5 className="text-xs font-mono text-slate-400 uppercase">Category Status</h5>
                    <div className="space-y-1.5 text-xs font-mono">
                      {talentCheckResult.category_breakdown.slice(0, 4).map((c, i) => (
                        <div key={i} className="flex justify-between items-center py-1">
                          <span className="text-slate-400 truncate max-w-[120px]">{c.category}</span>
                          <span
                            className={`font-bold ${
                              c.gap >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {c.gap >= 0 ? `+${c.gap}` : c.gap}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center: Recharts Radar */}
                <div className="lg:col-span-2 space-y-6">
                  <RadarChartComp
                    candidateScores={profile.category_scores}
                    companyBarScores={companyBarScores}
                    title="12-Axis Talent Readiness Radar Overlay"
                  />

                  {/* Feedback summary */}
                  <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 shadow-xl space-y-3 leading-relaxed text-sm">
                    <div className="flex items-center space-x-2 text-indigo-400 border-b border-slate-800/60 pb-2">
                      <Cpu className="w-4.5 h-4.5 text-indigo-400" />
                      <h4 className="font-display font-bold">AI Narrative Gap Audit</h4>
                    </div>
                    <div className="text-slate-300 font-sans text-xs space-y-4 whitespace-pre-line prose-invert">
                      {talentCheckResult.narrative_feedback}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <p className="text-sm text-slate-400">Benchmarking results are currently stale or uncalculated.</p>
                <button
                  id="run-initial-audit-btn"
                  onClick={handleRunTalentCheck}
                  className="px-6 py-2.5 rounded-xl text-xs font-sans font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  INITIALIZE READINESS AUDIT
                </button>
              </div>
            )}

            <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
              <button
                id="talent-back-btn"
                onClick={() => setActiveStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-mono border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 active:scale-95 transition-all"
              >
                BACK
              </button>
              <button
                id="talent-next-btn"
                onClick={() => {
                  setActiveStep(4);
                  handleRunSkillMatch();
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-sans font-extrabold bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all flex items-center justify-center space-x-1 cursor-pointer text-white"
              >
                <span>RUN SEMANTIC MATCH</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 4: SKILL MATCH */}
        {/* ================================================================== */}
        {activeStep === 4 && (
          <div className="glass-panel-glow rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-5">
              <div className="space-y-1">
                <span className="font-mono text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                  SEMANTIC ALIGNMENT SCORE
                </span>
                <h2 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                  Specific Job Role Alignment
                </h2>
                <p className="text-sm text-slate-400 max-w-xl">
                  Compare your credentials directly against the required keywords of **{activeJd ? activeJd.role_title : "Target Role"}**.
                </p>
              </div>

              <button
                id="re-run-match-btn"
                onClick={handleRunSkillMatch}
                disabled={loadingSkillMatch}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-slate-100 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSkillMatch ? "animate-spin" : ""}`} />
                <span>Re-run Matching</span>
              </button>
            </div>

            {loadingSkillMatch ? (
              <SkeletonLoader
                title="Launching Semantic Alignments"
                subtitle="Matching candidate credentials (e.g. Node, React) against specific target keywords using Gemini 2.5 Pro..."
                linesCount={6}
              />
            ) : skillMatchResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                {/* Left: Score Gauge */}
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 text-center space-y-4">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Semantic Match Score
                    </h4>
                    <CircularProgressGauge score={skillMatchResult.match_score} label="ROLE RELEVANCE" />
                    <p className="text-xs text-slate-400 italic">
                      Weighted: Must-haves represent 75% of the coefficient, Nice-to-haves represent 25%.
                    </p>
                  </div>

                  {/* Dynamic Match Stats Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-4 text-xs font-mono">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Target Role</span>
                      <span className="text-slate-300 truncate max-w-[150px] font-bold">{skillMatchResult.job_title}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Matched Skills</span>
                      <span className="text-slate-200 font-bold">{skillMatchResult.matched_skills.length} Mapped</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Critical Gaps</span>
                      <span className="text-rose-400 font-bold">
                        {skillMatchResult.missing_skills.filter(m => m.importance === "must-have").length} Must-haves
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Mapped tags & Recommendations */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="space-y-4">
                    {/* Recommendation Card */}
                    <div className="p-4 rounded-2xl bg-indigo-950/15 border border-indigo-900/30 space-y-2">
                      <div className="flex items-center space-x-2 text-indigo-400">
                        <Cpu className="w-4 h-4" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Veritable AI Recommendation</span>
                      </div>
                      <p className="text-xs text-slate-200 font-sans leading-relaxed">
                        {skillMatchResult.recommendation}
                      </p>
                    </div>

                    {/* Green Matched Skills tags */}
                    <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-3">
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">
                        Matched Skills (Fuzzy matches confirmed)
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {skillMatchResult.matched_skills.length > 0 ? (
                          skillMatchResult.matched_skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">No matching tags. Run CV revision.</span>
                        )}
                      </div>
                    </div>

                    {/* Red / Amber missing skills */}
                    <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-900 space-y-4">
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold">
                        Competency Gaps Detected
                      </h4>
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {skillMatchResult.missing_skills.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col space-y-1 p-3 rounded-xl bg-slate-900/40 border border-slate-900"
                          >
                            <div className="flex justify-between items-start text-xs">
                              <div className="space-y-1">
                                <span className="font-sans font-bold text-slate-200">{m.skill}</span>
                                <div className="flex items-center space-x-1.5">
                                  <CategoryChip category={m.category} size="sm" />
                                </div>
                              </div>
                              <span
                                className={`font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  m.importance === "must-have"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                              >
                                {m.importance}
                              </span>
                            </div>
                            {m.gap_tip && (
                              <p className="text-[11px] text-slate-400 font-sans italic leading-relaxed pt-1.5 border-t border-slate-900/60 mt-1 flex items-start space-x-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                <span>{m.gap_tip}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <p className="text-sm text-slate-400">Match score uncalculated.</p>
                <button
                  id="run-initial-match-btn"
                  onClick={handleRunSkillMatch}
                  className="px-6 py-2.5 rounded-xl text-xs font-sans font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  INITIALIZE MATCHING
                </button>
              </div>
            )}

            <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
              <button
                id="match-back-btn"
                onClick={() => setActiveStep(3)}
                className="px-5 py-2.5 rounded-xl text-xs font-mono border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 active:scale-95 transition-all"
              >
                BACK
              </button>
              <button
                id="match-next-btn"
                onClick={() => setActiveStep(5)}
                className="px-6 py-2.5 rounded-xl text-xs font-sans font-extrabold bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition-all flex items-center justify-center space-x-1 cursor-pointer text-white"
              >
                <span>PROCEED TO FINAL REPORT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STEP 5: FINAL RESULTS DASHBOARD */}
        {/* ================================================================== */}
        {activeStep === 5 && (
          <div className="space-y-6">
            
            {/* Top Level Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Candidate</span>
                <h3 className="text-lg font-sans font-bold text-slate-100 truncate mt-1">{profile.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1 line-clamp-1">{profile.preferred_roles[0]}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Target Company</span>
                <h3 className="text-lg font-sans font-bold text-slate-100 truncate mt-1">{activeJd ? activeJd.company : "Target"}</h3>
                <p className="text-xs text-indigo-400 font-mono mt-1 line-clamp-1">{activeJd ? activeJd.role_title : "Engineer"}</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Readiness Quotient</span>
                  <h3 className="text-2xl font-display font-black text-slate-100 mt-1">
                    {talentCheckResult ? `${talentCheckResult.overall_readiness}%` : "Stale"}
                  </h3>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  talentCheckResult && talentCheckResult.overall_readiness >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}>
                  Q
                </div>
              </div>
              <div className="glass-panel rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Match Score</span>
                  <h3 className="text-2xl font-display font-black text-indigo-400 mt-1">
                    {skillMatchResult ? `${skillMatchResult.match_score}%` : "Stale"}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                  M
                </div>
              </div>
            </div>

            {/* Main Visual Panels Block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Overlapping Radar + Gaps */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* 3-Shape Radar Chart */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-sans font-bold text-slate-100">
                        12-Axis Talent Blueprint
                      </h3>
                      <p className="text-xs text-slate-400">
                        Visualizing Candidate vs Benchmark Company Bar vs Target Job Requirements
                      </p>
                    </div>
                  </div>

                  <RadarChartComp
                    candidateScores={profile.category_scores}
                    companyBarScores={companyBarScores}
                    jdScores={(() => {
                      const jdMap: Record<RadixCategory, number> = {} as any;
                      RADIX_CATEGORIES.forEach((cat) => {
                        jdMap[cat] = 0;
                      });
                      if (activeJd) {
                        activeJd.required_skills.forEach((s) => {
                          if (jdMap[s.category] !== undefined) {
                            // Convert min_proficiency to score out of 100
                            jdMap[s.category] = Math.max(jdMap[s.category], s.min_proficiency * 20);
                          }
                        });
                      }
                      return jdMap;
                    })()}
                  />
                </div>

                {/* Gap Magnitude Bar Chart */}
                <div className="glass-panel rounded-3xl p-6">
                  {talentCheckResult && (
                    <SkillGapBarChart
                      gaps={talentCheckResult.category_breakdown.map((c) => ({
                        category: c.category,
                        gap: c.gap,
                      }))}
                    />
                  )}
                </div>

                {/* Timeline Checklist Gaps */}
                <div className="glass-panel rounded-3xl p-6 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-300 border-b border-slate-900 pb-3">
                    <Award className="w-4.5 h-4.5 text-indigo-400" />
                    <h3 className="text-base font-sans font-bold text-slate-100">
                      Must-Have Gaps Mitigation Plan
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {skillMatchResult ? (
                      skillMatchResult.missing_skills.filter(m => m.importance === "must-have").length > 0 ? (
                        skillMatchResult.missing_skills
                          .filter((m) => m.importance === "must-have")
                          .map((m, i) => (
                            <div key={i} className="flex space-x-4 p-3 rounded-xl bg-slate-900/30 border border-slate-900 leading-relaxed text-xs">
                              {/* Step Index bubble */}
                              <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 font-mono font-bold text-[10px]">
                                {i + 1}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <span className="font-bold text-slate-200">{m.skill}</span>
                                  <CategoryChip category={m.category} size="sm" />
                                </div>
                                <p className="text-slate-400 mt-0.5">{m.gap_tip}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl text-center">
                          <p className="font-mono font-semibold">🎉 All core must-have requirements satisfied!</p>
                        </div>
                      )
                    ) : (
                      <p className="text-slate-500 text-xs">No match audit records calculated.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Shareable Stat Card */}
              <div className="space-y-6">
                <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono text-slate-400 uppercase tracking-widest text-center">
                      Recruiter Trading Card
                    </h4>
                    <MatchCard profile={profile} matchScore={skillMatchResult ? skillMatchResult.match_score : 50} />
                  </div>

                  <div className="mt-6 p-4 rounded-2xl bg-indigo-950/10 border border-indigo-900/30 text-xs text-center space-y-1.5">
                    <p className="font-sans font-semibold text-indigo-400">Export Verified Credentials</p>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Export your completed talent checklist as a shareable JSON package.
                    </p>
                    <button
                      onClick={handleExportProfile}
                      className="px-4 py-1.5 text-[10px] font-mono rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 font-bold uppercase tracking-wider cursor-pointer"
                    >
                      DOWNLOAD PACKAGE
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/30 border border-slate-900 text-xs space-y-3">
                  <h4 className="font-sans font-bold text-slate-200">System Sandbox Options</h4>
                  <p className="text-slate-400 leading-relaxed">
                    You can reset your sandbox metrics to starting seeds at any time. This will purge local alterations.
                  </p>
                  <button
                    id="reset-sandbox-btn"
                    onClick={() => {
                      if (confirm("Reset database sandbox to default seeds? All custom skills/resumes will be lost.")) {
                        dataStore.clearAll();
                        setProfile(dataStore.getProfile());
                        setJds(dataStore.getJDs());
                        setActiveJdId(dataStore.getActiveJDId());
                        setTalentCheckResult(null);
                        setSkillMatchResult(null);
                        setActiveStep(0);
                        setApiNotice({ type: "info", message: "Sandbox purged and restored successfully." });
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all font-mono"
                  >
                    RESET SANDBOX
                  </button>
                </div>
              </div>

            </div>

            {/* Footer step controls */}
            <div className="pt-6 border-t border-slate-900 flex justify-between items-center">
              <button
                onClick={() => setActiveStep(4)}
                className="px-5 py-2.5 rounded-xl text-xs font-mono border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
              >
                BACK
              </button>
              <button
                onClick={() => {
                  setActiveStep(0);
                  setApiNotice({ type: "info", message: "Restarted flow. Prepare a new resume parser review!" });
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-sans font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 active:scale-95 transition-all cursor-pointer"
              >
                RESTART FLOW
              </button>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-[10px] font-mono text-slate-600 max-w-7xl mx-auto w-full px-6 py-4 border-t border-slate-900">
        <p>© 2026 RADIX Talent Match • Powered by Google Gemini AI Models • Transparency First</p>
      </footer>

      {/* INFO TRANSCRIPTION MODAL */}
      <InfoModal isOpen={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </div>
  );
}
