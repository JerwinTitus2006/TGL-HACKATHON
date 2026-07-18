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
  Cpu
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

  const getCoordinates = (index: number, value: number) => {
    const angle = (index * 2 * Math.PI) / numCategories - Math.PI / 2;
    const r = (Math.min(Math.max(value, 0), 9) / 9) * R;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const requiredPoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.required);
    return `${x},${y}`;
  }).join(' ');

  const candidatePoints = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.candidate);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--black-elevated)', border: '1px solid var(--grey-800)', padding: '20px', width: '100%' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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

        <polygon
          points={requiredPoints}
          fill="rgba(255, 255, 255, 0.01)"
          stroke="var(--grey-600)"
          strokeWidth="1.2"
          className="radar-target-line"
        />

        <polygon
          points={candidatePoints}
          fill="rgba(255, 255, 255, 0.08)"
          stroke="var(--white-pure)"
          strokeWidth="2"
          style={{ transition: 'all 0.8s var(--ease-ui)' }}
        />

        {data.map((d, i) => {
          const reqPt = getCoordinates(i, d.required);
          const candPt = getCoordinates(i, d.candidate);
          return (
            <g key={i}>
              <circle cx={reqPt.x} cy={reqPt.y} r="2" fill="var(--grey-600)" />
              <circle cx={candPt.x} cy={candPt.y} r="3.5" fill="var(--white-pure)" stroke="var(--black-void)" strokeWidth="1.5" />
            </g>
          );
        })}

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

          return (
            <text
              key={i}
              x={x}
              y={y}
              fill="var(--grey-400)"
              fontSize="9"
              fontFamily="var(--font-mono)"
              textAnchor={textAnchor}
              dy={dy}
            >
              {d.category}
            </text>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.08)', border: '1.5px solid var(--white-pure)' }}></span>
          <span>Your Skills</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1px dashed var(--grey-600)' }}></span>
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
    }
  }, [token]);

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
      
      // Find document id associated with this extraction
      const history = await apiCall('/documents/');
      const matchedDoc = history.find((d: any) => d.filename === mergePreview.source_file);
      if (!matchedDoc || !matchedDoc.extraction_id) {
        throw new Error('Extraction reference not found in history.');
      }

      const mergedProfile = await apiCall(`/profiles/me/merge-resume?extraction_id=${matchedDoc.extraction_id}`, {
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

            {/* Benchmark results visualization */}
            {activeTalentCheck && (
              <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--grey-800)', paddingBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Readiness Evaluation: <span className="glow-text-primary">{activeTalentCheck.company}</span></h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>Computed: {new Date(activeTalentCheck.computed_at).toLocaleString()}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '36px', 
                      fontWeight: 800, 
                      color: 'var(--white-pure)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {activeTalentCheck.readiness_score}%
                    </div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--grey-400)', fontFamily: 'var(--font-mono)' }}>Readiness Score</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr', gap: '30px', alignItems: 'start' }}>
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
                        <div className="animate-fade-in" style={{ 
                          width: '100%', 
                          background: 'var(--black-elevated)', 
                          border: '1px solid var(--grey-800)', 
                          padding: '16px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                          borderRadius: '0px'
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
                          borderRadius: '0px', 
                          padding: '12px 16px',
                          gap: '8px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--white-pure)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.category_code} - {CATEGORY_NAMES[g.category_code]}</span>
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
                                borderRadius: '0px',
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
                                borderRadius: '0px',
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

      </main>
    </div>
    </>
  );
}
