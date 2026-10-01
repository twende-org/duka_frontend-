import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserJourney } from '@/hooks/useUserJourney';

export const UserJourneyWidget = () => {
  const { milestones, isPublic, productProgress, PRODUCT_GOAL, progressPercent, handleSync } = useUserJourney();
  const [syncing, setSyncing] = React.useState(false);

  const onSync = async () => {
    setSyncing(true);
    try {
      await handleSync();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-6 mb-8 border-primary/20 bg-primary/5 shadow-inner relative overflow-hidden group">
      {/* Background Decorative Element */}
      <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors duration-500" />
      
      {!isPublic && (
        <div className="mb-6 p-4 bg-destructive/10 border-l-4 border-destructive rounded-lg animate-in fade-in slide-in-from-top-2 duration-500 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-destructive flex items-center gap-2">
              ⚠️ Duka lako bado halijaonekana mtandaoni! 
            </p>
            <p className="text-xs text-destructive/80 mt-1">
              Unahitaji kuongeza angalau bidhaa {PRODUCT_GOAL} ili duka lako liweze kuonekana kwa umma.
            </p>
          </div>
          <button 
            onClick={onSync}
            disabled={syncing}
            className="text-[10px] font-bold bg-destructive text-white px-3 py-1.5 rounded-full hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Inasawazisha...' : 'Hakiki Sasa'}
          </button>
        </div>
      )}
      
      {isPublic && progressPercent === 100 && (
        <div className="mb-6 p-4 bg-success/10 border-l-4 border-success rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
          <p className="text-sm font-bold text-success flex items-center gap-2">
            ✅ Pongezi! Duka lako lipo mtandaoni na linafanya kazi vizuri.
          </p>
          <p className="text-xs text-success/80 mt-1">
            Endelea kurekodi mauzo na bidhaa ili kukuza zaidi biashara yako.
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-black text-foreground tracking-tight">Safari ya Mafanikio ya Duka Lako 🚀</h3>
          <p className="text-xs text-muted-foreground font-medium">Kamilisha hatua hizi kukuza biashara yako mtandaoni.</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-primary">{Math.round(progressPercent)}%</span>
        </div>
      </div>
      
      <Progress value={progressPercent} className="h-1.5 mb-8 bg-muted" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {milestones.map((m) => (
          <div 
            key={m.id} 
            className={`relative flex flex-col gap-2 p-4 rounded-xl border transition-all duration-300 ${
              m.status === 'completed' ? 'bg-background/40 border-accent/20 opacity-80' : 
              m.status === 'active' ? 'bg-background border-primary ring-2 ring-primary/10 shadow-md scale-[1.02]' : 
              'bg-muted/30 border-dashed border-muted grayscale'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              {m.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
              ) : (
                <Circle className={`h-5 w-5 shrink-0 ${m.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
              {m.status === 'active' && m.id === 'add-products' && (
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {productProgress}/{PRODUCT_GOAL}
                </span>
              )}
            </div>
            
            <div className="min-w-0">
              <p className={`text-xs font-black leading-tight ${m.status === 'active' ? 'text-primary' : 'text-foreground'}`}>
                {m.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">
                {m.description}
              </p>
            </div>

            {m.id === 'add-products' && m.status === 'active' && (
              <Progress value={m.progress} className="h-1 mt-2 bg-muted/50" />
            )}

            {m.status === 'active' && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-primary animate-pulse">
                Anza Sasa <ArrowRight className="h-2.5 w-2.5" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
