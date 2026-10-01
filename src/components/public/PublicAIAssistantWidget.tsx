import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, ArrowUpRight, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askPublicAssistant, PublicAIContext } from "@/lib/public-ai";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface PublicAIAssistantWidgetProps {
  contextData: PublicAIContext;
}

export function PublicAIAssistantWidget({ contextData }: PublicAIAssistantWidgetProps) {
  const INITIAL_MESSAGE: Message = { 
    id: "1", 
    role: "ai", 
    content: `Jambo! Mimi ni **Twende AI** ✨, msaidizi wako kwa duka hili la ${contextData.shopName}. Nikusaidie kutafuta bidhaa gani leo?` 
  };
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await askPublicAssistant(
        contextData.shopName,
        userMsg,
        contextData
      );

      let finalResponse = response;
      const navigateMatch = response.match(/\[NAVIGATE:\?productId=(.*?)\]/);
      
      if (navigateMatch && navigateMatch[1]) {
        const targetProductId = navigateMatch[1].trim();
        finalResponse = finalResponse.replace(navigateMatch[0], "").trim();
        
        // Execute the navigation by updating URL params (this will trigger ShopDetail to show the product)
        setTimeout(() => {
          searchParams.set("productId", targetProductId);
          setSearchParams(searchParams);
          setIsOpen(false);
        }, 1500); 
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", content: finalResponse || "Hapa kuna bidhaa uliyoomba..." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "ai", 
        content: `Samahani, kumetokea hitilafu: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
  };

  const quickQuestions = [
    "Mnauza bidhaa gani?",
    "Duka lipo wapi?",
    "Bidhaa gani ziko chini ya TZS 50,000?"
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-32 lg:bottom-6 right-4 lg:right-6 z-[160] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-white shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-500 hover:scale-110 active:scale-95 group",
          isOpen ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        )}
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-[160] flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] transition-all duration-500",
          "bottom-0 left-0 right-0 w-full rounded-t-[2.5rem] border-b-0 origin-bottom", // Mobile
          "lg:bottom-6 lg:right-6 lg:left-auto lg:w-[380px] lg:rounded-[2rem] lg:border-b lg:origin-bottom-right", // Desktop
          isOpen 
            ? "translate-y-0 opacity-100 h-[85vh] lg:h-[600px] lg:max-h-[calc(100vh-6rem)]" 
            : "translate-y-full lg:translate-y-0 lg:scale-90 opacity-0 pointer-events-none"
        )}
      >
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-2 lg:hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/40 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <div className="relative h-10 w-10 flex items-center justify-center rounded-full bg-primary/20 text-primary">
              <Bot className="h-5 w-5" />
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"></div>
            </div>
            <div>
              <h3 className="font-bold text-foreground">Twende AI</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-1">
                Online <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            {messages.length > 1 && (
              <button
                onClick={handleReset}
                title="Futa Mazungumzo (Clear Chat)"
                className="rounded-full bg-muted/50 p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:-rotate-180 duration-500"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full bg-muted/50 p-2 text-muted-foreground transition-all hover:bg-destructive hover:text-destructive-foreground hover:rotate-90"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Decorative blur */}
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col scroll-smooth relative z-10">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full flex-col gap-1.5 fade-in-up group/msg",
                msg.role === "user" ? "items-end" : "items-start"
              )}
              style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
            >
              <div className="flex items-end gap-2 max-w-[90%]">
                {msg.role === "ai" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm shadow-sm"
                      : "bg-card backdrop-blur-sm border border-border/50 text-foreground rounded-bl-sm shadow-sm"
                  )}
                >
                  {msg.role === "ai" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-primary">
                      <ReactMarkdown
                        components={{
                          a: ({ node, href, children, ...props }) => {
                            if (href?.startsWith('?productId=')) {
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    searchParams.set("productId", href.replace('?productId=', ''));
                                    setSearchParams(searchParams);
                                    setIsOpen(false);
                                  }}
                                  className="text-primary underline font-medium hover:text-primary/80 transition-colors cursor-pointer"
                                  {...props}
                                >
                                  {children}
                                </a>
                              );
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80" {...props}>{children}</a>;
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                
                {/* Copy Button for AI Messages */}
                {msg.role === "ai" && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Quick Questions Chips */}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-col gap-2 mt-4 fade-in-up" style={{ animationDelay: '500ms' }}>
              <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground pl-9 mb-1">
                Maswali ya haraka:
              </p>
              <div className="flex flex-wrap gap-2 pl-9">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(q);
                      // handleSend will be triggered on next render cycle manually if we just set input
                      // So we call a helper instead
                      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
                      setInput(q);
                      setTimeout(() => {
                        const form = document.getElementById("public-ai-form");
                        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                      }, 50);
                    }}
                    className="bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border/50 text-[11px] font-medium px-3 py-1.5 rounded-full transition-all text-left flex items-center gap-1.5 group"
                  >
                    {q} <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-end gap-2 max-w-[85%] pl-2 fade-in-up">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mb-1">
                <Sparkles className="h-3 w-3 animate-spin" />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border/50 rounded-bl-sm">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-card/50 backdrop-blur-md border-t border-border/40 shrink-0 relative z-10">
          <form id="public-ai-form" onSubmit={handleSend} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Uliza swali lolote..."
              className="pr-12 bg-background border-border/50 h-12 rounded-2xl focus-visible:ring-primary/20 shadow-inner"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 h-9 w-9 rounded-xl shadow-md transition-transform active:scale-95"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-3 text-center">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">
              Powered by Twende AI ✨
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
