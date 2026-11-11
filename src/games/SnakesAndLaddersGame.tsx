import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, User, Cpu, Dices, Trophy, Sparkles, MessageSquare, Info } from 'lucide-react';
import { sounds } from '../utils/audio';

interface SnakesAndLaddersProps {
  onBack: () => void;
}

interface PlayerState {
  id: number;
  name: string;
  position: number; // 0 (start) to 100
  color: string;
  bgGradient: string;
  ringColor: string;
  isAi: boolean;
}

// Authentic Ladders from reference board (bottom -> top)
const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  51: 67,
  71: 91,
  80: 100,
};

// Authentic Snakes from reference board (head -> tail)
const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 79,
};

const PLAYER_PROFILES = [
  { name: 'Red Pawn', color: '#ef4444', bgGradient: 'from-red-500 to-rose-700', ringColor: 'ring-red-400' },
  { name: 'Blue Pawn', color: '#3b82f6', bgGradient: 'from-blue-500 to-indigo-700', ringColor: 'ring-blue-400' },
  { name: 'Green Pawn', color: '#10b981', bgGradient: 'from-emerald-500 to-teal-700', ringColor: 'ring-emerald-400' },
  { name: 'Yellow Pawn', color: '#f59e0b', bgGradient: 'from-amber-400 to-yellow-600', ringColor: 'ring-amber-400' },
];

// Helper: Convert square number (1..100) to percentage board coordinates (0% to 100%)
export function getSquareCoord(sq: number): { x: number; y: number } {
  if (sq <= 0) return { x: 5, y: 95 }; // Start square outside square 1
  const rowFromBottom = Math.floor((sq - 1) / 10); // 0 (bottom row) to 9 (top row)
  const isEvenRow = rowFromBottom % 2 === 0;
  const col = isEvenRow ? (sq - 1) % 10 : 9 - ((sq - 1) % 10);
  return {
    x: col * 10 + 5,
    y: (9 - rowFromBottom) * 10 + 5,
  };
}

// Offsets when multiple pawns share a square
const TOKEN_OFFSETS = [
  { dx: -2, dy: -2 },
  { dx: 2, dy: -2 },
  { dx: -2, dy: 2 },
  { dx: 2, dy: 2 },
];

