import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Mail, 
  Lock, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Compass, 
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Zap
} from "lucide-react";
import confetti from "canvas-confetti";

interface CosmicAuthProps {
  onAuthSuccess: (user: { name: string; email: string }) => void;
}

export const CosmicAuth: React.FC<CosmicAuthProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hyperdriveActive, setHyperdriveActive] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0 to 4
  const [passwordStatus, setPasswordStatus] = useState("Empty Vault");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  // Interactive Particle Field Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class
    class Star {
      x: number;
      y: number;
      size: number;
      baseSpeedX: number;
      baseSpeedY: number;
      speedX: number;
      speedY: number;
      color: string;
      glowIntensity: number;
      pulseDirection: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.baseSpeedX = (Math.random() - 0.5) * 0.3;
        this.baseSpeedY = (Math.random() - 0.5) * 0.3;
        this.speedX = this.baseSpeedX;
        this.speedY = this.baseSpeedY;
        
        // Beautiful cosmic palette: white, light-purple, cyan, pink
        const colors = [
          "rgba(255, 255, 255, 0.9)",
          "rgba(168, 85, 247, 0.8)", // purple
          "rgba(6, 182, 212, 0.8)",  // cyan
          "rgba(236, 72, 153, 0.8)"  // pink
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.glowIntensity = Math.random();
        this.pulseDirection = Math.random() > 0.5 ? 0.02 : -0.02;
      }

      update(hyperdrive: boolean) {
        if (hyperdrive) {
          // Hyperdrive effect: pull particles outwards from center quickly
          const dx = this.x - width / 2;
          const dy = this.y - height / 2;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          this.speedX = (dx / dist) * 22;
          this.speedY = (dy / dist) * 22;
          this.size = Math.min(this.size + 0.15, 4); // stretch effect
        } else {
          // Slow drifting
          this.speedX = this.baseSpeedX;
          this.speedY = this.baseSpeedY;

          // Gentle pull if mouse is active
          if (mouseRef.current.active) {
            const dx = mouseRef.current.x - this.x;
            const dy = mouseRef.current.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180) {
              const force = (180 - dist) / 180;
              this.speedX += (dx / dist) * force * 0.4;
              this.speedY += (dy / dist) * force * 0.4;
            }
          }
        }

        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around borders in normal mode, reset if in hyperdrive
        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
          if (hyperdrive) {
            // Respawn in the middle to continue hyperdrive tunnels
            this.x = width / 2 + (Math.random() - 0.5) * 50;
            this.y = height / 2 + (Math.random() - 0.5) * 50;
            this.size = Math.random() * 1 + 0.5;
          } else {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
          }
        }

        // Pulse glow
        this.glowIntensity += this.pulseDirection;
        if (this.glowIntensity > 1 || this.glowIntensity < 0.2) {
          this.pulseDirection = -this.pulseDirection;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        if (hyperdriveActive) {
          // Draw streak lines for hyperdrive
          ctx.strokeStyle = this.color;
          ctx.lineWidth = this.size;
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x - this.speedX * 1.5, this.y - this.speedY * 1.5);
          ctx.stroke();
        } else {
          ctx.fillStyle = this.color;
          ctx.shadowBlur = this.glowIntensity * 12;
          ctx.shadowColor = this.color;
          ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    const stars: Star[] = Array.from({ length: 140 }, () => new Star());

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const render = () => {
      // Clear with slight trailing alpha for hyperdrive motion blur
      ctx.fillStyle = hyperdriveActive ? "rgba(3, 0, 20, 0.25)" : "rgb(3, 0, 20)";
      ctx.fillRect(0, 0, width, height);

      // Render starfield
      stars.forEach((star) => {
        star.update(hyperdriveActive);
        star.draw();
      });

      // Draw faint connections for nearby stars in normal mode
      if (!hyperdriveActive) {
        ctx.strokeStyle = "rgba(139, 92, 246, 0.05)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < stars.length; i++) {
          for (let j = i + 1; j < stars.length; j++) {
            const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
            if (dist < 75) {
              ctx.beginPath();
              ctx.moveTo(stars[i].x, stars[i].y);
              ctx.lineTo(stars[j].x, stars[j].y);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hyperdriveActive]);

  // Handle password strength calculation
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordStatus("Empty Vault");
      return;
    }
    let strength = 0;
    if (password.length >= 6) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
    if (strength === 1) setPasswordStatus("Weak Stardust ☄️");
    else if (strength === 2) setPasswordStatus("Stable Orbit 🪐");
    else if (strength === 3) setPasswordStatus("Nebula Solid 🌌");
    else if (strength === 4) setPasswordStatus("Supernova Secure! 💥");
  }, [password]);

  // Quick action to bypass/autofill
  const handleAutofill = (role: "candidate" | "recruiter") => {
    setError("");
    setSuccess("");
    if (role === "candidate") {
      setName("Alex Rivera");
      setEmail("alex.rivera@codeodyssey.io");
      setPassword("NebulaDrive2026!");
      if (!isSignUp) {
        // perfect credentials
      }
    } else {
      setName("Commander Sarah");
      setEmail("sarah.recruiter@odyssey.io");
      setPassword("CosmicTalent99!");
    }
    setSuccess(`Autofilled coordinates for ${role === "candidate" ? "Alex Rivera" : "Commander Sarah"}!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please key in your space sector email address.");
      return;
    }
    if (!password) {
      setError("Your cosmic password key is missing.");
      return;
    }
    if (isSignUp && !name) {
      setError("Please declare your Explorer Name.");
      return;
    }

    setIsLoading(true);

    // Simulate AI network ping verification
    setTimeout(() => {
      setIsLoading(false);

      // Local accounts simulation
      const usersKey = "code_odyssey_registered_users";
      const existingUsers = JSON.parse(localStorage.getItem(usersKey) || "[]");

      if (isSignUp) {
        // Check if user already exists
        const userExists = existingUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (userExists || email === "alex.rivera@codeodyssey.io" || email === "sarah.recruiter@odyssey.io") {
          setError("This space sector is already registered. Please sign in instead.");
          return;
        }

        // Register user
        const newUser = { name, email, password };
        existingUsers.push(newUser);
        localStorage.setItem(usersKey, JSON.stringify(existingUsers));

        setSuccess("Cosmic coordinate established successfully! Preparing navigation portal...");
        triggerHyperdrive(name, email);
      } else {
        // Sign In check
        const isSampleCandidate = email === "alex.rivera@codeodyssey.io" && password === "NebulaDrive2026!";
        const isSampleRecruiter = email === "sarah.recruiter@odyssey.io" && password === "CosmicTalent99!";
        const registeredUser = existingUsers.find(
          (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (isSampleCandidate || isSampleRecruiter || registeredUser) {
          const loggedInName = isSampleCandidate 
            ? "Alex Rivera" 
            : isSampleRecruiter 
            ? "Commander Sarah" 
            : registeredUser.name;

          setSuccess(`Authorization approved. Welcome back, ${loggedInName}!`);
          triggerHyperdrive(loggedInName, email);
        } else {
          setError("Access Denied: Invalid quantum key or sector email.");
        }
      }
    }, 1200);
  };

  const triggerHyperdrive = (finalName: string, finalEmail: string) => {
    setHyperdriveActive(true);
    
    // Play sound or fire massive star burst
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 60,
      origin: { x: 0 },
      colors: ["#a855f7", "#ec4899", "#3b82f6"]
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 60,
      origin: { x: 1 },
      colors: ["#a855f7", "#ec4899", "#3b82f6"]
    });

    // Let the hyperdrive stream continue for 1.5 seconds, then transition to success!
    setTimeout(() => {
      // Trigger final authentication success back to App.tsx
      localStorage.setItem("code_odyssey_user", JSON.stringify({ name: finalName, email: finalEmail }));
      onAuthSuccess({ name: finalName, email: finalEmail });
    }, 1600);
  };

  const bypassAuth = () => {
    triggerHyperdrive("Guest Voyager", "guest@codeodyssey.io");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      {/* Absolute Canvas Starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 block" />

      {/* Background Neon Glow Nebulae */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] nebula-purple rounded-full filter blur-[100px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] nebula-blue rounded-full filter blur-[120px] pointer-events-none animate-pulse duration-[12000ms]" />

      {/* Hyperdrive warp speed screen flash */}
      <AnimatePresence>
        {hyperdriveActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-white z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-md mx-4 select-none">
        
        {/* Floating Top Header Logo & Branding */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-4 ring-2 ring-purple-400/20">
            <Compass className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight bg-gradient-to-r from-purple-200 via-purple-400 to-pink-300 bg-clip-text text-transparent drop-shadow">
            Code Odyssey
          </h1>
          <p className="text-xs font-mono text-purple-400/80 tracking-widest uppercase font-bold mt-1.5">
            Quantum Candidate Alignment Engine
          </p>
        </motion.div>

        {/* Credentials Form Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: hyperdriveActive ? 0 : 1, scale: hyperdriveActive ? 0.7 : 1, y: 0 }}
          transition={{ duration: 0.5, cubicBezier: [0.16, 1, 0.3, 1] }}
          className="relative group rounded-3xl p-8 glass-panel-glow border border-purple-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(139,92,246,0.15)] overflow-hidden"
        >
          {/* Futuristic corner grid lines */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500/40 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500/40 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500/40 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500/40 rounded-br-xl pointer-events-none" />

          {/* Tab Selector Buttons */}
          <div className="relative flex p-1.5 bg-slate-950/60 rounded-2xl border border-purple-500/10 mb-6">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError("");
                setSuccess("");
              }}
              className={`relative z-10 flex-1 py-2 text-xs font-semibold font-mono tracking-wider transition-colors duration-200 cursor-pointer ${
                !isSignUp ? "text-purple-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              SIGN IN
              {!isSignUp && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError("");
                setSuccess("");
              }}
              className={`relative z-10 flex-1 py-2 text-xs font-semibold font-mono tracking-wider transition-colors duration-200 cursor-pointer ${
                isSignUp ? "text-purple-200" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              SIGN UP
              {isSignUp && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Name field (Visible only on Sign Up) */}
            <AnimatePresence initial={false}>
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: "auto", scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-mono text-purple-300/80 tracking-widest uppercase">
                    Explorer Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4.5 h-4.5 text-purple-400/50" />
                    <input
                      type="text"
                      placeholder="Captain Kirk"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-purple-500/10 hover:border-purple-500/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 rounded-xl text-xs font-medium text-slate-100 transition-all placeholder:text-slate-600 focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-purple-300/80 tracking-widest uppercase">
                Sector Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4.5 h-4.5 text-purple-400/50" />
                <input
                  type="email"
                  placeholder="name@odyssey.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-purple-500/10 hover:border-purple-500/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 rounded-xl text-xs font-medium text-slate-100 transition-all placeholder:text-slate-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-purple-300/80 tracking-widest uppercase">
                  Quantum Password Key
                </label>
                {isSignUp && password && (
                  <span className="text-[9px] font-mono text-fuchsia-400 font-bold">
                    {passwordStatus}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4.5 h-4.5 text-purple-400/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/70 border border-purple-500/10 hover:border-purple-500/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 rounded-xl text-xs font-medium text-slate-100 transition-all placeholder:text-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-purple-400/40 hover:text-purple-400/80 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength dynamic gauge indicator */}
              <AnimatePresence>
                {isSignUp && password.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex space-x-1.5 pt-1.5"
                  >
                    {[1, 2, 3, 4].map((stepNum) => (
                      <div
                        key={stepNum}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= stepNum
                            ? passwordStrength === 1
                              ? "bg-red-500"
                              : passwordStrength === 2
                              ? "bg-amber-500"
                              : passwordStrength === 3
                              ? "bg-cyan-500"
                              : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                            : "bg-slate-900"
                        }`}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Verification message prompts */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center space-x-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] text-red-400 font-medium"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-400 font-medium"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={isLoading || hyperdriveActive}
              className="relative w-full py-3.5 rounded-xl font-bold font-mono tracking-wider text-xs overflow-hidden text-white transition-all duration-200 cursor-pointer group active:scale-[0.98] disabled:opacity-50"
            >
              {/* Spinning or glowing supernova background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-600 group-hover:opacity-90 transition-opacity" />
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 opacity-30 group-hover:opacity-100 blur transition duration-300 group-hover:duration-200" />
              
              <span className="relative flex items-center justify-center space-x-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>PINGING NAV-PORTAL...</span>
                  </>
                ) : (
                  <>
                    <span>LAUNCH ODYSSEY</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Bypass Guest Link & Coordinate Preset Buttons */}
          <div className="mt-6 pt-6 border-t border-purple-500/10 text-center space-y-4">
            <div className="flex justify-center space-x-2">
              <button
                onClick={() => handleAutofill("candidate")}
                type="button"
                className="px-2.5 py-1.5 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/20 text-[10px] font-mono text-purple-300 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Autofill Candidate</span>
              </button>
              <button
                onClick={() => handleAutofill("recruiter")}
                type="button"
                className="px-2.5 py-1.5 rounded-lg bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 hover:border-pink-500/20 text-[10px] font-mono text-pink-300 transition-all flex items-center space-x-1 cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>Autofill Recruiter</span>
              </button>
            </div>

            <button
              onClick={bypassAuth}
              type="button"
              className="text-[11px] font-semibold text-slate-400 hover:text-purple-300 transition-colors cursor-pointer block mx-auto hover:underline"
            >
              Explore Odyssey as Guest Voyager →
            </button>
          </div>
        </motion.div>

        {/* Dynamic decorative info footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-center mt-6 flex items-center justify-center space-x-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-[10px] font-mono text-slate-600">
            Secure holographic encryption active.
          </span>
        </motion.div>
      </div>
    </div>
  );
};
