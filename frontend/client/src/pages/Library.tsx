import { Search, FileText, CheckCircle2, Clock, AlertCircle, Sparkles, Brain, Eye, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCompanion } from "@/contexts/CompanionContext";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type SourceStatus = "ready" | "extracting" | "synthesizing" | "failed";

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

export default function Library() {
  const { setContext } = useCompanion();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  const bootstrap = trpc.workspace.bootstrap.useQuery();
  const { data: sourcesData } = trpc.workspace.sources.useQuery(
    { workspaceId: bootstrap.data?.id as number },
    { enabled: !!bootstrap.data?.id }
  );

  useEffect(() => {
    setContext({ workspace: "Library" });
  }, [setContext]);

  // Semantic search via backend
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${CAPTURE_API_URL}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, top_k: 5 })
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults([{ type: "ai", answer: data.answer, sources: data.sources || [] }]);
        }
      } catch {
        // Fallback to client-side filter
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready": return <CheckCircle2 size={16} className="text-green-600" />;
      case "extracting": 
      case "synthesizing": return <Clock size={16} className="text-amber-600" />;
      case "failed": return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ready": return "Ready for review";
      case "extracting": return "Extracting content...";
      case "synthesizing": return "Synthesizing course...";
      case "failed": return "Processing failed";
      default: return status;
    }
  };

  const filteredSources = (sourcesData || []).filter((s: any) => {
    if (activeFilter !== "All" && s.sourceType?.toLowerCase() !== activeFilter.toLowerCase()) return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-[1000px] mx-auto py-10 px-6">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">Library</h1>
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              {isSearching ? <Loader2 className="h-5 w-5 text-[#123d2d] animate-spin" /> : <Search className="h-5 w-5 text-gray-400" />}
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 focus:ring-[#123d2d] focus:border-[#123d2d] shadow-sm text-lg" 
              placeholder="Search what you remember..."
            />
          </div>
        </div>
        

      </div>

      {/* AI Search Results */}
      {searchResults.length > 0 && searchResults[0].type === "ai" && (
        <div className="mb-8 p-6 bg-gradient-to-br from-[#f1f5f2] to-white border border-[#e1e8e2] rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[#123d2d]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#123d2d]">AI Answer</span>
          </div>
          <p className="text-gray-800 leading-relaxed text-sm">{searchResults[0].answer}</p>
          {searchResults[0].sources?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#e1e8e2]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sources used</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {searchResults[0].sources.map((src: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-white rounded-lg text-xs font-medium text-gray-600 border border-gray-200">{src.title || `Source ${i + 1}`}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
        {["All", "PDF", "Document", "URL", "Audio"].map(filter => (
          <button 
            key={filter} 
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${filter === activeFilter ? 'bg-[#123d2d] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source: any) => (
          <div key={source.id}>
            <div 
              className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer" 
              onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                  <FileText className="text-gray-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 line-clamp-1">{source.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-gray-500 font-medium uppercase tracking-wider">{source.sourceType}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-gray-500">{new Date(source.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusIcon("ready")}
                <span className={`text-[10px] font-extrabold uppercase tracking-wide text-green-700`}>
                  {getStatusText("ready")}
                </span>
              </div>
            </div>
            
            {/* Expanded Detail View */}
            {expandedSource === source.id && (
              <div className="mt-2 p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                {source.excerpt && (
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Excerpt</span>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{source.excerpt}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLocation("/artifacts"); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#123d2d] text-white rounded-xl text-xs font-bold hover:bg-[#0d2a1f] transition-colors"
                  >
                    <Sparkles size={14} /> Generate Artifacts
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLocation("/course-builder"); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    <Brain size={14} /> Create Course
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={14} /> View Full
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
