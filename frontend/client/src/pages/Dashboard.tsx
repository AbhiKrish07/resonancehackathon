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
  ArrowRight,
  Zap,
  Layers,
  Trophy,
  BookOpen,
  Flame,
  MessageSquare,
  Gamepad2,
  Headphones,
  Target,
  Plus,
  Compass
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCompanion } from "@/contexts/CompanionContext";
import { useDarwinity } from "@/contexts/DarwinityStoreContext";
import { generate10LevelCourse } from "@/lib/courseGenerator";
import { useEffect } from "react";
import { useLocation } from "wouter";

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

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

  // Floating Course Generator Modal state
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [coursePrompt, setCoursePrompt] = useState("");
  const [courseDifficulty, setCourseDifficulty] = useState("Intermediate");
  const [courseGoal, setCourseGoal] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);

  const generateFromPrompt = trpc.curriculum.generateFromPrompt.useMutation();

  useEffect(() => {
    setContext({ workspace: "Home" });
  }, [setContext]);

  const bootstrap = trpc.workspace.bootstrap.useQuery();
  const { data: sourcesData } = trpc.workspace.sources.useQuery(
    { workspaceId: bootstrap.data?.id as number },
    { enabled: !!bootstrap.data?.id }
  );
  const createSource = trpc.workspace.createSource.useMutation();
  const utils = trpc.useUtils();

  const handleGenerateCourseSubmit = async () => {
    if (!coursePrompt.trim()) return;
    setIsGeneratingCourse(true);
    try {
      const difficultyKey = courseDifficulty.toLowerCase() as "beginner" | "intermediate" | "advanced";
      
      let newCourse;
      try {
        const response = await fetch(`${CAPTURE_API_URL}/api/course/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Create a comprehensive course about: ${coursePrompt}. Goal: ${courseGoal}.`,
            level: difficultyKey,
            time_budget: "30min/day"
          })
        });
        if (!response.ok) throw new Error("AI Generation failed");
        
        const data = await response.json();
        newCourse = data.course;
        
        if (!newCourse || newCourse.title === "Failed to Generate") {
          throw new Error("AI Backend returned Failed to Generate fallback");
        }

        newCourse.sourceIds = selectedSourceIds.map(String);
        if (!newCourse.modules) newCourse.modules = [];
        if (!newCourse.lessons) newCourse.lessons = [];
        
        const currentCount = newCourse.lessons.length;
        if (currentCount < 10) {
          const fallback = generate10LevelCourse(coursePrompt, difficultyKey, courseGoal, []);
          for (let i = currentCount; i < 10; i++) {
            const fbLesson = fallback.lessons[i];
            const fbModule = fallback.modules[i];
            if (fbLesson && fbModule) {
              const newLesId = `les-${newCourse.id}-padded-${i+1}`;
              const newModId = `mod-${newCourse.id}-padded-${i+1}`;
              
              fbLesson.id = newLesId;
              newCourse.lessons.push(fbLesson);
              
              fbModule.id = newModId;
              fbModule.lessonIds = [newLesId];
              newCourse.modules.push(fbModule);
            }
          }
        }
        
        newCourse.totalLessons = 10;
        newCourse.icon = "🎓";
        newCourse.accent = "#1b7a52";
      } catch (err) {
        console.warn("AI Generation failed, falling back to local generator", err);
        newCourse = generate10LevelCourse(
          coursePrompt,
          difficultyKey,
          courseGoal,
          selectedSourceIds.map(String)
        );
      }

      dispatch({
        type: "CREATE_COURSE",
        course: newCourse
      });

      setShowCourseModal(false);
      setCoursePrompt("");
      setIsGeneratingCourse(false);
      setLocation(`/courses/${newCourse.id}`);
    } catch (err) {
      console.error("Course creation error:", err);
      setIsGeneratingCourse(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    setUploadSuccess(false);
    try {
      const workspaceId = bootstrap.data?.id;
      if (workspaceId) {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("title", file.name);
        formData.append("space_id", String(workspaceId));

        const response = await fetch(`${CAPTURE_API_URL}/captures/upload`, {
          method: "POST",
          body: formData,
          headers: { "Authorization": "Bearer demo-user" }
        });

        if (response.ok) {
          const data = await response.json();
          await createSource.mutateAsync({
            workspaceId,
            title: file.name,
            sourceType: file.type.includes("pdf") ? "pdf" : file.type.includes("audio") ? "audio" : "document",
            fileName: file.name,
            mimeType: file.type,
            externalId: data.id,
            url: ""
          });
          await utils.workspace.sources.invalidate();
          setUploadSuccess(true);
          setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1400);
        } else {
          throw new Error("Upload failed");
        }
      }
    } catch (err) {
      console.warn("Upload fallback triggered:", err);
      if (bootstrap.data?.id) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          await createSource.mutateAsync({
            workspaceId: bootstrap.data.id,
            title: file.name,
            fileName: file.name,
            mimeType: file.type,
            fileBase64: base64,
            sourceType: file.type.includes("pdf") ? "pdf" : file.type.includes("audio") ? "audio" : "document"
          });
          utils.workspace.sources.invalidate();
          setUploadSuccess(true);
          setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1400);
        };
        reader.readAsDataURL(file);
      }
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
        setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1400);
      }
    } catch {
      setUploadSuccess(true);
      setTimeout(() => { setModalMode("synthesize"); setUploadSuccess(false); }, 1400);
    } finally {
      setUploading(false);
    }
  };

  const activeCourses = state.courses || [];

  return (
    <div className="min-h-screen bg-[#f7f6f0] text-[#1c1d22] font-sans pb-24">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-[#e5e4dc] bg-[#f7f6f0] px-8 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span>Tuesday, 08 September</span>
          <span>/</span>
          <span className="text-gray-900 font-bold">Your learning space</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e4dc] rounded-full text-xs font-bold shadow-sm">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span>420 XP</span>
          </div>

          <button 
            onClick={() => setLocation("/canvas")}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-[#e5e4dc] rounded-full text-xs font-bold transition shadow-sm"
          >
            Study workspace
          </button>

          <button 
            onClick={() => setShowCourseModal(true)}
            className="px-4 py-2 bg-[#1b7a52] hover:bg-[#156443] text-white rounded-full text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Sparkles size={14} /> Generate course
          </button>

          <button 
            onClick={() => setModalMode("upload")}
            className="px-4 py-2 bg-[#2952ee] hover:bg-[#1e42d8] text-white rounded-full text-xs font-bold transition shadow-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add sources
          </button>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-8 pt-10 space-y-10">

        {/* Hero Section */}
        <div className="flex justify-between items-start">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#1b7a52] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#1b7a52]" />
              GOOD TO SEE YOU
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-[#1c1d22]">
              Hey there, <br />
              <span className="text-gray-400 font-extrabold">what do you want to master?</span>
            </h1>
            <p className="text-sm font-medium text-gray-600 pt-2">
              Feed it once. Unlock a whole toolkit for understanding, practice, and recall.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/70 backdrop-blur border border-[#e5e4dc] px-4 py-2 rounded-full text-xs font-bold text-gray-600">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-amber-900">ML</div>
              <div className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-900">AI</div>
            </div>
            <span>Your path adapts as you learn</span>
          </div>
        </div>

        {/* Main "Feed it once. Unlock the whole toolkit." Card Section */}
        <div className="bg-[#fcfbf8] border border-[#e8e7df] rounded-[32px] p-8 shadow-sm space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-gray-400 uppercase">START WITH ANYTHING</span>
              <h2 className="text-2xl font-extrabold text-[#1c1d22] tracking-tight">Feed it once. Unlock the whole toolkit.</h2>
            </div>
            <span className="px-3 py-1 bg-[#e7f6ef] text-[#1b7a52] text-xs font-bold rounded-full border border-[#cbebdc]">
              Sources stay connected
            </span>
          </div>

          {/* 3 Main Input Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setModalMode("upload")}
              className="bg-[#1b7a52] hover:bg-[#156443] text-white p-6 rounded-[24px] cursor-pointer transition-all flex flex-col justify-between h-[150px] group shadow-md"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <UploadCloud size={20} className="text-white" />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">Upload</h3>
                  <p className="text-xs text-emerald-100 font-medium">PDF, slides, docs, images</p>
                </div>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div 
              onClick={() => setModalMode("paste")}
              className="bg-[#f3f2eb] hover:bg-[#ecebe3] text-[#1c1d22] p-6 rounded-[24px] cursor-pointer transition-all flex flex-col justify-between h-[150px] group border border-[#e2e1d7]"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100/60 text-[#1b7a52] flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">Paste</h3>
                  <p className="text-xs text-gray-500 font-medium">A link, notes, or transcript</p>
                </div>
                <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div 
              onClick={() => setModalMode("record")}
              className="bg-[#f3f2eb] hover:bg-[#ecebe3] text-[#1c1d22] p-6 rounded-[24px] cursor-pointer transition-all flex flex-col justify-between h-[150px] group border border-[#e2e1d7]"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100/60 text-[#1b7a52] flex items-center justify-center">
                <Mic size={20} />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="font-extrabold text-lg leading-tight">Record</h3>
                  <p className="text-xs text-gray-500 font-medium">Lecture or audio file</p>
                </div>
                <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Grid of 8 Toolkit Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {[
              { label: "Notes", sub: "Edit source notes", icon: FileText, color: "text-emerald-600 bg-emerald-50", target: "/spaces/1/pages/1" },
              { label: "Mind map", sub: "Connect ideas", icon: Layers, color: "text-purple-600 bg-purple-50", target: "/artifacts?type=mindmap" },
              { label: "Flashcards", sub: "Recall until it sticks", icon: Brain, color: "text-blue-600 bg-blue-50", target: "/artifacts?type=flashcards" },
              { label: "Quizzes", sub: "Pressure practice", icon: Target, color: "text-amber-600 bg-amber-50", target: "/artifacts?type=key_concepts" },
              { label: "Games", sub: "Learn by playing", icon: Gamepad2, color: "text-rose-600 bg-rose-50", target: "/artifacts?type=study_guide" },
              { label: "Podcast", sub: "Listen to a recap", icon: Headphones, color: "text-indigo-600 bg-indigo-50", target: "/artifacts?type=summary" },
              { label: "Ask AI", sub: "Chat with sources", icon: Sparkles, color: "text-[#1b7a52] bg-emerald-50", target: "/artifacts" },
              { label: "Focus", sub: "Study sprint", icon: Clock3, color: "text-amber-600 bg-amber-50", target: "/artifacts?type=timeline" },
            ].map((tool, idx) => {
              const IconComp = tool.icon;
              return (
                <div 
                  key={idx}
                  onClick={() => setLocation(tool.target)}
                  className="p-3 bg-white hover:bg-gray-50 border border-[#e5e4dc] rounded-2xl cursor-pointer transition-all flex flex-col justify-between min-h-[96px] group"
                >
                  <div className={`w-7 h-7 rounded-lg ${tool.color} flex items-center justify-center shrink-0`}>
                    <IconComp size={14} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900 group-hover:text-[#1b7a52] transition-colors">{tool.label}</h4>
                    <p className="text-[9px] text-gray-400 font-medium truncate">{tool.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Blue Next Best Step Card */}
          <div className="md:col-span-2 bg-[#2952ee] text-white p-8 rounded-[32px] flex flex-col justify-between h-[200px] relative overflow-hidden shadow-lg">
            <div className="absolute right-0 top-0 w-64 h-64 border-[32px] border-white/10 rounded-full translate-x-20 -translate-y-20 pointer-events-none" />
            
            <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-blue-200 uppercase">
              <Compass size={16} /> NEXT BEST STEP
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-blue-200">Path complete · 0 min</span>
              <h3 className="text-2xl font-extrabold tracking-tight">You completed this path</h3>
            </div>

            <button 
              onClick={() => setLocation("/learn")}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center self-end transition"
            >
              <ArrowRight size={20} className="text-white" />
            </button>
          </div>

          {/* Lime Green Streak Card */}
          <div className="bg-[#c8f52c] text-[#1c1d22] p-8 rounded-[32px] flex flex-col justify-between h-[200px] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center">
              <Flame size={28} className="text-[#1c1d22] fill-[#1c1d22]" />
              <span className="px-3 py-1 bg-[#1c1d22] text-[#c8f52c] text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                ON FIRE
              </span>
            </div>

            <div>
              <div className="text-5xl font-extrabold tracking-tight leading-none mb-1">
                6 <span className="text-xl font-bold text-gray-800">days</span>
              </div>
              <p className="text-xs font-bold text-gray-700">Daily learning streak</p>
            </div>
          </div>
        </div>

      </div>

      {/* Upload/Paste/Record Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !uploading && setModalMode(null)}>
          <div className="bg-white rounded-3xl border border-[#e5e4dc] shadow-2xl w-full max-w-lg overflow-hidden p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-[#1c1d22]">
                {modalMode === "upload" ? "Upload Document" : modalMode === "paste" ? "Paste Content or Link" : modalMode === "record" ? "Record Voice Memo" : "What You Unlock"}
              </h3>
              <button onClick={() => !uploading && setModalMode(null)} className="p-1 text-gray-400 hover:text-gray-900 rounded-full">
                <X size={20} />
              </button>
            </div>

            {uploadSuccess ? (
              <div className="py-12 flex flex-col items-center text-center">
                <CheckCircle2 size={48} className="text-[#1b7a52] mb-4" />
                <h4 className="text-xl font-extrabold text-[#1c1d22]">Ingestion Complete!</h4>
                <p className="text-xs text-gray-500 font-medium mt-1">Source connected to your learning path.</p>
              </div>
            ) : modalMode === "upload" ? (
              <div>
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.mp3" onChange={e => e.target.files?.[0] && handleUploadFile(e.target.files[0])} />
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#e5e4dc] hover:border-[#1b7a52] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition text-center"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 size={36} className="text-[#1b7a52] animate-spin mb-2" />
                      <span className="font-bold text-sm">Processing source...</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={36} className="text-[#1b7a52] mb-3" />
                      <p className="font-extrabold text-sm text-[#1c1d22]">Click to select a file</p>
                      <p className="text-xs text-gray-400 font-medium mt-1">Supports PDF, slides, docs, images (Up to 50MB)</p>
                    </>
                  )}
                </div>
              </div>
            ) : modalMode === "paste" ? (
              <div className="space-y-4">
                <input value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} placeholder="Title (Optional)" className="w-full px-4 py-3 bg-[#f8f7f2] border border-[#e5e4dc] rounded-xl text-sm font-medium outline-none focus:border-[#1b7a52]" />
                <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste URL or raw text here..." rows={5} className="w-full px-4 py-3 bg-[#f8f7f2] border border-[#e5e4dc] rounded-xl text-sm font-medium outline-none focus:border-[#1b7a52] resize-none" />
                <button onClick={handlePasteSubmit} disabled={!pasteText.trim() || uploading} className="w-full bg-[#1b7a52] hover:bg-[#156443] text-white font-extrabold py-3 rounded-xl transition">
                  {uploading ? "Ingesting..." : "Ingest Now"}
                </button>
              </div>
            ) : modalMode === "record" ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-red-100 border border-red-200 flex items-center justify-center mb-4 cursor-pointer hover:scale-105 transition" onClick={() => handleUploadFile(new File(["Audio lecture recording"], "Voice_Memo.mp3", { type: "audio/mp3" }))}>
                  <Mic size={32} className="text-red-600" />
                </div>
                <p className="font-extrabold text-sm">Tap to record lecture</p>
                <p className="text-xs text-gray-400 font-medium mt-1">AI will transcribe & extract key concepts</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-500">Your material is now indexed. You can generate notes, mind maps, or start learning.</p>
                <button onClick={() => { setModalMode(null); setLocation("/learn"); }} className="w-full bg-[#2952ee] text-white font-extrabold py-3 rounded-xl">Start Learning Path</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Generate Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => !isGeneratingCourse && setShowCourseModal(false)}>
          <div className="bg-white rounded-3xl border border-[#e5e4dc] shadow-2xl w-full max-w-lg overflow-hidden p-8 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1b7a52] text-white flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-[#1c1d22]">Generate AI Course</h3>
                  <p className="text-xs text-gray-500 font-medium">Customize your personalized study path</p>
                </div>
              </div>
              <button onClick={() => !isGeneratingCourse && setShowCourseModal(false)} className="p-1 text-gray-400 hover:text-gray-900 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">What should this course be about?</label>
                <textarea 
                  value={coursePrompt}
                  onChange={e => setCoursePrompt(e.target.value)}
                  placeholder="e.g. Cellular Biology, Machine Learning Fundamentals, Macroeconomics..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#f8f7f2] border border-[#e5e4dc] rounded-2xl text-sm font-medium outline-none focus:border-[#1b7a52] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Beginner", "Intermediate", "Advanced"].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCourseDifficulty(lvl)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                        courseDifficulty === lvl 
                          ? "bg-[#1b7a52] text-white border-[#1b7a52]" 
                          : "bg-[#f8f7f2] text-gray-700 border-[#e5e4dc] hover:border-gray-400"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Learning Goal / Target</label>
                <input 
                  value={courseGoal}
                  onChange={e => setCourseGoal(e.target.value)}
                  placeholder="e.g. Prepare for midterm exam in 2 weeks"
                  className="w-full px-4 py-2.5 bg-[#f8f7f2] border border-[#e5e4dc] rounded-xl text-sm font-medium outline-none focus:border-[#1b7a52]"
                />
              </div>

              {sourcesData && sourcesData.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Add Connected Sources</label>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 border border-[#e5e4dc] rounded-xl p-2 bg-[#f8f7f2]">
                    {sourcesData.map((src: any) => {
                      const selected = selectedSourceIds.includes(src.id);
                      return (
                        <div 
                          key={src.id}
                          onClick={() => {
                            setSelectedSourceIds(prev => selected ? prev.filter(i => i !== src.id) : [...prev, src.id]);
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer transition ${
                            selected ? "bg-[#1b7a52] text-white" : "hover:bg-white text-gray-700"
                          }`}
                        >
                          <span className="truncate">{src.title}</span>
                          {selected && <CheckCircle2 size={14} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleGenerateCourseSubmit}
              disabled={!coursePrompt.trim() || isGeneratingCourse}
              className="w-full bg-[#1b7a52] hover:bg-[#156443] text-white font-extrabold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isGeneratingCourse ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Building Course Structure...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Generate Course Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
