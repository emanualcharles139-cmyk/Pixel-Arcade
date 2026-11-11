import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Volume2,
  VolumeX,
  User,
  Cpu,
  Trophy,
  Users,
  Play,
  HelpCircle,
  X,
  Crown,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface LudoProps {
  onBack: () => void;
}

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1: Yard, 0..50: Circuit, 51..55: Home corridor, 56: Reached Home Center (finished)
}

interface PlayerConfig {
  color: PlayerColor;
  name: string;
  avatar: string;
  isAi: boolean;
  score: number;
}

// 15x15 Grid coordinate mapping for the 52 common path tiles (clockwise)
// [row, col] on 0-indexed 15x15 board
const TRACK_COORDS: [number, number][] = [
  [6, 1],  // 0: Red Start (Safe)
  [6, 2],  // 1
  [6, 3],  // 2
  [6, 4],  // 3
  [6, 5],  // 4
  [5, 6],  // 5
  [4, 6],  // 6
  [3, 6],  // 7
  [2, 6],  // 8: Safe Star ★
  [1, 6],  // 9
  [0, 6],  // 10
  [0, 7],  // 11
  [0, 8],  // 12
  [1, 8],  // 13: Green Start (Safe)
  [2, 8],  // 14
  [3, 8],  // 15
  [4, 8],  // 16
  [5, 8],  // 17
  [6, 9],  // 18
  [6, 10], // 19
  [6, 11], // 20
  [6, 12], // 21: Safe Star ★
  [6, 13], // 22
  [6, 14], // 23
  [7, 14], // 24
  [8, 14], // 25
  [8, 13], // 26: Yellow Start (Safe)
  [8, 12], // 27
  [8, 11], // 28
  [8, 10], // 29
  [8, 9],  // 30
  [9, 8],  // 31
  [10, 8], // 32
  [11, 8], // 33
  [12, 8], // 34: Safe Star ★
  [13, 8], // 35
  [14, 8], // 36
  [14, 7], // 37
  [14, 6], // 38
  [13, 6], // 39: Blue Start (Safe)
  [12, 6], // 40
  [11, 6], // 41
  [10, 6], // 42
  [9, 6],  // 43
  [8, 5],  // 44
  [8, 4],  // 45
  [8, 3],  // 46
  [8, 2],  // 47: Safe Star ★
  [8, 1],  // 48
  [8, 0],  // 49
  [7, 0],  // 50
  [6, 0],  // 51
];

// Start offsets on the 52-tile circuit
const START_POS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Safe tiles (cannot be captured here)
const SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home corridors (steps 51 to 55) and Center Home (step 56)
const HOME_CORRIDORS: Record<PlayerColor, [number, number][]> = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6], // Home Center
  ],
  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
    [6, 7], // Home Center
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
    [7, 8], // Home Center
  ],
  blue: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
    [8, 7], // Home Center
  ],
};

// Fixed positions inside the 6x6 base yards [row, col]
const YARD_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [
    [1.7, 1.7],
    [1.7, 4.3],
    [4.3, 1.7],
    [4.3, 4.3],
  ],
  green: [
    [1.7, 10.7],
    [1.7, 13.3],
    [4.3, 10.7],
    [4.3, 13.3],
  ],
  yellow: [
    [10.7, 10.7],
    [10.7, 13.3],
    [13.3, 10.7],
    [13.3, 13.3],
  ],
  blue: [
    [10.7, 1.7],
    [10.7, 4.3],
    [13.3, 1.7],
    [13.3, 4.3],
  ],
};

const COLOR_CONFIG: Record<
  PlayerColor,
  {
    name: string;
    bg: string;
    text: string;
    hex: string;
    border: string;
    glow: string;
    shadow: string;
    gradient: string;
    darkHex: string;
  }
