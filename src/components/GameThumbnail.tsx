import React, { useState } from 'react';

interface GameThumbnailProps {
  src: string;
  alt: string;
  gameId: string;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({ src, alt, gameId }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    // Rich fallback visual SVG matching game's exact concept
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center p-4">
        {gameId === 'stack-ball' && (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500 shadow-md mb-2 flex items-center justify-center font-bold text-white text-xs">
              BALL
            </div>
            <div className="w-24 h-3 bg-blue-500 rounded-sm mb-1" />
            <div className="w-24 h-3 bg-amber-500 rounded-sm mb-1" />
            <div className="w-24 h-3 bg-emerald-500 rounded-sm" />
          </div>
        )}
        {gameId === 'tic-tac-toe' && (
          <div className="grid grid-cols-3 gap-1 w-20 h-20 bg-slate-950 p-1 rounded-lg border border-slate-800 text-center font-bold">
            <span className="text-cyan-400">X</span>
            <span className="text-rose-400">O</span>
            <span className="text-cyan-400">X</span>
            <span className="text-rose-400">O</span>
            <span className="text-rose-400">O</span>
            <span className="text-cyan-400">X</span>
            <span className="text-cyan-400">X</span>
            <span className="text-rose-400">O</span>
            <span className="text-rose-400">O</span>
          </div>
        )}
        {gameId === '8-ball-pool' && (
          <div className="w-28 h-20 bg-emerald-700 rounded-lg border-4 border-amber-900 flex items-center justify-center relative">
            <div className="w-5 h-5 rounded-full bg-black text-white text-[9px] font-bold flex items-center justify-center">8</div>
            <div className="w-4 h-4 rounded-full bg-yellow-400 ml-1" />
            <div className="w-4 h-4 rounded-full bg-blue-600 -ml-8" />
          </div>
        )}
        {gameId === 'gun-sprint' && (
          <div className="relative w-28 h-20 bg-slate-950 rounded-lg border-2 border-orange-500/50 flex items-center justify-center overflow-hidden">
            <div className="absolute top-2 w-4 h-10 bg-emerald-500 rounded-sm border border-emerald-300" />
            <div className="w-12 h-12 rounded-full border-2 border-red-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            </div>
            <div className="absolute bottom-0 right-2 w-10 h-7 bg-slate-700 rounded-t-md" />
            <span className="absolute bottom-1 left-2 text-[9px] font-black text-amber-400">FPS SHOOT</span>
          </div>
        )}
        {gameId === 'ludo' && (
          <div className="grid grid-cols-2 gap-1 w-20 h-20 bg-amber-50 p-1 rounded-md border-2 border-slate-800">
            <div className="bg-red-500 rounded-sm" />
            <div className="bg-emerald-500 rounded-sm" />
            <div className="bg-blue-500 rounded-sm" />
            <div className="bg-amber-500 rounded-sm" />
          </div>
        )}
        {gameId === 'snakes-and-ladders' && (
          <div className="w-24 h-20 bg-amber-100 rounded border border-slate-700 flex flex-col justify-between p-1">
            <span className="text-[10px] font-bold text-slate-800">100 FINISH</span>
            <div className="text-emerald-600 font-extrabold text-center text-xs">▲ LADDERS</div>
            <div className="text-rose-600 font-extrabold text-center text-xs">▼ SNAKES</div>
          </div>
        )}
        {gameId === 'carrom' && (
          <div className="w-20 h-20 bg-amber-200 border-4 border-amber-950 rounded-md flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-red-600 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-600" />
            </div>
          </div>
        )}
        {gameId === 'car-racing' && (
          <div className="w-20 h-20 bg-slate-800 flex flex-col items-center justify-center border-l-2 border-r-2 border-dashed border-white">
            <div className="w-6 h-10 bg-red-600 rounded" />
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
  );
};
