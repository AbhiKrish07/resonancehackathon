import { useDarwinity } from "@/contexts/DarwinityStoreContext";
import { useCompanion } from "@/contexts/CompanionContext";
import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { FileText, Plus, BookOpen, Brain, Sparkles, FolderPlus, Loader2, Upload, Eye, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/types/darwinity";

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

export default function SpaceOverview() {
  const { spaceId } = useParams();
  const [, setLocation] = useLocation();
  const { state, dispatch } = useDarwinity();
  const { setContext } = useCompanion();

  const space = state.spaces.find(s => s.id === spaceId);
  const spacePages = state.pages.filter(p => p.spaceId === spaceId && !p.archived);

  useEffect(() => {
    dispatch({ type: "SET_ACTIVE_SPACE", id: spaceId || null });
    dispatch({ type: "SET_ACTIVE_PAGE", id: null });
    if (space) {
      setContext({ workspace: "Spaces", spaceId: space.id, selection: space.name });
    }
  }, [spaceId, space, dispatch, setContext]);

  if (!space) {
    return <div className="p-10">Space not found</div>;
  }

  const [generating, setGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captures, setCaptures] = useState<any[]>([]);
  const [previewCapture, setPreviewCapture] = useState<any | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({ name: space?.name || "", description: space?.description || "", icon: space?.icon || "🚀" });

  // Load captures from Python backend on mount
  useEffect(() => {
    fetch(`${CAPTURE_API_URL}/captures`, { headers: { "Authorization": "Bearer demo-user" } })
      .then(r => r.json())
      .then(data => setCaptures(Array.isArray(data) ? data : []))
      .catch(() => setCaptures([]));
  }, [spaceId]);

  const handleSaveSpace = () => {
    dispatch({ type: "UPDATE_SPACE", id: space.id, patch: editForm });
    setIsEditing(false);
  };

  const handleAddSource = () => {
    uploadRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      const res = await fetch(`${CAPTURE_API_URL}/captures/upload`, {
        method: "POST",
        headers: { "Authorization": "Bearer demo-user" },
        body: formData
      });
      if (res.ok) {
        const newCap = await res.json();
        setCaptures(prev => [newCap, ...prev]);
        alert(`✅ "${file.name}" uploaded! The AI is now processing it.`);
      } else {
        alert("Upload failed. Make sure the Python backend is running.");
      }
    } catch (err) {
      alert("Upload failed. Make sure the Python backend is running on port 8080.");
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const handleCreatePage = () => {
    const newPage: Page = {
      id: `page-${Date.now()}`,
      spaceId: space.id,
      title: "Untitled Page",
      icon: "📄",
      favorite: false,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dispatch({ type: "CREATE_PAGE", page: newPage });
    setLocation(`/spaces/${space.id}/pages/${newPage.id}`);
  };

  const handleGenerateCourse = async () => {
    if (!space) return;
    setGenerating(true);
    
    // Gather content: from page blocks AND from uploaded captures
    const pageContent = spacePages.map(p => {
      const pBlocks = (state.blocks || []).filter(b => b.pageId === p.id);
      return pBlocks.map(b => b.content?.text || "").join("\n");
    }).join("\n\n");
    
    const captureContent = captures.map(c => 
      `[${c.title}]\n${c.normalized_content || c.original_content || ""}`
    ).join("\n\n");
    
    const combinedContent = [pageContent, captureContent].filter(Boolean).join("\n\n");
    
    if (!combinedContent.trim()) {
      alert("No content found. Upload some PDFs or add text to pages first!");
      setGenerating(false);
      return;
    }

    try {
      const stored = localStorage.getItem("learningProfile");
      const profile = stored ? JSON.parse(stored) : {};
      
          const payload = {
              content: combinedContent.slice(0, 100000), // use large context window (Groq supports 128k)
          goal: profile.goal || "master",
          time_budget: profile.timeBudget || "30min",
          level: profile.level || "intermediate"
      };

      const courseRes = await fetch(`${CAPTURE_API_URL}/api/course/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer demo-user" },
        body: JSON.stringify(payload)
      });
      if (!courseRes.ok) throw new Error("Failed to generate course");
      const courseData = await courseRes.json();

      if (courseData.course && courseData.course.id) {
        // Also add to darwinity store so it shows up in UI
        dispatch({ type: "CREATE_COURSE", course: { id: courseData.course.id, spaceId: space.id, title: space.name + " Course", description: courseData.course.description || "", modules: courseData.course.modules || [], lessons: courseData.course.lessons || [], sourceIds: [], learningGoal: courseData.course.learningGoal || "", estimatedMinutes: 0, readiness: 0, currentLessonId: courseData.course.currentLessonId || "", totalLessons: courseData.course.totalLessons || 0, completedLessons: 0, nextAction: "Start", updatedAt: new Date().toISOString(), progress: 0, status: "active", icon: "🚀", accent: "sky" } });
        setLocation(`/courses/${courseData.course.id}`);
      }
    } catch (err) {
      console.error("Course generation failed", err);
      alert("Failed to generate course. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto py-10 px-6">
      <div className="text-sm text-gray-500 font-bold mb-4 flex items-center gap-2 uppercase tracking-widest">
        Spaces <span className="text-gray-300">/</span> {space.name}
      </div>
      
      <div className="mb-10 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100"
            style={{ backgroundColor: space.color }}
          >
            {space.icon}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{space.name}</h1>
            <p className="text-gray-500 mt-1">{space.description || "No description provided."}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-200 shadow-sm rounded-xl px-4 font-bold" onClick={() => setIsEditing(true)}>Edit Space</Button>
          <Button 
            className="bg-primary hover:opacity-90 text-primary-foreground font-bold rounded-xl px-4 py-2 shadow-sm flex items-center gap-2"
            onClick={handleGenerateCourse}
            disabled={generating}
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
            {generating ? "Building..." : "Generate Course"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <FileText size={18} className="text-gray-400" /> Pages & Canvases
            </h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCreatePage} className="text-[#123d2d] font-bold">
                <Plus size={16} className="mr-1" /> New Page
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/canvas')} className="text-purple-700 font-bold hover:text-purple-800 hover:bg-purple-50">
                <Plus size={16} className="mr-1" /> New Canvas Space
              </Button>
            </div>
          </div>
          
          {spacePages.length === 0 ? (
            <div className="p-10 border border-dashed border-gray-300 rounded-2xl bg-gray-50 flex flex-col items-center justify-center text-center">
              <FolderPlus size={32} className="text-gray-400 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1">No pages yet</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-[250px]">Create your first page to start organizing your knowledge.</p>
              <Button onClick={handleCreatePage} className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50">Create Page</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {spacePages.filter(p => !p.parentId).map(page => (
                <div 
                  key={page.id}
                  onClick={() => setLocation(`/spaces/${space.id}/pages/${page.id}`)}
                  className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{page.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 group-hover:text-[#123d2d] transition-colors">{page.title}</h3>
                      <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        {spacePages.filter(p => p.parentId === page.id).length} subpages
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={16} className="text-gray-400" /> Sources
            </h3>
            
            {/* Hidden file input */}
            <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.txt,.doc,.docx,.png,.jpg,.mp3,.m4a" onChange={handleFileSelected} />
            
            {captures.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No sources linked.</p>
            ) : (
              <div className="space-y-2">
                {captures.slice(0, 5).map((cap: any) => (
                  <div key={cap.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 cursor-pointer transition-colors group" onClick={() => setPreviewCapture(cap)}>
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700 truncate block">{cap.title}</span>
                      <span className="text-xs text-gray-400">{cap.capture_type?.toUpperCase() || "DOC"} · {cap.processing_status === "ready" ? "✅ Ready" : "⏳ Processing"}</span>
                    </div>
                    <Eye size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4 text-xs font-bold border-dashed" onClick={handleAddSource} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
              {uploading ? "Uploading..." : "Add Source"}
            </Button>
          </div>

          <div className="p-6 rounded-2xl bg-green-50 border border-green-100 shadow-sm">
            <h3 className="text-sm font-extrabold text-green-900 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Brain size={16} className="text-green-700" /> Active Courses
            </h3>
            {space.courseIds.length === 0 ? (
              <p className="text-sm text-green-800">Turn this space into a structured course.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-green-200 shadow-sm cursor-pointer hover:border-green-400 transition-colors">
                  <span className="text-xl">🦠</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-gray-900 truncate">Cellular Biology</h4>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-green-600 w-[45%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Edit Space</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Icon (Emoji)</label>
                <input type="text" className="w-full border rounded-lg p-2" value={editForm.icon} onChange={e => setEditForm({...editForm, icon: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Name</label>
                <input type="text" className="w-full border rounded-lg p-2" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Description</label>
                <textarea className="w-full border rounded-lg p-2" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSaveSpace} className="bg-primary text-primary-foreground">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewCapture && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 lg:p-10" onClick={() => setPreviewCapture(null)}>
          <div className="bg-white w-full h-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200">
                  <FileText size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{previewCapture.title}</h3>
                  <p className="text-xs text-gray-500 font-medium">Uploaded on {new Date(previewCapture.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); setLocation(`/artifacts?captureId=${previewCapture.id}`); }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#123d2d] text-white rounded-xl text-xs font-bold hover:bg-[#0d2a1f] transition-colors"
                >
                  <Sparkles size={14} /> Generate Artifacts
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    localStorage.setItem("courseTargetId", previewCapture.id);
                    setLocation(`/course-builder?captureId=${previewCapture.id}`); 
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  <Brain size={14} /> Create Course
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} /> AI Processed
                </div>
                <button onClick={() => setPreviewCapture(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors bg-gray-100 text-gray-600">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              {(previewCapture.capture_type === 'screenshot' || previewCapture.capture_type === 'image') && previewCapture.file_url && (
                <div className="flex justify-center mb-8">
                  <img src={`http://localhost:8080${previewCapture.file_url}`} alt={previewCapture.title} className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-md border border-gray-200" />
                </div>
              )}
              <div className="prose prose-sm max-w-none text-gray-700">
                {(previewCapture.normalized_content || previewCapture.original_content || "No content available.").split('\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className="mb-4 text-base leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
