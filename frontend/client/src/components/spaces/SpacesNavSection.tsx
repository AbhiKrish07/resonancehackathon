import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Folder, FileText, MoreHorizontal } from "lucide-react";
import { useDarwinity } from "@/contexts/DarwinityStoreContext";
import { useLocation } from "wouter";

export function SpacesNavSection() {
  const { state, dispatch } = useDarwinity();
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(true);
  const [expandedSpaces, setExpandedSpaces] = useState<Record<string, boolean>>({});

  const activeSpaces = state.spaces.filter(s => !s.archived);

  const toggleSpace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSpaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const createSpace = () => {
    const id = `space-${Date.now()}`;
    dispatch({
      type: "CREATE_SPACE",
      space: {
        id,
        name: "New Space",
        icon: "📁",
        color: "#f3f4f6",
        description: "",
        pageIds: [],
        sourceIds: [],
        courseIds: [],
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
    setLocation(`/spaces/${id}`);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-3 mb-2 group">
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Spaces
        </button>
        <button 
          onClick={createSpace}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded text-gray-500"
          title="New Space"
        >
          <Plus size={14} />
        </button>
      </div>

      {expanded && (
        <div className="space-y-1">
          {activeSpaces.length === 0 ? (
            <div className="px-5 py-2 text-sm text-gray-400 italic">No spaces yet.</div>
          ) : (
            activeSpaces.map(space => {
              const isExpanded = expandedSpaces[space.id];
              const isActiveSpace = state.activeSpaceId === space.id;
              const spacePages = state.pages.filter(p => p.spaceId === space.id && !p.parentId && !p.archived);

              return (
                <div key={space.id}>
                  <div 
                    onClick={() => setLocation(`/spaces/${space.id}`)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActiveSpace ? "bg-[#f1f5f2] text-[#123d2d] font-bold" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <button 
                        onClick={(e) => toggleSpace(space.id, e)}
                        className={`p-0.5 rounded hover:bg-gray-200 ${isExpanded ? 'text-gray-500' : 'text-gray-400'}`}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <span className="shrink-0">{space.icon}</span>
                      <span className="truncate text-sm">{space.name}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1 border-l border-gray-200 pl-2">
                      {spacePages.length === 0 ? (
                        <div className="px-2 py-1 text-xs text-gray-400 italic">No pages</div>
                      ) : (
                        spacePages.map(page => (
                          <div 
                            key={page.id}
                            onClick={() => setLocation(`/spaces/${space.id}/pages/${page.id}`)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm ${
                              state.activePageId === page.id ? "bg-[#f1f5f2] text-[#123d2d] font-bold" : "text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <span className="text-gray-400 shrink-0"><FileText size={14} /></span>
                            <span className="truncate">{page.title}</span>
                          </div>
                        ))
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
  );
}
