import { cn } from "@/lib/utils";

interface FloatingOrbsProps {
  className?: string;
}

export function FloatingOrbs({ className }: FloatingOrbsProps) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Simplified orbs - reduced blur and opacity for performance */}
      {/* Large gold orb - top left */}
      <div 
        className="absolute w-72 h-72 rounded-full opacity-20"
        style={{
          top: '-5%',
          left: '-5%',
          background: 'radial-gradient(circle at 30% 30%, hsl(var(--gold) / 0.3), transparent 60%)',
          filter: 'blur(40px)',
          animation: 'float 15s ease-in-out infinite',
        }}
      />
      
      {/* Navy orb - top right */}
      <div 
        className="absolute w-60 h-60 rounded-full opacity-15"
        style={{
          top: '15%',
          right: '-3%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--navy) / 0.4), transparent 60%)',
          filter: 'blur(35px)',
          animation: 'float 18s ease-in-out infinite 2s',
        }}
      />
      
      {/* Medium gold orb - center right */}
      <div 
        className="absolute w-48 h-48 rounded-full opacity-18"
        style={{
          top: '45%',
          right: '8%',
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.25), transparent 60%)',
          filter: 'blur(30px)',
          animation: 'float 12s ease-in-out infinite 4s',
        }}
      />
      
      {/* Small accent orb - bottom left */}
      <div 
        className="absolute w-36 h-36 rounded-full opacity-15"
        style={{
          bottom: '25%',
          left: '8%',
          background: 'radial-gradient(circle at 30% 30%, hsl(220 60% 60% / 0.3), transparent 60%)',
          filter: 'blur(25px)',
          animation: 'float 14s ease-in-out infinite 1s',
        }}
      />
    </div>
  );
}
