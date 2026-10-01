import { MapPin, Package } from "lucide-react";

export function ShopSkeleton() {
  return (
    <div className="min-h-screen bg-background font-sans pointer-events-none animate-pulse">
      {/* Navbar Skeleton */}
      <nav className="fixed top-0 inset-x-0 z-[100] h-16 bg-background/60 border-b border-border/10 flex items-center px-4 sm:px-6">
        <div className="h-8 w-8 bg-muted rounded-xl" />
        <div className="ml-3 h-5 w-32 bg-muted rounded-full" />
        <div className="ml-auto h-9 w-9 bg-muted rounded-xl" />
      </nav>

      <main>
        {/* Cover Skeleton */}
        <section className="relative w-full">
          <div className="w-full h-[35vh] md:h-[50vh] bg-muted" />
          
          {/* Hero Content Skeleton */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 -mt-20 md:-mt-32 flex flex-col md:flex-row items-center md:items-end gap-6 mb-12">
            <div className="h-40 w-40 md:h-56 md:w-56 rounded-[2.5rem] bg-muted shadow-2xl ring-4 ring-background shrink-0" />
            <div className="flex-1 text-center md:text-left w-full space-y-4">
              <div className="h-12 w-3/4 max-w-sm bg-muted rounded-full mx-auto md:mx-0" />
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="h-4 w-24 bg-muted rounded-full" />
                <div className="h-4 w-24 bg-muted rounded-full" />
              </div>
              <div className="h-4 w-full max-w-md bg-muted rounded-full mx-auto md:mx-0 mt-4" />
              <div className="h-4 w-2/3 max-w-sm bg-muted rounded-full mx-auto md:mx-0" />
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
               <div className="h-14 w-14 bg-muted rounded-2xl shrink-0" />
               <div className="h-14 flex-1 md:w-48 bg-muted rounded-2xl" />
            </div>
          </div>
        </section>

        {/* Highlighted Product Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="aspect-[4/3] bg-muted rounded-[2rem]" />
            <div className="space-y-6">
               <div className="h-6 w-32 bg-muted rounded-full" />
               <div className="h-12 w-3/4 bg-muted rounded-full" />
               <div className="h-8 w-40 bg-muted rounded-full" />
               <div className="space-y-3">
                 <div className="h-4 w-full bg-muted rounded-full" />
                 <div className="h-4 w-5/6 bg-muted rounded-full" />
               </div>
               <div className="h-16 w-full bg-muted rounded-2xl mt-8" />
            </div>
          </div>
        </div>

        {/* Grid Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-16">
          <div className="h-8 w-48 bg-muted rounded-full mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="rounded-[2rem] overflow-hidden border border-border/30 bg-card">
                 <div className="aspect-[4/5] bg-muted" />
                 <div className="p-5 space-y-3">
                    <div className="h-3 w-16 bg-muted rounded-full" />
                    <div className="h-4 w-3/4 bg-muted rounded-full" />
                    <div className="h-4 w-1/2 bg-muted rounded-full" />
                 </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