> = {
  red: {
    name: 'Red',
    bg: 'bg-red-600',
    text: 'text-red-500',
    hex: '#ef4444',
    darkHex: '#b91c1c',
    border: 'border-red-500',
    glow: 'rgba(239, 68, 68, 0.4)',
    shadow: 'shadow-red-500/30',
    gradient: 'from-red-500 to-rose-700',
  },
  green: {
    name: 'Green',
    bg: 'bg-emerald-600',
    text: 'text-emerald-500',
    hex: '#10b981',
    darkHex: '#047857',
    border: 'border-emerald-500',
    glow: 'rgba(16, 185, 129, 0.4)',
    shadow: 'shadow-emerald-500/30',
    gradient: 'from-emerald-500 to-green-700',
  },
  yellow: {
    name: 'Yellow',
    bg: 'bg-amber-500',
    text: 'text-amber-500',
    hex: '#f59e0b',
    darkHex: '#b45309',
    border: 'border-amber-500',
    glow: 'rgba(245, 158, 11, 0.4)',
    shadow: 'shadow-amber-500/30',
    gradient: 'from-amber-400 to-amber-600',
  },
  blue: {
    name: 'Blue',
    bg: 'bg-blue-600',
    text: 'text-blue-500',
    hex: '#3b82f6',
    darkHex: '#1d4ed8',
    border: 'border-blue-500',
    glow: 'rgba(59, 130, 246, 0.4)',
    shadow: 'shadow-blue-500/30',
    gradient: 'from-blue-500 to-indigo-700',
  },
};

const DEFAULT_AVATARS: Record<PlayerColor, { name: string; icon: string }> = {
  red: { name: 'Player 1', icon: '👑' },
  green: { name: 'Sarah', icon: '🌸' },
  yellow: { name: 'Alex', icon: '⚡' },
  blue: { name: 'Maya', icon: '🛡️' },
};

