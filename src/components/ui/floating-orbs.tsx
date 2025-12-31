import { cn } from "@/lib/utils";

interface FloatingOrbsProps {
  className?: string;
}

export function FloatingOrbs({ className }: FloatingOrbsProps) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Large teal orb - top left */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full liquid-blob"
        style={{
          top: '-15%',
          left: '-10%',
          background: 'radial-gradient(circle at 30% 30%, hsl(var(--teal) / 0.35), hsl(var(--cyan) / 0.15), transparent 70%)',
          filter: 'blur(80px)',
          animation: 'liquid-float 15s ease-in-out infinite',
        }}
      />
      
      {/* Cyan orb - top right */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full liquid-blob"
        style={{
          top: '5%',
          right: '-8%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--cyan) / 0.4), hsl(var(--lime) / 0.15), transparent 70%)',
          filter: 'blur(70px)',
          animation: 'liquid-float 12s ease-in-out infinite reverse',
        }}
      />
      
      {/* Medium lime orb - center right */}
      <div 
        className="absolute w-80 h-80 rounded-full liquid-blob"
        style={{
          top: '45%',
          right: '5%',
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--lime) / 0.35), hsl(var(--emerald) / 0.12), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'liquid-float 18s ease-in-out infinite 2s',
        }}
      />
      
      {/* Emerald orb - bottom left */}
      <div 
        className="absolute w-72 h-72 rounded-full liquid-blob"
        style={{
          bottom: '15%',
          left: '3%',
          background: 'radial-gradient(circle at 30% 30%, hsl(var(--emerald) / 0.4), hsl(var(--teal) / 0.15), transparent 70%)',
          filter: 'blur(55px)',
          animation: 'liquid-float 14s ease-in-out infinite 1s',
        }}
      />
      
      {/* Large cyan orb - bottom center */}
      <div 
        className="absolute w-96 h-96 rounded-full liquid-blob"
        style={{
          bottom: '-10%',
          left: '35%',
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--cyan) / 0.3), hsl(var(--teal) / 0.1), transparent 70%)',
          filter: 'blur(75px)',
          animation: 'liquid-float 20s ease-in-out infinite 4s',
        }}
      />
      
      {/* Small accent orb - floating left */}
      <div 
        className="absolute w-48 h-48 rounded-full"
        style={{
          top: '55%',
          left: '18%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--teal) / 0.5), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'liquid-float 10s ease-in-out infinite 1.5s',
        }}
      />

      {/* Extra small lime orb - center */}
      <div 
        className="absolute w-40 h-40 rounded-full"
        style={{
          top: '30%',
          left: '50%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--lime) / 0.4), transparent 70%)',
          filter: 'blur(35px)',
          animation: 'liquid-float 8s ease-in-out infinite 3s reverse',
        }}
      />
    </div>
  );
}