export const SnakesAndLaddersGame: React.FC<SnakesAndLaddersProps> = ({ onBack }) => {
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [gameMode, setGameMode] = useState<'AI' | '2P'>('AI');
  const [players, setPlayers] = useState<PlayerState[]>(() => initPlayers(2, 'AI'));
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [winner, setWinner] = useState<PlayerState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Player 1, roll the dice to begin!');
  const [actionBanner, setActionBanner] = useState<{ text: string; type: 'ladder' | 'snake' | 'bonus' | 'win' } | null>(null);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [activeHighlight, setActiveHighlight] = useState<{ from: number; to: number; type: 'ladder' | 'snake' } | null>(null);
  const [boardImageError, setBoardImageError] = useState<boolean>(false);

  // Animated visual coordinates for each player token
  const [visualPositions, setVisualPositions] = useState<Array<{ x: number; y: number; hopping: boolean }>>(() =>
    initPlayers(2, 'AI').map(() => ({ ...getSquareCoord(0), hopping: false }))
  );

  function initPlayers(count: number, mode: 'AI' | '2P'): PlayerState[] {
    const list: PlayerState[] = [];
    for (let i = 0; i < count; i++) {
      const prof = PLAYER_PROFILES[i % PLAYER_PROFILES.length];
      list.push({
        id: i,
        name: i === 0 ? 'Player 1' : mode === 'AI' ? `Smart Bot ${i}` : `Player ${i + 1}`,
        position: 0,
        color: prof.color,
        bgGradient: prof.bgGradient,
        ringColor: prof.ringColor,
        isAi: mode === 'AI' && i > 0,
      });
    }
    return list;
  }

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  const restartGame = () => {
    const newP = initPlayers(numPlayers, gameMode);
    setPlayers(newP);
    setVisualPositions(newP.map(() => ({ ...getSquareCoord(0), hopping: false })));
    setTurnIndex(0);
    setDiceValue(null);
    setIsRolling(false);
    setIsMoving(false);
    setWinner(null);
    setActionBanner(null);
    setActiveHighlight(null);
    setStatusMessage('Player 1, roll the dice!');
    sounds.playClick();
  };

  const currentPlayer = players[turnIndex % players.length];

  // Roll Dice Action
  const rollDice = () => {
    if (isRolling || isMoving || winner) return;

    setIsRolling(true);
    setActionBanner(null);
    setActiveHighlight(null);
    sounds.playDiceRoll();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount >= 7) {
        clearInterval(interval);
        const roll = Math.floor(Math.random() * 6) + 1;
        setDiceValue(roll);
        setIsRolling(false);
        executePlayerMove(roll);
      }
    }, 60);
  };

  // Step-by-Step animated player hop along the board
  const executePlayerMove = async (roll: number) => {
    setIsMoving(true);
    const pIdx = turnIndex % players.length;
    const player = players[pIdx];
    const startPos = player.position;
    const targetPos = startPos + roll;

    // Exact Finish Rule check
    if (targetPos > 100) {
      sounds.playBounce();
      const needed = 100 - startPos;
      setStatusMessage(`${player.name} rolled ${roll}, but needs exact roll of ${needed} to finish!`);
      setActionBanner({ text: `Overshot! Needs exact ${needed}`, type: 'bonus' });
      await new Promise((r) => setTimeout(r, 1200));
      finishTurn(roll);
      return;
    }

    // Step-by-step hopping sequence
    let currentStep = Math.max(1, startPos);
    for (let step = currentStep + 1; step <= targetPos; step++) {
      sounds.playMove();
      const coord = getSquareCoord(step);

      setVisualPositions((prev) => {
        const copy = [...prev];
        copy[pIdx] = { ...coord, hopping: true };
        return copy;
      });

      await new Promise((r) => setTimeout(r, 180));

      setVisualPositions((prev) => {
        const copy = [...prev];
        copy[pIdx] = { ...coord, hopping: false };
        return copy;
      });

      await new Promise((r) => setTimeout(r, 80));
    }

    // Landed on target square
    let finalPos = targetPos;
    const updatedPlayers = [...players];
    updatedPlayers[pIdx].position = finalPos;
    setPlayers(updatedPlayers);

    // 1. Check Ladder Encounter
    if (LADDERS[finalPos]) {
      const ladderTop = LADDERS[finalPos];
      sounds.playLadder();
      setStatusMessage(`🪜 LADDER! ${player.name} climbs from ${finalPos} up to ${ladderTop}!`);
      setActionBanner({ text: `🪜 CLIMBING LADDER to ${ladderTop}!`, type: 'ladder' });
      setActiveHighlight({ from: finalPos, to: ladderTop, type: 'ladder' });

      await new Promise((r) => setTimeout(r, 600));

      // Glide smoothly to ladder top
      const topCoord = getSquareCoord(ladderTop);
      setVisualPositions((prev) => {
        const copy = [...prev];
        copy[pIdx] = { ...topCoord, hopping: false };
        return copy;
      });

      finalPos = ladderTop;
      updatedPlayers[pIdx].position = finalPos;
      setPlayers(updatedPlayers);
      await new Promise((r) => setTimeout(r, 600));
    }
    // 2. Check Snake Encounter
    else if (SNAKES[finalPos]) {
      const snakeTail = SNAKES[finalPos];
      sounds.playSlide();
      setStatusMessage(`🐍 SNAKE! ${player.name} bit by snake, slides from ${finalPos} down to ${snakeTail}!`);
      setActionBanner({ text: `🐍 BITTEN BY SNAKE! Sliding to ${snakeTail}`, type: 'snake' });
      setActiveHighlight({ from: finalPos, to: snakeTail, type: 'snake' });

      await new Promise((r) => setTimeout(r, 600));

      // Slide smoothly to snake tail
      const tailCoord = getSquareCoord(snakeTail);
      setVisualPositions((prev) => {
        const copy = [...prev];
        copy[pIdx] = { ...tailCoord, hopping: false };
        return copy;
      });

      finalPos = snakeTail;
      updatedPlayers[pIdx].position = finalPos;
      setPlayers(updatedPlayers);
      await new Promise((r) => setTimeout(r, 600));
    }

    // 3. Check Square 100 Victory
    if (finalPos === 100) {
      setWinner(player);
      sounds.playWin();
      setStatusMessage(`🏆 ${player.name} reached square 100 and WON!`);
      setActionBanner({ text: `🏆 VICTORY FOR ${player.name.toUpperCase()}!`, type: 'win' });
      setIsMoving(false);
      return;
    }

    finishTurn(roll);
  };

  const finishTurn = (roll: number) => {
    setIsMoving(false);
    // Rolling a 6 earns a bonus turn
    if (roll === 6) {
      setStatusMessage(`${currentPlayer.name} rolled a 6 and gets another roll!`);
      setActionBanner({ text: `🎲 Rolled a 6! Roll Again!`, type: 'bonus' });
      if (currentPlayer.isAi) {
        setTimeout(rollDice, 1000);
      }
    } else {
      const nextIdx = (turnIndex + 1) % players.length;
      setTurnIndex(nextIdx);
      const nextP = players[nextIdx];
      setStatusMessage(`${nextP.name}'s turn. Roll the dice!`);
    }
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (currentPlayer && currentPlayer.isAi && !isRolling && !isMoving && !winner) {
      const timer = setTimeout(() => {
        rollDice();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [turnIndex, currentPlayer, isRolling, isMoving, winner]);

  // Procedural Board Cells array for SVG/Fallback rendering
  const boardCells: number[] = [];
  for (let r = 9; r >= 0; r--) {
    const rowStart = r * 10 + 1;
    const rowCells: number[] = [];
    for (let c = 0; c < 10; c++) rowCells.push(rowStart + c);
    if (r % 2 === 1) rowCells.reverse();
    boardCells.push(...rowCells);
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 sm:p-4 select-none">
      {/* 1. TOP MATCH HEADER */}
      <div className="w-full max-w-xl bg-gradient-to-r from-[#172033] via-[#0f172a] to-[#172033] border border-amber-500/30 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Arcade</span>
            </button>
            <span className="text-sm font-bold text-white tracking-wide font-display">SNAKES &amp; LADDERS</span>
          </div>

          {/* Mode & Player Count */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => {
                  setGameMode('AI');
                  setPlayers(initPlayers(numPlayers, 'AI'));
                  setTurnIndex(0);
                  setWinner(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  gameMode === 'AI' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>vs AI</span>
              </button>
              <button
                onClick={() => {
                  setGameMode('2P');
                  setPlayers(initPlayers(numPlayers, '2P'));
                  setTurnIndex(0);
                  setWinner(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  gameMode === '2P' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Pass &amp; Play</span>
              </button>
            </div>

            <button
              onClick={() => {
                const nextCount = numPlayers === 2 ? 4 : 2;
                setNumPlayers(nextCount);
                setPlayers(initPlayers(nextCount, gameMode));
                setTurnIndex(0);
                setWinner(null);
              }}
              className="text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              {numPlayers} Players
            </button>

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              aria-label="Toggle Sound"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Restart */}
            <button
              onClick={restartGame}
              aria-label="Restart Match"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Turn Status ribbon */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full shadow-md animate-pulse"
              style={{ backgroundColor: currentPlayer.color }}
            />
            <span className="font-bold text-white">
              {currentPlayer.name}'s Turn {currentPlayer.isAi ? '(AI)' : ''}
            </span>
          </div>

          <span className="font-medium text-amber-400">{statusMessage}</span>
        </div>
      </div>

      {/* Action Event Banner (Ladder climb / Snake slide) */}
      {actionBanner && (
        <div
          className={`w-full max-w-xl mb-2 py-1.5 px-4 rounded-xl text-xs font-bold text-center shadow-lg animate-bounce ${
            actionBanner.type === 'ladder'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
              : actionBanner.type === 'snake'
              ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white'
              : actionBanner.type === 'win'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
          }`}
        >
          {actionBanner.text}
        </div>
      )}

      {/* 2. MAIN 10x10 BOARD WITH DETAILED SNAKES & WOODEN LADDERS */}
      <div className="relative w-full max-w-xl aspect-square bg-[#3e160a] border-4 border-amber-900/80 rounded-3xl overflow-hidden shadow-2xl p-2 sm:p-3 flex items-center justify-center">
        {/* Board Surface Container */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-amber-700/60 shadow-inner bg-amber-50">
          {/* Authentic Artwork Board Image */}
          {!boardImageError ? (
            <img
              src="/assets/aistudio/image_7ae0db07.png"
              alt="Snakes and Ladders Board"
              onError={() => setBoardImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            /* Vector Canvas/SVG fallback if image unavailable */
            <div className="absolute inset-0 w-full h-full grid grid-cols-10 grid-rows-10">
              {boardCells.map((sqNum) => (
                <div
                  key={sqNum}
                  className={`border border-slate-300 p-0.5 text-[8px] font-bold flex flex-col justify-between ${
                    sqNum === 100
                      ? 'bg-red-600 text-white'
                      : LADDERS[sqNum]
                      ? 'bg-emerald-100 text-emerald-900'
                      : SNAKES[sqNum]
                      ? 'bg-rose-100 text-rose-900'
                      : sqNum % 2 === 0
                      ? 'bg-amber-100/60 text-slate-800'
                      : 'bg-white text-slate-800'
                  }`}
                >
                  <span className="font-mono">{sqNum}</span>
                </div>
              ))}
            </div>
          )}

          {/* SVG Overlay for Highlight Glows when climbing/sliding */}
          {activeHighlight && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100">
              {(() => {
                const cFrom = getSquareCoord(activeHighlight.from);
                const cTo = getSquareCoord(activeHighlight.to);
                const isLadder = activeHighlight.type === 'ladder';
                return (
                  <g>
                    <line
                      x1={cFrom.x}
                      y1={cFrom.y}
                      x2={cTo.x}
                      y2={cTo.y}
                      stroke={isLadder ? '#22c55e' : '#f43f5e'}
                      strokeWidth="3"
                      strokeDasharray="4 2"
                      className="animate-pulse"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={cTo.x}
                      cy={cTo.y}
                      r="4"
                      fill={isLadder ? '#22c55e' : '#f43f5e'}
                      className="animate-ping"
                      opacity="0.75"
                    />
                  </g>
                );
              })()}
            </svg>
          )}

          {/* Player Pawn Tokens Rendering */}
          {players.map((player, idx) => {
            const vPos = visualPositions[idx] || getSquareCoord(player.position);
            const offset = TOKEN_OFFSETS[idx % TOKEN_OFFSETS.length];

            return (
              <div
                key={player.id}
                className="absolute transition-all duration-200 z-20 pointer-events-none"
                style={{
                  left: `${vPos.x + offset.dx}%`,
                  top: `${vPos.y + offset.dy}%`,
                  transform: `translate(-50%, -50%) ${vPos.hopping ? 'translateY(-10px) scale(1.15)' : 'translateY(0) scale(1)'}`,
                }}
              >
                {/* 3D Realistic Conical Board Pawn */}
                <div className="relative flex flex-col items-center">
                  {/* Active Player Glow Ring */}
                  {turnIndex % players.length === idx && !winner && (
                    <div
                      className="absolute -inset-1 rounded-full animate-ping opacity-60"
                      style={{ backgroundColor: player.color }}
                    />
                  )}

                  {/* Drop Shadow */}
                  <div className="absolute bottom-0 w-4 h-1.5 bg-black/40 rounded-full blur-[1px]" />

                  {/* Pawn Head Ball */}
                  <div
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white shadow-md flex items-center justify-center text-[7px] font-black text-white"
                    style={{ backgroundColor: player.color }}
                  >
                    {idx + 1}
                  </div>

                  {/* Pawn Conical Skirt Base */}
                  <div
                    className="w-4 h-2 sm:w-5 sm:h-2.5 rounded-b-md border-b border-x border-white/60 shadow-inner"
                    style={{ backgroundColor: player.color }}
                  />
                </div>
              </div>
            );
          })}

          {/* Victory Trophy Modal Screen */}
          {winner && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 text-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.6)]">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">Square 100 Reached!</span>
              <h2 className="text-3xl font-extrabold text-white mb-2">{winner.name} Wins!</h2>
              <p className="text-xs text-slate-400 mb-6">Congratulations on conquering all the snakes and ladders!</p>

              <button
                onClick={restartGame}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-7 py-3 rounded-xl transition-all shadow-lg active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. PLAYER STANDINGS & PROGRESS HUD */}
      <div className={`grid gap-2 w-full max-w-xl mt-3 ${numPlayers === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {players.map((p, idx) => {
          const isCurrent = turnIndex % players.length === idx && !winner;
          return (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                isCurrent
                  ? 'bg-slate-900 border-amber-500/70 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-white"
                  style={{ backgroundColor: p.color }}
                />
                <span className="font-semibold text-slate-200 truncate">{p.name}</span>
              </div>
              <span className="font-mono font-bold text-amber-400 text-xs">
                {p.position === 0 ? 'Start' : `Sq ${p.position}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 4. 3D DICE ROLLING STATION */}
      <div className="w-full max-w-xl mt-3 bg-gradient-to-b from-[#1b2333] to-[#0f172a] border border-amber-500/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
        {/* Animated 3D Dice Button */}
        <button
          onClick={rollDice}
          disabled={isRolling || isMoving || currentPlayer.isAi || !!winner}
          className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/60 shadow-xl flex flex-col items-center justify-center transition-all active:scale-95 ${
            !currentPlayer.isAi && !isRolling && !isMoving && !winner
              ? 'ring-4 ring-amber-500/50 hover:bg-slate-800 cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              : 'opacity-70 cursor-not-allowed'
          }`}
        >
          {isRolling ? (
            <Dices className="w-9 h-9 text-amber-400 animate-spin" />
          ) : diceValue ? (
            <span className="font-display font-extrabold text-4xl text-amber-400 drop-shadow-md">{diceValue}</span>
          ) : (
            <>
              <Dices className="w-7 h-7 text-amber-400 mb-1" />
              <span className="text-[10px] font-bold text-amber-300">ROLL</span>
            </>
          )}
        </button>

        {/* Dice Instruction and Legend */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white">
              {currentPlayer.isAi ? 'AI Bot Rolling...' : isMoving ? 'Moving Pawn...' : 'Your Turn to Roll!'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            🪜 Climb ladders to skip ahead. 🐍 Dodge snakes sliding you back! Rolling a <strong>6</strong> awards an extra turn.
          </p>
        </div>

        {/* Roll Action Button for Touch & Mobile */}
        <button
          onClick={rollDice}
          disabled={isRolling || isMoving || currentPlayer.isAi || !!winner}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95"
        >
          {isRolling ? 'Rolling...' : isMoving ? 'Pawn Hopping...' : 'Roll Dice'}
        </button>
      </div>

      {/* Info Status footer */}
      <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span>Need exact roll to land on square 100.</span>
      </div>
    </div>
  );
};