export const LudoGame: React.FC<LudoProps> = ({ onBack }) => {
  // Game Setup State
  const [inLobby, setInLobby] = useState<boolean>(true);
  const [numPlayers, setNumPlayers] = useState<2 | 3 | 4>(2);
  const [gameMode, setGameMode] = useState<'AI' | 'PASS_PLAY'>('AI');
  const [showRules, setShowRules] = useState<boolean>(false);

  // Active Match State
  const [activeColors, setActiveColors] = useState<PlayerColor[]>(['red', 'yellow']);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceRotation, setDiceRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tokens, setTokens] = useState<Token[]>(() => initTokens());
  const [movableTokenIds, setMovableTokenIds] = useState<number[]>([]);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Roll the dice to start!');
  const [soundMuted, setSoundMuted] = useState<boolean>(!sounds.enabled);
  const [captureFlash, setCaptureFlash] = useState<string | null>(null);
  const [extraTurnBanner, setExtraTurnBanner] = useState<boolean>(false);

  // Stats
  const [stats, setStats] = useState<{ captures: number; totalRolls: number; sixes: number }>({
    captures: 0,
    totalRolls: 0,
    sixes: 0,
  });

  const rollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function initTokens(): Token[] {
    const list: Token[] = [];
    let id = 0;
    (['red', 'green', 'yellow', 'blue'] as PlayerColor[]).forEach((c) => {
      for (let i = 0; i < 4; i++) {
        list.push({ id: id++, color: c, step: -1 });
      }
    });
    return list;
  }

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  const startNewMatch = (pCount: 2 | 3 | 4, mode: 'AI' | 'PASS_PLAY') => {
    let colors: PlayerColor[] = ['red', 'yellow'];
    if (pCount === 3) colors = ['red', 'green', 'yellow'];
    if (pCount === 4) colors = ['red', 'green', 'yellow', 'blue'];

    setActiveColors(colors);
    setNumPlayers(pCount);
    setGameMode(mode);
    setTokens(initTokens());
    setCurrentTurnIndex(0);
    setDiceValue(null);
    setIsRolling(false);
    setMovableTokenIds([]);
    setWinner(null);
    setCaptureFlash(null);
    setExtraTurnBanner(false);
    setStats({ captures: 0, totalRolls: 0, sixes: 0 });
    setStatusMessage(`${COLOR_CONFIG[colors[0]].name}'s turn to roll!`);
    setInLobby(false);
    sounds.playClick();
  };

  const restartMatch = () => {
    startNewMatch(numPlayers, gameMode);
  };

  const currentColor: PlayerColor = activeColors[currentTurnIndex % activeColors.length];
  const isAiTurn = gameMode === 'AI' && currentColor !== 'red';

  // Compute legal moves given rolled dice
  const computeMovableTokens = (val: number, playerTokens: Token[]) => {
    const validIds: number[] = [];
    playerTokens.forEach((t) => {
      if (t.step === -1) {
        // Must roll a 6 to release from yard
        if (val === 6) validIds.push(t.id);
      } else if (t.step < 56) {
        // On circuit or home corridor
        if (t.step + val <= 56) {
          validIds.push(t.id);
        }
      }
    });
    return validIds;
  };

  // Roll Dice Action
  const rollDice = useCallback(() => {
    if (isRolling || diceValue !== null || winner) return;

    setIsRolling(true);
    sounds.playDiceRoll();
    setStats((s) => ({ ...s, totalRolls: s.totalRolls + 1 }));

    // Tumble rotation
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setDiceRotation({
        x: Math.floor(Math.random() * 360),
        y: Math.floor(Math.random() * 360),
      });
      setDiceValue(Math.floor(Math.random() * 6) + 1);

      if (frame >= 8) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalVal);
        setIsRolling(false);
        setDiceRotation({ x: 0, y: 0 });

        if (finalVal === 6) {
          setStats((s) => ({ ...s, sixes: s.sixes + 1 }));
        }

        processRoll(finalVal);
      }
    }, 55);
  }, [isRolling, diceValue, winner, currentColor, tokens]);

  // Process rolled dice outcome
  const processRoll = (val: number) => {
    const playerTokens = tokens.filter((t) => t.color === currentColor);
    const validMoves = computeMovableTokens(val, playerTokens);
    setMovableTokenIds(validMoves);

    if (validMoves.length === 0) {
      // No moves available
      setStatusMessage(`${COLOR_CONFIG[currentColor].name} rolled ${val}. No legal moves.`);
      setTimeout(() => {
        passTurn(false);
      }, 900);
    } else if (validMoves.length === 1 && isAiTurn) {
      // Auto move single option for AI
      setTimeout(() => {
        moveToken(validMoves[0], val);
      }, 600);
    } else {
      setStatusMessage(
        isAiTurn
          ? `${COLOR_CONFIG[currentColor].name} is choosing a move...`
          : `Rolled ${val}! Tap a pulsing token to move.`
      );

      if (isAiTurn) {
        setTimeout(() => {
          const chosenId = chooseAiMove(validMoves, val);
          moveToken(chosenId, val);
        }, 750);
      }
    }
  };

  // Smart heuristic for AI
  const chooseAiMove = (validIds: number[], val: number): number => {
    // 1. Can we capture an opponent?
    for (const id of validIds) {
      const t = tokens[id];
      const targetStep = t.step === -1 ? 0 : t.step + val;
      if (targetStep < 51) {
        const targetTile = (START_POS[t.color] + targetStep) % 52;
        if (!SAFE_TILES.includes(targetTile)) {
          const opponent = tokens.find(
            (o) => o.color !== t.color && o.step >= 0 && o.step < 51 && (START_POS[o.color] + o.step) % 52 === targetTile
          );
          if (opponent) return id;
        }
      }
    }

    // 2. Can we score into home?
    const homeFinish = validIds.find((id) => tokens[id].step + val === 56);
    if (homeFinish !== undefined) return homeFinish;

    // 3. Bring out of yard on 6
    if (val === 6) {
      const yardToken = validIds.find((id) => tokens[id].step === -1);
      if (yardToken !== undefined) return yardToken;
    }

    // 4. Advance token closest to home
    return validIds.reduce((best, curr) => (tokens[curr].step > tokens[best].step ? curr : best), validIds[0]);
  };

  // Move token
  const moveToken = (tokenId: number, rollVal: number) => {
    sounds.playMove();
    const newTokens = [...tokens];
    const token = newTokens[tokenId];

    if (token.step === -1) {
      token.step = 0; // Exits to start square
    } else {
      token.step += rollVal;
    }

    // Check capture
    let captured = false;
    if (token.step >= 0 && token.step < 51) {
      const currentGlobalTile = (START_POS[token.color] + token.step) % 52;
      const isSafe = SAFE_TILES.includes(currentGlobalTile);

      if (!isSafe) {
        newTokens.forEach((other) => {
          if (other.color !== token.color && other.step >= 0 && other.step < 51) {
            const otherGlobalTile = (START_POS[other.color] + other.step) % 52;
            if (otherGlobalTile === currentGlobalTile) {
              other.step = -1; // Send back to yard!
              captured = true;
              setStats((s) => ({ ...s, captures: s.captures + 1 }));
              sounds.playSmash();
              setCaptureFlash(
                `💥 ${COLOR_CONFIG[token.color].name} captured ${COLOR_CONFIG[other.color].name}!`
              );
              setTimeout(() => setCaptureFlash(null), 1800);
            }
          }
        });
      }
    }

    // Check victory: all 4 tokens finished (step === 56)
    const playerTokens = newTokens.filter((t) => t.color === currentColor);
    const allHome = playerTokens.every((t) => t.step === 56);

    setTokens(newTokens);
    setMovableTokenIds([]);

    if (allHome) {
      setWinner(currentColor);
      sounds.playWin();
      setStatusMessage(`🏆 ${COLOR_CONFIG[currentColor].name.toUpperCase()} WINS THE MATCH!`);
      return;
    }

    // Bonus roll rule: rolling a 6 OR capturing an opponent grants another turn!
    const getsBonus = rollVal === 6 || captured;
    if (getsBonus) {
      setExtraTurnBanner(true);
      setTimeout(() => setExtraTurnBanner(false), 1400);
      setStatusMessage(`${COLOR_CONFIG[currentColor].name} gets a BONUS ROLL! 🎉`);
      setDiceValue(null);
      if (isAiTurn) {
        setTimeout(rollDice, 900);
      }
    } else {
      passTurn(false);
    }
  };

  const passTurn = (bonus: boolean) => {
    setDiceValue(null);
    setMovableTokenIds([]);
    if (!bonus) {
      const nextIdx = (currentTurnIndex + 1) % activeColors.length;
      setCurrentTurnIndex(nextIdx);
      const nextCol = activeColors[nextIdx];
      setStatusMessage(`${COLOR_CONFIG[nextCol].name}'s turn to roll!`);
    }
  };

  // Trigger AI roll automatically
  useEffect(() => {
    if (isAiTurn && !isRolling && diceValue === null && !winner && !inLobby) {
      rollingTimeoutRef.current = setTimeout(() => {
        rollDice();
      }, 700);
      return () => {
        if (rollingTimeoutRef.current) clearTimeout(rollingTimeoutRef.current);
      };
    }
  }, [currentTurnIndex, isAiTurn, diceValue, winner, inLobby, rollDice]);

  // Calculate pixel percentages on the 15x15 board for any token
  const getTokenPosition = (token: Token, tokenIndexInYard: number) => {
    let r = 0;
    let c = 0;

    if (token.step === -1) {
      // In Yard
      const coords = YARD_COORDS[token.color][tokenIndexInYard];
      r = coords[0];
      c = coords[1];
    } else if (token.step < 51) {
      // On outer 52 circuit
      const tileIndex = (START_POS[token.color] + token.step) % 52;
      const coords = TRACK_COORDS[tileIndex];
      r = coords[0];
      c = coords[1];
    } else {
      // In home corridor or home center (51..56)
      const corridorIdx = Math.min(5, token.step - 51);
      const coords = HOME_CORRIDORS[token.color][corridorIdx];
      r = coords[0];
      c = coords[1];
    }

    // Offset tokens sharing the same tile so they don't cover each other
    let offsetX = 0;
    let offsetY = 0;
    if (token.step >= 0 && token.step < 56) {
      // Find other tokens on the exact same tile
      const currentGlobalTile =
        token.step < 51 ? (START_POS[token.color] + token.step) % 52 : -100 - token.step;
      const sameTileTokens = tokens.filter((other) => {
        if (other.step === -1 || other.step === 56) return false;
        if (token.step < 51 && other.step < 51) {
          return (START_POS[other.color] + other.step) % 52 === currentGlobalTile;
        }
        return other.color === token.color && other.step === token.step;
      });

      if (sameTileTokens.length > 1) {
        const orderIndex = sameTileTokens.findIndex((t) => t.id === token.id);
        const angles = [0, Math.PI, Math.PI / 2, (3 * Math.PI) / 2];
        const dist = 1.1; // percentage shift
        offsetX = Math.cos(angles[orderIndex % 4]) * dist;
        offsetY = Math.sin(angles[orderIndex % 4]) * dist;
      }
    }

    const xPercent = (c + 0.5) * (100 / 15) + offsetX;
    const yPercent = (r + 0.5) * (100 / 15) + offsetY;

    return { top: `${yPercent}%`, left: `${xPercent}%` };
  };

  // Render 3D Dice Face
  const renderDiceFace = (val: number | null, isCurrentPlayer: boolean) => {
    if (isRolling && isCurrentPlayer) {
      return (
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-400 shadow-xl flex items-center justify-center animate-spin">
          <Zap className="w-6 h-6 text-amber-600 animate-pulse" />
        </div>
      );
    }

    const pipClass = 'w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-900 shadow-inner';
    const displayVal = val || 6;

    return (
      <div
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-200 border-2 ${
          isCurrentPlayer ? 'border-amber-400 shadow-lg ring-2 ring-amber-400/50' : 'border-slate-300 shadow-md'
        } p-2 flex flex-col justify-between transition-transform duration-200`}
      >
        {displayVal === 1 && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-inner" />
          </div>
        )}

        {displayVal === 2 && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-start">
              <div className={pipClass} />
            </div>
            <div className="flex justify-end">
              <div className={pipClass} />
            </div>
          </div>
        )}

        {displayVal === 3 && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-start">
              <div className={pipClass} />
            </div>
            <div className="flex justify-center">
              <div className={pipClass} />
            </div>
            <div className="flex justify-end">
              <div className={pipClass} />
            </div>
          </div>
        )}

        {displayVal === 4 && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
          </div>
        )}

        {displayVal === 5 && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
            <div className="flex justify-center">
              <div className={pipClass} />
            </div>
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
          </div>
        )}

        {displayVal === 6 && (
          <div className="w-full h-full flex flex-col justify-between">
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
            <div className="flex justify-between">
              <div className={pipClass} />
              <div className={pipClass} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Player Card (matches Reference 2 layout)
  const renderPlayerCard = (col: PlayerColor, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
    if (!activeColors.includes(col)) {
      return (
        <div
          className={`flex items-center gap-2 p-2 rounded-xl bg-slate-900/40 border border-slate-800/40 opacity-30 select-none ${
            position.includes('right') ? 'flex-row-reverse text-right' : 'text-left'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 font-bold">
            -
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Unused</div>
            <div className="text-[9px] text-slate-600">Inactive</div>
          </div>
        </div>
      );
    }

    const isTurn = currentColor === col;
    const playerTokens = tokens.filter((t) => t.color === col);
    const finishedCount = playerTokens.filter((t) => t.step === 56).length;
    const isHuman = gameMode === 'PASS_PLAY' || col === 'red';

    return (
      <div
        className={`relative flex items-center gap-2.5 p-2 sm:p-2.5 rounded-2xl border transition-all duration-300 backdrop-blur-md ${
          position.includes('right') ? 'flex-row-reverse text-right' : 'text-left'
        } ${
          isTurn
            ? `${COLOR_CONFIG[col].bg} border-amber-300 shadow-xl ring-2 ring-amber-400 scale-[1.03] z-20`
            : 'bg-slate-900/80 border-slate-800/80 shadow-md'
        }`}
      >
        {/* Avatar with Turn Halo */}
        <div className="relative">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${COLOR_CONFIG[col].gradient} border-2 border-white/60 flex items-center justify-center text-xl shadow-md ${
              isTurn ? 'animate-bounce' : ''
            }`}
          >
            {DEFAULT_AVATARS[col].icon}
          </div>
          {isTurn && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-white flex items-center justify-center text-[8px] font-black text-slate-950 animate-ping" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 justify-start">
            <span
              className={`text-xs sm:text-sm font-black tracking-wide ${
                isTurn ? 'text-white' : 'text-slate-200'
              }`}
            >
              {DEFAULT_AVATARS[col].name}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                isHuman ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-700/60 text-slate-400'
              }`}
            >
              {isHuman ? 'YOU' : 'BOT'}
            </span>
          </div>

          {/* Tokens home progress bar */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full border ${
                  i < finishedCount
                    ? 'bg-amber-300 border-white shadow-sm'
                    : 'bg-slate-800 border-slate-600'
                }`}
              />
            ))}
            <span className={`text-[10px] font-mono ml-1 ${isTurn ? 'text-white' : 'text-slate-400'}`}>
              {finishedCount}/4
            </span>
          </div>
        </div>

        {/* Dice Slot in Card */}
        {isTurn && (
          <div className="ml-auto flex items-center">
            {renderDiceFace(diceValue, true)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 sm:p-4 select-none">
      {/* Top Navbar */}
      <div className="w-full flex items-center justify-between bg-slate-900/95 border border-slate-800 rounded-xl px-4 py-2.5 mb-3 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Arcade</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-extrabold text-white tracking-wide">PIXEL LUDO</span>
          </div>
        </div>

        {/* Mode & Action shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            aria-label="How to play"
            className="flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setInLobby(true)}
            aria-label="Change Match"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Game Card */}
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center">
        {/* 4 Corner Player Cards (matches Reference 2 layout) */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 mb-3">
          {renderPlayerCard('red', 'top-left')}
          {renderPlayerCard('green', 'top-right')}
        </div>

        {/* Status / Announcement Ticker */}
        <div className="relative w-full py-1.5 px-4 mb-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-center overflow-hidden">
          <span className="text-xs font-semibold text-slate-300 truncate mx-auto">
            {statusMessage}
          </span>
          {extraTurnBanner && (
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 animate-pulse">
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>EXTRA ROLL AWARDED!</span>
            </div>
          )}
          {captureFlash && (
            <div className="absolute inset-0 bg-red-600 text-white font-black text-xs flex items-center justify-center gap-1.5 animate-pulse">
              <span>{captureFlash}</span>
            </div>
          )}
        </div>

        {/* 15x15 Traditional Ludo Board Graphic (Authentic Mobile-Game Style) */}
        <div className="relative w-full max-w-[420px] aspect-square bg-amber-50 rounded-2xl border-4 border-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* SVG Board Rendering for crisp 15x15 grid lines & colors */}
          <svg viewBox="0 0 15 15" className="w-full h-full select-none pointer-events-none">
            {/* Background Grid */}
            <rect x="0" y="0" width="15" height="15" fill="#fdfbf7" />

            {/* Red Base (Top-Left 6x6) */}
            <rect x="0" y="0" width="6" height="6" fill="#ef4444" />
            <rect x="0.8" y="0.8" width="4.4" height="4.4" rx="0.5" fill="#ffffff" />
            {/* 4 circular yards for Red */}
            <circle cx="2.2" cy="2.2" r="0.9" fill="#fee2e2" stroke="#ef4444" strokeWidth="0.15" />
            <circle cx="3.8" cy="2.2" r="0.9" fill="#fee2e2" stroke="#ef4444" strokeWidth="0.15" />
            <circle cx="2.2" cy="3.8" r="0.9" fill="#fee2e2" stroke="#ef4444" strokeWidth="0.15" />
            <circle cx="3.8" cy="3.8" r="0.9" fill="#fee2e2" stroke="#ef4444" strokeWidth="0.15" />

            {/* Green Base (Top-Right 6x6) */}
            <rect x="9" y="0" width="6" height="6" fill="#10b981" />
            <rect x="9.8" y="0.8" width="4.4" height="4.4" rx="0.5" fill="#ffffff" />
            {/* 4 circular yards for Green */}
            <circle cx="11.2" cy="2.2" r="0.9" fill="#d1fae5" stroke="#10b981" strokeWidth="0.15" />
            <circle cx="12.8" cy="2.2" r="0.9" fill="#d1fae5" stroke="#10b981" strokeWidth="0.15" />
            <circle cx="11.2" cy="3.8" r="0.9" fill="#d1fae5" stroke="#10b981" strokeWidth="0.15" />
            <circle cx="12.8" cy="3.8" r="0.9" fill="#d1fae5" stroke="#10b981" strokeWidth="0.15" />

            {/* Blue Base (Bottom-Left 6x6) */}
            <rect x="0" y="9" width="6" height="6" fill="#3b82f6" />
            <rect x="0.8" y="9.8" width="4.4" height="4.4" rx="0.5" fill="#ffffff" />
            {/* 4 circular yards for Blue */}
            <circle cx="2.2" cy="11.2" r="0.9" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.15" />
            <circle cx="3.8" cy="11.2" r="0.9" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.15" />
            <circle cx="2.2" cy="12.8" r="0.9" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.15" />
            <circle cx="3.8" cy="12.8" r="0.9" fill="#dbeafe" stroke="#3b82f6" strokeWidth="0.15" />

            {/* Yellow Base (Bottom-Right 6x6) */}
            <rect x="9" y="9" width="6" height="6" fill="#f59e0b" />
            <rect x="9.8" y="9.8" width="4.4" height="4.4" rx="0.5" fill="#ffffff" />
            {/* 4 circular yards for Yellow */}
            <circle cx="11.2" cy="11.2" r="0.9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.15" />
            <circle cx="12.8" cy="11.2" r="0.9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.15" />
            <circle cx="11.2" cy="12.8" r="0.9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.15" />
            <circle cx="12.8" cy="12.8" r="0.9" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.15" />

            {/* Colored Home Corridors */}
            {/* Red home column (left to center: row 7, cols 1..5) */}
            <rect x="1" y="7" width="5" height="1" fill="#ef4444" />
            {/* Red starting tile [6, 1] */}
            <rect x="1" y="6" width="1" height="1" fill="#ef4444" />

            {/* Green home column (top to center: col 7, rows 1..5) */}
            <rect x="7" y="1" width="1" height="5" fill="#10b981" />
            {/* Green starting tile [1, 8] */}
            <rect x="8" y="1" width="1" height="1" fill="#10b981" />

            {/* Yellow home column (right to center: row 7, cols 9..13) */}
            <rect x="9" y="7" width="5" height="1" fill="#f59e0b" />
            {/* Yellow starting tile [8, 13] */}
            <rect x="13" y="8" width="1" height="1" fill="#f59e0b" />

            {/* Blue home column (bottom to center: col 7, rows 9..13) */}
            <rect x="7" y="9" width="1" height="5" fill="#3b82f6" />
            {/* Blue starting tile [13, 6] */}
            <rect x="6" y="13" width="1" height="1" fill="#3b82f6" />

            {/* Center Home Triangles (3x3 area: rows 6..8, cols 6..8) */}
            <polygon points="6,6 9,6 7.5,7.5" fill="#10b981" /> {/* Green Top */}
            <polygon points="9,6 9,9 7.5,7.5" fill="#f59e0b" /> {/* Yellow Right */}
            <polygon points="6,9 9,9 7.5,7.5" fill="#3b82f6" /> {/* Blue Bottom */}
            <polygon points="6,6 6,9 7.5,7.5" fill="#ef4444" /> {/* Red Left */}

            {/* Center Crown Emblem */}
            <circle cx="7.5" cy="7.5" r="0.75" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.08" />

            {/* 15x15 Grid Lines for Middle Paths */}
            {Array.from({ length: 16 }).map((_, i) => (
              <React.Fragment key={i}>
                {/* Horizontal lines */}
                <line x1="0" y1={i} x2="15" y2={i} stroke="#cbd5e1" strokeWidth="0.04" />
                {/* Vertical lines */}
                <line x1={i} y1="0" x2={i} y2="15" stroke="#cbd5e1" strokeWidth="0.04" />
              </React.Fragment>
            ))}

            {/* Safe Stars ★ on Tiles 8, 21, 34, 47 */}
            {/* Tile 8: [2, 6] */}
            <text x="6.5" y="2.7" fontSize="0.7" fill="#64748b" textAnchor="middle" fontWeight="bold">
              ★
            </text>
            {/* Tile 21: [6, 12] */}
            <text x="12.5" y="6.7" fontSize="0.7" fill="#64748b" textAnchor="middle" fontWeight="bold">
              ★
            </text>
            {/* Tile 34: [12, 8] */}
            <text x="8.5" y="12.7" fontSize="0.7" fill="#64748b" textAnchor="middle" fontWeight="bold">
              ★
            </text>
            {/* Tile 47: [8, 2] */}
            <text x="2.5" y="8.7" fontSize="0.7" fill="#64748b" textAnchor="middle" fontWeight="bold">
              ★
            </text>

            {/* Starting tile arrows */}
            <text x="1.5" y="6.7" fontSize="0.5" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              →
            </text>
            <text x="8.5" y="1.7" fontSize="0.5" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              ↓
            </text>
            <text x="13.5" y="8.7" fontSize="0.5" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              ←
            </text>
            <text x="6.5" y="13.7" fontSize="0.5" fill="#ffffff" textAnchor="middle" fontWeight="bold">
              ↑
            </text>
          </svg>

          {/* Tokens Layer on the 15x15 Board */}
          {tokens.map((t) => {
            const isMovable = movableTokenIds.includes(t.id);
            const tokenIndexInYard = t.id % 4;
            const pos = getTokenPosition(t, tokenIndexInYard);
            const isFinished = t.step === 56;

            return (
              <button
                key={t.id}
                onClick={() => {
                  if (isMovable && diceValue && !isAiTurn) {
                    moveToken(t.id, diceValue);
                  }
                }}
                disabled={!isMovable || isAiTurn}
                style={{
                  top: pos.top,
                  left: pos.left,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-all duration-300 z-10 flex items-center justify-center ${
                  isFinished ? 'opacity-30 pointer-events-none scale-75' : ''
                } ${
                  isMovable && !isAiTurn
                    ? 'ring-4 ring-amber-400 scale-125 z-30 cursor-pointer animate-bounce shadow-xl'
                    : 'shadow-md'
                }`}
              >
                {/* 3D Glossy Pawn Head */}
                <div
                  className={`relative w-full h-full rounded-full bg-gradient-to-br ${COLOR_CONFIG[t.color].gradient} border-2 border-white flex items-center justify-center shadow-lg`}
                >
                  {/* Specular 3D Reflection */}
                  <div className="absolute top-0.5 left-1 w-2 h-1 rounded-full bg-white/70 transform -rotate-45" />

                  {/* Token Number / Dot */}
                  <span className="text-[9px] font-black text-white drop-shadow-sm">
                    {tokenIndexInYard + 1}
                  </span>
                </div>

                {/* Soft Drop Shadow under token */}
                <div className="absolute -bottom-1 w-4 h-1.5 rounded-full bg-slate-900/40 blur-[1px] pointer-events-none" />
              </button>
            );
          })}
        </div>

        {/* Bottom 2 Corner Player Cards */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-3 mt-3">
          {renderPlayerCard('blue', 'bottom-left')}
          {renderPlayerCard('yellow', 'bottom-right')}
        </div>

        {/* Central Roll Button Station */}
        <div className="w-full mt-4 flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={rollDice}
              disabled={isRolling || diceValue !== null || isAiTurn || !!winner}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
                !diceValue && !isAiTurn && !winner
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/20 cursor-pointer animate-pulse'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{isRolling ? 'ROLLING...' : 'ROLL DICE'}</span>
            </button>

            <span className="text-xs text-slate-400 hidden sm:inline">
              {isAiTurn ? 'Bot is making its move...' : 'Roll a 6 to free a token or take another roll!'}
            </span>
          </div>

          {/* Quick Stats Counter */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">Captures</span>
              <span className="font-bold text-red-400">{stats.captures}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase">6s Rolled</span>
              <span className="font-bold text-amber-400">{stats.sixes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MATCH LOBBY MODAL (Matches Reference 1) */}
      {inLobby && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            {/* Royal Crown & Title */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
              <Crown className="w-9 h-9 text-amber-400" />
            </div>

            <h2 className="text-3xl font-black text-white tracking-wider mb-1">PIXEL LUDO</h2>
            <p className="text-xs text-slate-400 mb-6">Traditional 4-Color Board Arcade</p>

            {/* Game Mode Selection */}
            <div className="mb-5 text-left">
              <label className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wider">
                Select Game Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameMode('AI')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                    gameMode === 'AI'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-5 h-5 mb-1 text-amber-400" />
                  <span className="text-xs font-bold">vs Computer</span>
                  <span className="text-[10px] text-slate-500">Play against smart bots</span>
                </button>

                <button
                  onClick={() => setGameMode('PASS_PLAY')}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all ${
                    gameMode === 'PASS_PLAY'
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-5 h-5 mb-1 text-sky-400" />
                  <span className="text-xs font-bold">Pass &amp; Play</span>
                  <span className="text-[10px] text-slate-500">Local multiplayer</span>
                </button>
              </div>
            </div>

            {/* Number of Players */}
            <div className="mb-6 text-left">
              <label className="text-xs font-bold text-slate-300 block mb-2 uppercase tracking-wider">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => setNumPlayers(count as 2 | 3 | 4)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      numPlayers === count
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Match Button */}
            <button
              onClick={() => startNewMatch(numPlayers, gameMode)}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 rounded-xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 text-sm uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>START MATCH</span>
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {winner && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mb-3 shadow-xl shadow-amber-500/20 animate-bounce">
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>

            <div className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Match Complete</div>
            <h2 className="text-3xl font-black text-white mb-2">
              {COLOR_CONFIG[winner].name.toUpperCase()} WINS!
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              All 4 tokens successfully returned home!
            </p>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Captures</span>
                <span className="text-xl font-bold font-mono text-red-400">{stats.captures}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Dice Rolls</span>
                <span className="text-xl font-bold font-mono text-amber-400">{stats.totalRolls}</span>
              </div>
            </div>

            <button
              onClick={restartMatch}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>PLAY AGAIN</span>
            </button>
          </div>
        </div>
      )}

      {/* RULES MODAL */}
      {showRules && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left">
            <button
              onClick={() => setShowRules(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>Traditional Ludo Rules</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <p>
                  <strong>Starting:</strong> A player must roll a <strong>6</strong> to bring a token out of their home yard onto the start square.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <p>
                  <strong>Bonus Roll:</strong> Rolling a <strong>6</strong> or <strong>capturing</strong> an opponent's token awards an immediate extra roll.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <p>
                  <strong>Capturing:</strong> Landing on a square occupied by an opponent's token sends it back to their yard, unless it is on a safe square.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <p>
                  <strong>Safe Zones:</strong> All starting squares and squares marked with a star (★) are safe. Multiple tokens can safely share these squares.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  5
                </span>
                <p>
                  <strong>Winning:</strong> The first player to navigate all 4 tokens completely around the track and into their home center wins the match.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
