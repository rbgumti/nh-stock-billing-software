import { cn } from "@/lib/utils";

interface FloatingOrbsProps {
  className?: string;
}

export function FloatingOrbs({ className }: FloatingOrbsProps) {
  return (
    <div className={cn("fixed inset-0 overflow-hidden pointer-events-none -z-10", className)}>
      {/* Large gold orb - top left */}
      <div 
        className="absolute w-96 h-96 rounded-full opacity-30"
        style={{
          top: '-10%',
          left: '-5%',
          background: 'radial-gradient(circle at 30% 30%, hsl(var(--gold) / 0.4), hsl(var(--gold) / 0.1), transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      
      {/* Navy orb - top right */}
      <div 
        className="absolute w-80 h-80 rounded-full opacity-20"
        style={{
          top: '10%',
          right: '-5%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--navy) / 0.5), hsl(var(--navy) / 0.2), transparent 70%)',
          filter: 'blur(50px)',
          animation: 'float 10s ease-in-out infinite 1s',
        }}
      />
      
      {/* Medium gold orb - center right */}
      <div 
        className="absolute w-64 h-64 rounded-full opacity-25"
        style={{
          top: '40%',
          right: '10%',
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--gold) / 0.3), hsl(var(--gold) / 0.1), transparent 70%)',
          filter: 'blur(40px)',
          animation: 'float 7s ease-in-out infinite 2s',
        }}
      />
      
      {/* Small accent orb - bottom left */}
      <div 
        className="absolute w-48 h-48 rounded-full opacity-20"
        style={{
          bottom: '20%',
          left: '5%',
          background: 'radial-gradient(circle at 30% 30%, hsl(220 60% 60% / 0.4), hsl(220 60% 60% / 0.1), transparent 70%)',
          filter: 'blur(35px)',
          animation: 'float 9s ease-in-out infinite 0.5s',
        }}
      />
      
      {/* Large navy orb - bottom */}
      <div 
        className="absolute w-72 h-72 rounded-full opacity-15"
        style={{
          bottom: '-5%',
          left: '30%',
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--navy) / 0.4), hsl(var(--navy) / 0.15), transparent 70%)',
          filter: 'blur(55px)',
          animation: 'float 11s ease-in-out infinite 3s',
        }}
      />
      
      {/* Extra small gold orb - floating */}
      <div 
        className="absolute w-32 h-32 rounded-full opacity-30"
        style={{
          top: '60%',
          left: '20%',
          background: 'radial-gradient(circle at 40% 40%, hsl(var(--gold) / 0.5), transparent 70%)',
          filter: 'blur(25px)',
          animation: 'float 6s ease-in-out infinite 1.5s',
        }}
      />
    </div>
  );
}