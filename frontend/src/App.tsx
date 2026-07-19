import React, { useState, useEffect, useRef } from 'react';
import { 
  User as UserIcon, 
  FileText, 
  Award, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  History, 
  LogOut, 
  Trash2, 
  Sliders, 
  Cpu,
  Building2,
  Globe,
  Target,
  Briefcase,
  Compass,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Check,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';

// API Base URL
const API_URL = 'http://localhost:8000/api';

// Categories Definitions
const CATEGORY_NAMES: Record<string, string> = {
  COD: 'Coding & Scripting',
  DSA: 'Data Structures & Algorithms',
  OOD: 'Object-Oriented Design',
  APTI: 'Aptitude & Problem Solving',
  COMM: 'Communication Skills',
  AI: 'AI-Native Engineering',
  CLOUD: 'DevOps & Cloud',
  SQL: 'SQL & Database Design',
  SWE: 'Software Engineering Practices',
  SYSD: 'System Design & Architecture',
  NETW: 'Computer Networking',
  OS: 'Operating Systems',
  OTHER: 'General Technologies'
};

// --- Custom SVG Radar Chart component ---
interface RadarChartProps {
  data: {
    category: string;
    required: number;
    candidate: number;
  }[];
}

const RadarChart: React.FC<RadarChartProps> = ({ data }) => {
  const size = 320;
  const center = size / 2;
  const R = 90;
  const numCategories = data.length;
  const rings = [3, 6, 9];
  const [animationProgress, setAnimationProgress] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setAnimationProgress(0);
    let start: number | null = null;
    const duration = 750; // ms
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setAnimationProgress(eased);
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [data]);

  const getCoordinates = (index: number, value: number, progress = 1.0) => {
    const angle = (index * 2 * Math.PI) / numCategories - Math.PI / 2;
    const val = value * progress;
    const r = (Math.min(Math.max(val, 0), 9) / 9) * R;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const requiredPoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.required, animationProgress);
    return `${x},${y}`;
  }).join(' ');

  const candidatePoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.candidate, animationProgress);
    return `${x},${y}`;
  }).join(' ');

  const activeHoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '20px', width: '100%', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Draw rings */}
        {rings.map((ring, ringIdx) => {
          const points = Array.from({ length: numCategories }).map((_, i) => {
            const { x, y } = getCoordinates(i, ring);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={ringIdx}
              points={points}
              fill="none"
              stroke="var(--grey-800)"
              strokeWidth="1"
              strokeDasharray={ring !== 9 ? "4,4" : undefined}
            />
          );
        })}

        {/* Draw spokes */}
        {data.map((_, i) => {
          const outer = getCoordinates(i, 9);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--grey-800)"
              strokeWidth="1"
            />
          );
        })}

        {/* Draw required area */}
        <polygon
          points={requiredPoints}
          fill="rgba(255, 255, 255, 0.005)"
          stroke="var(--grey-600)"
          strokeWidth="1.2"
          strokeDasharray="2,2"
          className="radar-target-line"
        />

        {/* Draw candidate area */}
        <polygon
          points={candidatePoints}
          fill="rgba(255, 255, 255, 0.08)"
          stroke="var(--white-pure)"
          strokeWidth="2"
          style={{ transition: 'fill 0.3s ease' }}
        />

        {/* Draw vertices */}
        {data.map((d, i) => {
          const reqPt = getCoordinates(i, d.required, animationProgress);
          const candPt = getCoordinates(i, d.candidate, animationProgress);
          const isHovered = hoveredIndex === i;
          
          return (
            <g key={i}>
              <circle cx={reqPt.x} cy={reqPt.y} r="2" fill="var(--grey-600)" />
              <circle 
                cx={candPt.x} 
                cy={candPt.y} 
                r={isHovered ? "6" : "3.5"} 
                fill={isHovered ? "var(--white-pure)" : "var(--white-primary)"} 
                stroke="var(--black-void)" 
                strokeWidth="1.5" 
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}

        {/* Draw labels */}
        {data.map((d, i) => {
          const angle = (i * 2 * Math.PI) / numCategories - Math.PI / 2;
          const labelDist = R + 18;
          const x = center + labelDist * Math.cos(angle);
          const y = center + labelDist * Math.sin(angle);
          
          let textAnchor: "inherit" | "end" | "start" | "middle" | undefined = "middle";
          if (Math.cos(angle) > 0.15) textAnchor = "start";
          else if (Math.cos(angle) < -0.15) textAnchor = "end";

          let dy = "0.35em";
          if (Math.sin(angle) > 0.85) dy = "0.95em";
          else if (Math.sin(angle) < -0.85) dy = "-0.20em";

          const isHovered = hoveredIndex === i;

          return (
            <text
              key={i}
              x={x}
              y={y}
              fill={isHovered ? "var(--white-pure)" : "var(--grey-400)"}
              fontSize={isHovered ? "10" : "9"}
              fontWeight={isHovered ? "700" : "normal"}
              fontFamily="var(--font-mono)"
              textAnchor={textAnchor}
              dy={dy}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {d.category}
            </text>
          );
        })}
      </svg>

      {/* Interactive Tooltip Overlay in center */}
      {activeHoveredData && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '1px solid var(--white-pure)',
          padding: '10px 14px',
          width: '140px',
          pointerEvents: 'none',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          boxShadow: '0 0 16px rgba(255,255,255,0.1)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--white-pure)', marginBottom: '4px', borderBottom: '1px solid var(--grey-800)', paddingBottom: '3px' }}>
            {activeHoveredData.category}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: 'var(--grey-400)' }}>Cand:</span>
            <span style={{ color: 'var(--white-pure)' }}>{activeHoveredData.candidate}/9</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span style={{ color: 'var(--grey-400)' }}>Target:</span>
            <span style={{ color: 'var(--white-pure)' }}>{activeHoveredData.required}/9</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--grey-800)', marginTop: '4px', paddingTop: '2px' }}>
            <span style={{ color: 'var(--grey-400)' }}>Gap:</span>
            <span style={{ color: activeHoveredData.candidate >= activeHoveredData.required ? 'var(--grey-400)' : 'var(--white-pure)', fontWeight: 'bold' }}>
              {activeHoveredData.candidate >= activeHoveredData.required ? '0' : `-${activeHoveredData.required - activeHoveredData.candidate}`}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.08)', border: '1.5px solid var(--white-pure)' }}></span>
          <span>Your Skills</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1.2px dashed var(--grey-600)' }}></span>
          <span>Required Target</span>
        </div>
      </div>
    </div>
  );
};

// --- Custom Progress Ring component ---
const ProgressRing = ({ value }: { value: number }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * (radius - 4);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const strokeDashoffset = circumference - (Math.min(Math.max(animatedValue, 0), 100) / 100) * circumference;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px', background: 'var(--black-elevated)', border: '1px solid var(--grey-800)' }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="50"
          cy="50"
          r={radius - 4}
          fill="transparent"
          stroke="var(--grey-800)"
          strokeWidth="4"
        />
        <circle
          cx="50"
          cy="50"
          r={radius - 4}
          fill="transparent"
          stroke="var(--white-pure)"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.2s var(--ease-reveal)' }}
        />
      </svg>
      <div style={{ position: 'absolute', fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--white-pure)' }}>
        {value}%
      </div>
    </div>
  );
};

// --- Custom SVG Bar Chart component ---
interface ComparisonBarChartProps {
  data: {
    label: string;
    value: number;
    max: number;
  }[];
}

