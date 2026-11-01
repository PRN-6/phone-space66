import React from 'react';
import { useWallpaperStore } from '../../stores/wallpaperStore';

export const Wallpaper: React.FC = () => {
  const { currentTheme, customWallpaperUrl } = useWallpaperStore();

  if (customWallpaperUrl) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-charcoal-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${customWallpaperUrl})` }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-charcoal-950">
      {/* THEME 1: Obsidian Void (Default) */}
      {currentTheme === 'obsidian-void' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(70,70,70,0.28),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(to right, #FFFFFF 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />
          {/* Orbital Concentric Geometry */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full border border-white/[0.10] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[740px] h-[740px] rounded-full border border-dashed border-white/[0.07] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1040px] h-[1040px] rounded-full border border-white/[0.04] pointer-events-none" />
          
          {/* Subtle Precision Crosshairs */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.05]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.05]" />
        </>
      )}

      {/* THEME 2: Orbital Hypr */}
      {currentTheme === 'orbital-hypr' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(60,60,60,0.35),rgba(5,5,5,1)_72%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-white/[0.12] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full border border-dashed border-white/[0.08] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[920px] h-[920px] rounded-full border border-white/[0.06] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1240px] h-[1240px] rounded-full border border-white/[0.03] pointer-events-none" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.06]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.06]" />
        </>
      )}

      {/* THEME 3: Geometric Mesh */}
      {currentTheme === 'geometric-mesh' && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(25,25,25,0.85),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `radial-gradient(circle, #FFFFFF 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }}
          />
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="#FFF" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="#FFF" strokeWidth="1" strokeDasharray="4 4" />
            <polygon points="400,150 850,400 250,650" fill="none" stroke="#FFF" strokeWidth="1" />
            <polygon points="1200,200 1650,550 950,850" fill="none" stroke="#FFF" strokeWidth="1" />
          </svg>
        </>
      )}

      {/* THEME 4: Carbon Matrix */}
      {currentTheme === 'carbon-matrix' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_65%_at_50%_0%,rgba(70,70,70,0.3),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              background: `linear-gradient(45deg, #222222 25%, transparent 25%),
                           linear-gradient(-45deg, #222222 25%, transparent 25%),
                           linear-gradient(45deg, transparent 75%, #222222 75%),
                           linear-gradient(-45deg, transparent 75%, #222222 75%)`,
              backgroundSize: '20px 20px',
            }}
          />
        </>
      )}

      {/* Monochrome Brand Centerpiece */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-[0.16] pointer-events-none">
        <div className="text-8xl md:text-9xl font-black tracking-[0.25em] text-white font-mono select-none drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
          SPACE66
        </div>
        <div className="text-xs uppercase tracking-[0.55em] text-silver-300 mt-3 font-mono select-none">
          Your Phone • Your Space • Your Desktop
        </div>
      </div>
    </div>
  );
};
