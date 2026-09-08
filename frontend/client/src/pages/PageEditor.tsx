import { useDarwinity } from "@/contexts/DarwinityStoreContext";
import { useCompanion } from "@/contexts/CompanionContext";
import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { Plus, Check, Trash2, ArrowUp, ArrowDown, Sparkles, Loader2 } from "lucide-react";
import { BlockNode } from "@/types/darwinity";

export default function PageEditor() {
  const { spaceId, pageId } = useParams();
  const [, setLocation] = useLocation();
  const { state, dispatch } = useDarwinity();
  const { setContext } = useCompanion();
  
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved">("Saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const space = state.spaces.find(s => s.id === spaceId);
  const page = state.pages.find(p => p.id === pageId);
  const blocks = (state.blocks || []).filter(b => b.pageId === pageId).sort((a, b) => a.order - b.order);

  useEffect(() => {
    dispatch({ type: "SET_ACTIVE_SPACE", id: spaceId || null });
    dispatch({ type: "SET_ACTIVE_PAGE", id: pageId || null });
    if (space && page) {
      setContext({ workspace: "Spaces", spaceId: space.id, pageId: page.id, selection: `${space.name} / ${page.title}` });
    }
  }, [spaceId, pageId, space, page, dispatch, setContext]);

  // If no blocks exist, initialize with a paragraph
  useEffect(() => {
    if (page && blocks.length === 0) {
      dispatch({ type: "CREATE_BLOCK", block: { id: `b-${Date.now()}`, pageId: page.id, parentId: null, type: "paragraph", content: { text: "" }, order: 0 } });
    }
  }, [page, blocks.length, dispatch]);

  if (!space || !page) return <div className="p-10">Page not found</div>;

  const triggerSave = () => {
    setSaveStatus("Saving...");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => setSaveStatus("Saved"), 600);
  };

  const updateTitle = (newTitle: string) => {
    dispatch({ type: "UPDATE_PAGE", id: page.id, patch: { title: newTitle } });
    triggerSave();
  };

  const updateIcon = (newIcon: string) => {
    dispatch({ type: "UPDATE_PAGE", id: page.id, patch: { icon: newIcon } });
    triggerSave();
  };

  const updateBlock = (blockId: string, content: any) => {
    dispatch({ type: "UPDATE_BLOCK", id: blockId, patch: { content } });
    triggerSave();
  };

  const toggleTodo = (blockId: string, checked: boolean) => {
    const b = blocks.find(x => x.id === blockId);
    if (b) {
      dispatch({ type: "UPDATE_BLOCK", id: blockId, patch: { content: { ...b.content, checked } } });
      triggerSave();
    }
  };

  const addBlock = (index: number, type: BlockNode["type"] = "paragraph") => {
    const newBlock: BlockNode = {
      id: `b-${Date.now()}`,
      pageId: page.id,
      parentId: null,
      type,
      content: type === "todo" ? { text: "", checked: false } : type === "heading" ? { level: 2, text: "" } : type === "callout" ? { tone: "sage", text: "" } : type === "canvas" ? { canvasId: `canvas-${Date.now()}` } : { text: "" },
      order: index + 1.5, // Simple ordering
    };
    dispatch({ type: "CREATE_BLOCK", block: newBlock });
    // Reorder all
    const all = [...blocks, newBlock].sort((a,b) => a.order - b.order);
    all.forEach((b, i) => dispatch({ type: "UPDATE_BLOCK", id: b.id, patch: { order: i } }));
    triggerSave();
  };

  const deleteBlock = (blockId: string) => {
    dispatch({ type: "DELETE_BLOCK", id: blockId });
    triggerSave();
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;
    
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const b1 = blocks[index];
    const b2 = blocks[targetIndex];
    dispatch({ type: "UPDATE_BLOCK", id: b1.id, patch: { order: b2.order } });
    dispatch({ type: "UPDATE_BLOCK", id: b2.id, patch: { order: b1.order } });
    triggerSave();
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-black text-[#123d2d] dark:text-orange-50 p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4 group">
          <input 
            type="text" 
            className="text-6xl bg-transparent w-16 outline-none hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-center cursor-pointer transition-colors" 
            value={page.icon} 
            onChange={e => updateIcon(e.target.value)} 
          />
          <input 
            type="text" 
            className="text-5xl font-extrabold bg-transparent flex-1 outline-none placeholder-[#123d2d]/20 dark:placeholder-orange-500/30" 
            value={page.title} 
            onChange={e => updateTitle(e.target.value)} 
            placeholder="Untitled Page"
          />
        </div>

        <div className="space-y-2 mt-8">
          {blocks.map((block, index) => (
            <div key={block.id} className="group relative flex gap-2 items-start">
              <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity text-gray-400">
                <button onClick={() => addBlock(index)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"><Plus size={16} /></button>
                <div className="flex flex-col">
                  <button onClick={() => moveBlock(index, "up")} className="hover:text-emerald-600"><ArrowUp size={12} /></button>
                  <button onClick={() => moveBlock(index, "down")} className="hover:text-emerald-600"><ArrowDown size={12} /></button>
                </div>
                <button onClick={() => deleteBlock(block.id)} className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
              </div>
              
              <div className="flex-1 w-full min-h-[1.5rem]">
                {block.type === "paragraph" && (
                  <input
                    type="text"
                    value={block.content.text || ""}
                    onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                    placeholder="Press / for commands, or start typing..."
                    className="w-full bg-transparent outline-none text-lg text-[#123d2d] dark:text-orange-100 placeholder-[#123d2d]/40 dark:placeholder-orange-600/50 focus:placeholder-transparent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addBlock(index, "paragraph"); }
                      if (e.key === "Backspace" && !block.content.text) { e.preventDefault(); deleteBlock(block.id); }
                    }}
                  />
                )}
                {block.type === "heading" && (
                  <input
                    type="text"
                    value={block.content.text || ""}
                    onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                    placeholder="Heading"
                    className="w-full bg-transparent outline-none text-2xl font-bold text-gray-900 dark:text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addBlock(index, "paragraph"); }
                      if (e.key === "Backspace" && !block.content.text) { e.preventDefault(); updateBlock(block.id, { ...block.content, type: "paragraph" }); }
                    }}
                  />
                )}
                {block.type === "todo" && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleTodo(block.id, !block.content.checked)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${block.content.checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-gray-600 hover:border-emerald-400"}`}>
                      {block.content.checked && <Check size={14} />}
                    </button>
                    <input
                      type="text"
                      value={block.content.text || ""}
                      onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                      placeholder="To-do"
                      className={`flex-1 bg-transparent outline-none text-lg transition-colors ${block.content.checked ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addBlock(index, "todo"); }
                        if (e.key === "Backspace" && !block.content.text) { e.preventDefault(); deleteBlock(block.id); }
                      }}
                    />
                  </div>
                )}
                {block.type === "callout" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-xl flex items-start gap-3">
                    <Sparkles size={20} className="mt-1 flex-shrink-0" />
                    <textarea
                      value={block.content.text || ""}
                      onChange={(e) => updateBlock(block.id, { ...block.content, text: e.target.value })}
                      placeholder="Callout text..."
                      className="w-full bg-transparent outline-none resize-none"
                      rows={Math.max(1, (block.content.text || "").split("\n").length)}
                    />
                  </div>
                )}
                {block.type === "divider" && <div className="py-4"><hr className="border-gray-200 dark:border-gray-700" /></div>}
              </div>
            </div>
          ))}
          {blocks.length === 0 && (
            <div className="text-gray-400 py-10 cursor-pointer" onClick={() => addBlock(-1, "paragraph")}>
              Click to start writing...
            </div>
          )}
        </div>
      </div>
      
      {/* Save Status */}
      <div className="fixed bottom-4 right-4 bg-white/80 dark:bg-black/50 backdrop-blur border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-full text-xs text-gray-500 flex items-center gap-2 shadow-sm z-50">
        {saveStatus === "Saving..." ? <Loader2 size={12} className="animate-spin text-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-emerald-500" />}
        {saveStatus}
      </div>
    </div>
  );
}
