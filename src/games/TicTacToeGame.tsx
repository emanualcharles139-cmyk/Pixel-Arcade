import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, User, Cpu, Volume2, VolumeX, Trophy } from 'lucide-react';
import { sounds } from '../utils/audio';

interface TicTacToeProps {
  onBack: () => void;
}

type Cell = 'X' | 'O' | null;
type GameMode = 'AI' | '2P';
type Difficulty = 'easy' | 'medium' | 'hard';

export const TicTacToeGame: React.FC<TicTacToeProps> = ({ onBack }) => {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<GameMode>('AI');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [winner, setWinner] = useState<'X' | 'O' | 'DRAW' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Scoreboard
  const [scores, setScores] = useState({
    x: 0,
    o: 0,
    draws: 0,
  });

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  const WINNING_COMBOS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const checkWinner = (currentBoard: Cell[]): { winner: 'X' | 'O' | 'DRAW' | null; line: number[] | null } => {
    for (const combo of WINNING_COMBOS) {
      const [a, b, c] = combo;
      if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
        return { winner: currentBoard[a], line: combo };
      }
    }
    if (currentBoard.every((cell) => cell !== null)) {
      return { winner: 'DRAW', line: null };
    }
    return { winner: null, line: null };
  };

  // Minimax algorithm for unbeatable Hard AI
  const minimax = (newBoard: Cell[], player: 'X' | 'O'): { score: number; index?: number } => {
    const { winner: resWinner } = checkWinner(newBoard);
    if (resWinner === 'O') return { score: 10 };
    if (resWinner === 'X') return { score: -10 };
    if (resWinner === 'DRAW') return { score: 0 };

    const availSpots: number[] = [];
    newBoard.forEach((cell, idx) => {
      if (cell === null) availSpots.push(idx);
    });

    const moves: Array<{ index: number; score: number }> = [];

    for (let i = 0; i < availSpots.length; i++) {
      const idx = availSpots[i];
      newBoard[idx] = player;

      let resultScore: number;
      if (player === 'O') {
        const result = minimax(newBoard, 'X');
        resultScore = result.score;
      } else {
        const result = minimax(newBoard, 'O');
        resultScore = result.score;
      }

      newBoard[idx] = null;
      moves.push({ index: idx, score: resultScore });
    }

    let bestMove = 0;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove];
  };

  const getAiMove = (currentBoard: Cell[], diff: Difficulty): number => {
    const emptyIndices = currentBoard
      .map((c, i) => (c === null ? i : -1))
      .filter((i) => i !== -1);

    if (emptyIndices.length === 0) return -1;

    // Easy: Random move
    if (diff === 'easy') {
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // Medium: Win if possible, block opponent win, otherwise tactical / center
    if (diff === 'medium') {
      // 1. Can AI (O) win?
      for (const idx of emptyIndices) {
        const testBoard = [...currentBoard];
        testBoard[idx] = 'O';
        if (checkWinner(testBoard).winner === 'O') return idx;
      }
      // 2. Can player (X) win? Block it!
      for (const idx of emptyIndices) {
        const testBoard = [...currentBoard];
        testBoard[idx] = 'X';
        if (checkWinner(testBoard).winner === 'X') return idx;
      }
      // 3. Take center if open
      if (currentBoard[4] === null) return 4;
      // 4. Random from corners or remaining
      const corners = [0, 2, 6, 8].filter((i) => currentBoard[i] === null);
      if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }

    // Hard: Minimax (unbeatable)
    const best = minimax(currentBoard, 'O');
    return best.index !== undefined ? best.index : emptyIndices[0];
  };

  // AI Turn effect
  useEffect(() => {
    if (gameMode === 'AI' && !isXNext && !winner && !isAiThinking) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getAiMove(board, difficulty);
        if (move !== -1) {
          makeMove(move, 'O');
        }
        setIsAiThinking(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isXNext, gameMode, winner, board, difficulty]);

  const makeMove = (index: number, player: 'X' | 'O') => {
    if (board[index] || winner) return;

    sounds.playClick();
    const newBoard = [...board];
    newBoard[index] = player;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result.winner) {
      setWinner(result.winner);
      setWinningLine(result.line);
      if (result.winner === 'X') {
        sounds.playWin();
        setScores((s) => ({ ...s, x: s.x + 1 }));
      } else if (result.winner === 'O') {
        if (gameMode === 'AI') sounds.playGameOver();
        else sounds.playWin();
        setScores((s) => ({ ...s, o: s.o + 1 }));
      } else {
        sounds.playBounce();
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
      }
    } else {
      setIsXNext(player === 'X' ? false : true);
    }
  };

  const handleCellClick = (index: number) => {
    if (winner || board[index] || isAiThinking) return;
    if (gameMode === 'AI' && !isXNext) return;

    makeMove(index, isXNext ? 'X' : 'O');
  };

  const restartRound = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
    setWinningLine(null);
    setIsAiThinking(false);
    sounds.playClick();
  };

  const resetAll = () => {
    restartRound();
    setScores({ x: 0, o: 0, draws: 0 });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 select-none">
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 mb-4 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Arcade Menu</span>
          </button>
          <span className="text-sm font-bold text-white tracking-wide">TIC TAC TOE</span>
        </div>

        {/* Mode selector */}
        <div className="flex items-center bg-slate-950 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => {
              setGameMode('AI');
              restartRound();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              gameMode === 'AI' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>vs AI</span>
          </button>
          <button
            onClick={() => {
              setGameMode('2P');
              restartRound();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
              gameMode === '2P' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>2-Player</span>
          </button>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={restartRound}
            aria-label="Restart Round"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
        {/* Difficulty selection if AI mode */}
        {gameMode === 'AI' && (
          <div className="flex items-center gap-2 mb-5 w-full justify-center">
            <span className="text-xs text-slate-400 font-medium mr-1">Difficulty:</span>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDifficulty(d);
                  restartRound();
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-all ${
                  difficulty === d
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white bg-slate-950/60'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* Scoreboard Cards */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6 text-center">
          <div
            className={`p-3 rounded-xl border transition-all ${
              isXNext && !winner
                ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="text-xs font-medium text-cyan-400 flex items-center justify-center gap-1 mb-1">
              <span>Player X</span>
            </div>
            <div className="text-2xl font-mono font-bold text-cyan-400">{scores.x}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-xs font-medium text-slate-400 mb-1">Draws</div>
            <div className="text-2xl font-mono font-bold text-slate-300">{scores.draws}</div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-all ${
              !isXNext && !winner
                ? 'bg-rose-950/40 border-rose-500/50 shadow-md ring-1 ring-rose-500/30'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="text-xs font-medium text-rose-400 flex items-center justify-center gap-1 mb-1">
              <span>{gameMode === 'AI' ? 'AI (O)' : 'Player O'}</span>
            </div>
            <div className="text-2xl font-mono font-bold text-rose-400">{scores.o}</div>
          </div>
        </div>

        {/* Turn status banner */}
        <div className="h-8 flex items-center justify-center mb-4">
          {winner === 'DRAW' ? (
            <span className="text-sm font-semibold text-amber-400">Match Drawn!</span>
          ) : winner ? (
            <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span>{winner === 'X' ? 'Player X Wins!' : gameMode === 'AI' ? 'AI Wins!' : 'Player O Wins!'}</span>
            </span>
          ) : isAiThinking ? (
            <span className="text-xs text-slate-400 animate-pulse font-medium">AI is thinking...</span>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Current Turn:{' '}
              <strong className={isXNext ? 'text-cyan-400' : 'text-rose-400'}>
                {isXNext ? 'Player X' : gameMode === 'AI' ? 'AI (O)' : 'Player O'}
              </strong>
            </span>
          )}
        </div>

        {/* 3x3 Board */}
        <div className="relative grid grid-cols-3 gap-3 w-72 h-72 sm:w-80 sm:h-80 bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-inner">
          {board.map((cell, index) => {
            const isWinningCell = winningLine?.includes(index);
            return (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={cell !== null || winner !== null || isAiThinking}
                className={`relative flex items-center justify-center rounded-xl font-display font-extrabold text-4xl sm:text-5xl transition-all duration-200 select-none ${
                  cell
                    ? isWinningCell
                      ? 'bg-slate-800 scale-105 shadow-lg'
                      : 'bg-slate-900'
                    : 'bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700 active:scale-95'
                } border ${isWinningCell ? 'border-amber-400/80 ring-2 ring-amber-400/30' : 'border-slate-800'}`}
              >
                {cell === 'X' && (
                  <span className="text-cyan-400 drop-shadow-[0_2px_8px_rgba(34,211,238,0.4)] animate-in fade-in zoom-in duration-150">
                    ✕
                  </span>
                )}
                {cell === 'O' && (
                  <span className="text-rose-400 drop-shadow-[0_2px_8px_rgba(251,113,133,0.4)] animate-in fade-in zoom-in duration-150">
                    ○
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={restartRound}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Round</span>
          </button>
          <button
            onClick={resetAll}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Reset Scores
          </button>
        </div>
      </div>
    </div>
  );
};
