import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronRight, Command, FileText, FolderOpen, Grip, Link2, Maximize2, MessageCircle, Minus, MoreHorizontal, Move, Plus, Search, Sparkles, StickyNote, Upload, WandSparkles, X, ZoomIn, ZoomOut, Grid2X2, Headphones, GraduationCap, Award, ChevronLeft, UserRound, Clock3 } from "lucide-react";

type Accent = "mint" | "lilac" | "peach" | "sky" | "sand";
type CardType = "note" | "quote" | "question" | "insight" | "summary" | "media";
type CanvasCard = { id: number; title: string; body: string; cardType: CardType; accent: Accent; x: number; y: number; width: number; height: number; sourceId?: number; mediaUrl?: string; mediaType?: string };
type CanvasLink = { id: number; fromCardId: number; toCardId: number; label?: string | null };
type Source = { id: number; title: string; type: string; meta: string; excerpt: string; color: string };

const starterCards: CanvasCard[] = [
  { id: 1, title: "Learning is a change in mental models", body: "A working thesis captured from the reading. Keep the wording close to the source, then add your own interpretation below.", cardType: "quote", accent: "mint", x: 70, y: 220, width: 280, height: 188, sourceId: 1 },
  { id: 2, title: "Models become useful when they connect", body: "The value of an idea often comes from the bridges it creates between different observations.", cardType: "insight", accent: "lilac", x: 430, y: 350, width: 282, height: 188, sourceId: 1 },
  { id: 3, title: "What changes when the source is local?", body: "Question for the next pass through the research. Add evidence, counterexamples, and a synthesis card.", cardType: "question", accent: "peach", x: 830, y: 205, width: 280, height: 180, sourceId: 2 },
  { id: 4, title: "The computer as a thinking partner", body: "A pattern across three excerpts: tools become formative when they let people externalize, revisit, and rearrange ideas.", cardType: "note", accent: "sky", x: 1180, y: 430, width: 286, height: 192, sourceId: 3 },
  { id: 5, title: "A small synthesis", body: "Better learning may be less about collecting more information and more about seeing relationships clearly.", cardType: "summary", accent: "sand", x: 1200, y: 110, width: 270, height: 172, sourceId: 1 },
];

const starterSources: Source[] = [
  { id: 1, title: "Point of View Is Worth 80 IQ Points", type: "Book excerpt", meta: "Alan Kay · 8 highlights", excerpt: "Learning happens through the improvement of our mental models and computers are the best way to mediate this kind of learning.", color: "#d9f4e8" },
  { id: 2, title: "The Design of Everyday Things", type: "PDF document", meta: "Don Norman · 12 highlights", excerpt: "Good design makes the actions we can take visible and the results of our actions intelligible.", color: "#f8dfd5" },
  { id: 3, title: "Open Notebook research thread", type: "SurfSense import", meta: "14 sources · synced today", excerpt: "A connected collection of research notes, citations, and questions gathered across the web.", color: "#e5def8" },
];

const groups = [
  { title: "Why models matter", x: 35, y: 155, w: 755, h: 465, color: "#d7f1e7" },
  { title: "Learning through making", x: 790, y: 80, w: 740, h: 555, color: "#e5def8" },
  { title: "Questions to carry forward", x: 1010, y: 665, w: 495, h: 300, color: "#f8e1d9" },
];

function CanvasCardView({ card, selected, onSelect, onMove }: { card: CanvasCard; selected: boolean; onSelect: () => void; onMove: (id: number, x: number, y: number) => void }) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect();
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const stage = event.currentTarget.closest("[data-canvas-stage]") as HTMLElement | null;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    const zoom = Number(stage.dataset.zoom || 1);
    const x = (event.clientX - bounds.left) / zoom - drag.current.dx / zoom;
    const y = (event.clientY - bounds.top) / zoom - drag.current.dy / zoom;
    onMove(card.id, Math.max(0, x), Math.max(0, y));
  };
  const onPointerUp = () => { drag.current = null; };
  return <div className={`canvas-card card-${card.accent} ${selected ? "is-selected" : ""}`} style={{ left: card.x, top: card.y, width: card.width, minHeight: card.height }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
    <div className="card-grip"><Grip size={14} /><span>{card.cardType}</span><MoreHorizontal size={16} /></div>
    <h3>{card.title}</h3>
    {card.mediaUrl && card.mediaType?.startsWith("image/") && <img src={card.mediaUrl} alt={card.title} style={{width: '100%', borderRadius: '4px', marginTop: '8px'}} />}
    {card.mediaUrl && card.mediaType?.startsWith("video/") && <video src={card.mediaUrl} controls style={{width: '100%', borderRadius: '4px', marginTop: '8px'}} />}
    <p>{card.body}</p>
    {card.sourceId && <div className="card-source"><BookOpen size={13} /> Source passage linked</div>}
  </div>;
}

