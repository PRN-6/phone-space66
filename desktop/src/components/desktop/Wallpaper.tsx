import React from 'react';

export const Wallpaper: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-charcoal-950">
      {/* Deep black radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_-15%,rgba(55,55,55,0.22),rgba(5,5,5,1))]" />

      {/* Subtle monochrome geometric grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage: `linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(to right, #FFFFFF 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Concentric monochrome orbital rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/[0.04] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[980px] rounded-full border border-white/[0.025] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-white/[0.06] pointer-events-none" />

      {/* Monochrome Brand Centerpiece */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-[0.09] pointer-events-none">
        <div className="text-8xl font-black tracking-widest text-white font-mono">
          SPACE66
        </div>
        <div className="text-xs uppercase tracking-[0.45em] text-silver-300 mt-2 font-mono">
          Your Phone • Your Space • Your Desktop
        </div>
      </div>
    </div>
  );
};
