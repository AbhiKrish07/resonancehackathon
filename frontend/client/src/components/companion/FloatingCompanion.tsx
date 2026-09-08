import { Sparkles, X, Loader2, Send } from "lucide-react";
import { useCompanion } from "@/contexts/CompanionContext";
import { useState, useRef, useEffect } from "react";
import "./FloatingCompanion.css";

type Message = { role: "user" | "companion"; content: string };

const CAPTURE_API_URL = import.meta.env.VITE_CAPTURE_API_URL || "http://localhost:8080";

export function FloatingCompanion() {
  const { profile, context, state, isOpen, open, close, setState } = useCompanion();
  const [messages, setMessages] = useState<Message[]>([
    { role: "companion", content: "Hey! I'm your Darwinity learning companion. I can see what you're working on — ask me to explain, quiz you, summarize, or connect ideas." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const askCompanion = async (query: string) => {
    if (!query.trim()) return;
    
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setInput("");
    setIsLoading(true);
    setState("thinking" as any); // Update companion state to thinking/loading

    try {
      let enhancedQuery = query;
      if (query === "Make flashcards") {
        const topic = context.course || context.selection || context.workspace || "recent notes";
        enhancedQuery = `Make 3 spaced-repetition flashcards about ${topic}. Format them as markdown bullet points. Do not mention Flight AI-842 unless the topic is specifically about it.`;
      } else {
        const topic = context.course || context.selection || context.workspace;
        if (topic && topic !== "Home") {
           enhancedQuery = `[Context: currently looking at ${topic}] ${query}`;
        }
      }

      const response = await fetch(`${CAPTURE_API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: enhancedQuery,
          space_id: context.spaceId || null,
          top_k: 3
        })
      });

      if (!response.ok) {
        throw new Error("Failed to connect to Darwinity backend");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "companion", content: data.answer }]);
      setState("explaining");
    } catch (error) {
      setMessages(prev => [...prev, { role: "companion", content: "Sorry, I couldn't reach the Darwinity backend. Make sure the API server is running on port 8080." }]);
      setState("idle");
    } finally {
      setIsLoading(false);
      setTimeout(() => setState("idle"), 5000); // Reset to idle after a few seconds
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askCompanion(input);
    }
  };

  const displayContext = context.selection || context.course || context.workspace;

  return (
    <>
      <button
        className={`companion-orbit companion-${state}`}
        style={{
          "--companion-primary": profile.primaryColor,
          "--companion-accent": profile.accentColor,
        } as React.CSSProperties}
        onClick={open}
        aria-label={`Open ${profile.name}, your learning companion`}
      >
        <span className="companion-aura" />
        <span className="companion-body">
          <span className="companion-eye companion-eye-left" />
          <span className="companion-eye companion-eye-right" />
          <span className="companion-mouth" />
          {profile.accessory === "leaf" && <span className="companion-leaf" />}
        </span>
        <span className="companion-spark"><Sparkles size={12} /></span>
      </button>

      {isOpen && (
        <aside className="companion-panel flex flex-col h-[500px]" aria-label={`${profile.name} assistant`}>
          <header className="companion-panel-header shrink-0">
            <div>
              <span className="companion-kicker">YOUR LEARNING COMPANION</span>
              <h2>{profile.name}</h2>
            </div>
            <button onClick={close} aria-label="Close companion panel"><X size={18} /></button>
          </header>

          <div className="companion-context shrink-0">
            <span className="context-dot" />
            <span className="truncate">Seeing: {displayContext}</span>
            <button className="shrink-0">Change</button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 1 && (
              <div className="companion-actions mb-4">
                <button onClick={() => askCompanion("Explain this")}>Explain this</button>
                <button onClick={() => askCompanion("Summarize")}>Summarize</button>
                <button onClick={() => askCompanion("Quiz me")}>Quiz me</button>
                <button onClick={() => askCompanion("Make flashcards")}>Make flashcards</button>
                <button onClick={() => askCompanion("Connect these ideas")}>Connect these ideas</button>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              const formatText = (text: string) => {
                const html = text
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n/g, '<br/>');
                return <span dangerouslySetInnerHTML={{ __html: html }} />;
              };

              return (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-[#123d2d] text-white' 
                      : 'bg-white border border-[#e1e8e2] text-gray-800 shadow-sm'
                  }`}>
                    {msg.role === 'user' ? msg.content : formatText(msg.content)}
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e1e8e2] rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2 text-gray-500">
                  <Loader2 size={16} className="animate-spin text-[#123d2d]" />
                  <span className="text-xs font-bold uppercase tracking-widest">{profile.name} is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="companion-input-row shrink-0 bg-white border-t border-[#e1e8e2] p-4 flex items-center gap-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about what you’re studying..." 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#123d2d] transition-colors"
            />
            <button 
              onClick={() => askCompanion(input)}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#123d2d] text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send size={16} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
