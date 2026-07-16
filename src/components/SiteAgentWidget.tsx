"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "How does ClearPath work?",
  "What is a reference range?",
  "What should I ask my doctor?",
  "Is my uploaded data safe?",
];

export default function SiteAgentWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: "Hi, I'm the **ClearPath Guide**! 👋 I can help you understand how this simplifier works, explain common medical terms (like WBC or Hemoglobin), or help you brainstorm good questions for your next doctor's visit.\n\n*Note: I provide general information and do not give medical advice or diagnoses.*",
        },
      ]);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMsg];
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get response.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong. Please check your Gemini API key.");
    } finally {
      setIsLoading(false);
    }
  };

  // Convert markdown-like bold/bullet formatting to simple HTML
  const formatText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      let content = line;
      // Bold **text**
      content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Bullet points
      if (content.trim().startsWith("* ")) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: content.replace(/^\*\s+/, "") }} />
        );
      }
      return (
        <p key={lineIdx} className="text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#103e3d] text-white shadow-xl hover:bg-[#0c3130] hover:scale-105 active:scale-95 transition-all duration-300 group"
          aria-label="Open AI Guide"
        >
          <div className="relative">
            <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-[#d2e2de] bg-[#fbfbf8] shadow-2xl sm:w-[390px] animate-in slide-in-from-bottom-6 fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between bg-[#103e3d] px-4 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-amber-400">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold tracking-tight">ClearPath Guide</h3>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-300">AI Assistant</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
              aria-label="Close Chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                    msg.role === "user"
                      ? "bg-[#2d7871] text-white"
                      : "bg-[#e5f4ee] text-[#1a534c]"
                  }`}
                >
                  {msg.role === "user" ? "You" : <Bot size={16} />}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-[#103e3d] text-white rounded-tr-none"
                      : "bg-white border border-[#e5eeec] text-[#2c4744] rounded-tl-none"
                  }`}
                >
                  {formatText(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e5f4ee] text-[#1a534c]">
                  <Bot size={16} />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl border border-[#e5eeec] bg-white px-4 py-3 shadow-sm rounded-tl-none">
                  <Loader2 size={14} className="animate-spin text-[#2d7871]" />
                  <span className="text-xs text-[#6e8c87] font-medium">ClearPath is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-100">
                <AlertCircle className="shrink-0 mt-0.5" size={14} />
                <div>
                  <p>{error}</p>
                  <p className="mt-1 text-[10px] text-rose-500 font-normal">Please make sure your GEMINI_API_KEY is configured in your local environment.</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (Visible only when not loading) */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#718f8a] mb-1.5">Common questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSendMessage(suggestion)}
                    className="rounded-full border border-[#cbdfe0] bg-white px-2.5 py-1 text-xs font-semibold text-[#285e58] hover:border-[#103e3d] hover:bg-[#f2f8f6] transition active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="border-t border-[#e2edea] bg-white px-4 py-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-[#cbdfe0] bg-[#fbfdfc] px-3 py-1.5 focus-within:border-[#2d7871] focus-within:ring-1 focus-within:ring-[#2d7871] transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about terms or how to use..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-[#183a37] outline-none placeholder:text-[#88a5a0] disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-lg p-1.5 bg-[#103e3d] text-white hover:bg-[#0c3130] disabled:opacity-30 disabled:hover:bg-[#103e3d] transition"
                aria-label="Send Message"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="mt-2 text-[10px] text-center text-[#8ca39f]">
              For informational support. Always consult a medical professional.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