const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({ data }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '20px', width: '100%' }}>
      {data.map((d, i) => {
        const pct = (d.value / d.max) * 100;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'var(--grey-400)' }}>{d.label}</span>
              <span style={{ color: 'var(--white-pure)', fontWeight: 'bold' }}>{d.value} / {d.max}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--black-void)', border: '1px solid var(--grey-800)' }}>
              <div 
                style={{ 
                  width: `${pct}%`, 
                  height: '100%', 
                  background: 'var(--white-pure)',
                  transition: 'width 0.6s var(--ease-ui)' 
                }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Custom Floating Particles Background ---
const FloatingParticles = () => {
  const particles = [
    { type: 'plus', size: 10, left: '12%', top: '15%', delay: '0s', duration: '28s' },
    { type: 'square', size: 5, left: '88%', top: '25%', delay: '3s', duration: '32s' },
    { type: 'plus', size: 12, left: '78%', top: '78%', delay: '5s', duration: '30s' },
    { type: 'circle', size: 7, left: '18%', top: '65%', delay: '1s', duration: '35s' },
    { type: 'cross', size: 9, left: '48%', top: '45%', delay: '6s', duration: '38s' },
    { type: 'plus', size: 8, left: '92%', top: '55%', delay: '2s', duration: '26s' },
    { type: 'square', size: 4, left: '6%', top: '50%', delay: '7s', duration: '29s' },
    { type: 'circle', size: 5, left: '42%', top: '8%', delay: '8s', duration: '31s' },
    { type: 'cross', size: 11, left: '58%', top: '82%', delay: '4s', duration: '34s' }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {particles.map((p, i) => {
        let content = '+';
        if (p.type === 'square') content = '■';
        if (p.type === 'circle') content = '○';
        if (p.type === 'cross') content = '×';
        
        return (
          <div
            key={i}
            className="floating-particle"
            style={{
              position: 'absolute',
              left: p.left,
              top: p.top,
              fontSize: `${p.size}px`,
              color: 'rgba(255, 255, 255, 0.05)',
              fontFamily: 'var(--font-mono)',
              animationDelay: p.delay,
              animationDuration: p.duration,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'linear'
            }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  // Responsive layout state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('radix_token'));
  const [, setRefreshToken] = useState<string | null>(localStorage.getItem('radix_refresh_token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('radix_role'));
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App navigation
  const [currentTab, setCurrentTab] = useState<string>('profile');

  // Candidate state
  const [profile, setProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileEdu, setProfileEdu] = useState('');
  const [profileRoles, setProfileRoles] = useState('');

  // Editing forms state for skills/activities
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState('COD');
  const [newSkillConf, setNewSkillConf] = useState('medium');
  const [newSkillEvidence, setNewSkillEvidence] = useState('');

  // Upload/Extraction state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'resume' | 'jd'>('resume');
  const [uploading, setUploading] = useState<boolean>(false);
  const [activeExtraction, setActiveExtraction] = useState<any>(null);
  const [mergePreview, setMergePreview] = useState<any>(null);

  // Talent Check Benchmarks
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [activeTalentCheck, setActiveTalentCheck] = useState<any>(null);
  
  // Skill Matching
  const [jdExtractionsList, setJdExtractionsList] = useState<any[]>([]);
  const [selectedJdId, setSelectedJdId] = useState<string>('');
  const [activeSkillMatch, setActiveSkillMatch] = useState<any>(null);

  // Document/Matching History
  const [documentsHistory, setDocumentsHistory] = useState<any[]>([]);
  const [talentHistory, setTalentHistory] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  // New features state
  const [hiringCompanies, setHiringCompanies] = useState<any[]>([]);
  const [assignedCompanies, setAssignedCompanies] = useState<any[]>([]);
  const [placementStats, setPlacementStats] = useState<any>(null);
  const [selectedHubCompany, setSelectedHubCompany] = useState<any>(null);
  const [companyDetailTab, setCompanyDetailTab] = useState<string>('about');

  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [practiceRecs, setPracticeRecs] = useState<any[]>([]);
  const [activeTestSession, setActiveTestSession] = useState<any>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({});
  const [activeTestResult, setActiveTestResult] = useState<any>(null);
  const [resultSubTab, setResultSubTab] = useState<'summary' | 'questions'>('summary');
  const [expandedResultQuestion, setExpandedResultQuestion] = useState<string | null>(null);
  const [generatingTest, setGeneratingTest] = useState<boolean>(false);
  const [submittingTest, setSubmittingTest] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [userCode, setUserCode] = useState<string>('');
  const [runCodeOutput, setRunCodeOutput] = useState<any>(null);
  const [runningCode, setRunningCode] = useState<boolean>(false);

  const [innovxOpps, setInnovxOpps] = useState<any[]>([]);
  const [innovxApps, setInnovxApps] = useState<any[]>([]);

  // Generic loading & messages
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Refs for upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // JD Upload matching state
  const [matchingJd, setMatchingJd] = useState<boolean>(false);
  const matchJdInputRef = useRef<HTMLInputElement>(null);

  // Fetch baseline data when token is active
  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchCompanies();
      fetchDocuments();
      fetchTalentHistory();
      fetchMatchHistory();
      fetchStudentDashboard();
      fetchInnovXData();
      fetchMockTestHistory();
    }
  }, [token]);

  // Active test timer decrement
  useEffect(() => {
    if (!activeTestSession) return;
    const interval = setInterval(() => {
      setActiveTestSession((prev: any) => {
        if (!prev) return null;
        if (prev.remaining_seconds <= 0) {
          clearInterval(interval);
          apiCall(`/mock-test/${prev.session_id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: prev.session_id, answers: testAnswers })
          }).then(async () => {
            try {
              const res = await apiCall(`/mock-test/results/${prev.session_id}`);
              setActiveTestResult(res);
            } catch (err) {
              console.error("Failed to fetch test results:", err);
            }
            setActiveTestSession(null);
            triggerMessage('success', 'Time expired! Test submitted automatically.');
          }).catch(() => {
            setActiveTestSession(null);
          });
          return null;
        }
        return {
          ...prev,
          remaining_seconds: prev.remaining_seconds - 1
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTestSession, testAnswers]);

  // Alert helpers
  const triggerMessage = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  // Logout handler (declared early so it can be called by apiCall)
  const handleLogout = () => {
    localStorage.removeItem('radix_token');
    localStorage.removeItem('radix_refresh_token');
    localStorage.removeItem('radix_role');
    setToken(null);
    setRefreshToken(null);
    setRole(null);
    setProfile(null);
    triggerMessage('success', 'Logged out.');
  };

  // API Call helper with auto-refresh mechanism
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const makeRequest = async (tokenToUse: string | null) => {
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
      };
      if (tokenToUse) {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
      }
      return fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });
    };

    try {
      let response = await makeRequest(token);
      let data = await response.json();
      
      // Check for 401 Unauthorized indicating token expiration
      if (response.status === 401 && (data.detail === 'Token has expired' || data.error?.message === 'Token has expired')) {
        const storedRefreshToken = localStorage.getItem('radix_refresh_token');
        if (storedRefreshToken) {
          try {
            // Request token refresh
            const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: storedRefreshToken })
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem('radix_token', refreshData.access_token);
              localStorage.setItem('radix_refresh_token', refreshData.refresh_token);
              setToken(refreshData.access_token);
              setRefreshToken(refreshData.refresh_token);
              
              // Retry the original request with the fresh token
              response = await makeRequest(refreshData.access_token);
              data = await response.json();
            } else {
              handleLogout();
              throw new Error('Session expired. Please log in again.');
            }
          } catch (refreshErr) {
            handleLogout();
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          handleLogout();
          throw new Error('Session expired. Please log in again.');
        }
      }

      if (!response.ok) {
        throw new Error(data.error?.message || data.detail || 'API Call failed');
      }
      return data;
    } catch (err: any) {
      console.error(`API Error for ${endpoint}:`, err);
      throw err;
    }
  };

  // Authentication handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = { email, password, role: isRegister ? 'candidate' : undefined };
      
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.detail || 'Authentication failed');
      }
      
      localStorage.setItem('radix_token', data.access_token);
      localStorage.setItem('radix_refresh_token', data.refresh_token);
      localStorage.setItem('radix_role', data.role);
      setToken(data.access_token);
      setRefreshToken(data.refresh_token);
      setRole(data.role);
      triggerMessage('success', 'Logged in successfully!');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details
  const fetchProfile = async () => {
    try {
      const data = await apiCall('/profiles/me');
      setProfile(data);
      setProfileName(data.name || '');
      setProfileEmail(data.email || '');
      setProfileEdu(data.education || '');
      setProfileRoles((data.preferred_roles || []).join(', '));
    } catch (err: any) {
      // If profile not initialized, let user create one
      if (err.message.includes('not initialized')) {
        setProfile(null);
      }
    }
  };

  const fetchCompanies = async () => {
    try {
      const data = await apiCall('/talent-check/companies');
      setCompanies(data);
      if (data.length > 0) setSelectedCompany(data[0].company_id);
    } catch (err) {}
  };

  const fetchDocuments = async () => {
    try {
      const data = await apiCall('/documents/');
      setDocumentsHistory(data);
      // Filter list of parsed JDs
      const jds = data.filter((d: any) => d.doc_type === 'jd' && d.has_extraction);
      setJdExtractionsList(jds);
      if (jds.length > 0) setSelectedJdId(jds[0].extraction_id);
    } catch (err) {}
  };

  const fetchTalentHistory = async () => {
    try {
      const data = await apiCall('/talent-check/history');
      setTalentHistory(data);
    } catch (err) {}
  };

  const fetchMatchHistory = async () => {
    try {
      const data = await apiCall('/skill-match/history');
      setMatchHistory(data);
    } catch (err) {}
  };

  const fetchStudentDashboard = async () => {
    try {
      const data = await apiCall('/student/dashboard');
      setHiringCompanies(data.hiring_companies || []);
      setAssignedCompanies(data.assigned_companies || []);
      setPlacementStats(data.stats || null);
    } catch (err) {}
  };

  const fetchInnovXData = async () => {
    try {
      const data = await apiCall('/student/innovx');
      setInnovxOpps(data.opportunities || []);
      setInnovxApps(data.applications || []);
    } catch (err) {}
  };

  const fetchMockTestHistory = async () => {
    try {
      const histData = await apiCall('/mock-test/history/list');
      setTestHistory(histData.history || []);
      
      const recData = await apiCall('/mock-test/practice/list');
      setPracticeRecs(recData.practice || recData.recommendations || []);
    } catch (err) {}
  };

  // Profile management
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const rolesArray = profileRoles.split(',').map(r => r.trim()).filter(Boolean);
      const payload = {
        name: profileName,
        email: profileEmail,
        education: profileEdu,
        preferred_roles: rolesArray,
        version: profile ? profile.version : 1
      };
      
      const method = profile ? 'PUT' : 'POST';
      const data = await apiCall('/profiles/me', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setProfile(data);
      setEditingProfile(false);
      triggerMessage('success', 'Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Skill manipulations
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    setLoading(true);
    try {
      const currentSkills = profile?.skills || [];
      const updatedSkills = [
        ...currentSkills,
        {
          skill_name: newSkillName.trim(),
          category_code: newSkillCat,
          confidence: newSkillConf,
          evidence: newSkillEvidence.trim() || 'Manually added skill'
        }
      ];

      const payload = {
        skills: updatedSkills,
        version: profile.version
      };

      const data = await apiCall('/profiles/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setProfile(data);
      setNewSkillName('');
      setNewSkillEvidence('');
      triggerMessage('success', 'Skill added successfully!');
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSkill = async (skillToDelete: any) => {
    if (!window.confirm(`Delete ${skillToDelete.skill_name}?`)) return;
    setLoading(true);
    try {
      const updatedSkills = profile.skills.filter(
        (s: any) => !(s.skill_name.toLowerCase() === skillToDelete.skill_name.toLowerCase() && s.category_code === skillToDelete.category_code)
      );

      const payload = {
        skills: updatedSkills,
        version: profile.version
      };

      const data = await apiCall('/profiles/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      setProfile(data);
      triggerMessage('success', 'Skill deleted.');
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // New modules event handlers
  const handleApplyCompany = async (companyId: string) => {
    setLoading(true);
    try {
      const res = await apiCall(`/student/companies/${companyId}/apply`, {
        method: 'POST'
      });
      triggerMessage('success', res.message || `Successfully applied to company.`);
      await fetchStudentDashboard();
    } catch (err: any) {
      triggerMessage('error', err.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyInnovx = async (opportunityId: string) => {
    setLoading(true);
    try {
      const res = await apiCall(`/student/innovx/${opportunityId}/apply`, {
        method: 'POST'
      });
      triggerMessage('success', res.message || `Successfully applied to InnovX opportunity.`);
      await fetchInnovXData();
    } catch (err: any) {
      triggerMessage('error', err.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartMockTest = async (testType: string, companyName?: string) => {
    setGeneratingTest(true);
    setStatusMsg(null);
    try {
      // 1. Initialize session on backend
      const startRes = await apiCall('/mock-test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_type: testType,
          company: companyName || null,
          duration_minutes: 60
        })
      });
      
      // 2. Fetch full session details with questions and remaining seconds
      const sessionDetails = await apiCall(`/mock-test/${startRes.session_id}`);
      
      setActiveTestSession(sessionDetails);
      setTestQuestions(sessionDetails.questions || []);
      setCurrentQuestionIdx(0);
      setTestAnswers({});
      setActiveTestResult(null);
      setRunCodeOutput(null);
      
      if (sessionDetails.questions && sessionDetails.questions.length > 0) {
        const firstQ = sessionDetails.questions[0];
        if (firstQ.category === 'CODING') {
          setUserCode(`def solution():\n    # Write your code here\n    pass\n`);
          setSelectedLanguage('python');
        }
      }
      
      triggerMessage('success', 'Mock test session initialized.');
    } catch (err: any) {
      triggerMessage('error', err.message || 'Failed to start mock test');
    } finally {
      setGeneratingTest(false);
    }
  };

  const handleRunCode = async () => {
    const activeQ = testQuestions[currentQuestionIdx];
    if (!activeQ) return;
    setRunningCode(true);
    setRunCodeOutput(null);
    try {
      const res = await apiCall('/mock-test/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: userCode,
          language: selectedLanguage,
          question_text: activeQ.question_text,
          title_slug: activeQ.title_slug || null
        })
      });
      setRunCodeOutput(res);
      triggerMessage('success', 'Code execution completed.');
    } catch (err: any) {
      triggerMessage('error', err.message || 'Code execution failed');
    } finally {
      setRunningCode(false);
    }
  };

  const handleSubmitMockTest = async () => {
    if (!activeTestSession) return;
    if (!window.confirm('Are you sure you want to submit your mock test?')) return;
    setSubmittingTest(true);
    try {
      await apiCall(`/mock-test/${activeTestSession.session_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeTestSession.session_id,
          answers: testAnswers
        })
      });
      
      const res = await apiCall(`/mock-test/results/${activeTestSession.session_id}`);
      setActiveTestResult(res);
      setActiveTestSession(null);
      triggerMessage('success', 'Mock test submitted successfully!');
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
      await fetchMockTestHistory();
    } catch (err: any) {
      triggerMessage('error', err.message || 'Failed to submit test');
    } finally {
      setSubmittingTest(false);
    }
  };

  const getSkillLevel = (skillName: string): number => {
    if (!profile || !profile.skills) return 0;
    const found = profile.skills.find((s: any) => s.skill_name.toLowerCase() === skillName.toLowerCase());
    if (!found) return 0;
    const conf = (found.confidence || 'medium').toLowerCase();
    if (conf === 'high') return 9;
    if (conf === 'low') return 5;
    return 7;
  };

  const mapSkillToCategory = (skillName: string): string => {
    const name = skillName.toLowerCase();
    if (name.includes('data structure')) return 'DSA';
    if (name.includes('algorithm')) return 'DSA';
    if (name.includes('system design')) return 'SYSD';
    if (name.includes('sql') || name.includes('database')) return 'SQL';
    if (name.includes('cloud') || name.includes('aws') || name.includes('devops')) return 'CLOUD';
    if (name.includes('oop') || name.includes('object-oriented') || name.includes('ood')) return 'OOD';
    if (name.includes('communication') || name.includes('english')) return 'COMM';
    if (name.includes('aptitude') || name.includes('math') || name.includes('problem solving')) return 'APTI';
    if (name.includes('software engineering') || name.includes('swe') || name.includes('git')) return 'SWE';
    if (name.includes('network')) return 'NETW';
    if (name.includes('operating system') || name.includes(' os')) return 'OS';
    if (name.includes('ai') || name.includes('machine learning') || name.includes('ml')) return 'AI';
    return 'COD';
  };

  const getCompanySkillsetGap = (company: any) => {
    const reqSkills = company.required_skills || {};
    const categoriesMap: Record<string, { required: number, candidate: number }> = {};
    
    const defaultCats = ['COD', 'DSA', 'SQL', 'SYSD', 'CLOUD'];
    defaultCats.forEach(cat => {
      categoriesMap[cat] = { required: 0, candidate: 0 };
    });

    Object.entries(reqSkills).forEach(([skillName, reqLevelVal]) => {
      const reqLevel = Number(reqLevelVal) || 5;
      const cat = mapSkillToCategory(skillName);
      const candLevel = getSkillLevel(skillName);
      
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = { required: 0, candidate: 0 };
      }
      
      categoriesMap[cat].required = Math.max(categoriesMap[cat].required, reqLevel);
      categoriesMap[cat].candidate = Math.max(categoriesMap[cat].candidate, candLevel);
    });

    if (profile && profile.skills) {
      profile.skills.forEach((s: any) => {
        const cat = s.category_code || 'COD';
        const candLevel = getSkillLevel(s.skill_name);
        if (!categoriesMap[cat]) {
          categoriesMap[cat] = { required: 0, candidate: candLevel };
        } else {
          categoriesMap[cat].candidate = Math.max(categoriesMap[cat].candidate, candLevel);
        }
      });
    }

    return Object.entries(categoriesMap).map(([cat, val]) => ({
      category: cat,
      required: val.required || 1,
      candidate: val.candidate
    }));
  };

  // Upload/Extraction flow
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
  };

  const triggerUploadAndExtract = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setStatusMsg(null);
    
    try {
      // 1. Upload File
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('doc_type', uploadType);
      
      const uploadRes = await apiCall('/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      const docId = uploadRes.document_id;
      
      // 2. Trigger Extraction
      const extractRes = await apiCall(`/documents/${docId}/extract`, {
        method: 'POST'
      });
      
      setActiveExtraction(extractRes);
      fetchDocuments();
      
      if (uploadType === 'resume') {
        // Show merge preview modal instead of auto-merging
        setMergePreview({
          extraction_id: extractRes.extraction_id || docId,
          ...extractRes
        });
      } else {
        triggerMessage('success', `Job Description extracted successfully! You can now match against it.`);
        setCurrentTab('skill-match');
      }
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setUploading(false);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleJdUploadAndMatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMatchingJd(true);
    setStatusMsg(null);
    triggerMessage('success', 'Uploading and parsing Job Description...');
    
    try {
      // 1. Upload File
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', 'jd');
      
      const uploadRes = await apiCall('/documents/upload', {
        method: 'POST',
        body: formData
      });
      
      const docId = uploadRes.document_id;
      
      // 2. Trigger Extraction
      const extractRes = await apiCall(`/documents/${docId}/extract`, {
        method: 'POST'
      });
      
      const extractionId = extractRes.extraction_id || docId;
      fetchDocuments();
      
      // 3. Evaluate Match immediately
      const matchRes = await apiCall(`/skill-match/?jd_extraction_id=${extractionId}`, {
        method: 'POST'
      });
      
      setActiveSkillMatch(matchRes);
      fetchMatchHistory();
      triggerMessage('success', `Evaluation complete for Job Description: ${file.name}`);
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setMatchingJd(false);
      if (matchJdInputRef.current) matchJdInputRef.current.value = '';
    }
  };

  // Merge parser confirmation
  const handleConfirmMerge = async () => {
    if (!mergePreview) return;
    setLoading(true);
    try {
      // First ensure candidate profile is initialized
      if (!profile) {
        const initData = await apiCall('/profiles/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: mergePreview.candidate_name || 'My Name',
            email: mergePreview.email || 'myemail@radix.com',
            education: mergePreview.education ? JSON.stringify(mergePreview.education) : 'Imported'
          })
        });
        setProfile(initData);
      }
      
      let extractionId = mergePreview.extraction_id;
      
      // Fallback if extraction_id is not directly in mergePreview
      if (!extractionId) {
        const history = await apiCall('/documents/');
        const matchedDoc = history.find((d: any) => d.filename === mergePreview.source_file);
        if (!matchedDoc || !matchedDoc.extraction_id) {
          throw new Error('Extraction reference not found.');
        }
        extractionId = matchedDoc.extraction_id;
      }

      const mergedProfile = await apiCall(`/profiles/me/merge-resume?extraction_id=${extractionId}`, {
        method: 'POST'
      });
      
      setProfile(mergedProfile);
      setMergePreview(null);
      triggerMessage('success', 'Resume details successfully merged into your profile!');
      setCurrentTab('profile');
      fetchProfile();
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Benchmark / Talent Check trigger
  const triggerTalentCheck = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const res = await apiCall(`/talent-check/?company_id=${selectedCompany}`, {
        method: 'POST'
      });
      setActiveTalentCheck(res);
      fetchTalentHistory();
      triggerMessage('success', 'Benchmarking calculated.');
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Skill Match trigger
  const triggerSkillMatch = async () => {
    if (!selectedJdId) return;
    setLoading(true);
    try {
      const res = await apiCall(`/skill-match/?jd_extraction_id=${selectedJdId}`, {
        method: 'POST'
      });
      setActiveSkillMatch(res);
      fetchMatchHistory();
      triggerMessage('success', 'Skill match computed.');
      
      // Trigger confetti explosion on high matches!
      if (res.match_score >= 80) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      triggerMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Auth Render View ---
  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '440px', borderRadius: '0px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '64px', 
              height: '64px', 
              border: '1px solid var(--grey-800)',
              background: 'var(--black-elevated)',
              marginBottom: '16px'
            }}>
              <Cpu size={32} color="var(--white-pure)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.5px' }}>
              RADIX <span className="glow-text-primary">TALENT MATCH</span>
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
              01 — ENTERPRISE SKILL ANALYTICS
            </p>
          </div>

          {authError && (
            <div style={{ 
              background: 'var(--black-void)', 
              border: '1px solid var(--grey-800)', 
              padding: '12px', 
              color: 'var(--white-pure)', 
              fontSize: '13px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '20px' 
            }}>
              <AlertTriangle size={16} />
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="eyebrow-label" style={{ display: 'block', marginBottom: '6px' }}>Email Address</label>
              <input 
                type="email" 
                required 
                className="form-input" 
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="eyebrow-label" style={{ display: 'block', marginBottom: '6px' }}>Password</label>
              <input 
                type="password" 
                required 
                className="form-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <RefreshCw size={18} className="spin" /> : null}
              {isRegister ? 'Initialize Account' : 'Authenticate Session'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {isRegister ? 'Already registered?' : 'Need to register?'} {' '}
            <span 
              onClick={() => setIsRegister(!isRegister)} 
              style={{ color: 'var(--white-pure)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
            >
              {isRegister ? 'Log in here' : 'Create candidate account'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Product UI Layout ---
  return (
    <>
      <FloatingParticles />
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      
      {/* Mobile Header Bar */}
      {isMobile && (
        <header style={{ 
          background: 'var(--black-elevated)', 
          borderBottom: '1px solid var(--grey-800)', 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '0px', 
              background: 'var(--chrome-accent)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Cpu size={16} color="#000000" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 800, color: 'var(--white-pure)' }}>RADIX</h2>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ 
              background: 'transparent', 
              border: '1px solid var(--grey-800)', 
              color: 'var(--white-pure)', 
              padding: '6px 12px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer'
            }}
          >
            {isMobileMenuOpen ? 'CLOSE MENU' : 'OPEN MENU'}
          </button>
        </header>
      )}

      {/* Mobile Drawer Navigation */}
      {isMobile && isMobileMenuOpen && (
        <nav style={{ 
          background: 'var(--black-elevated)', 
          borderBottom: '1px solid var(--grey-800)', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '12px',
          gap: '4px',
          animation: 'fade-in 0.2s var(--ease-reveal) forwards'
        }}>
          {[
            { id: 'profile', label: 'My Talent Profile', icon: UserIcon },
            { id: 'jd-parser', label: 'JD & CV Upload', icon: Upload },
            { id: 'talent-check', label: 'Talent Benchmarking', icon: Sliders },
            { id: 'skill-match', label: 'Skill Matcher', icon: Award },
            { id: 'placement-hub', label: 'Placement Hub', icon: Briefcase },
            { id: 'mock-test', label: 'Mock Test', icon: GraduationCap },
            { id: 'innov-x', label: 'Innov X', icon: Compass },
            { id: 'history', label: 'System Logs', icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: isActive ? 'var(--black-hover)' : 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--white-pure)' : 'var(--grey-400)',
                  padding: '12px',
                  width: '100%',
                  textAlign: 'left',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          <div style={{ borderTop: '1px solid var(--grey-800)', marginTop: '8px', paddingTop: '8px' }}>
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--grey-400)',
                padding: '12px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <LogOut size={16} />
              Terminate Session
            </button>
          </div>
        </nav>
      )}
      
      {/* 1. Sidebar Navigation (Desktop) */}
      {!isMobile && (
        <aside style={{ width: '260px', background: 'var(--black-elevated)', borderRight: '1px solid var(--grey-800)', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '8px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '0px', 
              background: 'var(--chrome-accent)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Cpu size={18} color="#000000" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--white-pure)' }}>RADIX</h2>
              <span style={{ fontSize: '10px', color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>M_ENGINE</span>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {[
              { id: 'profile', label: 'My Talent Profile', icon: UserIcon },
              { id: 'jd-parser', label: 'JD & CV Upload', icon: Upload },
              { id: 'talent-check', label: 'Talent Benchmarking', icon: Sliders },
              { id: 'skill-match', label: 'Skill Matcher', icon: Award },
              { id: 'placement-hub', label: 'Placement Hub', icon: Briefcase },
              { id: 'mock-test', label: 'Mock Test', icon: GraduationCap },
              { id: 'innov-x', label: 'Innov X', icon: Compass },
              { id: 'history', label: 'System Logs', icon: History }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isActive ? 'var(--black-hover)' : 'transparent',
                    border: 'none',
                    color: isActive ? 'var(--white-pure)' : 'var(--grey-400)',
                    borderLeft: isActive ? '2px solid var(--white-pure)' : '2px solid transparent',
                    padding: '12px 14px',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Footnote & Logout */}
          <div style={{ borderTop: '1px solid var(--grey-800)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '0px', background: 'var(--white-pure)', border: '1px solid var(--grey-600)' }}></div>
              <span style={{ fontSize: '11px', color: 'var(--grey-400)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px', fontFamily: 'var(--font-mono)' }}>
                Connected as {role || 'candidate'}
              </span>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'transparent',
                border: '1px solid var(--grey-800)',
                color: 'var(--white-primary)',
                padding: '10px',
                borderRadius: '0px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                width: '100%',
                justifyContent: 'center',
                transition: 'var(--transition-smooth)'
              }}
            >
              <LogOut size={16} />
              Terminate Session
            </button>
          </div>
        </aside>
      )}

      {/* 2. Main Content Body */}
      <main style={{ flex: 1, padding: isMobile ? '20px' : '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Global status message */}
        {statusMsg && (
          <div style={{
            background: 'var(--black-elevated)',
            border: '1px solid var(--grey-600)',
            borderRadius: '0px',
            padding: '12px 20px',
            color: 'var(--white-pure)',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slide-up 0.4s var(--ease-reveal) forwards'
          }}>
            {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span style={{ fontWeight: 600 }}>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Profile Management */}
        {currentTab === 'profile' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Header info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Talent Profile</h1>
                <p style={{ color: 'var(--color-text-muted)' }}>Configure core profile parameters and skill weights</p>
              </div>
              <button 
                onClick={() => setEditingProfile(!editingProfile)} 
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sliders size={16} />
                {editingProfile ? 'Cancel Settings' : 'Modify Core Details'}
              </button>
            </div>

            {/* Profile editor */}
            {editingProfile ? (
              <form onSubmit={handleUpdateProfile} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Core Metadata Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>Full Name</label>
                    <input type="text" className="form-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>Email Address</label>
                    <input type="email" className="form-input" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>Education Detail</label>
                  <input type="text" className="form-input" value={profileEdu} onChange={(e) => setProfileEdu(e.target.value)} placeholder="e.g. Master of Software Engineering, Stanford University (2024)" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '6px' }}>Preferred Roles (comma-separated)</label>
                  <input type="text" className="form-input" value={profileRoles} onChange={(e) => setProfileRoles(e.target.value)} placeholder="e.g. Software Engineer, Tech Lead, Data Scientist" />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>Commit Details</button>
                  <button type="button" onClick={() => setEditingProfile(false)} className="btn-secondary">Dismiss</button>
                </div>
              </form>
            ) : (
              <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Full Name</span>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{profile?.name || 'Anonymous User'}</h2>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Email Address</span>
                    <p>{profile?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Education Summary</span>
                    <p style={{ color: 'var(--color-text-main)' }}>{profile?.education || 'No education listed. Upload resume to parse details.'}</p>
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Preferred Roles</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {profile?.preferred_roles?.map((role: string, idx: number) => (
                        <span key={idx} style={{ background: 'var(--black-hover)', color: 'var(--white-primary)', border: '1px solid var(--grey-800)', borderRadius: '0px', padding: '4px 10px', fontSize: '12px', fontWeight: 600 }}>
                          {role}
                        </span>
                      )) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>Schema & Version</span>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      Contract Version: <strong>{profile?.schema_version || '1.0'}</strong><br />
                      Database Revision: <strong>v{profile?.version || 1}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Add manual skill */}
            {profile && (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Inject Skill Evidence</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Skill Name</label>
                    <input type="text" className="form-input" placeholder="e.g. Python, Docker, PyTorch" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>RADIX Category</label>
                    <select className="form-input" value={newSkillCat} onChange={(e) => setNewSkillCat(e.target.value)}>
                      {Object.entries(CATEGORY_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{code} - {name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Confidence</label>
                    <select className="form-input" value={newSkillConf} onChange={(e) => setNewSkillConf(e.target.value)}>
                      <option value="high">High (2.0)</option>
                      <option value="medium">Medium (1.0)</option>
                      <option value="low">Low (0.5)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>Evidence / Proof (Max 200 chars)</label>
                  <input type="text" className="form-input" placeholder="e.g. Led 4-member team to design microservice APIs in AWS ECS" value={newSkillEvidence} onChange={(e) => setNewSkillEvidence(e.target.value)} maxLength={200} />
                </div>
                <button type="button" onClick={handleAddSkill} className="btn-primary" style={{ alignSelf: 'flex-start' }}>Inject Skill</button>
              </div>
            )}

            {/* List Skills by Category Grid */}
            {profile && (() => {
              const activeCategories = Object.entries(CATEGORY_NAMES).filter(([code]) => 
                (profile.skills?.some((s: any) => s.category_code === code))
              );
              const inactiveCategories = Object.entries(CATEGORY_NAMES).filter(([code]) => 
                !(profile.skills?.some((s: any) => s.category_code === code))
              );

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Skill Catalog Matrix</h3>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--grey-400)', background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '4px 10px' }}>
                      {activeCategories.length} / {Object.keys(CATEGORY_NAMES).length} ACTIVE SECTORS
                    </span>
                  </div>
                  
                  {activeCategories.length > 0 ? (
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                       {activeCategories.map(([code, name]) => {
                         const categorySkills = profile.skills?.filter((s: any) => s.category_code === code) || [];
                         const isSingleSkill = categorySkills.length === 1;

                         if (isSingleSkill) {
                           const s = categorySkills[0];
                           const confidencePct = s.confidence.toLowerCase() === 'high' ? 100 : s.confidence.toLowerCase() === 'medium' ? 65 : 35;
                           return (
                             <div key={code} className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '240px', justifyContent: 'space-between', padding: '16px', borderRadius: '0px' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '6px' }}>
                                 <span style={{ fontWeight: 700, color: 'var(--white-pure)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{code}</span>
                                 <span style={{ fontSize: '11px', color: 'var(--grey-400)', fontWeight: 500 }}>{name}</span>
                               </div>
                               
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                   <strong style={{ color: 'var(--white-pure)', fontSize: '14px' }}>{s.skill_name}</strong>
                                   <button onClick={() => handleDeleteSkill(s)} style={{ background: 'transparent', border: 'none', color: 'var(--grey-600)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                     <Trash2 size={12} />
                                   </button>
                                 </div>
                                 
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--grey-400)' }}>
                                     <span>CONFIDENCE LEVEL</span>
                                     <span>{s.confidence.toUpperCase()}</span>
                                   </div>
                                   <div style={{ height: '3px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', width: '100%' }}>
                                     <div style={{ height: '100%', background: 'var(--white-pure)', width: `${confidencePct}%`, transition: 'width 1s var(--ease-ui)' }}></div>
                                   </div>
                                 </div>
                               </div>
                               
                               <div style={{ 
                                 background: 'var(--black-void)', 
                                 borderLeft: '2px solid var(--grey-600)', 
                                 padding: '6px 10px', 
                                 fontSize: '10px', 
                                 fontFamily: 'var(--font-mono)', 
                                 color: 'var(--grey-400)',
                                 overflow: 'hidden',
                                 textOverflow: 'ellipsis',
                                 display: '-webkit-box',
                                 WebkitLineClamp: 3,
                                 WebkitBoxOrient: 'vertical',
                                 lineHeight: '1.4'
                               }}>
                                 {s.evidence}
                               </div>
                             </div>
                           );
                         }

                         return (
                           <div key={code} className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '240px', padding: '16px', borderRadius: '0px' }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '6px', marginBottom: '8px' }}>
                               <span style={{ fontWeight: 700, color: 'var(--white-pure)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{code}</span>
                               <span style={{ fontSize: '11px', color: 'var(--grey-400)', fontWeight: 500 }}>{name}</span>
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                               {categorySkills.map((s: any, idx: number) => (
                                 <div key={idx} style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-800)', borderRadius: '0px', padding: '6px 10px', fontSize: '12px' }}>
                                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                     <strong style={{ color: 'var(--white-pure)' }}>{s.skill_name}</strong>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                       <span style={{ 
                                         fontSize: '8px', 
                                         fontWeight: 700, 
                                         textTransform: 'uppercase', 
                                         color: 'var(--white-primary)',
                                         background: 'var(--black-void)',
                                         border: '1px solid var(--grey-600)',
                                         padding: '1px 4px',
                                         fontFamily: 'var(--font-mono)'
                                       }}>
                                         {s.confidence}
                                       </span>
                                       <button onClick={() => handleDeleteSkill(s)} style={{ background: 'transparent', border: 'none', color: 'var(--grey-600)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                         <Trash2 size={11} />
                                       </button>
                                     </div>
                                   </div>
                                   <p style={{ fontSize: '10px', color: 'var(--grey-400)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.evidence}</p>
                                 </div>
                               ))}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                  ) : (
                     <div className="glass-card animate-slide-up" style={{ padding: '24px', textAlign: 'center', color: 'var(--grey-400)', borderStyle: 'dashed' }}>
                       No active skill categories found. Inject skill evidence above or upload a resume to populate your profile.
                     </div>
                  )}

                  {inactiveCategories.length > 0 && (
                    <div className="animate-slide-up" style={{ background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--grey-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Inactive Target Sectors (Level 1 — No Evidence)
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {inactiveCategories.map(([code, name]) => (
                          <div key={code} title={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--black-void)', border: '1px dashed var(--grey-800)', padding: '6px 12px', fontSize: '11px' }}>
                            <span style={{ color: 'var(--grey-400)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{code}</span>
                            <span style={{ color: 'var(--grey-600)' }}>|</span>
                            <span style={{ color: 'var(--grey-400)' }}>{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Tab 2: Upload Documents (JD and Resume Parser) */}
        {currentTab === 'jd-parser' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Document Upload Hub</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Upload resumes (CVs) or Job Descriptions (JDs) to extract skills using LLM</p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Document Target Type</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" checked={uploadType === 'resume'} onChange={() => setUploadType('resume')} />
                    <span>Candidate Resume / CV</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="radio" checked={uploadType === 'jd'} onChange={() => setUploadType('jd')} />
                    <span>Job Description (JD)</span>
                  </label>
                </div>
              </div>

              {/* Drag-and-drop zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1px dashed var(--grey-600)',
                  background: 'var(--black-void)',
                  borderRadius: '0px',
                  padding: '40px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Upload size={48} color="var(--white-pure)" style={{ marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Select file to upload</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Supports PDF, DOCX and TXT formats (Max size 10MB)</p>
                {uploadFile && (
                  <div style={{ marginTop: '16px', background: 'var(--black-hover)', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '0px', border: '1px solid var(--grey-800)' }}>
                    <FileText size={16} />
                    <strong style={{ fontSize: '13px' }}>{uploadFile.name}</strong>
                  </div>
                )}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".pdf,.docx,.doc,.txt" />
              </div>

              {uploadFile && (
                <button 
                  onClick={triggerUploadAndExtract} 
                  disabled={uploading} 
                  className="btn-primary" 
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  {uploading ? <RefreshCw className="spin" size={16} /> : null}
                  {uploading ? 'Parsing with LLM...' : 'Upload & Parse Document'}
                </button>
              )}
            </div>

            {/* Merge Confirmation Preview Dialog/Modal */}
            {mergePreview && (
              <div className="glass-card animate-slide-up" style={{ borderColor: 'var(--grey-600)', borderWidth: '1px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle color="var(--white-pure)" /> Confirm Resume Merge
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                    LLM extraction successfully parsed details from <strong>{mergePreview.source_file}</strong>. Review and click merge to commit them to your main profile:
                  </p>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div><strong>Candidate Name:</strong> {mergePreview.candidate_name || 'N/A'}</div>
                    <div><strong>Email:</strong> {mergePreview.email || 'N/A'}</div>
                    <div>
                      <strong>Extracted Skills ({mergePreview.skills?.length || 0}):</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {mergePreview.skills?.map((s: any, idx: number) => (
                          <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px' }}>
                            {s.skill_name} ({s.category_code})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleConfirmMerge} className="btn-primary">Merge into Profile</button>
                  <button onClick={() => setMergePreview(null)} className="btn-secondary">Dismiss</button>
                </div>
              </div>
            )}

            {/* Display active extraction details */}
            {activeExtraction && !mergePreview && (
              <div className="glass-card">
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Extraction Response</h3>
                <pre style={{ background: '#03050c', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '12px', border: '1px solid var(--border-color)' }}>
                  {JSON.stringify(activeExtraction, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Talent Benchmarking (Talent Check) */}
        {currentTab === 'talent-check' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Talent Benchmarking</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Compare your profile skillset levels against hiring criteria for top organizations</p>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '8px' }}>Target Company</label>
                <select className="form-input" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
                  {companies.map(c => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <button onClick={triggerTalentCheck} disabled={loading || !selectedCompany} className="btn-primary" style={{ height: '46px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading ? <RefreshCw className="spin" size={16} /> : null}
                Evaluate Readiness
              </button>
            </div>

            {activeTalentCheck && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Main Benchmarking Summary HUD */}
                <div className="glass-card flowing-line-top" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--grey-800)', paddingBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--grey-800)', color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>ENTERPRISE REPORT</span>
                        <span style={{ color: 'var(--grey-400)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>ID: TC-{activeTalentCheck.id?.substring(0, 8).toUpperCase() || 'TEMP'}</span>
                      </div>
                      <h3 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={24} style={{ color: 'var(--white-primary)' }} />
                        <span>{activeTalentCheck.company}</span>
                      </h3>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        Telemetry calculated: {new Date(activeTalentCheck.computed_at).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '38px', fontWeight: 800, color: 'var(--white-pure)', fontFamily: 'var(--font-mono)', lineHeight: '1' }}>
                          {activeTalentCheck.readiness_score}%
                        </span>
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px', marginTop: '4px' }}>Readiness Score</span>
                      </div>
                      <div style={{ width: '45px', height: '45px', border: '2px solid var(--grey-800)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black-void)' }}>
                        <Target size={20} className={activeTalentCheck.readiness_score >= 80 ? 'pulse-subtle' : ''} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>
                    {/* Radar Chart & Telemetry Log */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <RadarChart
                        data={activeTalentCheck.skillset_gap.map((g: any) => ({
                          category: g.category_code,
                          required: g.required_level,
                          candidate: g.candidate_level
                        }))}
                      />

                      {(() => {
                        const totalSectors = activeTalentCheck.skillset_gap.length;
                        const qualifiedSectors = activeTalentCheck.skillset_gap.filter((g: any) => !g.gap).length;
                        const gapsList = activeTalentCheck.skillset_gap.filter((g: any) => g.gap);
                        const maxGapItem = gapsList.reduce((max: any, curr: any) => curr.gap_size > (max?.gap_size || 0) ? curr : max, null);
                        const avgDev = gapsList.reduce((sum: number, g: any) => sum + g.gap_size, 0) / (totalSectors || 1);

                        return (
                          <div style={{
                            width: '100%',
                            background: 'var(--black-elevated)',
                            border: '1px solid var(--grey-800)',
                            padding: '16px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative'
                          }}>
                            <div style={{ position: 'absolute', top: '12px', right: '12px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--white-pure)', animation: 'pulse-subtle 1.5s infinite' }} />
                            <div style={{ color: 'var(--white-pure)', fontWeight: 700, borderBottom: '1px solid var(--grey-800)', paddingBottom: '6px', fontSize: '10px', letterSpacing: '0.5px' }}>
                              READINESS TELEMETRY LOG
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--grey-400)' }}>EVALUATION STATE:</span>
                              <span style={{ color: 'var(--white-pure)', fontWeight: 'bold' }}>SYNCHRONIZED</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--grey-400)' }}>QUALIFIED SECTORS:</span>
                              <span style={{ color: 'var(--white-pure)' }}>{qualifiedSectors} / {totalSectors}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--grey-400)' }}>CRITICAL GAP:</span>
                              <span style={{ color: maxGapItem ? 'var(--white-pure)' : 'var(--grey-400)', fontWeight: maxGapItem ? 'bold' : 'normal' }}>
                                {maxGapItem ? `${maxGapItem.category_code} (-${maxGapItem.gap_size})` : 'NONE'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--grey-400)' }}>AVERAGE DEVIATION:</span>
                              <span style={{ color: 'var(--white-pure)' }}>{avgDev.toFixed(2)} pts</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Category Gaps Analysis list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 700 }}>Category Gaps Analysis</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '480px', overflowY: 'auto', paddingRight: '4px' }}>
                        {activeTalentCheck.skillset_gap.map((g: any, idx: number) => (
                          <div key={idx} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            background: 'var(--black-hover)',
                            border: '1px solid var(--grey-800)',
                            padding: '12px 16px',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--white-pure)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {g.category_code} - {CATEGORY_NAMES[g.category_code]}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--grey-400)' }}>Required Tier: <strong>{g.required_tier}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--grey-800)', paddingTop: '6px' }}>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                <div>Req: <strong style={{ color: 'var(--grey-400)' }}>{g.required_level}</strong></div>
                                <div>Cand: <strong style={{ color: 'var(--white-pure)' }}>{g.candidate_level}</strong></div>
                              </div>
                              {g.gap ? (
                                <span style={{
                                  background: 'var(--black-void)',
                                  border: '1px solid var(--grey-600)',
                                  color: 'var(--white-pure)',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  <AlertTriangle size={10} />
                                  -{g.gap_size} Gap
                                </span>
                              ) : (
                                <span style={{
                                  background: 'var(--black-void)',
                                  border: '1px solid var(--grey-800)',
                                  color: 'var(--grey-400)',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  <CheckCircle size={10} />
                                  Qualified
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corporate Intelligence Metadata Cards */}
                {activeTalentCheck.company_intel && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
                    
                    {/* Card 1: Culture & Awards */}
                    <div className="glass-card flowing-bg-accent" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--grey-800)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--grey-800)', paddingBottom: '10px' }}>
                        <Award size={18} style={{ color: 'var(--white-pure)' }} />
                        <h4 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>CULTURE & ACCOLADES</h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }}>WORK CULTURE</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {(activeTalentCheck.company_intel.work_culture || []).map((trait: string, i: number) => (
                              <span key={i} style={{ fontSize: '11px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', padding: '3px 8px', color: 'var(--white-primary)' }}>
                                {trait}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }}>AWARDS & KEY MILESTONES</span>
                          <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '12px', color: 'var(--grey-400)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(activeTalentCheck.company_intel.awards || []).map((award: string, i: number) => (
                              <li key={i}>{award}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Tech Matrix & Adoption */}
                    <div className="glass-card flowing-bg-accent" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--grey-800)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--grey-800)', paddingBottom: '10px' }}>
                        <Cpu size={18} style={{ color: 'var(--white-pure)' }} />
                        <h4 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>TECH MATRIX & ADOPTION</h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }}>ACTIVE TOOL STACK</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {(activeTalentCheck.company_intel.tools_technologies || []).map((tech: string, i: number) => (
                              <span key={i} style={{ fontSize: '10px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', padding: '2px 6px', color: 'var(--grey-200)', fontFamily: 'var(--font-mono)' }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                            <span>ADOPTING MATRIX</span>
                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--white-pure)', animation: 'pulse-subtle 1s infinite' }}></span>
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {(activeTalentCheck.company_intel.adopting_tech || []).map((tech: string, i: number) => (
                              <span key={i} style={{ fontSize: '10px', background: 'var(--white-pure)', color: 'var(--black-void)', fontWeight: 'bold', padding: '2px 6px', fontFamily: 'var(--font-mono)' }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Moats & Challenges */}
                    <div className="glass-card flowing-bg-accent" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--grey-800)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--grey-800)', paddingBottom: '10px' }}>
                        <Globe size={18} style={{ color: 'var(--white-pure)' }} />
                        <h4 style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>STRATEGIC MOAT & CHALLENGES</h4>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px' }}>COMPETITIVE UNIQUENESS</span>
                          <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '12px', color: 'var(--white-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(activeTalentCheck.company_intel.uniqueness || []).map((unique: string, i: number) => (
                              <li key={i}>{unique}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', display: 'block', marginBottom: '6px', color: 'var(--grey-400)' }}>CORPORATE CHALLENGES</span>
                          <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '12px', color: 'var(--grey-400)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {(activeTalentCheck.company_intel.weaknesses || []).map((weak: string, i: number) => (
                              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{ color: 'var(--grey-600)' }}>▪</span>
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Skill Matching */}
        {currentTab === 'skill-match' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Skill Matcher</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Perform 3-tier exact, fuzzy, and semantic matches against target Job Descriptions</p>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Evaluate Fit Against Job Description</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Select an existing Job Description or upload a new file to execute instant matching evaluation.</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label className="eyebrow-label" style={{ display: 'block', marginBottom: '8px' }}>Select Existing JD</label>
                  <select className="form-input" value={selectedJdId} onChange={(e) => setSelectedJdId(e.target.value)}>
                    <option value="">-- Choose JD --</option>
                    {jdExtractionsList.map(jd => (
                      <option key={jd.extraction_id} value={jd.extraction_id}>{jd.filename} ({jd.filename.includes(' - ') ? jd.filename.split(' - ')[1].replace('.pdf','') : 'JD'})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
                  <button onClick={triggerSkillMatch} disabled={loading || !selectedJdId} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {loading ? <RefreshCw className="spin" size={14} /> : null}
                    Evaluate Selected
                  </button>
                  
                  <div style={{ borderLeft: '1px solid var(--grey-800)', height: '40px', margin: '0 8px' }}></div>
                  
                  <div>
                    <input 
                      ref={matchJdInputRef} 
                      type="file" 
                      style={{ display: 'none' }} 
                      onChange={handleJdUploadAndMatch} 
                      accept=".pdf,.docx,.doc,.txt" 
                    />
                    <button 
                      onClick={() => matchJdInputRef.current?.click()} 
                      disabled={matchingJd || loading} 
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {matchingJd ? <RefreshCw className="spin" size={14} /> : <Upload size={14} />}
                      {matchingJd ? 'Processing JD...' : 'Upload & Match JD'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {activeSkillMatch && (
              <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Matching Summary: <span className="glow-text-primary">{activeSkillMatch.jd_source_file.replace('.pdf','')}</span></h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>Contract Version: {activeSkillMatch.schema_version}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '36px', 
                      fontWeight: 800, 
                      color: 'var(--white-pure)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {activeSkillMatch.match_score}%
                    </div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Match Score</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '30px', alignItems: 'start' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', width: '100%' }}>
                    <ProgressRing value={activeSkillMatch.match_score} />
                    <ComparisonBarChart 
                      data={[
                        { 
                          label: 'Matched Skills', 
                          value: activeSkillMatch.matched_skills?.length || 0, 
                          max: (activeSkillMatch.matched_skills?.length || 0) + (activeSkillMatch.missing_skills?.length || 0) || 1 
                        },
                        { 
                          label: 'Requirements Unmet', 
                          value: activeSkillMatch.missing_skills?.length || 0, 
                          max: (activeSkillMatch.matched_skills?.length || 0) + (activeSkillMatch.missing_skills?.length || 0) || 1 
                        }
                      ]}
                    />
                    
                    {/* Live Match Telemetry Console */}
                    {(() => {
                      const matchLines = [
                        `[SYS] Initializing semantic matcher...`,
                        `[OK] JD parsed: "${activeSkillMatch.jd_source_file.replace('.pdf','').substring(0, 24)}..."`,
                        `[OK] Matched: ${activeSkillMatch.matched_skills?.length || 0} | Missing: ${activeSkillMatch.missing_skills?.length || 0}`,
                        `[EVAL] Match score calculated: ${activeSkillMatch.match_score}%`,
                        `[STATUS] ${activeSkillMatch.match_score >= 70 ? 'COMPATIBLE PROFILE' : 'RECOMMEND UPSKILL'}`
                      ];
                      return (
                        <div className="animate-fade-in" style={{ 
                          width: '100%', 
                          background: 'var(--black-elevated)', 
                          border: '1px solid var(--grey-800)', 
                          padding: '12px 16px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          lineHeight: '1.4',
                          position: 'relative',
                          borderRadius: '0px'
                        }}>
                          <div style={{ color: 'var(--white-pure)', fontWeight: 700, borderBottom: '1px solid var(--grey-800)', paddingBottom: '4px', fontSize: '10px', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>MATCH TELEMETRY PIPELINE</span>
                            <span className="animate-pulse-subtle" style={{ color: 'var(--white-pure)', fontSize: '8px' }}>● LIVE</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--grey-400)' }}>
                            {matchLines.map((line, idx) => (
                              <div key={idx} style={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                animation: 'fade-in 0.3s ease-out forwards',
                                animationDelay: `${idx * 0.1}s`,
                                opacity: 0
                              }}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
                    {/* Matched Skills */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--white-pure)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} /> Matched Skills ({activeSkillMatch.matched_skills?.length || 0})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                        {activeSkillMatch.matched_skills?.length === 0 ? (
                          <div style={{ color: 'var(--grey-400)', fontSize: '12px', fontStyle: 'italic' }}>No skills matched.</div>
                        ) : (
                          activeSkillMatch.matched_skills.map((s: any, idx: number) => (
                            <div key={idx} style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-800)', borderRadius: '0px', padding: '10px 14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--white-pure)' }}>{s.skill_name}</strong>
                                <span style={{ color: 'var(--grey-400)', fontSize: '11px', marginLeft: '6px' }}>({s.category_code})</span>
                                {s.matched_with && s.matched_with.toLowerCase() !== s.skill_name.toLowerCase() && (
                                  <div style={{ fontSize: '10px', color: 'var(--grey-400)', marginTop: '2px' }}>
                                    Matched with profile skill: <em>{s.matched_with}</em>
                                  </div>
                                )}
                              </div>
                              <span style={{ 
                                fontSize: '9px', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                background: 'var(--black-void)', 
                                border: '1px solid var(--grey-600)',
                                color: 'var(--white-pure)', 
                                padding: '2px 8px', 
                                borderRadius: '0px',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {s.match_type}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--grey-400)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={16} /> Missing Skills ({activeSkillMatch.missing_skills?.length || 0})
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                        {activeSkillMatch.missing_skills?.length === 0 ? (
                          <div style={{ color: 'var(--white-pure)', fontSize: '12px', fontStyle: 'italic' }}>All requirements met!</div>
                        ) : (
                          activeSkillMatch.missing_skills.map((s: any, idx: number) => (
                            <div key={idx} style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-800)', borderRadius: '0px', padding: '10px 14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <strong style={{ color: 'var(--white-pure)' }}>{s.skill_name}</strong>
                                <span style={{ color: 'var(--grey-400)', fontSize: '11px', marginLeft: '6px' }}>({s.category_code})</span>
                              </div>
                              <span style={{ 
                                fontSize: '9px', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                background: 'var(--black-void)', 
                                border: '1px solid var(--grey-800)',
                                color: 'var(--grey-400)', 
                                padding: '2px 8px', 
                                borderRadius: '0px',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {s.importance}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: System Logs / History */}
        {currentTab === 'history' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>System Logs</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Historical logs of parsed documents, matching calculations, and audits</p>
            </div>

            {/* Document history list */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Uploaded Documents ({documentsHistory.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {documentsHistory.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No documents uploaded.</div>
                ) : (
                  documentsHistory.map((doc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black-hover)', border: '1px solid var(--grey-800)', padding: '12px 18px', borderRadius: '0px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <FileText color="var(--white-pure)" size={20} />
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--white-pure)' }}>{doc.filename}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--grey-400)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            Type: <span style={{ textTransform: 'uppercase', color: 'var(--white-primary)' }}>{doc.doc_type}</span> | 
                            Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        background: 'var(--black-void)', 
                        border: '1px solid var(--grey-600)',
                        color: 'var(--white-pure)', 
                        padding: '4px 10px', 
                        borderRadius: '0px',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {doc.has_extraction ? 'Extracted' : 'Pending Extract'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Talent check history list */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Talent Check Runs ({talentHistory.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {talentHistory.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No talent evaluations executed.</div>
                ) : (
                  talentHistory.map((tc, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black-hover)', border: '1px solid var(--grey-800)', padding: '12px 18px', borderRadius: '0px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--white-pure)' }}>{tc.company}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--grey-400)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          Evaluated: {new Date(tc.computed_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>
                        {tc.readiness_score}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Skill Matches history list */}
            <div className="glass-card">
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Skill Match Runs ({matchHistory.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {matchHistory.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>No matching runs computed.</div>
                ) : (
                  matchHistory.map((sm, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black-hover)', border: '1px solid var(--grey-800)', padding: '12px 18px', borderRadius: '0px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--white-pure)' }}>{sm.jd_source_file.replace('.pdf','')}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--grey-400)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          Evaluated: {new Date(sm.computed_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>
                        {sm.match_score}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab: Placement Hub */}
        {currentTab === 'placement-hub' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Placement Hub</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Synchronized enterprise hiring board and company match intelligence</p>
            </div>

            {/* Placement stats summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <span className="eyebrow-label" style={{ fontSize: '10px' }}>Total Hiring Companies</span>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {placementStats?.total_companies || hiringCompanies.length}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '20px' }}>
                <span className="eyebrow-label" style={{ fontSize: '10px' }}>Active Openings</span>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {placementStats?.hiring_now || hiringCompanies.filter(c => c.is_hiring).length}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '20px' }}>
                <span className="eyebrow-label" style={{ fontSize: '10px' }}>Your Applications</span>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {assignedCompanies.length}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '20px' }}>
                <span className="eyebrow-label" style={{ fontSize: '10px' }}>Top Compatibility</span>
                <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {placementStats?.top_match || Math.max(...hiringCompanies.map(c => c.match_percentage || 0), 0)}%
                </div>
              </div>
            </div>

            {/* Layout with Board & Details Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: (!isMobile && selectedHubCompany) ? '1.5fr 1fr' : '1fr', gap: '28px', alignItems: 'start' }}>
              
              {/* Companies Hiring Board */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Hiring Opportunities</h3>
                
                {hiringCompanies.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed var(--grey-800)' }}>
                    No companies seeded or fetching from database...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--grey-800)', paddingBottom: '12px' }}>
                          <th style={{ padding: '12px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Company</th>
                          <th style={{ padding: '12px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Type</th>
                          <th style={{ padding: '12px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Location</th>
                          <th style={{ padding: '12px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Match</th>
                          <th style={{ padding: '12px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hiringCompanies.map((c) => {
                          const isApplied = assignedCompanies.some(app => app.company_id === c.id);
                          const isSelected = selectedHubCompany?.id === c.id;
                          return (
                            <tr 
                              key={c.id} 
                              onClick={() => setSelectedHubCompany(c)}
                              style={{ 
                                borderBottom: '1px solid var(--grey-900)',
                                background: isSelected ? 'var(--black-hover)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease'
                              }}
                              className="table-row-hover"
                            >
                              <td style={{ padding: '14px 8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    background: 'var(--black-void)', 
                                    border: '1px solid var(--grey-800)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    color: 'var(--white-pure)',
                                    fontSize: '14px',
                                    fontFamily: 'var(--font-mono)'
                                  }}>
                                    {c.logo || c.name[0]}
                                  </div>
                                  <div>
                                    <strong style={{ display: 'block', fontSize: '14px', color: 'var(--white-pure)' }}>{c.name}</strong>
                                    <span style={{ fontSize: '11px', color: 'var(--grey-400)' }}>Deadline: {c.deadline || 'N/A'}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '14px 8px' }}>
                                <span style={{ 
                                  fontSize: '10px', 
                                  background: c.type === 'Super Dream' ? 'var(--white-pure)' : 'var(--black-void)', 
                                  color: c.type === 'Super Dream' ? 'var(--black-void)' : 'var(--white-primary)', 
                                  border: '1px solid var(--grey-800)', 
                                  padding: '3px 8px',
                                  fontWeight: 'bold',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {c.type}
                                </span>
                              </td>
                              <td style={{ padding: '14px 8px', fontSize: '13px', color: 'var(--grey-300)' }}>{c.location}</td>
                              <td style={{ padding: '14px 8px' }}>
                                <strong style={{ 
                                  fontSize: '14px', 
                                  color: 'var(--white-pure)', 
                                  fontFamily: 'var(--font-mono)',
                                  textShadow: c.match_percentage >= 80 ? '0 0 8px rgba(255,255,255,0.4)' : 'none'
                                }}>
                                  {c.match_percentage}%
                                </strong>
                              </td>
                              <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isApplied) handleApplyCompany(c.id);
                                  }}
                                  disabled={loading || isApplied}
                                  className={isApplied ? "btn-secondary" : "btn-primary"}
                                  style={{ padding: '6px 12px', fontSize: '11px', height: '30px' }}
                                >
                                  {isApplied ? 'Applied' : 'Apply'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Company Intelligence Panel */}
              {selectedHubCompany && (
                <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', position: 'relative', border: '1px solid var(--grey-800)' }}>
                  <button 
                    onClick={() => setSelectedHubCompany(null)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--grey-400)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px'
                    }}
                  >
                    ×
                  </button>

                  {/* Header Banner */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', borderBottom: '1px solid var(--grey-900)', paddingBottom: '16px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      background: 'var(--black-void)', 
                      border: '1px solid var(--grey-800)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: 'var(--white-pure)',
                      fontSize: '24px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {selectedHubCompany.logo || selectedHubCompany.name[0]}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="eyebrow-label" style={{ fontSize: '9px', letterSpacing: '1px' }}>
                        {selectedHubCompany.category || 'CORPORATE PROFILE'}
                      </span>
                      <h3 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2 }}>{selectedHubCompany.name}</h3>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--grey-400)', flexWrap: 'wrap' }}>
                        <span>{selectedHubCompany.location}</span>
                        <span>•</span>
                        <span>{selectedHubCompany.employee_size || 'N/A employees'}</span>
                        <span>•</span>
                        <span>{selectedHubCompany.nature_of_company || 'Private'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Naukri-style Sub tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-900)', overflowX: 'auto', gap: '4px' }}>
                    {[
                      { id: 'about', label: 'Overview' },
                      { id: 'org', label: 'Org Intel' },
                      { id: 'skills', label: 'Skill Compatibility' },
                      { id: 'esg', label: 'ESG & Compliance' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setCompanyDetailTab(tab.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: companyDetailTab === tab.id ? '2px solid var(--white-pure)' : '2px solid transparent',
                          color: companyDetailTab === tab.id ? 'var(--white-pure)' : 'var(--grey-500)',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: companyDetailTab === tab.id ? 700 : 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Tab 1: About & Core */}
                    {companyDetailTab === 'about' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>ABOUT THE COMPANY</span>
                          <p style={{ color: 'var(--grey-200)', fontSize: '13px', lineHeight: '1.5', marginTop: '4px' }}>
                            {selectedHubCompany.overview_text || 'No corporate description is currently available.'}
                          </p>
                        </div>

                        {selectedHubCompany.vision_statement && (
                          <div>
                            <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>VISION</span>
                            <blockquote style={{ borderLeft: '2px solid var(--grey-700)', paddingLeft: '12px', margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '13px', color: 'var(--grey-300)' }}>
                              "{selectedHubCompany.vision_statement}"
                            </blockquote>
                          </div>
                        )}

                        {selectedHubCompany.mission_statement && (
                          <div>
                            <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>MISSION</span>
                            <blockquote style={{ borderLeft: '2px solid var(--grey-700)', paddingLeft: '12px', margin: '4px 0 0 0', fontStyle: 'italic', fontSize: '13px', color: 'var(--grey-300)' }}>
                              "{selectedHubCompany.mission_statement}"
                            </blockquote>
                          </div>
                        )}

                        <div style={{ borderTop: '1px solid var(--grey-900)', paddingTop: '12px' }}>
                          <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>CONTACT DETAILS</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            <div>
                              <span style={{ color: 'var(--grey-500)' }}>Email:</span>
                              <div style={{ color: 'var(--white-primary)', marginTop: '2px' }}>{selectedHubCompany.primary_contact_email || 'hiring@corp.radix'}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--grey-500)' }}>Phone:</span>
                              <div style={{ color: 'var(--white-primary)', marginTop: '2px' }}>{selectedHubCompany.primary_phone_number || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Org Details */}
                    {companyDetailTab === 'org' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>ORGANIZATIONAL MATRIX</span>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          <div style={{ background: 'var(--black-void)', border: '1px solid var(--grey-900)', padding: '10px' }}>
                            <span style={{ color: 'var(--grey-500)', fontSize: '10px' }}>INCORPORATION YEAR</span>
                            <div style={{ color: 'var(--white-pure)', fontWeight: 'bold', marginTop: '2px' }}>{selectedHubCompany.incorporation_year || 'N/A'}</div>
                          </div>
                          <div style={{ background: 'var(--black-void)', border: '1px solid var(--grey-900)', padding: '10px' }}>
                            <span style={{ color: 'var(--grey-500)', fontSize: '10px' }}>OFFICES NATIONWIDE</span>
                            <div style={{ color: 'var(--white-pure)', fontWeight: 'bold', marginTop: '2px' }}>{selectedHubCompany.office_count || 'N/A'}</div>
                          </div>
                        </div>

                        <div style={{ background: 'var(--black-void)', border: '1px solid var(--grey-900)', padding: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: 'var(--grey-500)', fontSize: '10px' }}>HEADQUARTERS ADDRESS</span>
                          <div style={{ color: 'var(--white-pure)', marginTop: '4px', lineHeight: 1.4 }}>{selectedHubCompany.headquarters_address || 'N/A'}</div>
                        </div>

                        {/* Social channels */}
                        <div style={{ borderTop: '1px solid var(--grey-900)', paddingTop: '12px' }}>
                          <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)', display: 'block', marginBottom: '8px' }}>CORPORATE SOCIAL CHANNELS</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {selectedHubCompany.linkedin_url && (
                              <a href={selectedHubCompany.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--white-primary)', border: '1px solid var(--grey-800)', padding: '4px 10px', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>LinkedIn</a>
                            )}
                            {selectedHubCompany.twitter_handle && (
                              <a href={`https://twitter.com/${selectedHubCompany.twitter_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--white-primary)', border: '1px solid var(--grey-800)', padding: '4px 10px', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>Twitter</a>
                            )}
                            {selectedHubCompany.facebook_url && (
                              <a href={selectedHubCompany.facebook_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--white-primary)', border: '1px solid var(--grey-800)', padding: '4px 10px', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>Facebook</a>
                            )}
                            {selectedHubCompany.instagram_url && (
                              <a href={selectedHubCompany.instagram_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--white-primary)', border: '1px solid var(--grey-800)', padding: '4px 10px', textDecoration: 'none', fontFamily: 'var(--font-mono)' }}>Instagram</a>
                            )}
                            {!selectedHubCompany.linkedin_url && !selectedHubCompany.twitter_handle && !selectedHubCompany.facebook_url && !selectedHubCompany.instagram_url && (
                              <span style={{ fontSize: '12px', color: 'var(--grey-500)', fontStyle: 'italic' }}>No corporate social channels connected.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Skills Compatibility */}
                    {companyDetailTab === 'skills' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Dynamic Radar Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span className="eyebrow-label" style={{ fontSize: '9px', marginBottom: '8px', alignSelf: 'flex-start' }}>COMPATIBILITY MATRIX</span>
                          <RadarChart 
                            data={getCompanySkillsetGap(selectedHubCompany)}
                          />
                        </div>

                        <div>
                          <h4 style={{ fontSize: '12px', fontWeight: 800, borderBottom: '1px solid var(--grey-900)', paddingBottom: '6px', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>TARGET SKILL REQUISITES</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(selectedHubCompany.required_skills || {}).map(([skillName, reqVal]: any, idx: number) => {
                              const candVal = getSkillLevel(skillName);
                              const isMet = candVal >= reqVal;
                              return (
                                <div 
                                  key={idx} 
                                  style={{ 
                                    background: 'var(--black-void)', 
                                    border: isMet ? '1px solid var(--white-pure)' : '1px solid var(--grey-900)', 
                                    padding: '4px 10px', 
                                    fontSize: '11px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontFamily: 'var(--font-mono)'
                                  }}
                                >
                                  <span style={{ color: isMet ? 'var(--white-pure)' : 'var(--grey-500)', fontWeight: isMet ? 'bold' : 'normal' }}>{skillName}</span>
                                  <span style={{ color: 'var(--grey-500)' }}>({candVal}/{reqVal})</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Governance & ESG */}
                    {companyDetailTab === 'esg' && (
                      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>ESG & ENVIRONMENTAL FOOTPRINT</span>
                          <div style={{ background: 'var(--black-void)', border: '1px solid var(--grey-900)', padding: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '10px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)' }}>CARBON NET INTENSITY</span>
                              <strong style={{ fontSize: '16px', color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>{selectedHubCompany.carbon_footprint || '2.4 tons CO2e'}</strong>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="eyebrow-label" style={{ fontSize: '9px', color: 'var(--grey-400)' }}>COMPLIANCE & LEGAL STATUS</span>
                          <div style={{ background: 'var(--black-void)', border: '1px solid var(--grey-900)', padding: '12px', marginTop: '4px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: selectedHubCompany.legal_issues ? '#ff4444' : 'var(--white-pure)', fontWeight: 'bold', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedHubCompany.legal_issues ? '#ff4444' : 'var(--white-pure)' }}></span>
                              {selectedHubCompany.legal_issues ? 'REGULATORY CAUTIONS' : 'COMPLIANCE AUDIT PASSED'}
                            </div>
                            <p style={{ color: 'var(--grey-400)', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>
                              {selectedHubCompany.legal_issues || 'Zero regulatory or compliance legal cases registered for this organization.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                  {selectedHubCompany.website_url && (
                    <a 
                      href={selectedHubCompany.website_url.startsWith('http') ? selectedHubCompany.website_url : `https://${selectedHubCompany.website_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn-secondary"
                      style={{ 
                        textAlign: 'center', 
                        display: 'block', 
                        padding: '10px 0', 
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: '1px solid var(--grey-800)'
                      }}
                    >
                      Visit Corporate Website
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Mock Test */}
        {currentTab === 'mock-test' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Mock Test</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Generate adaptive mock tests and simulate online assessments</p>
            </div>

            {/* Test dashboard view (unstarted session, no active results) */}
            {!activeTestSession && !activeTestResult && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '28px', alignItems: 'start' }}>
                {/* Start a new mock test */}
                <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Start Assessment</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Test Format</label>
                      <select 
                        id="test-type-select"
                        style={{ background: 'var(--black-void)', border: '1px solid var(--grey-800)', color: 'var(--white-pure)', padding: '12px', fontSize: '14px' }}
                      >
                        <option value="mcq_coding">Comprehensive (MCQ & Coding)</option>
                        <option value="coding_only">Coding Challenges Only</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Company Target (Optional)</label>
                      <select 
                        id="test-company-select"
                        style={{ background: 'var(--black-void)', border: '1px solid var(--grey-800)', color: 'var(--white-pure)', padding: '12px', fontSize: '14px' }}
                      >
                        <option value="">General Assessment</option>
                        {hiringCompanies.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={() => {
                        const selType = document.getElementById('test-type-select') as HTMLSelectElement;
                        const selComp = document.getElementById('test-company-select') as HTMLSelectElement;
                        handleStartMockTest(selType?.value || 'mcq_coding', selComp?.value || undefined);
                      }}
                      disabled={generatingTest}
                      className="btn-primary"
                      style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {generatingTest ? <RefreshCw className="spin" size={16} /> : <Play size={16} />}
                      Initialize Test
                    </button>
                  </div>
                </div>

                {/* Recommendations & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Practice recommendations */}
                  <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Practice Recommendations</h3>
                    {practiceRecs.length === 0 ? (
                      <p style={{ color: 'var(--grey-400)', fontSize: '13px', fontStyle: 'italic' }}>No recommendation metrics. Take a test to populate.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                        {practiceRecs.map((rec, idx) => (
                          <div key={idx} style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-800)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '10px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', padding: '2px 6px', color: 'var(--white-primary)', width: 'fit-content', fontFamily: 'var(--font-mono)' }}>
                              {rec.topic || rec.category}
                            </span>
                            <strong style={{ fontSize: '13px', color: 'var(--white-pure)' }}>{rec.title || rec.recommendation}</strong>
                            {rec.url && (
                              <a href={rec.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--white-pure)', textDecoration: 'underline' }}>
                                Solve Problem
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* History */}
                  <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Previous Assessments ({testHistory.length})</h3>
                    {testHistory.length === 0 ? (
                      <p style={{ color: 'var(--grey-400)', fontSize: '13px', fontStyle: 'italic' }}>No tests completed yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {testHistory.map((hist) => (
                          <div 
                            key={hist.session_id} 
                            onClick={async () => {
                              try {
                                const details = await apiCall(`/mock-test/results/${hist.session_id}`);
                                setActiveTestResult(details.result || details);
                              } catch (err) {}
                            }}
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              background: 'var(--black-hover)', 
                              border: '1px solid var(--grey-800)', 
                              padding: '12px 18px', 
                              cursor: 'pointer' 
                            }}
                            className="table-row-hover"
                          >
                            <div>
                              <strong style={{ fontSize: '14px', color: 'var(--white-pure)', display: 'block' }}>{hist.test_type}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--grey-400)' }}>Completed: {new Date(hist.completed_at || hist.started_at).toLocaleDateString()}</span>
                            </div>
                            <span style={{ fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                              {hist.total_score || hist.score || 0} / {hist.max_score || 100}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Test Session View */}
            {activeTestSession && (
              <div className="glass-card animate-slide-up" style={{ padding: '0px', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                {/* Timer Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--black-hover)', borderBottom: '1px solid var(--grey-800)', padding: '16px 24px' }}>
                  <div>
                    <span className="eyebrow-label" style={{ fontSize: '9px' }}>ASSESSMENT IN PROGRESS</span>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>{activeTestSession.test_type}</h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>
                    <Clock size={16} />
                    <span>
                      {Math.floor(activeTestSession.remaining_seconds / 60)}:
                      {String(activeTestSession.remaining_seconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Left/Right Pane layout */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', flex: 1, minHeight: '480px' }}>
                  {/* Left list of questions */}
                  <div style={{ borderRight: isMobile ? 'none' : '1px solid var(--grey-800)', borderBottom: isMobile ? '1px solid var(--grey-800)' : 'none', display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px', background: 'var(--black-void)' }}>
                    {testQuestions.map((q, idx) => {
                      const isAnswered = testAnswers[q.id] !== undefined && testAnswers[q.id] !== '';
                      const isCurrent = idx === currentQuestionIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => {
                            setCurrentQuestionIdx(idx);
                            // If switching to coding question, initialize user code state if blank
                            if (q.category === 'CODING') {
                              setUserCode(testAnswers[q.id] || `def solution():\n    # Write your code here\n    pass\n`);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isCurrent ? 'var(--black-hover)' : 'transparent',
                            border: 'none',
                            color: isCurrent ? 'var(--white-pure)' : 'var(--grey-400)',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--grey-500)' }}>Q{idx + 1}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{q.category}</span>
                          </span>
                          {isAnswered && <Check size={14} color="var(--white-pure)" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right current question panel */}
                  {testQuestions[currentQuestionIdx] && (() => {
                    const q = testQuestions[currentQuestionIdx];
                    return (
                      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', background: 'var(--grey-800)', color: 'var(--white-pure)', padding: '3px 8px', fontFamily: 'var(--font-mono)' }}>
                            {q.category} | {q.difficulty || 'MEDIUM'}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--white-pure)' }}>{q.question_text}</h4>

                        {/* Rendering MCQ options */}
                        {q.category !== 'CODING' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            {(() => {
                              let parsedOptions: string[] = [];
                              try {
                                if (Array.isArray(q.options)) {
                                  parsedOptions = q.options;
                                } else if (typeof q.options === 'string') {
                                  const trimmed = q.options.trim();
                                  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                                    parsedOptions = JSON.parse(trimmed);
                                  } else if (trimmed === '[object Object]') {
                                    parsedOptions = [];
                                  } else {
                                    parsedOptions = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
                                  }
                                } else if (q.options && typeof q.options === 'object') {
                                  parsedOptions = Object.values(q.options) as string[];
                                }
                              } catch (err) {
                                console.error("Failed to parse options:", err);
                              }
                              return parsedOptions.map((opt: string, optIdx: number) => {
                                const isSelected = testAnswers[q.id] === opt;
                                return (
                                  <button
                                    key={optIdx}
                                    onClick={() => {
                                      setTestAnswers(prev => ({ ...prev, [q.id]: opt }));
                                    }}
                                    style={{
                                      textAlign: 'left',
                                      background: isSelected ? 'var(--white-pure)' : 'var(--black-void)',
                                      color: isSelected ? 'var(--black-void)' : 'var(--grey-300)',
                                      border: '1px solid var(--grey-800)',
                                      padding: '14px 18px',
                                      fontSize: '14px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        )}

                        {/* Rendering Coding Console */}
                        {q.category === 'CODING' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                            {q.description && (
                              <div style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-800)', padding: '14px', fontSize: '13px', color: 'var(--grey-300)' }}>
                                {q.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <select 
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                style={{ background: 'var(--black-void)', border: '1px solid var(--grey-800)', color: 'var(--white-pure)', padding: '6px 12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                              >
                                <option value="python">Python 3</option>
                                <option value="javascript">JavaScript (Node.js)</option>
                                <option value="cpp">C++ (GCC)</option>
                                <option value="java">Java (OpenJDK)</option>
                              </select>
                              
                              <button
                                onClick={handleRunCode}
                                disabled={runningCode}
                                className="btn-secondary"
                                style={{ height: '32px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                              >
                                {runningCode ? <RefreshCw className="spin" size={12} /> : <Play size={12} />}
                                Run Code
                              </button>
                            </div>

                            <textarea
                              value={userCode}
                              onChange={(e) => {
                                setUserCode(e.target.value);
                                setTestAnswers(prev => ({ ...prev, [q.id]: e.target.value }));
                              }}
                              rows={12}
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '13px',
                                background: 'var(--black-void)',
                                color: 'var(--white-pure)',
                                border: '1px solid var(--grey-800)',
                                padding: '12px',
                                width: '100%',
                                outline: 'none'
                              }}
                            />

                            {/* Execution Output Console */}
                            {runCodeOutput && (
                              <div style={{ background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--white-pure)', borderBottom: '1px solid var(--grey-800)', paddingBottom: '6px', marginBottom: '8px' }}>
                                  RUN OUTPUT: <span style={{ color: runCodeOutput.status === 'Success' ? '#ffffff' : '#ff4444' }}>{runCodeOutput.status}</span>
                                </div>
                                {runCodeOutput.stdout && <pre style={{ color: 'var(--white-pure)', background: 'var(--black-void)', padding: '8px' }}>{runCodeOutput.stdout}</pre>}
                                {runCodeOutput.stderr && <pre style={{ color: '#ff4444', background: 'var(--black-void)', padding: '8px' }}>{runCodeOutput.stderr}</pre>}
                                {runCodeOutput.test_cases && runCodeOutput.test_cases.length > 0 && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                    {runCodeOutput.test_cases.map((tc: any, tcIdx: number) => (
                                      <div key={tcIdx} style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--black-void)', padding: '6px 12px' }}>
                                        <span>Case {tcIdx + 1}: {tc.passed ? 'PASSED' : 'FAILED'}</span>
                                        <span>Expected: {tc.expected} | Actual: {tc.actual}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Back / Next footer buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--grey-800)' }}>
                          <button
                            onClick={() => {
                              if (currentQuestionIdx > 0) {
                                const nextIdx = currentQuestionIdx - 1;
                                setCurrentQuestionIdx(nextIdx);
                                if (testQuestions[nextIdx].category === 'CODING') {
                                  setUserCode(testAnswers[testQuestions[nextIdx].id] || `def solution():\n    # Write your code here\n    pass\n`);
                                }
                              }
                            }}
                            disabled={currentQuestionIdx === 0}
                            className="btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                          >
                            <ChevronLeft size={16} /> Back
                          </button>
                          
                          {currentQuestionIdx < testQuestions.length - 1 ? (
                            <button
                              onClick={() => {
                                const nextIdx = currentQuestionIdx + 1;
                                setCurrentQuestionIdx(nextIdx);
                                if (testQuestions[nextIdx].category === 'CODING') {
                                  setUserCode(testAnswers[testQuestions[nextIdx].id] || `def solution():\n    # Write your code here\n    pass\n`);
                                }
                              }}
                              className="btn-secondary"
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              Next <ChevronRight size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={handleSubmitMockTest}
                              disabled={submittingTest}
                              className="btn-primary"
                              style={{ padding: '8px 20px', fontSize: '12px', background: 'var(--white-pure)', color: 'var(--black-void)' }}
                            >
                              {submittingTest ? <RefreshCw className="spin" size={14} /> : 'Submit Test'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Test Result Screen */}
            {activeTestResult && !activeTestSession && (
              <div className="glass-card animate-slide-up" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '16px' }}>
                  <div>
                    <span className="eyebrow-label" style={{ fontSize: '9px' }}>ASSESSMENT REPORT CARD</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 800 }}>{activeTestResult.test_type}</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTestResult(null)}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Back to Dashboard
                  </button>
                </div>

                {/* Tab selector */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--grey-900)' }}>
                  <button 
                    onClick={() => setResultSubTab('summary')}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: resultSubTab === 'summary' ? '2px solid var(--white-pure)' : '2px solid transparent',
                      color: resultSubTab === 'summary' ? 'var(--white-pure)' : 'var(--grey-500)',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-display)'
                    }}
                  >
                    Performance Summary
                  </button>
                  <button 
                    onClick={() => setResultSubTab('questions')}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: resultSubTab === 'questions' ? '2px solid var(--white-pure)' : '2px solid transparent',
                      color: resultSubTab === 'questions' ? 'var(--white-pure)' : 'var(--grey-500)',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-display)'
                    }}
                  >
                    Question Breakdown
                  </button>
                </div>

                {/* Tab content 1: summary */}
                {resultSubTab === 'summary' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 2fr', gap: '28px', alignItems: 'start' }}>
                    {/* Left Column: Progress ring & MCQ/Coding comparison */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '24px', background: 'var(--black-void)', border: '1px solid var(--grey-800)' }}>
                      <span className="eyebrow-label" style={{ fontSize: '10px' }}>OVERALL PERFORMANCE</span>
                      
                      <ProgressRing value={activeTestResult.total_score} />

                      {/* Performance Grade Badge */}
                      {(() => {
                        const pct = (activeTestResult.total_score / (activeTestResult.max_score || 100)) * 100;
                        let grade = "INSUFFICIENT (TIER 4)";
                        let color = "var(--error)";
                        if (pct >= 90) { grade = "EXPERT (TIER 1)"; color = "var(--success)"; }
                        else if (pct >= 70) { grade = "ADVANCED (TIER 2)"; color = "#22d3ee"; }
                        else if (pct >= 50) { grade = "COMPETENT (TIER 3)"; color = "#fbbf24"; }
                        return (
                          <span style={{ fontSize: '11px', background: 'var(--black-hover)', border: `1px solid ${color}`, color: color, padding: '4px 12px', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                            {grade}
                          </span>
                        );
                      })()}

                      <div style={{ width: '100%', marginTop: '10px' }}>
                        <ComparisonBarChart 
                          data={[
                            ...(activeTestResult.mcq_total > 0 ? [{
                              label: 'MCQ Questions Correct',
                              value: activeTestResult.mcq_score,
                              max: activeTestResult.mcq_total
                            }] : []),
                            ...(activeTestResult.coding_total > 0 ? [{
                              label: 'Coding Points Earned',
                              value: activeTestResult.coding_score,
                              max: activeTestResult.coding_total
                            }] : [])
                          ]}
                        />
                      </div>

                      {/* Telemetry log console */}
                      {(() => {
                        const lines = [
                          `[SYS] Evaluation completed at: ${new Date(activeTestResult.completed_at || Date.now()).toLocaleTimeString()}`,
                          `[OK] MCQ accuracy: ${activeTestResult.mcq_total > 0 ? Math.round((activeTestResult.mcq_score / activeTestResult.mcq_total) * 100) : 0}%`,
                          `[OK] Coding points: ${activeTestResult.coding_total > 0 ? Math.round((activeTestResult.coding_score / activeTestResult.coding_total) * 100) : 0}%`,
                          `[SYS] AI recommendation engine initialized.`,
                        ];
                        return (
                          <div style={{
                            width: '100%',
                            background: 'var(--black-elevated)',
                            border: '1px solid var(--grey-800)',
                            padding: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--grey-400)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}>
                            {lines.map((ln, idx) => (
                              <div key={idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln}</div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right Column: Radar Chart & AI feedback/Practice areas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '20px' }}>
                        {/* Radar Chart */}
                        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: 800, marginBottom: '12px', fontFamily: 'var(--font-mono)', color: 'var(--grey-400)' }}>TOPIC MASTERY RADAR</h4>
                          <RadarChart
                            data={(() => {
                              const categories = ['APTITUDE', 'LOGICAL', 'VERBAL', 'TECHNICAL', 'CODING'];
                              return categories.map(cat => {
                                const qList = activeTestResult.questions?.filter((q: any) => q.category === cat) || [];
                                let candidateScore = 0;
                                if (cat === 'CODING') {
                                  const codingTotal = activeTestResult.coding_total || 10;
                                  const codingScore = activeTestResult.coding_score || 0;
                                  candidateScore = codingTotal > 0 ? (codingScore / codingTotal) * 9 : 0;
                                } else {
                                  const total = qList.length;
                                  const correct = qList.filter((q: any) => q.is_correct).length;
                                  candidateScore = total > 0 ? (correct / total) * 9 : 0;
                                }
                                return {
                                  category: cat,
                                  required: 7,
                                  candidate: Math.round(candidateScore * 10) / 10
                                };
                              });
                            })()}
                          />
                        </div>

                        {/* AI Recommended Practice Areas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div className="glass-card" style={{ padding: '20px', flex: 1 }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px' }}>AI Recommended Practice Areas</h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {activeTestResult.weak_areas && activeTestResult.weak_areas.length > 0 ? (
                                activeTestResult.weak_areas.map((area: string, areaIdx: number) => (
                                  <span key={areaIdx} style={{ fontSize: '11px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', padding: '4px 10px', color: 'var(--white-primary)', fontFamily: 'var(--font-mono)' }}>
                                    {area}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--grey-500)', fontSize: '12px', fontStyle: 'italic' }}>No weak areas identified! Outstanding performance.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Feedback & Practice Steps */}
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>AI Feedback & Practice Steps</h4>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', fontSize: '13px', color: 'var(--grey-300)', lineHeight: 1.6 }}>
                          {activeTestResult.recommendations && activeTestResult.recommendations.length > 0 ? (
                            activeTestResult.recommendations.map((rec: string, recIdx: number) => (
                              <li key={recIdx}>{rec}</li>
                            ))
                          ) : (
                            <li>Maintain your daily coding habits. You are in the top tier!</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab content 2: questions list */}
                {resultSubTab === 'questions' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {(!activeTestResult.questions || activeTestResult.questions.length === 0) ? (
                      <p style={{ color: 'var(--grey-400)', fontSize: '13px', fontStyle: 'italic' }}>No detailed question breakdown available for this session.</p>
                    ) : (
                      activeTestResult.questions.map((q: any, idx: number) => {
                        const isExpanded = expandedResultQuestion === q.id;
                        // Determine if coding feedback exists
                        const codingFeedback = q.category === 'CODING' && activeTestResult.breakdown?.coding?.feedback?.find(
                          (f: any) => f.question_id === q.id || f.title_slug === q.title_slug
                        );
                        
                        return (
                          <div 
                            key={q.id} 
                            style={{ 
                              background: 'var(--black-hover)', 
                              border: '1px solid var(--grey-850)', 
                              display: 'flex', 
                              flexDirection: 'column',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {/* Accordion Header */}
                            <div 
                              onClick={() => setExpandedResultQuestion(isExpanded ? null : q.id)}
                              style={{ 
                                padding: '16px 20px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--grey-400)' }}>Q{idx + 1}</span>
                                <span style={{ fontSize: '11px', background: 'var(--black-void)', border: '1px solid var(--grey-800)', padding: '2px 8px', color: 'var(--white-pure)', fontFamily: 'var(--font-mono)' }}>
                                  {q.category}
                                </span>
                                <span style={{ fontSize: '11px', color: q.difficulty === 'HARD' ? 'var(--error)' : q.difficulty === 'MEDIUM' ? '#fbbf24' : 'var(--success)' }}>
                                  [{q.difficulty || 'MEDIUM'}]
                                </span>
                                <span style={{ 
                                  fontSize: '13px', 
                                  fontWeight: 650, 
                                  color: 'var(--white-pure)', 
                                  maxWidth: isMobile ? '160px' : '400px', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis', 
                                  whiteSpace: 'nowrap' 
                                }}>
                                  {q.question_text}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {q.category === 'CODING' ? (
                                  <span style={{ 
                                    fontSize: '11px', 
                                    fontFamily: 'var(--font-mono)',
                                    color: (codingFeedback?.score || 0) > 0 ? 'var(--success)' : 'var(--error)',
                                    background: 'var(--black-void)',
                                    padding: '2px 8px',
                                    border: `1px solid ${(codingFeedback?.score || 0) > 0 ? 'var(--success)' : 'var(--error)'}`
                                  }}>
                                    Score: {codingFeedback?.score || 0} / {codingFeedback?.max_score || 10}
                                  </span>
                                ) : (
                                  <span style={{ 
                                    fontSize: '11px', 
                                    fontFamily: 'var(--font-mono)',
                                    color: q.is_correct ? 'var(--success)' : 'var(--error)',
                                    background: 'var(--black-void)',
                                    padding: '2px 8px',
                                    border: `1px solid ${q.is_correct ? 'var(--success)' : 'var(--error)'}`
                                  }}>
                                    {q.is_correct ? 'PASSED' : 'FAILED'}
                                  </span>
                                )}
                                <span style={{ color: 'var(--grey-500)' }}>
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </span>
                              </div>
                            </div>

                            {/* Accordion Body */}
                            {isExpanded && (
                              <div style={{ padding: '20px', borderTop: '1px solid var(--grey-900)', background: 'var(--black-void)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Full Question Text */}
                                <div>
                                  <h5 style={{ fontSize: '11px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>QUESTION</h5>
                                  <p style={{ fontSize: '14px', color: 'var(--white-pure)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                    {q.question_text}
                                  </p>
                                </div>

                                {/* Answers Display for MCQ */}
                                {q.category !== 'CODING' && (
                                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                                    <div style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-850)', padding: '12px' }}>
                                      <h6 style={{ fontSize: '10px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>YOUR ANSWER</h6>
                                      <p style={{ 
                                        fontSize: '13px', 
                                        color: q.is_correct ? 'var(--success)' : 'var(--error)',
                                        fontWeight: 600
                                      }}>
                                        {q.user_answer || '(No answer submitted)'}
                                      </p>
                                    </div>
                                    <div style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-850)', padding: '12px' }}>
                                      <h6 style={{ fontSize: '10px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>CORRECT ANSWER</h6>
                                      <p style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                                        {q.correct_answer}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Explanation/AI Feedback */}
                                {q.category !== 'CODING' && q.explanation && (
                                  <div>
                                    <h5 style={{ fontSize: '11px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>EXPLANATION</h5>
                                    <p style={{ fontSize: '13px', color: 'var(--grey-300)', lineHeight: 1.5 }}>
                                      {q.explanation}
                                    </p>
                                  </div>
                                )}

                                {/* Coding Details */}
                                {q.category === 'CODING' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                      <h5 style={{ fontSize: '11px', color: 'var(--grey-500)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>YOUR SUBMITTED CODE</h5>
                                      <pre style={{ 
                                        background: 'var(--black-hover)', 
                                        border: '1px solid var(--grey-850)', 
                                        padding: '14px', 
                                        fontSize: '12px', 
                                        fontFamily: 'var(--font-mono)', 
                                        color: 'var(--grey-200)',
                                        overflowX: 'auto',
                                        maxHeight: '300px'
                                      }}>
                                        {q.user_answer || '# No code submitted'}
                                      </pre>
                                    </div>

                                    {codingFeedback && (
                                      <div style={{ background: 'var(--black-hover)', border: '1px solid var(--grey-850)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                          <h6 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--white-pure)' }}>AI Code Evaluation Summary</h6>
                                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--grey-300)' }}>
                                            Test Cases Passed: {codingFeedback.passed_test_cases || 0} / {codingFeedback.total_test_cases || 3}
                                          </span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--grey-300)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                          {codingFeedback.feedback}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Innov X */}
        {currentTab === 'innov-x' && (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px' }}>Innov X</h1>
              <p style={{ color: 'var(--color-text-muted)' }}>Corporate Innovation Radar and Open Hackathon Challenges</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '28px', alignItems: 'start' }}>
              
              {/* Opportunities list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Open Innovation Calls</h3>
                
                {innovxOpps.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed var(--grey-800)' }}>
                    No innovation opportunities currently posted.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {innovxOpps.map((opp) => (
                      <div key={opp.id} className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                        <div style={{ 
                          width: '45px', 
                          height: '45px', 
                          background: 'var(--black-void)', 
                          border: '1px solid var(--grey-800)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: 'var(--white-pure)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '18px'
                        }}>
                          {opp.company_avatar || opp.company[0]}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>{opp.company.toUpperCase()}</span>
                            <span style={{ fontSize: '11px', color: 'var(--grey-400)' }}>Deadline: {opp.due_date}</span>
                          </div>
                          <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--white-pure)' }}>{opp.title}</h4>
                          <p style={{ fontSize: '13px', color: 'var(--grey-300)', lineHeight: '1.5' }}>{opp.description}</p>
                          <div style={{ marginTop: '12px' }}>
                            <button
                              onClick={() => handleApplyInnovx(opp.id)}
                              disabled={loading || opp.has_applied}
                              className={opp.has_applied ? "btn-secondary" : "btn-primary"}
                              style={{ padding: '8px 16px', fontSize: '12px' }}
                            >
                              {opp.has_applied ? 'Applied' : 'Register / Apply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submissions & applications status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>My Innovations Dashboard</h3>
                
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <span className="eyebrow-label" style={{ fontSize: '9px' }}>INNOVX APPLICATIONS</span>
                  {innovxApps.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--grey-400)', fontStyle: 'italic' }}>
                      No active applications or submissions.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {innovxApps.map((a) => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-900)', paddingBottom: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: 'var(--white-pure)', display: 'block' }}>{a.title}</strong>
                            <span style={{ fontSize: '11px', color: 'var(--grey-400)' }}>{a.company} | {new Date(a.applied_at).toLocaleDateString()}</span>
                          </div>
                          <span style={{ 
                            fontSize: '9px', 
                            background: 'var(--black-void)', 
                            border: '1px solid var(--grey-800)', 
                            color: 'var(--white-primary)',
                            padding: '2px 6px',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase'
                          }}>
                            {a.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
    </>
  );
}
