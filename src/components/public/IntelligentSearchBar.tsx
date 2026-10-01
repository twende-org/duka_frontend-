import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Sparkles, X, History, TrendingUp, ArrowRight, Store, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  getSearchHistory,
  getTrendingSearches,
  getInstantSuggestions,
  addSearchToHistory,
  SearchSuggestion,
  RichSearchItem
} from "@/lib/services/searchService";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

export type SearchContext = "marketplace" | "wholesale";

interface IntelligentSearchBarProps {
  onSearch: (query: string, isAiMode: boolean, isSubmit?: boolean) => void;
  initialQuery?: string;
  compact?: boolean;
  /** Scopes placeholder, trending set and the AI prompt to the current section. */
  context?: SearchContext;
  /** On small screens render only a search icon that opens the full-screen overlay. */
  mobileTrigger?: boolean;
}

const CONTEXT_COPY: Record<SearchContext, { label: string; placeholder: string; aiPlaceholder: string; trending: RichSearchItem[] }> = {
  marketplace: {
    label: "Marketplace",
    placeholder: "Search products, shops, or ask Twende AI...",
    aiPlaceholder: "Ask Twende AI (e.g. Good laptop under 500k)",
    trending: [],
  },
  wholesale: {
    label: "Wholesale B2B",
    placeholder: "Search suppliers, categories or bulk products...",
    aiPlaceholder: "Ask Twende AI (e.g. Rice suppliers in Dar with MOQ 50)",
    trending: [
      { text: "Rice suppliers", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=200&h=200" },
      { text: "Cooking oil wholesale", imageUrl: "https://images.unsplash.com/photo-1620853503250-93a0ceeb2801?auto=format&fit=crop&q=80&w=200&h=200" },
      { text: "Electronics distributor", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200&h=200" },
      { text: "Soft drinks bulk", imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=200&h=200" }
    ],
  },
};

export function IntelligentSearchBar({
  onSearch,
  initialQuery = "",
  compact = false,
  context = "marketplace",
  mobileTrigger = false,
}: IntelligentSearchBarProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [history, setHistory] = useState<RichSearchItem[]>([]);
  const [trending, setTrending] = useState<RichSearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const copy = CONTEXT_COPY[context] ?? CONTEXT_COPY.marketplace;

  useEffect(() => {
    setHistory(getSearchHistory());
    setTrending(copy.trending.length ? copy.trending : getTrendingSearches());
  }, [context]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (query.length > 2 && isFocused && !isAiMode) {
      setSuggestions(getInstantSuggestions(query));
    } else {
      setSuggestions([]);
    }
  }, [query, isFocused, isAiMode]);

  // Lock body scroll + close on Escape while the overlay is open.
  useEffect(() => {
    if (!isFocused) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFocused(false);
    };
    document.addEventListener("keydown", onKey);
    // Focus the overlay input on the next frame so the caret lands correctly.
    const raf = requestAnimationFrame(() => overlayInputRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [isFocused]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      addSearchToHistory(query);
      setHistory(getSearchHistory());
      onSearch(query, isAiMode, true);
      setIsFocused(false);
      trackEvent("search_submitted", { query, isAiMode, context, source: "intelligent_search_bar" });
    }
  };

  const handleSuggestionClick = (item: RichSearchItem | SearchSuggestion) => {
    setQuery(item.text);
    addSearchToHistory(item.text, item.imageUrl);
    setHistory(getSearchHistory());
    onSearch(item.text, false, true);
    setIsFocused(false);
  };

  const toggleAiMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMode = !isAiMode;
    setIsAiMode(nextMode);
    if (query.trim()) onSearch(query, nextMode);
    if (nextMode) trackEvent("ai_search_toggled", { context, source: "intelligent_search_bar" });
  };

  const clearQuery = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onSearch("", isAiMode);
    overlayInputRef.current?.focus();
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "shop": return <Store className="h-4 w-4 text-primary" />;
      case "category": return <Tag className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const ScopeChip = (
    <span className="hidden sm:inline-flex items-center gap-1 shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {context === "wholesale" ? <Store className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
      {copy.label}
    </span>
  );

  /** Field shared by the inline (read-only trigger) and overlay (live) renders. */
  const renderField = useCallback((variant: "inline" | "overlay") => {
    const overlay = variant === "overlay";
    return (
      <div
        className={`relative flex items-center w-full min-w-0 transition-all duration-500 overflow-hidden ${
          overlay
            ? `rounded-[1.5rem] bg-background shadow-2xl ${isAiMode ? "ring-2 ring-primary shadow-primary/20" : "ring-1 ring-border shadow-black/5"}`
            : `${compact ? "rounded-full" : "rounded-[1.5rem]"} bg-muted/30 backdrop-blur-md border border-border/50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:bg-background hover:shadow-lg hover:border-primary/40`
        }`}
      >
        <div className={`absolute left-0 inset-y-0 w-12 sm:w-14 flex items-center justify-center transition-colors duration-300 ${isAiMode ? "bg-primary/5 text-primary" : "text-muted-foreground"}`}>
          <Search className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0`} />
        </div>

        <Input
          ref={overlay ? overlayInputRef : undefined}
          placeholder={isAiMode ? copy.aiPlaceholder : copy.placeholder}
          value={query}
          readOnly={!overlay}
          onChange={(e) => {
            if (!overlay) return;
            setQuery(e.target.value);
            onSearch(e.target.value, isAiMode);
          }}
          onFocus={() => setIsFocused(true)}
          onClick={() => setIsFocused(true)}
          className={`pl-11 sm:pl-14 pr-[6.5rem] sm:pr-[8.5rem] w-full min-w-0 truncate bg-transparent border-none focus-visible:ring-0 font-semibold placeholder:font-medium placeholder:text-muted-foreground/60 transition-all ${
            !overlay && compact ? "h-11 sm:h-12 text-sm cursor-pointer" : "h-14 sm:h-16 text-sm sm:text-base"
          }`}
        />

        <div className="absolute right-1.5 sm:right-2 flex items-center gap-1 sm:gap-1.5">
          {overlay && ScopeChip}
          {query && overlay && (
            <button type="button" onClick={clearQuery} className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 hover:scale-105 transition-all text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={overlay ? toggleAiMode : () => setIsFocused(true)}
            title="Toggle AI Search"
            className={`px-3 sm:px-4 rounded-full flex items-center gap-1.5 transition-all duration-300 font-bold shrink-0 shadow-sm ${
              !overlay && compact ? "h-8 sm:h-9 text-[11px] sm:text-xs" : "h-10 sm:h-11 text-xs sm:text-sm"
            } ${isAiMode ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02]" : "bg-primary/10 text-primary hover:bg-primary/20 hover:scale-[1.02]"}`}
          >
            <Sparkles className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isAiMode ? "text-primary-foreground animate-pulse" : "text-primary"}`} />
            <span className="hidden sm:inline">{isAiMode ? "Twende AI" : "AI Search"}</span>
          </button>
        </div>
      </div>
    );
  }, [isAiMode, compact, query, copy, onSearch, context]);

  const overlayContent = (
    <AnimatePresence>
      {isFocused && (
        <div className="fixed inset-0 z-[300]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => setIsFocused(false)}
          />

          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="absolute inset-x-0 top-0 mx-auto w-full max-w-3xl px-3 sm:px-6 pt-4 sm:pt-[8vh] flex flex-col max-h-[100dvh]"
          >
            <div className="flex items-center gap-2">
              <form onSubmit={handleSubmit} className="flex-1 min-w-0">
                {renderField("overlay")}
              </form>
              <button
                type="button"
                onClick={() => setIsFocused(false)}
                className="sm:hidden h-11 w-11 shrink-0 rounded-xl bg-muted flex items-center justify-center"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isAiMode && (
              <div className="mt-3 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
                  {query.trim().length === 0 ? (
                    <div className="flex flex-col sm:flex-row p-4 gap-6">
                      {history.length > 0 && (
                        <div className="w-full sm:w-1/3">
                          <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <History className="h-3.5 w-3.5 shrink-0" /> Recent Searches
                          </h4>
                          <ul className="space-y-2">
                            {history.map((h, i) => (
                              <li key={i}>
                                <button
                                  onClick={() => handleSuggestionClick(h)}
                                  className="w-full flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all group text-left"
                                >
                                  <span className="truncate text-sm font-medium text-foreground/80 group-hover:text-foreground flex-1">{h.text}</span>
                                  {h.imageUrl ? (
                                    <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted">
                                      <img src={h.imageUrl} alt={h.text} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                                    </div>
                                  ) : (
                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                      <History className="h-4 w-4" />
                                    </div>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {history.length > 0 && <div className="hidden sm:block w-px bg-border/40 shrink-0" />}

                      <div className="flex-1 min-w-0">
                        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 shrink-0" /> Trending in {copy.label}
                        </h4>
                        <div className="flex flex-col gap-2">
                          {trending.map((tItem, i) => (
                            <button
                              key={i}
                              onClick={() => handleSuggestionClick(tItem)}
                              className="w-full flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border transition-all group text-left"
                            >
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{tItem.text}</span>
                                <span className="text-xs text-muted-foreground">Trending</span>
                              </div>
                              {tItem.imageUrl ? (
                                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                                  <img src={tItem.imageUrl} alt={tItem.text} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                </div>
                              ) : (
                                <div className="h-12 w-12 shrink-0 rounded-lg bg-muted flex items-center justify-center p-2 group-hover:bg-primary/5 transition-colors">
                                  <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      <h4 className="px-3 mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Suggestions</h4>
                      <ul className="space-y-1">
                        {suggestions.map((item) => (
                          <li key={item.id}>
                            <button
                              onClick={() => handleSuggestionClick(item)}
                              className="w-full flex items-center gap-4 p-2 rounded-xl hover:bg-accent transition-all text-left group overflow-hidden"
                            >
                              <div className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${item.type === "shop" ? "bg-primary/10 text-primary" : item.type === "category" ? "bg-purple-500/10 text-purple-500" : "bg-muted text-muted-foreground"}`}>
                                {renderIcon(item.type)}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{item.text}</span>
                                {item.subtitle && <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>}
                              </div>
                              <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </button>
                          </li>
                        ))}
                        {suggestions.length === 0 && (
                          <li className="px-3 py-6 text-sm text-muted-foreground text-center">
                            Press Enter to search "{query}" in {copy.label}
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {query.length > 0 && (
                  <div
                    className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-t border-border flex items-center justify-between gap-3 group cursor-pointer hover:from-primary/15 transition-colors shrink-0"
                    onClick={toggleAiMode}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">Not finding what you need?</span>
                        <span className="text-xs text-muted-foreground truncate">Ask Twende AI about {copy.label.toLowerCase()}</span>
                      </div>
                    </div>
                    <Button size="sm" className="hidden sm:flex rounded-full px-4 shrink-0">Ask AI</Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className={`w-full min-w-0 mx-auto ${compact ? "" : "max-w-2xl"}`}>
        {/* Mobile icon trigger */}
        {mobileTrigger && (
          <button
            type="button"
            onClick={() => setIsFocused(true)}
            aria-label="Search"
            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
        <div className={mobileTrigger ? "hidden lg:block" : ""}>{renderField("inline")}</div>
      </div>

      {typeof document !== "undefined" && createPortal(overlayContent, document.body)}
    </>
  );
}
