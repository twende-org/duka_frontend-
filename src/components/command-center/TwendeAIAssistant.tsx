import React, { useState, useEffect } from "react";
import { Send, Loader2, Sparkles, MessageSquare, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askBusinessAssistant } from "@/lib/api/domains/ai";
import { useI18n } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const getSuggestedQuestions = (t: any) => [
  t("cc.aiQ1") || "How is my business today?",
  t("cc.aiQ2") || "What products should I restock?",
  t("cc.aiQ3") || "Who owes me money?",
  t("cc.aiQ4") || "Which products sell best?",
  t("cc.aiQ5") || "How can I increase sales?"
];

export function TwendeAIAssistant({ context }: { context?: any } = {}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextData, setContextData] = useState<any>(context ?? null);
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find((s) => s.id === currentShopId);

  useEffect(() => {
    if (context) {
      setContextData(context);
      return;
    }
    // Read the AI context prepared by useBusinessIntelligence
    const scriptEl = document.getElementById("twende-ai-context");
    if (scriptEl && scriptEl.textContent) {
      try {
        setContextData(JSON.parse(scriptEl.textContent));
      } catch (err) {
        console.error("Failed to parse AI context", err);
      }
    }
  }, [context]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading || !contextData) return;
    
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const response = await askBusinessAssistant(
        currentShop?.name || "My Shop",
        text,
        contextData
      );
      setMessages((prev) => [...prev, { role: "ai", content: response }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: err.message || t("cc.aiError") || "An error occurred while connecting to Twende AI." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3 bg-muted/30">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-orange-500" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{t("cc.aiTitle") || "Twende AI Business Assistant"}</h2>
          <p className="text-xs text-muted-foreground truncate">{t("cc.aiSubtitle") || "Your intelligent business advisor"}</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">{t("cc.aiGreeting") || "How can I help you today?"}</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {t("cc.aiGreetingDesc") || "I can analyze your sales, inventory, and customer data to give you actionable insights."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-4">
              {getSuggestedQuestions(t).map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-xs text-left p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl p-4 text-sm",
                  m.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted/50 text-foreground border border-border/60 rounded-tl-sm"
                )}
              >
                {m.role === "ai" ? (
                  <div className="prose prose-sm prose-p:leading-relaxed prose-pre:bg-muted/50 dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl p-4 bg-muted/50 border border-border/60 rounded-tl-sm flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {t("cc.aiAnalyzing") || "Twende AI is analyzing your business data..."}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex items-center gap-2 relative"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("cc.aiPlaceholder") || "Ask about your sales, inventory, or customers..."}
            className="rounded-full pl-4 pr-12 h-12 bg-muted/50 border-border/60 focus-visible:ring-primary/20"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="absolute right-1.5 h-9 w-9 rounded-full bg-primary hover:bg-primary/90 transition-transform active:scale-95"
          >
            <Send className="h-4 w-4 text-primary-foreground ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