export default function Workspace() {
  const { user, isAuthenticated, loading } = useAuth();
  const [cards, setCards] = useState<CanvasCard[]>(starterCards);
  const [links, setLinks] = useState<CanvasLink[]>([{ id: 1, fromCardId: 1, toCardId: 2 }, { id: 2, fromCardId: 2, toCardId: 3 }, { id: 3, fromCardId: 3, toCardId: 4 }, { id: 4, fromCardId: 5, toCardId: 2 }]);
  const [selectedId, setSelectedId] = useState(1);
  const [zoom, setZoom] = useState(0.78);
  const [pan, setPan] = useState({ x: 90, y: 15 });
  const [activePanel, setActivePanel] = useState<"inspector" | "sources" | "ai">("inspector");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([{ role: 'assistant', content: 'Hello! I am your Canvas AI. How can I help you explore your ideas today?' }]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  const askAi = () => { if (!input.trim()) return; setMessages(p => [...p, { role: 'user', content: input }]); setTimeout(() => { setMessages(p => [...p, { role: 'assistant', content: 'This is a simulated response based on your canvas context. I can help synthesize these notes for you!' }]); }, 1000); setInput(""); };
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [authSettled, setAuthSettled] = useState(false);
  const [canvasId, setCanvasId] = useState<number | null>(null);
  const bootstrap = trpc.workspace.bootstrap.useQuery(undefined, { enabled: isAuthenticated });
  const canvasQuery = trpc.workspace.canvas.useQuery({ workspaceId: workspaceId ?? 0, canvasId: canvasId ?? undefined }, { enabled: Boolean(workspaceId) });
  const sourcesQuery = trpc.workspace.sources.useQuery({ workspaceId: workspaceId ?? 0 }, { enabled: Boolean(workspaceId) });
  const activeSources = sourcesQuery.data?.length ? sourcesQuery.data : starterSources;
  const updateCard = trpc.workspace.updateCard.useMutation();
  const deleteCard = trpc.workspace.deleteCard.useMutation();
  const createCard = trpc.workspace.createCard.useMutation();
  const createNote = trpc.workspace.createNote.useMutation();
  const createSource = trpc.workspace.createSource.useMutation();
  const aiMutation = trpc.workspace.ai.useMutation();
  const createSyncRun = trpc.workspace.createSyncRun.useMutation();
  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*,audio/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !workspaceId) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        toast(`Uploading ${file.name}...`);
        createSource.mutate({ workspaceId, title: file.name, fileName: file.name, mimeType: file.type, fileBase64: base64, sourceType: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'document' }, {
          onSuccess: () => { toast("Source added and sent to backend processing!"); sourcesQuery.refetch(); }
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  
  const handleAddMediaCard = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const next: CanvasCard = { id: Date.now(), title: file.name, body: "", cardType: "media", accent: "mint", x: 420 - pan.x / zoom, y: 260 - pan.y / zoom, width: 320, height: 240, mediaUrl: dataUrl, mediaType: file.type };
        setCards((current: CanvasCard[]) => [...current, next]);
        setSelectedId(next.id);
        if (canvasId) createCard.mutate({ canvasId, title: next.title, body: next.body, cardType: next.cardType, accent: next.accent, x: next.x, y: next.y });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const moveCard = trpc.workspace.moveCard.useMutation();
  const updateViewport = trpc.workspace.updateViewport.useMutation();
  const searchQuery = trpc.workspace.search.useQuery({ workspaceId: workspaceId ?? 0, query: search }, { enabled: Boolean(workspaceId && search.length > 1) });

  useEffect(() => {
    const timer = window.setTimeout(() => setAuthSettled(true), 900);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (bootstrap.data?.id) { setWorkspaceId(bootstrap.data.id); }
  }, [bootstrap.data]);
  useEffect(() => {
    if (canvasQuery.data?.canvas) {
      setCanvasId(canvasQuery.data.canvas.id);
      if (canvasQuery.data.cards.length) setCards(canvasQuery.data.cards as CanvasCard[]);
      if (canvasQuery.data.links.length) setLinks(canvasQuery.data.links as CanvasLink[]);
      setZoom(canvasQuery.data.canvas.zoom);
      setPan({ x: canvasQuery.data.canvas.viewportX, y: canvasQuery.data.canvas.viewportY });
    }
  }, [canvasQuery.data]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") { event.preventDefault(); setSearchOpen(true); }
      if (event.key === "Escape") { setCommandOpen(false); setSearchOpen(false); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selected = cards.find((card: CanvasCard) => card.id === selectedId) ?? cards[0];
  const syncRuns = trpc.workspace.syncRuns.useQuery({ workspaceId: workspaceId ?? 0 }, { enabled: Boolean(workspaceId) });
  const selectedSource = activeSources.find((source: any) => source.id === selected?.sourceId) ?? activeSources[0];
  const filteredCards = useMemo(() => search.length > 1 ? cards.filter((card: CanvasCard) => `${card.title} ${card.body}`.toLowerCase().includes(search.toLowerCase())) : cards, [cards, search]);
  const handleMove = (id: number, x: number, y: number) => {
    setCards((current: CanvasCard[]) => current.map((card: CanvasCard) => card.id === id ? { ...card, x, y } : card));
    if (canvasId) moveCard.mutate({ cardId: id, x, y });
  };
  const handleStagePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".canvas-card")) return;
    setIsPanning(true); panStart.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleStagePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return; setPan({ x: panStart.current.px + event.clientX - panStart.current.x, y: panStart.current.py + event.clientY - panStart.current.y });
  };
  const finishPan = () => { setIsPanning(false); if (canvasId) updateViewport.mutate({ canvasId, x: pan.x, y: pan.y, zoom }); };
  const addCard = () => {
    const next: CanvasCard = { id: Date.now(), title: "New idea", body: "Write a thought, question, or evidence here…", cardType: "note", accent: "mint", x: 420 - pan.x / zoom, y: 260 - pan.y / zoom, width: 270, height: 170 };
    setCards((current: CanvasCard[]) => [...current, next]); setSelectedId(next.id); setCommandOpen(false);
    if (canvasId) createCard.mutate({ canvasId, title: next.title, body: next.body, cardType: next.cardType, accent: next.accent, x: next.x, y: next.y });
  };
  const changeZoom = (delta: number) => { const next = Math.max(0.45, Math.min(1.35, zoom + delta)); setZoom(next); if (canvasId) updateViewport.mutate({ canvasId, x: pan.x, y: pan.y, zoom: next }); };

  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading && !authSettled) return <div className="app-loading"><div className="loading-mark">K</div><p>Opening your garden…</p></div>;
  if (!isAuthenticated) return <div className="welcome-screen"><div className="welcome-orbit"><div className="orbit-dot dot-one" /><div className="orbit-dot dot-two" /><div className="welcome-core">K</div></div><p className="eyebrow">A quieter way to think</p><h1>Make the shape of your thinking visible.</h1><p className="welcome-copy">A calm, visual workspace for collecting sources, connecting ideas, and returning to the questions that matter.</p><Button onClick={() => startLogin()} className="welcome-button">Enter your garden <ArrowRight size={16} /></Button></div>;

  return <div className="knowledge-app w-screen h-screen flex flex-col overflow-hidden m-0 p-0 absolute inset-0">
    <div className="workspace flex-1 flex h-full w-full relative">
        <div className="page-content h-full w-full">
      <main className="canvas-shell h-full w-full">
        <div className="canvas-toolbar absolute top-4 left-4 right-4 z-50 flex justify-between bg-white/90 backdrop-blur-md rounded-xl shadow-sm p-2 border border-gray-100"><div className="toolbar-left flex gap-1"><button className="tool-button selected"><Move size={15} /></button><button className="tool-button" onClick={addCard}><StickyNote size={15} /></button><button className="tool-button" onClick={handleAddMediaCard}><Upload size={15} /></button><button className="tool-button"><ArrowDownRight size={15} /></button><span className="toolbar-divider" /><button className="tool-button" onClick={() => setCommandOpen(true)}><Plus size={15} /></button></div><div className="toolbar-center flex items-center"><span className="board-state"><span className="state-dot" /> Live canvas</span></div><div className="toolbar-right flex gap-1 items-center"><button className="tool-button" onClick={() => setZoom(0.78)}><Maximize2 size={15} /></button><button className="tool-button" onClick={() => changeZoom(-0.1)}><ZoomOut size={15} /></button><span className="zoom-value px-2 font-bold text-xs">{Math.round(zoom * 100)}%</span><button className="tool-button" onClick={() => changeZoom(0.1)}><ZoomIn size={15} /></button></div></div>
        <div className={`canvas-viewport ${isPanning ? "is-panning" : ""}`} data-canvas-stage data-zoom={zoom} onPointerDown={handleStagePointerDown} onPointerMove={handleStagePointerMove} onPointerUp={finishPan} onPointerLeave={finishPan}>
          <div className="canvas-grid" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
            {groups.map(group => <div key={group.title} className="card-group" style={{ left: group.x, top: group.y, width: group.w, height: group.h, background: group.color }}><div className="group-title">{group.title}<MoreHorizontal size={16} /></div></div>)}
            <svg className="link-layer" width="1700" height="1100" aria-hidden="true"><defs><marker id="canvas-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9eb6a6" /></marker></defs>{links.map((link: CanvasLink) => { const from = cards.find((card: CanvasCard) => card.id === link.fromCardId); const to = cards.find((card: CanvasCard) => card.id === link.toCardId); if (!from || !to) return null; const x1 = from.x + from.width; const y1 = from.y + from.height / 2; const x2 = to.x; const y2 = to.y + to.height / 2; const bend = Math.max(50, Math.abs(x2 - x1) / 2); return <path key={link.id} d={`M${x1} ${y1} C${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} markerEnd="url(#canvas-arrow)" />; })}</svg>
            {filteredCards.map((card: CanvasCard) => <CanvasCardView key={card.id} card={card} selected={card.id === selectedId} onSelect={() => { setSelectedId(card.id); setActivePanel("inspector"); }} onMove={handleMove} />)}
          </div>
        </div>
        <div className="canvas-status"><span><span className="state-dot" /> Autosaved</span><span>Drag to pan · Scroll to zoom · Double click to add</span></div>
      </main>
      <aside className="inspector flex flex-col h-full">
        <div className="inspector-tabs"><button className={activePanel === "inspector" ? "active" : ""} onClick={() => setActivePanel("inspector")}>Inspector</button><button className={activePanel === "sources" ? "active" : ""} onClick={() => setActivePanel("sources")}>Sources <span>{activeSources.length}</span></button><button className={activePanel === "ai" ? "active" : ""} onClick={() => setActivePanel("ai")}>AI</button></div>
        {activePanel === "sources" ? <div className="source-panel"><div className="panel-heading"><div><p className="eyebrow">Library</p><h2>Research sources</h2></div><button className="round-button" onClick={handleUploadClick}><Upload size={15} /></button></div><div className="source-search"><Search size={15} /><input placeholder="Filter sources" /></div>{activeSources.map((source: any) => <button className="source-item" key={source.id} onClick={() => { const linked = cards.find((card: CanvasCard) => card.sourceId === source.id); if (linked) setSelectedId(linked.id); setActivePanel("inspector"); }}><div className="source-icon" style={{ background: source.color ?? "#e5def8" }}><FileText size={16} /></div><div><strong>{source.title}</strong><span>{source.sourceType || source.type} {source.meta ? `· ${source.meta}` : ''}</span></div><ArrowRight size={15} /></button>)}<button className="add-source" onClick={handleUploadClick}><Plus size={15} /> Add a source</button></div> 
        : activePanel === "ai" ? 
        <div className="ai-panel flex-1 flex flex-col p-4 bg-white/50 backdrop-blur-md">
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-[90%] text-sm ${msg.role === "user" ? "bg-gray-900 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askAi()} placeholder="Ask about your canvas..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
            <button onClick={askAi} disabled={!input.trim()} className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-black transition-colors disabled:opacity-50"><ChevronRight size={18} /></button>
          </div>
        </div>
        : <div className="inspector-content">{selected && <><div className={`inspector-banner banner-${selected.accent}`}><span>{selected.cardType}</span><button><MoreHorizontal size={17} /></button></div><div className="inspector-heading"><input className="editable-title bg-transparent border-none outline-none w-full font-bold text-lg" value={selected.title} onChange={(e) => { setCards(cards.map(c => c.id === selected.id ? { ...c, title: e.target.value } : c)); if (canvasId) updateCard.mutate({ cardId: selected.id, title: e.target.value }); }} /><button className="round-button"><WandSparkles size={15} /></button></div><div className="inspector-meta"><span><span className="state-dot" /> Card saved</span><span>Just now</span></div><div className="inspector-block"><label>Thought</label><div className="inspector-body"><textarea className="w-full bg-transparent border-none outline-none resize-none min-h-[120px] text-sm" value={selected.body} onChange={(e) => { setCards(cards.map(c => c.id === selected.id ? { ...c, body: e.target.value } : c)); if (canvasId) updateCard.mutate({ cardId: selected.id, body: e.target.value }); }} placeholder="Enter thought here..." /></div></div>{selectedSource && <div className="linked-source"><div className="linked-source-top"><BookOpen size={15} /><span>Linked source</span><ArrowRight size={14} /></div><strong>{selectedSource.title}</strong><p>“{selectedSource.excerpt}”</p><div className="citation-row"><span>Passage 04</span><span>Open reading view</span></div></div>}<div className="ai-suggestion"><Sparkles size={15} /><div><strong>Context Assembly</strong><p>Ask the backend intelligence to assemble context for this card.</p></div><button onClick={() => { toast("Assembling context via backend..."); aiMutation.mutate({ mode: "context_assembly" as any, prompt: selected.title, context: selected.body }, { onSuccess: (res) => { const next: CanvasCard = { id: Date.now(), title: "AI Response", body: res.content, cardType: "insight", accent: "sky", x: selected.x + selected.width + 40, y: selected.y, width: 270, height: 170 }; setCards(c => [...c, next]); setLinks(l => [...l, { id: Date.now(), fromCardId: selected.id, toCardId: next.id }]); setSelectedId(next.id); if (canvasId) createCard.mutate({ canvasId, title: next.title, body: next.body, cardType: next.cardType, accent: next.accent, x: next.x, y: next.y }); } }) }}>{aiMutation.isPending ? "Asking..." : "Ask"}</button></div><div className="inspector-footer"><button><Link2 size={15} /> Add connection</button><button onClick={() => { setCards(cards.filter(c => c.id !== selected.id)); if (canvasId) deleteCard.mutate({ cardId: selected.id }); }} className="text-destructive hover:bg-destructive/10"><X size={15} /> Delete</button></div></>}</div>}
      </aside>
      </div>
    </div>
    {searchOpen && <div className="overlay-layer" onMouseDown={() => setSearchOpen(false)}><div className="search-dialog" onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}><div className="dialog-input"><Search size={19} /><Input autoFocus value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search cards and sources…" /><kbd>esc</kbd></div><div className="search-results">{search.length > 1 ? <>{filteredCards.map((card: CanvasCard) => <button key={card.id} onClick={() => { setSelectedId(card.id); setSearchOpen(false); }}><StickyNote size={15} /><span><strong>{card.title}</strong><em>{card.cardType} · Learning Garden</em></span><ArrowRight size={15} /></button>)}{searchQuery.data?.sources?.map((source: any) => <button key={source.id}><BookOpen size={15} /><span><strong>{source.title}</strong><em>Source · {source.sourceType}</em></span><ArrowRight size={15} /></button>)}</> : <div className="empty-search"><Search size={22} /><p>Type to search across your garden</p><span>Cards, sources, notes, and boards</span></div>}</div></div></div>}
    {commandOpen && <div className="overlay-layer" onMouseDown={() => setCommandOpen(false)}><div className="command-dialog" onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}><div className="command-heading"><div className="command-symbol"><Command size={17} /></div><div><strong>Command garden</strong><span>Quick actions for your workspace</span></div><button onClick={() => setCommandOpen(false)}><X size={16} /></button></div><div className="command-list"><button onClick={addCard}><StickyNote size={17} /><span><strong>New card</strong><em>Capture a thought on the canvas</em></span><kbd>n</kbd></button><button onClick={() => { setActivePanel("sources"); setCommandOpen(false); }}><BookOpen size={17} /><span><strong>Open source library</strong><em>Browse reading material and excerpts</em></span><kbd>s</kbd></button><button onClick={() => { setSearchOpen(true); setCommandOpen(false); }}><Search size={17} /><span><strong>Search this garden</strong><em>Find cards, sources, and notes</em></span><kbd>/</kbd></button></div></div></div>}
  </div>;
}
