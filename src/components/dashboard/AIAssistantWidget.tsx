  import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Bot, ArrowUpRight, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/store/hooks";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { useTodaySummary } from "@/hooks/useSales";
import { useUserRole } from "@/hooks/useUserRole";
import { askBusinessAssistant } from "@/lib/api/domains/ai";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

const QUICK_QUESTIONS = [
  "Mauzo ya leo yapoje?",
  "Bidhaa gani zinakaribia kuisha?",
  "Nipe ushauri wa kuongeza faida."
];

export function AIAssistantWidget() {
  const INITIAL_MESSAGE: Message = { id: "1", role: "ai", content: "Jambo! Mimi ni **Twende AI** ✨. Nikusaidie nini kuhusu biashara yako leo?" };
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { role } = useUserRole();

  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find(s => s.id === currentShopId);

  const { data: products = [] } = useProducts(currentShopId);
  const { data: inventory = [] } = useInventory(currentShopId);
  const { data: todaySummary } = useTodaySummary(currentShopId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  if (!currentShopId) return null;

  const handleSend = async (e?: React.FormEvent, predefinedMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = predefinedMsg || input.trim();
    if (!userMsg || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const contextData = {
        shopName: currentShop?.name || "Twende Duka",
        userRole: role || "Cashier", // Default to Cashier for safety if undefined
        totalProductsCount: products.length,
        todaySalesTotal: todaySummary?.totalSales || 0,
        todayProfit: todaySummary?.netProfit || todaySummary?.profit || 0,
        todayTransactions: todaySummary?.transactions || 0,
        inventoryStatus: products.map(p => {
          const inv = inventory.find(i => i.productId === p.id);
          return {
            name: p.name,
            stock: inv?.quantity || 0,
            minStock: inv?.minStock || 5,
            price: p.sellingPrice
          };
        }).filter(p => p.stock <= p.minStock)
      };

      const response = await askBusinessAssistant(
        currentShop?.name || "Twende Duka",
        userMsg,
        contextData
      );

      let finalResponse = response;
      const navigateMatch = response.match(/\[NAVIGATE:(.*?)\]/);
      
      if (navigateMatch && navigateMatch[1]) {
        const targetPath = navigateMatch[1].trim();
        finalResponse = finalResponse.replace(navigateMatch[0], "").trim();
        
        // Execute the navigation automatically after a brief moment
        setTimeout(() => {
          navigate(targetPath);
          setIsOpen(false);
        }, 1500); 
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", content: finalResponse || "Ninakupeleka sasa..." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "ai", 
        content: error.message || "Samahani, kumetokea hitilafu kimtandao." 
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

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-32 lg:bottom-6 right-4 lg:right-6 z-[160] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-[0_8px_30px_rgb(0,0,0,0.2)] shadow-primary/40 transition-all duration-300 hover:scale-110 hover:shadow-primary/50 group",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <Sparkles className="h-7 w-7 transition-transform duration-500 group-hover:rotate-12" />
        <span className="absolute right-0 top-0 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex h-4 w-4 rounded-full bg-white/20 backdrop-blur-sm border border-white/50"></span>
        </span>
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-[160] flex flex-col overflow-hidden border border-white/10 bg-background/95 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)",
          "bottom-0 left-0 right-0 w-full rounded-t-[2.5rem] border-b-0 origin-bottom", // Mobile
          "lg:bottom-6 lg:right-6 lg:left-auto lg:w-[400px] lg:rounded-[2rem] lg:border-b lg:origin-bottom-right", // Desktop
          isOpen 
            ? "translate-y-0 opacity-100 h-[85vh] lg:h-[650px] lg:max-h-[85vh] lg:translate-x-0" 
            : "translate-y-full opacity-0 pointer-events-none lg:translate-y-12 lg:translate-x-4 lg:scale-95"
        )}
      >
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-2 lg:hidden bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5">
          <div className="flex items-center gap-4 z-10">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-white/20">
              <Bot className="h-6 w-6" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Twende AI</h3>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-transparent via-muted/5 to-muted/10 relative">
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
                    "rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm font-medium"
                      : "bg-card text-foreground rounded-bl-sm border border-border/50 backdrop-blur-sm"
                  )}
                >
                  {msg.role === "ai" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-primary">
                      <ReactMarkdown
                        components={{
                          a: ({ node, href, children, ...props }) => {
                            if (href?.startsWith('/')) {
                              return (
                                <a
                                  href={href}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate(href);
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
              <span className={cn(
                "text-[10px] font-medium text-muted-foreground",
                msg.role === "user" ? "pr-2" : "pl-9"
              )}>
                {msg.role === "user" ? "Wewe" : "Msaidizi"}
              </span>
            </div>
          ))}
          
          {/* Quick Questions Chips */}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-col gap-2 pl-9 fade-in-up" style={{ animationDelay: '200ms' }}>
              <p className="text-xs text-muted-foreground font-medium mb-1">Jaribu kuuliza:</p>
              {QUICK_QUESTIONS.map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(undefined, q)} 
                  className="flex items-center justify-between w-full text-left text-sm px-4 py-2.5 bg-card hover:bg-primary/5 text-foreground hover:text-primary rounded-xl border border-border/50 transition-all hover:shadow-sm hover:-translate-y-0.5 group"
                >
                  {q}
                  <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex w-full items-start gap-2 fade-in-up">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mb-1 mt-auto">
                <Sparkles className="h-3 w-3" />
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-card px-5 py-4 text-foreground border border-border/50 shadow-sm flex gap-1.5 items-center h-[46px]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input Area */}
        <div className="border-t border-border/50 bg-background/50 p-4 backdrop-blur-xl">
          <form onSubmit={handleSend} className="relative flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Uliza chochote..."
              className="h-14 flex-1 rounded-2xl bg-card border-border/50 pl-5 pr-14 text-sm focus-visible:ring-primary/30 shadow-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4 ml-0.5" />
            </Button>
          </form>
          <div className="mt-3 flex justify-center">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-70">
              <Sparkles className="h-3 w-3" /> Powered by OpenRouter AI
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
