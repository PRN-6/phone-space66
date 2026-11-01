import React from 'react';
import { useWallpaperStore } from '../../stores/wallpaperStore';

export const Wallpaper: React.FC = () => {
  const { currentTheme, customWallpaperUrl } = useWallpaperStore();

  if (customWallpaperUrl) {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-charcoal-950">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${customWallpaperUrl})` }}
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-charcoal-950">
      {/* THEME 1: Obsidian Void */}
      {currentTheme === 'obsidian-void' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_-15%,rgba(55,55,55,0.22),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.028]"
            style={{
              backgroundImage: `linear-gradient(#FFFFFF 1px, transparent 1px), linear-gradient(to right, #FFFFFF 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/[0.04] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[980px] rounded-full border border-white/[0.025] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] rounded-full border border-white/[0.06] pointer-events-none" />
        </>
      )}

      {/* THEME 2: Orbital Hypr */}
      {currentTheme === 'orbital-hypr' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,40,40,0.35),rgba(5,5,5,1)_70%)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-white/10 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] rounded-full border border-dashed border-white/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-white/[0.03] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1150px] h-[1150px] rounded-full border border-white/[0.02] pointer-events-none" />
          {/* Subtle crosshairs */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.03]" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.03]" />
        </>
      )}

      {/* THEME 3: Geometric Mesh */}
      {currentTheme === 'geometric-mesh' && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,18,18,0.8),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `radial-gradient(circle, #FFFFFF 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
          {/* Geometric facet polygons */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="#FFF" strokeWidth="1" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="#FFF" strokeWidth="1" />
            <polygon points="500,200 800,450 300,600" fill="none" stroke="#FFF" strokeWidth="1" />
            <polygon points="1200,300 1600,600 1000,800" fill="none" stroke="#FFF" strokeWidth="1" />
          </svg>
        </>
      )}

      {/* THEME 4: Carbon Matrix */}
      {currentTheme === 'carbon-matrix' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(60,60,60,0.25),rgba(5,5,5,1))]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              background: `linear-gradient(45deg, #1A1A1A 25%, transparent 25%),
                           linear-gradient(-45deg, #1A1A1A 25%, transparent 25%),
                           linear-gradient(45deg, transparent 75%, #1A1A1A 75%),
                           linear-gradient(-45deg, transparent 75%, #1A1A1A 75%)`,
              backgroundSize: '16px 16px',
            }}
          />
        </>
      )}

      {/* Monochrome Brand Centerpiece */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-[0.08] pointer-events-none">
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
