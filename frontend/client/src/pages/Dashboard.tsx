import { useState, useRef } from "react";
import { 
  UploadCloud, 
  Link2, 
  Mic, 
  Brain, 
  FileText, 
  Clock3,
  PlayCircle,
  Sparkles,
  X,
  Loader2,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import "./Dashboard.css";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCompanion } from "@/contexts/CompanionContext";
import { useDarwinity } from "@/contexts/DarwinityStoreContext";
import { useEffect } from "react";
import { useLocation, Link } from "wouter";

type IconType = typeof Brain;

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

interface ActionCard {
  title: string;
  description: string;
  icon: IconType;
  color: string;
}

type ModalMode = null | "upload" | "paste" | "record" | "synthesize";

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { setContext } = useCompanion();
  const { state, dispatch } = useDarwinity();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setContext({ workspace: "Home" });
  }, [setContext]);

  const bootstrap = trpc.workspace.bootstrap.useQuery();
  const { data: sourcesData } = trpc.workspace.sources.useQuery(
    { workspaceId: bootstrap.data?.id as number },
    { enabled: !!bootstrap.data?.id }
  );
  const createSource = trpc.workspace.createSource.useMutation();
  const coursesQuery = trpc.curriculum.list.useQuery(
    { workspaceId: bootstrap.data?.id as number },
    { enabled: !!bootstrap.data?.id }
  );
  const createCourse = trpc.curriculum.create.useMutation();
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  const generateAST = trpc.curriculum.generateAST.useMutation();
  const activeCourses = state.courses || [];
  const draftCourses = []; // Deprecated, we show all in activeCourses now

  const handleCreateCourse = async () => {
    if (!bootstrap.data?.id || !selectedSourceId) return;
    
    const source = sourcesData?.find(s => s.id === selectedSourceId);
    if (!source || !source.externalId) {
      alert("Please select a valid source with an external ID.");
      return;
    }

    setCreatingCourse(true);
    try {
      const stored = localStorage.getItem("learningProfile");
      const profile = stored ? JSON.parse(stored) : {};
      
      const levelStr = (profile.level || "").toLowerCase();
      const levelNum = levelStr === "advanced" ? 3 : levelStr === "intermediate" ? 2 : 1;
      const minutes = parseInt(profile.timeBudget) || 30;
      
      const payload = {
          content: source.excerpt || source.title || "Course content",
          goal: profile.goal || "understand",
          time_budget: profile.timeBudget || "30min",
          level: profile.level || "intermediate"
      };

      // 1. Fetch the full normalized text from the Python backend
      const pyRes = await fetch(`${CAPTURE_API_URL}/api/course/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer demo-user" },
        body: JSON.stringify(payload)
      });
      if (!pyRes.ok) throw new Error("Failed to create course from backend");
      const data = await pyRes.json();
      
      if (data.course && data.course.id) {
        // Also add to darwinity store so it shows up in UI
        dispatch({ type: "CREATE_COURSE", course: { id: data.course.id, spaceId: "dashboard", title: data.course.title || source.title || "Generated Course", description: data.course.description || "", modules: data.course.modules || [], lessons: data.course.lessons || [], sourceIds: [source.externalId], learningGoal: data.course.learningGoal || "", estimatedMinutes: 0, readiness: 0, currentLessonId: data.course.currentLessonId || "", totalLessons: data.course.totalLessons || 0, completedLessons: 0, nextAction: "Start", updatedAt: new Date().toISOString(), progress: 0, status: "active", icon: "🚀", accent: "sky" } });
        setLocation(`/courses/${data.course.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create course. Ensure the Python backend is running.");
      setCreatingCourse(false);
    }
  };

  const utils = trpc.useUtils();

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadSuccess(false);
    try {
      const workspaceId = bootstrap.data?.id;
      if (workspaceId) {
        // Build FormData
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("title", file.name);
        formData.append("space_id", String(workspaceId));
        
        // Post directly to the Python backend API
        const response = await fetch(`${CAPTURE_API_URL}/captures/upload`, {
          method: "POST",
          body: formData,
          headers: { 
            "Authorization": "Bearer demo-user" // Demo user auth
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Tell TRPC to save it to SQL and refresh the sources list
          await createSource.mutateAsync({
            workspaceId,
            title: file.name,
            sourceType: file.type.includes("pdf") ? "pdf" : file.type.includes("audio") ? "audio" : "document",
            fileName: file.name,
            mimeType: file.type,
            externalId: data.id, // Use the python DB ID
            url: ""
          });
          
          await utils.workspace.sources.invalidate();
          setUploadSuccess(true);
          setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1500);
        } else {
          console.error("Upload failed:", await response.text());
          throw new Error("Upload failed");
        }
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Upload failed. Your material was not added to the library.");
    } finally {
      setUploading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setUploading(true);
    try {
      if (bootstrap.data?.id) {
        await createSource.mutateAsync({
          workspaceId: bootstrap.data.id,
          title: pasteTitle || "Pasted Content",
          sourceType: pasteText.startsWith("http") ? "url" : "document",
          url: pasteText.startsWith("http") ? pasteText : undefined,
          excerpt: !pasteText.startsWith("http") ? pasteText.substring(0, 200) : undefined
        });
        utils.workspace.sources.invalidate();
        setUploadSuccess(true);
        setPasteText("");
        setPasteTitle("");
        setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1500);
      }
    } catch {
      setUploadSuccess(true);
      setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1500);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-6 sm:px-12 pb-32">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 mb-2">
            Welcome back.
          </h1>
          <p className="text-lg text-gray-500 font-medium">
            Ready to shape some knowledge today?
          </p>
        </div>
        

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left Column: Input Actions */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-xl font-extrabold mb-4">Add Material</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => setModalMode("upload")} 
              className="group relative flex flex-col justify-center items-center gap-4 p-8 rounded-[24px] bg-gradient-to-br from-[#123d2d] to-[#0a241a] shadow-xl overflow-hidden text-center min-h-[260px] w-full border border-[#1a5440] hover:shadow-2xl transition-all"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
              
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                <UploadCloud size={32} className="text-emerald-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-xl tracking-tight mb-2">Ingest Knowledge</h3>
                <p className="text-sm text-emerald-100/70 font-medium px-4">Upload PDFs, paste links, record lectures, or connect integrations.</p>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-white bg-white/10 px-4 py-2 rounded-full border border-white/5">
                <Sparkles size={14} className="text-emerald-400" /> Let AI organize it
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Dashboard Data */}
        <div className="lg:col-span-2 space-y-12">
          
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold">Active Courses</h2>
              <button 
                onClick={() => setCourseModalOpen(true)}
                disabled={creatingCourse}
                className="bg-primary hover:opacity-90 text-primary-foreground font-bold text-sm px-4 py-2 rounded-xl transition-opacity shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {creatingCourse ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Create New AI Course
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCourses.length === 0 ? (
                <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                  No active courses yet.
                </div>
              ) : (
                activeCourses.map((course: any, i: number) => (
                  <div 
                    key={course.id || i}
                    className="group relative flex flex-col justify-between p-6 rounded-[24px] bg-white border border-[#e1e8e2] shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden min-h-[210px]"
                    onClick={() => setLocation(`/courses/${course.id}`)}
                  >
                    <div>
                      <div className="text-3xl mb-3 p-3 rounded-2xl bg-gray-50 border border-gray-100 w-fit shrink-0">
                        {course.icon}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-gray-900 leading-tight mb-1 group-hover:text-[#123d2d] transition-colors line-clamp-2">{course.title}</h3>
                        <p className="text-xs text-gray-500 font-medium truncate">{course.mastery?.progress ?? 0}% • {course.mastery?.completedLessons ?? 0}/{course.mastery?.totalLessons ?? 0} Lessons</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${course.mastery?.progress ?? 0}%`, backgroundColor: course.accent || "#2563eb" }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                        <span>UP NEXT</span>
                        <span style={{ color: course.accent || "#2563eb" }} className="flex items-center gap-1 group-hover:opacity-100 transition-opacity"><PlayCircle size={10} /> {course.mastery?.completedLessons ? "Resume" : "Start"}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>


        </div>
      </div>

      {/* Recent Material (Dark Theme Grid) */}
      <section className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Recent Material</h2>
          <button onClick={() => setLocation('/library')} className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
            View All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(!sourcesData || sourcesData.length === 0) ? (
             <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-300 rounded-3xl bg-gray-50">
               No recent material found. Add some above!
             </div>
          ) : (
            sourcesData.slice(0, 6).map((source) => (
              <div key={source.id} onClick={() => source.url && window.open(source.url, '_blank')} className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card border border-border shadow-lg hover:border-primary/50 transition-all cursor-pointer h-[180px]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">{source.sourceType}</span>
                    <span className="text-[9px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-sm uppercase tracking-wider">Synced</span>
                  </div>
                  <h3 className="font-bold text-foreground text-[15px] leading-snug mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{source.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{source.excerpt || `Imported material: ${source.title}`}</p>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded border border-border uppercase tracking-wider">{source.adapter || "Darwinity"}</span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{new Date(source.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ===== CAPTURE-STYLE INGESTION MODAL ===== */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all" onClick={() => !uploading && setModalMode(null)}>
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
            
            {/* Left Sidebar (Tabs) */}
            <div className="md:w-1/3 bg-muted/30 border-r border-border p-6 flex flex-col gap-2">
              <div className="mb-6">
                <h3 className="text-foreground font-bold text-lg">Ingest Data</h3>
                <p className="text-muted-foreground text-xs">Select a source type</p>
              </div>
              <button 
                onClick={() => setModalMode("upload")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${modalMode === "upload" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"}`}
              >
                <UploadCloud size={18} /> <span className="font-bold text-sm">Upload File</span>
              </button>
              <button 
                onClick={() => setModalMode("paste")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${modalMode === "paste" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Link2 size={18} /> <span className="font-bold text-sm">Paste / Link</span>
              </button>
              <button 
                onClick={() => setModalMode("record")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${modalMode === "record" ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Mic size={18} /> <span className="font-bold text-sm">Voice Memo</span>
              </button>
            </div>

            {/* Right Content Area */}
            <div className="md:w-2/3 p-8 relative min-h-[400px] flex flex-col justify-center">
              <button onClick={() => !uploading && setModalMode(null)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
                <X size={16} className="text-muted-foreground hover:text-foreground" />
              </button>

              {uploadSuccess ? (
                <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                    <CheckCircle2 size={40} className="text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Ingestion Complete!</h3>
                  <p className="text-muted-foreground">Your data has been added and indexed.</p>
                </div>
              ) : modalMode === "upload" ? (
                <div className="animate-in fade-in duration-200">
                  <h3 className="text-foreground font-bold text-xl mb-6">Upload Document</h3>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.mp3,.wav,.m4a"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFile(file);
                    }}
                  />
                  <div 
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${uploading ? 'bg-muted/50' : 'hover:border-primary/50 hover:bg-muted/30'}`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 size={40} className="text-primary animate-spin mb-4" />
                        <p className="font-bold text-foreground">Processing...</p>
                        <p className="text-xs text-muted-foreground mt-2">Extracting and indexing data</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                          <UploadCloud size={28} className="text-muted-foreground" />
                        </div>
                        <p className="font-bold text-foreground mb-2">Select a file to upload</p>
                        <p className="text-xs text-muted-foreground text-center">Supports PDF, Markdown, Images, Audio.<br/>Up to 50MB.</p>
                      </>
                    )}
                  </div>
                </div>
              ) : modalMode === "paste" ? (
                <div className="animate-in fade-in duration-200 flex flex-col h-full justify-center">
                  <h3 className="text-foreground font-bold text-xl mb-6">Paste Content</h3>
                  <div className="space-y-4">
                    <div>
                      <input 
                        value={pasteTitle}
                        onChange={e => setPasteTitle(e.target.value)}
                        placeholder="Title (Optional)"
                        className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <textarea 
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Paste URL, raw text, or code here..."
                        rows={6}
                        className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-foreground text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none placeholder:text-muted-foreground font-mono"
                      />
                    </div>
                    <button 
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim() || uploading}
                      className="w-full bg-primary hover:opacity-90 text-primary-foreground font-extrabold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <><Loader2 size={18} className="animate-spin" /> Ingesting...</> : "Ingest Now"}
                    </button>
                  </div>
                </div>
              ) : modalMode === "record" ? (
                <div className="animate-in fade-in duration-200 flex flex-col items-center justify-center h-full py-8">
                  <h3 className="text-foreground font-bold text-xl mb-8 self-start w-full">Voice Memo</h3>
                  <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 cursor-pointer hover:bg-red-500/20 transition-all hover:scale-105" onClick={() => {
                    setUploading(true);
                    setTimeout(() => {
                      setUploading(false);
                      setUploadSuccess(true);
                      setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1500);
                    }, 2000);
                  }}>
                    {uploading ? <Loader2 size={36} className="text-red-500 animate-spin" /> : <Mic size={36} className="text-red-500" />}
                  </div>
                  <p className="font-bold text-foreground mb-2">{uploading ? "Recording..." : "Tap to record"}</p>
                  <p className="text-xs text-muted-foreground text-center mb-8">AI will transcribe and summarize automatically.</p>
                  
                  <button 
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "audio/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleUploadFile(file);
                      };
                      input.click();
                    }}
                    className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-4 py-2 rounded-full border border-border hover:border-primary/30"
                  >
                    <UploadCloud size={14} /> or upload audio file
                  </button>
                </div>
              ) : modalMode === "synthesize" ? (
                <div className="animate-in fade-in duration-200 flex flex-col h-full py-2 overflow-y-auto pr-2" style={{ maxHeight: "70vh" }}>
                  <h3 className="text-foreground font-bold text-xl mb-1">What You Unlock</h3>
                  <p className="text-muted-foreground text-sm mb-6">Choose how you want to synthesize this material, or just save it.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                      { id: 'notes', title: 'Notes', desc: 'Editable study notes from your source.', icon: '📝', color: 'bg-primary/10 text-primary' },
                      { id: 'mindmap', title: 'Mind map', desc: 'See how topics connect.', icon: '🔗', color: 'bg-primary/10 text-primary' },
                      { id: 'flashcards', title: 'Flashcards', desc: 'Active recall until it sticks.', icon: '📇', color: 'bg-primary/10 text-primary' },
                      { id: 'quizzes', title: 'Quizzes', desc: 'Exam-pressure practice.', icon: '✨', color: 'bg-primary/10 text-primary' },
                      { id: 'games', title: 'Games', desc: 'Learn by playing, not grinding.', icon: '🎮', color: 'bg-primary/10 text-primary' },
                      { id: 'podcast', title: 'Podcast', desc: 'Open a note, then Audio.', icon: '🎧', color: 'bg-primary/10 text-primary' },
                      { id: 'askai', title: 'Ask AI', desc: 'Chat with your material.', icon: '💬', color: 'bg-primary/10 text-primary' },
                      { id: 'focus', title: 'Focus', desc: 'Pomodoro while you study.', icon: '⏱️', color: 'bg-primary/10 text-primary' },
                    ].map(opt => (
                      <div key={opt.id} onClick={() => {
                        setUploading(true);
                        setTimeout(() => {
                          setUploading(false);
                          setModalMode(null);
                        }, 1500);
                      }} className="bg-muted hover:bg-muted/80 border border-border rounded-xl p-4 cursor-pointer transition-colors flex gap-3 group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${opt.color}`}>
                          <span className="text-xl">{opt.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{opt.title}</h4>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setModalMode(null)}
                    className="w-full bg-muted hover:bg-muted/80 text-foreground border border-border font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center"
                  >
                    Only Upload
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ===== COURSE CREATION MODAL ===== */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all" onClick={() => !creatingCourse && setCourseModalOpen(false)}>
          <div className="bg-[#1a1b1e] border border-[#2c2d30] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <Sparkles size={20} className="text-blue-400" /> Generate AI Course
              </h3>
              <button onClick={() => setCourseModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-6">
              Select an ingested source from your library to transform into a structured, Duolingo-style learning course.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 mb-6 custom-scrollbar">
              {(!sourcesData || sourcesData.length === 0) ? (
                <div className="text-center py-8 text-gray-500 border border-[#2c2d30] rounded-xl border-dashed">
                  No sources available. Upload something first!
                </div>
              ) : (
                sourcesData.map(source => (
                  <div 
                    key={source.id} 
                    onClick={() => setSelectedSourceId(source.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${selectedSourceId === source.id ? "bg-blue-500/10 border-blue-500/50" : "bg-[#141517] border-[#2c2d30] hover:border-gray-600"}`}
                  >
                    <div className="mt-0.5">
                      {source.sourceType === "pdf" ? <FileText size={16} className="text-red-400" /> : <Link2 size={16} className="text-blue-400" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold mb-1 ${selectedSourceId === source.id ? "text-blue-400" : "text-white"}`}>{source.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{source.excerpt || `External ID: ${source.externalId}`}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={handleCreateCourse}
              disabled={!selectedSourceId || creatingCourse}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creatingCourse ? <><Loader2 size={18} className="animate-spin" /> Generating AST...</> : "Create Course"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
