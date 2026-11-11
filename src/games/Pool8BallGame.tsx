import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, User, Cpu, Trophy, Sparkles, MessageSquare, Palette, X, Info } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PoolGameProps {
  onBack: () => void;
}

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isStripe: boolean;
  stripeColor?: string;
  isPocketed: boolean;
  rotX: number;
  rotY: number;
}

interface SinkingBall {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
  progress: number;
}

interface CueSkin {
  id: string;
  name: string;
  shaftColor: string;
  buttColor: string;
  tipColor: string;
  ringColor: string;
  glowColor: string;
}

const CUE_SKINS: CueSkin[] = [
  {
    id: 'master-maple',
    name: 'Master Maple',
    shaftColor: '#fde68a',
    buttColor: '#451a03',
    tipColor: '#38bdf8',
    ringColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.4)',
  },
  {
    id: 'dragon-fire',
    name: 'Dragon Fire',
    shaftColor: '#f87171',
    buttColor: '#881337',
    tipColor: '#facc15',
    ringColor: '#fbbf24',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    shaftColor: '#22d3ee',
    buttColor: '#0f172a',
    tipColor: '#f43f5e',
    ringColor: '#38bdf8',
    glowColor: 'rgba(34, 211, 238, 0.5)',
  },
  {
    id: 'royal-crown',
    name: 'Royal Crown',
    shaftColor: '#93c5fd',
    buttColor: '#1e3a8a',
    tipColor: '#fde047',
    ringColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.5)',
  },
];

const CHAT_MESSAGES = [
  'Nice shot! 🎯',
  'Well played! 👏',
  'Good game! 👍',
  'Oops! 😅',
  'Lucky bank! 🍀',
  'Rematch? 🎱',
];

type Player = 1 | 2;
type BallType = 'solids' | 'stripes';

export const Pool8BallGame: React.FC<PoolGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameMode, setGameMode] = useState<'AI' | '2P'>('AI');
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [player1Suit, setPlayer1Suit] = useState<BallType | null>(null);
  const [player2Suit, setPlayer2Suit] = useState<BallType | null>(null);
  const [shotPower, setShotPower] = useState<number>(55); // 10 - 100
  const [gameStatus, setGameStatus] = useState<string>('Drag anywhere to aim, pull power slider & strike!');
  const [winner, setWinner] = useState<string | null>(null);
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [selectedCue, setSelectedCue] = useState<CueSkin>(CUE_SKINS[0]);
  const [showCueModal, setShowCueModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [activeChat, setActiveChat] = useState<{ sender: 'P1' | 'P2'; text: string } | null>(null);
  const [ballInHand, setBallInHand] = useState<boolean>(false);

  // High-DPI Table Coordinates (860 x 480)
  const TABLE_X = 55;
  const TABLE_Y = 50;
  const TABLE_WIDTH = 750;
  const TABLE_HEIGHT = 380;
  const BALL_RADIUS = 11.5;
  const POCKET_RADIUS = 21;

  // 6 Pockets Coordinates (4 corner, 2 middle)
  const pockets = useMemo(
    () => [
      { x: TABLE_X + 10, y: TABLE_Y + 10 },
      { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y + 4 },
      { x: TABLE_X + TABLE_WIDTH - 10, y: TABLE_Y + 10 },
      { x: TABLE_X + 10, y: TABLE_Y + TABLE_HEIGHT - 10 },
      { x: TABLE_X + TABLE_WIDTH / 2, y: TABLE_Y + TABLE_HEIGHT - 4 },
      { x: TABLE_X + TABLE_WIDTH - 10, y: TABLE_Y + TABLE_HEIGHT - 10 },
    ],
    []
  );

  const stateRef = useRef({
    balls: [] as Ball[],
    sinkingBalls: [] as SinkingBall[],
    aimAngle: 0,
    power: 55,
    isAiming: false,
    isRolling: false,
    strikeAnimation: 0, // 0 = idle, >0 = striking stroke
    currentPlayer: 1 as Player,
    gameMode: 'AI' as 'AI' | '2P',
    player1Suit: null as BallType | null,
    player2Suit: null as BallType | null,
    ballsPocketedThisTurn: [] as number[],
    firstBallHit: null as number | null,
    winner: null as string | null,
    selectedCue: CUE_SKINS[0],
    feltPatternCanvas: null as HTMLCanvasElement | null,
  });

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Ball Colors
  const BALL_COLORS: Record<number, { color: string; isStripe: boolean; accent?: string }> = {
    0: { color: '#ffffff', isStripe: false }, // Cue Ball
    1: { color: '#facc15', isStripe: false }, // Solid Yellow
    2: { color: '#2563eb', isStripe: false }, // Solid Blue
    3: { color: '#dc2626', isStripe: false }, // Solid Red
    4: { color: '#9333ea', isStripe: false }, // Solid Purple
    5: { color: '#ea580c', isStripe: false }, // Solid Orange
    6: { color: '#16a34a', isStripe: false }, // Solid Green
    7: { color: '#881337', isStripe: false }, // Solid Maroon
    8: { color: '#09090b', isStripe: false }, // 8-Ball Black
    9: { color: '#ffffff', isStripe: true, accent: '#facc15' }, // Stripe Yellow
    10: { color: '#ffffff', isStripe: true, accent: '#2563eb' }, // Stripe Blue
    11: { color: '#ffffff', isStripe: true, accent: '#dc2626' }, // Stripe Red
    12: { color: '#ffffff', isStripe: true, accent: '#9333ea' }, // Stripe Purple
    13: { color: '#ffffff', isStripe: true, accent: '#ea580c' }, // Stripe Orange
    14: { color: '#ffffff', isStripe: true, accent: '#16a34a' }, // Stripe Green
    15: { color: '#ffffff', isStripe: true, accent: '#881337' }, // Stripe Maroon
  };

  // Procedural felt weave texture
  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = 860;
    off.height = 480;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Rich tournament emerald green felt gradient
    const feltGrad = ctx.createRadialGradient(
      430,
      240,
      50,
      430,
      240,
      450
    );
    feltGrad.addColorStop(0, '#0d6948');
    feltGrad.addColorStop(0.65, '#0a563b');
    feltGrad.addColorStop(1, '#063f2b');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(0, 0, 860, 480);

    // Subtle worsted cloth texture noise
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
    for (let x = 0; x < 860; x += 4) {
      for (let y = 0; y < 480; y += 4) {
        if ((x + y) % 8 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }

    stateRef.current.feltPatternCanvas = off;
  }, []);

  useEffect(() => {
    stateRef.current.selectedCue = selectedCue;
  }, [selectedCue]);

  // Rack and Initialize Balls
  const initBalls = () => {
    const balls: Ball[] = [];
    // Cue Ball at head string
    balls.push({
      id: 0,
      x: TABLE_X + TABLE_WIDTH * 0.26,
      y: TABLE_Y + TABLE_HEIGHT / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      color: '#ffffff',
      isStripe: false,
      isPocketed: false,
      rotX: 0,
      rotY: 0,
    });

    // Standard 15-Ball Triangle Rack at Foot Spot
    const rackStartX = TABLE_X + TABLE_WIDTH * 0.72;
    const rackStartY = TABLE_Y + TABLE_HEIGHT / 2;
    const r = BALL_RADIUS;
    const d = r * 2 + 0.6;
    const dx = d * Math.cos(Math.PI / 6);
    const dy = d;

    // Pyramid pattern with 8-Ball in center row 3
    const order = [
      1,
      9, 2,
      3, 8, 10,
      11, 4, 12, 5,
      6, 13, 7, 14, 15
    ];

    let bIdx = 0;
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row <= col; row++) {
        const id = order[bIdx++];
        const x = rackStartX + col * dx;
        const y = rackStartY - (col * dy) / 2 + row * dy;
        const conf = BALL_COLORS[id];
        balls.push({
          id,
          x,
          y,
          vx: 0,
          vy: 0,
          radius: r,
          color: conf.color,
          isStripe: conf.isStripe,
          stripeColor: conf.accent,
          isPocketed: false,
          rotX: 0,
          rotY: 0,
        });
      }
    }

    stateRef.current.balls = balls;
    stateRef.current.sinkingBalls = [];
    stateRef.current.isRolling = false;
    stateRef.current.ballsPocketedThisTurn = [];
    stateRef.current.firstBallHit = null;
    stateRef.current.player1Suit = null;
    stateRef.current.player2Suit = null;
    stateRef.current.currentPlayer = 1;
    stateRef.current.winner = null;

    setCurrentPlayer(1);
    setPlayer1Suit(null);
    setPlayer2Suit(null);
    setWinner(null);
    setIsShooting(false);
    setBallInHand(false);
    setGameStatus('Table is Open! Break the rack to begin.');
  };

  useEffect(() => {
    initBalls();
  }, [gameMode]);

  // Execute Cue Shot with animation
  const shootCue = (powerPct: number, angle: number) => {
    const cue = stateRef.current.balls[0];
    if (!cue || cue.isPocketed || stateRef.current.isRolling || ballInHand) return;

    // Trigger cue lunging forward stroke
    stateRef.current.strikeAnimation = 10;
    sounds.playBallHit(0.35, 420);

    const speed = (powerPct / 100) * 24 + 4;
    cue.vx = Math.cos(angle) * speed;
    cue.vy = Math.sin(angle) * speed;

    stateRef.current.isRolling = true;
    stateRef.current.ballsPocketedThisTurn = [];
    stateRef.current.firstBallHit = null;
    setIsShooting(true);
  };

  // Bot Turn Intelligence
  const triggerAiTurn = () => {
    const s = stateRef.current;
    if (s.currentPlayer !== 2 || !!winner || s.isRolling) return;

    setGameStatus('AI is lining up the shot...');
    setTimeout(() => {
      const cue = s.balls[0];
      if (!cue || cue.isPocketed) return;

      const aiSuit = s.player2Suit;
      let targets = s.balls.filter((b) => !b.isPocketed && b.id !== 0 && b.id !== 8);
      if (aiSuit === 'solids') {
        const solidsLeft = targets.filter((b) => b.id <= 7);
        targets = solidsLeft.length > 0 ? solidsLeft : s.balls.filter((b) => !b.isPocketed && b.id === 8);
      } else if (aiSuit === 'stripes') {
        const stripesLeft = targets.filter((b) => b.id >= 9);
        targets = stripesLeft.length > 0 ? stripesLeft : s.balls.filter((b) => !b.isPocketed && b.id === 8);
      }

      if (targets.length === 0) {
        targets = s.balls.filter((b) => !b.isPocketed && b.id === 8);
      }

      const target = targets[Math.floor(Math.random() * targets.length)];
      if (target) {
        // Aim angle with realistic minor human-like variation
        const dx = target.x - cue.x;
        const dy = target.y - cue.y;
        const baseAngle = Math.atan2(dy, dx);
        const aiAngle = baseAngle + (Math.random() - 0.5) * 0.05;
        s.aimAngle = aiAngle;

        const aiPower = 50 + Math.floor(Math.random() * 30);
        setShotPower(aiPower);

        setTimeout(() => {
          shootCue(aiPower, aiAngle);
        }, 500);
      }
    }, 850);
  };

  // Turn resolution after balls stop rolling
  const handleTurnResolution = () => {
    const s = stateRef.current;
    const cue = s.balls[0];
    const pocketed = s.ballsPocketedThisTurn;
    const curP = s.currentPlayer;

    let switchTurn = true;
    let statusMsg = '';

    // 1. Cue Ball Scratch Foul
    if (cue.isPocketed) {
      sounds.playGameOver();
      cue.isPocketed = false;
      cue.x = TABLE_X + TABLE_WIDTH * 0.26;
      cue.y = TABLE_Y + TABLE_HEIGHT / 2;
      cue.vx = 0;
      cue.vy = 0;
      statusMsg = `Foul! Cue ball scratched. ${curP === 1 ? 'Player 2' : 'Player 1'}'s turn with Ball-in-Hand!`;
      switchTurn = true;
      setBallInHand(true);
    }

    // 2. 8-Ball Pocketed
    if (pocketed.includes(8)) {
      const mySuit = curP === 1 ? s.player1Suit : s.player2Suit;
      const remainingSuitBalls = s.balls.filter((b) => {
        if (b.isPocketed || b.id === 0 || b.id === 8) return false;
        if (mySuit === 'solids') return b.id <= 7;
        if (mySuit === 'stripes') return b.id >= 9;
        return true;
      });

      if (remainingSuitBalls.length === 0 && !cue.isPocketed) {
        // Legal 8-Ball Win!
        const winTitle = curP === 1 ? 'Player 1 (You) Wins!' : s.gameMode === 'AI' ? 'Master AI Wins!' : 'Player 2 Wins!';
        s.winner = winTitle;
        setWinner(winTitle);
        sounds.playWin();
        return;
      } else {
        // Foul / Premature 8-ball Loss!
        const winTitle = curP === 1 ? (s.gameMode === 'AI' ? 'Master AI Wins (8-Ball foul)!' : 'Player 2 Wins!') : 'Player 1 Wins!';
        s.winner = winTitle;
        setWinner(winTitle);
        sounds.playGameOver();
        return;
      }
    }

    // 3. Object Balls Pocketed
    const objectBalls = pocketed.filter((id) => id !== 0 && id !== 8);
    if (objectBalls.length > 0 && !cue.isPocketed) {
      // If table is open, assign suits
      if (!s.player1Suit) {
        const firstBall = objectBalls[0];
        const suit: BallType = firstBall <= 7 ? 'solids' : 'stripes';
        const otherSuit: BallType = suit === 'solids' ? 'stripes' : 'solids';

        if (curP === 1) {
          s.player1Suit = suit;
          s.player2Suit = otherSuit;
          setPlayer1Suit(suit);
          setPlayer2Suit(otherSuit);
          statusMsg = `Player 1 claimed ${suit.toUpperCase()}! Continue shooting.`;
        } else {
          s.player2Suit = suit;
          s.player1Suit = otherSuit;
          setPlayer1Suit(otherSuit);
          setPlayer2Suit(suit);
          statusMsg = `Player 2 claimed ${suit.toUpperCase()}! Continue shooting.`;
        }
        switchTurn = false;
      } else {
        // Player pocketed balls: check if potted own suit
        const mySuit = curP === 1 ? s.player1Suit : s.player2Suit;
        const pottedOwn = objectBalls.some((id) => (mySuit === 'solids' ? id <= 7 : id >= 9));
        if (pottedOwn) {
          switchTurn = false;
          statusMsg = `${curP === 1 ? 'Player 1' : 'Player 2'} potted ball! Shoot again.`;
        }
      }
    }

    if (switchTurn) {
      const nextP: Player = curP === 1 ? 2 : 1;
      s.currentPlayer = nextP;
      setCurrentPlayer(nextP);
      if (!statusMsg) {
        statusMsg = `${nextP === 1 ? 'Player 1' : s.gameMode === 'AI' ? 'AI' : 'Player 2'}'s turn`;
      }
    }

    setGameStatus(statusMsg || `${s.currentPlayer === 1 ? 'Player 1' : 'Player 2'}'s Turn`);

    if (s.gameMode === 'AI' && s.currentPlayer === 2 && !s.winner) {
      triggerAiTurn();
    }
  };

  // Pointer interactions for Aiming and Ball in Hand
  const handlePointerInteraction = (clientX: number, clientY: number, isClick = false) => {
    const canvas = canvasRef.current;
    if (!canvas || stateRef.current.isRolling || !!winner) return;
    if (stateRef.current.gameMode === 'AI' && stateRef.current.currentPlayer === 2) return;

    const rect = canvas.getBoundingClientRect();
    const scale = 860 / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;

    const cue = stateRef.current.balls[0];
    if (!cue) return;

    if (ballInHand && isClick) {
      // Reposition cue ball
      if (x >= TABLE_X + 20 && x <= TABLE_X + TABLE_WIDTH - 20 && y >= TABLE_Y + 20 && y <= TABLE_Y + TABLE_HEIGHT - 20) {
        cue.x = x;
        cue.y = y;
        setBallInHand(false);
        setGameStatus('Cue ball placed. Aim and strike!');
        sounds.playClick();
        return;
      }
    }

    const angle = Math.atan2(y - cue.y, x - cue.x);
    stateRef.current.aimAngle = angle;
  };

  // Quick Chat Trigger
  const triggerChat = (msg: string) => {
    setActiveChat({ sender: 'P1', text: msg });
    setShowChatModal(false);
    sounds.playClick();

    setTimeout(() => {
      if (gameMode === 'AI' && !winner) {
        const botReplies = ['Nice shot! 👏', 'Thanks! 🎱', 'Good game! 🔥', 'Lucky! 🍀'];
        setActiveChat({ sender: 'P2', text: botReplies[Math.floor(Math.random() * botReplies.length)] });
        setTimeout(() => setActiveChat(null), 2500);
      } else {
        setActiveChat(null);
      }
    }, 2000);
  };

  // Compute Remaining Suit Balls count
  const remainingSolids = useMemo(
    () => stateRef.current.balls.filter((b) => !b.isPocketed && b.id >= 1 && b.id <= 7).length,
    [stateRef.current.balls, isShooting]
  );
  const remainingStripes = useMemo(
    () => stateRef.current.balls.filter((b) => !b.isPocketed && b.id >= 9 && b.id <= 15).length,
    [stateRef.current.balls, isShooting]
  );

  // High-Fidelity Physics & Graphics Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const updatePhysics = () => {
      const s = stateRef.current;
      const balls = s.balls;
      let moving = false;

      if (s.strikeAnimation > 0) {
        s.strikeAnimation--;
      }

      // 6 SUB-STEPS FOR PERFECT IMPACT DYNAMICS
      const SUB_STEPS = 6;
      for (let step = 0; step < SUB_STEPS; step++) {
        balls.forEach((ball) => {
          if (ball.isPocketed) return;

          // Natural cloth friction
          ball.vx *= 0.9972;
          ball.vy *= 0.9972;

          // Roll rotation
          ball.rotX += ball.vx * 0.05;
          ball.rotY += ball.vy * 0.05;

          if (Math.hypot(ball.vx, ball.vy) < 0.04) {
            ball.vx = 0;
            ball.vy = 0;
          } else {
            moving = true;
          }

          ball.x += ball.vx / SUB_STEPS;
          ball.y += ball.vy / SUB_STEPS;

          // Cushion Bounds Collision
          const minX = TABLE_X + ball.radius;
          const maxX = TABLE_X + TABLE_WIDTH - ball.radius;
          const minY = TABLE_Y + ball.radius;
          const maxY = TABLE_Y + TABLE_HEIGHT - ball.radius;

          if (ball.x < minX) {
            ball.x = minX;
            ball.vx = -ball.vx * 0.88;
            sounds.playBallHit(0.12, 280);
          } else if (ball.x > maxX) {
            ball.x = maxX;
            ball.vx = -ball.vx * 0.88;
            sounds.playBallHit(0.12, 280);
          }

          if (ball.y < minY) {
            ball.y = minY;
            ball.vy = -ball.vy * 0.88;
            sounds.playBallHit(0.12, 280);
          } else if (ball.y > maxY) {
            ball.y = maxY;
            ball.vy = -ball.vy * 0.88;
            sounds.playBallHit(0.12, 280);
          }

          // Pocket Suction & Sinking
          pockets.forEach((p) => {
            const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
            if (dist < POCKET_RADIUS && !ball.isPocketed) {
              ball.isPocketed = true;
              ball.vx = 0;
              ball.vy = 0;
              sounds.playPocket();

              s.sinkingBalls.push({
                id: ball.id,
                x: ball.x,
                y: ball.y,
                targetX: p.x,
                targetY: p.y,
                scale: 1,
                alpha: 1,
                progress: 0,
              });

              s.ballsPocketedThisTurn.push(ball.id);
            }
          });
        });

        // Ball to Ball Elastic Collisions
        for (let i = 0; i < balls.length; i++) {
          const b1 = balls[i];
          if (b1.isPocketed) continue;

          for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            if (b2.isPocketed) continue;

            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < b1.radius + b2.radius) {
              const overlap = b1.radius + b2.radius - dist;
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);

              // Overlap separation
              b1.x -= nx * overlap * 0.5;
              b1.y -= ny * overlap * 0.5;
              b2.x += nx * overlap * 0.5;
              b2.y += ny * overlap * 0.5;

              // Elastic impulse
              const kx = b1.vx - b2.vx;
              const ky = b1.vy - b2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              b1.vx -= p * nx * 0.96;
              b1.vy -= p * ny * 0.96;
              b2.vx += p * nx * 0.96;
              b2.vy += p * ny * 0.96;

              // Track first ball hit by cue ball
              if (b1.id === 0 && s.firstBallHit === null) {
                s.firstBallHit = b2.id;
              }

              const imp = Math.hypot(kx, ky);
              if (imp > 0.4 && step === 0) {
                sounds.playBallHit(Math.min(0.3, imp * 0.04), 480 + Math.random() * 80);
              }
            }
          }
        }
      }

      // Update Sinking Balls
      s.sinkingBalls.forEach((b) => {
        b.progress += 0.08;
        b.x += (b.targetX - b.x) * 0.2;
        b.y += (b.targetY - b.y) * 0.2;
        b.scale = Math.max(0, 1 - b.progress * 0.85);
        b.alpha = Math.max(0, 1 - b.progress);
      });
      s.sinkingBalls = s.sinkingBalls.filter((b) => b.alpha > 0);

      // Check when motion stops
      if (s.isRolling && !moving && s.sinkingBalls.length === 0) {
        s.isRolling = false;
        setIsShooting(false);
        handleTurnResolution();
      }
    };

    // Render Canvas Scene
    const render = () => {
      animId = requestAnimationFrame(render);
      updatePhysics();

      const s = stateRef.current;
      ctx.clearRect(0, 0, 860, 480);

      // 1. MAHOGANY POLISHED WOODEN RAILS & TABLE RIM
      ctx.save();
      // Outer drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;

      // Dark beveled walnut/mahogany border
      const woodGrad = ctx.createLinearGradient(0, 0, 860, 480);
      woodGrad.addColorStop(0, '#2e1208');
      woodGrad.addColorStop(0.35, '#4a1d0d');
      woodGrad.addColorStop(0.7, '#240b04');
      woodGrad.addColorStop(1, '#170602');
      ctx.fillStyle = woodGrad;
      ctx.beginPath();
      ctx.roundRect(TABLE_X - 32, TABLE_Y - 32, TABLE_WIDTH + 64, TABLE_HEIGHT + 64, 24);
      ctx.fill();
      ctx.restore();

      // Brass Inlay Accent Rim
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(TABLE_X - 16, TABLE_Y - 16, TABLE_WIDTH + 32, TABLE_HEIGHT + 32, 16);
      ctx.stroke();

      // Diamond Sights (Mother of pearl sights along rails)
      const diamondSites: Array<{ x: number; y: number }> = [];
      // Top and Bottom rail sights
      for (let i = 1; i <= 7; i++) {
        if (i !== 4) {
          diamondSites.push({ x: TABLE_X + (TABLE_WIDTH / 8) * i, y: TABLE_Y - 16 });
          diamondSites.push({ x: TABLE_X + (TABLE_WIDTH / 8) * i, y: TABLE_Y + TABLE_HEIGHT + 16 });
        }
      }
      // Left and Right rail sights
      for (let j = 1; j <= 3; j++) {
        diamondSites.push({ x: TABLE_X - 16, y: TABLE_Y + (TABLE_HEIGHT / 4) * j });
        diamondSites.push({ x: TABLE_X + TABLE_WIDTH + 16, y: TABLE_Y + (TABLE_HEIGHT / 4) * j });
      }

      ctx.fillStyle = '#fef3c7';
      diamondSites.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y - 4);
        ctx.lineTo(d.x + 4, d.y);
        ctx.lineTo(d.x, d.y + 4);
        ctx.lineTo(d.x - 4, d.y);
        ctx.closePath();
        ctx.fill();
      });

      // 2. GREEN FELT PLAYING SURFACE
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEIGHT, 8);
      ctx.clip();

      if (s.feltPatternCanvas) {
        ctx.drawImage(s.feltPatternCanvas, 0, 0);
      } else {
        ctx.fillStyle = '#065f46';
        ctx.fillRect(TABLE_X, TABLE_Y, TABLE_WIDTH, TABLE_HEIGHT);
      }

      // Cushions (Darker beveled green cloth with inner shadow)
      ctx.fillStyle = '#064e3b';
      // Top & Bottom cushions
      ctx.fillRect(TABLE_X, TABLE_Y - 4, TABLE_WIDTH, 4);
      ctx.fillRect(TABLE_X, TABLE_Y + TABLE_HEIGHT, TABLE_WIDTH, 4);
      // Left & Right cushions
      ctx.fillRect(TABLE_X - 4, TABLE_Y, 4, TABLE_HEIGHT);
      ctx.fillRect(TABLE_X + TABLE_WIDTH, TABLE_Y, 4, TABLE_HEIGHT);

      // Head string line & foot spot
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(TABLE_X + TABLE_WIDTH * 0.26, TABLE_Y);
      ctx.lineTo(TABLE_X + TABLE_WIDTH * 0.26, TABLE_Y + TABLE_HEIGHT);
      ctx.stroke();

      // Foot spot marker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(TABLE_X + TABLE_WIDTH * 0.72, TABLE_Y + TABLE_HEIGHT / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // 3. SIX DEEP CORNER & SIDE POCKETS
      pockets.forEach((p) => {
        const pGrad = ctx.createRadialGradient(p.x - 2, p.y - 2, 2, p.x, p.y, POCKET_RADIUS);
        pGrad.addColorStop(0, '#020617');
        pGrad.addColorStop(0.7, '#0f172a');
        pGrad.addColorStop(1, '#334155');

        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();

        // Metallic pocket ring liner
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS - 2, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 4. BALLS RENDERING (True 3D Glossy Finish with Shadows)
      s.balls.forEach((ball) => {
        if (ball.isPocketed) return;

        ctx.save();
        // Drop shadow onto felt
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.restore();

        // If striped ball, draw wide colored stripe band
        if (ball.isStripe && ball.stripeColor) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius - 0.5, -Math.PI * 0.45, Math.PI * 0.45);
          ctx.lineTo(ball.x, ball.y);
          ctx.fillStyle = ball.stripeColor;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius - 0.5, Math.PI * 0.55, Math.PI * 1.45);
          ctx.lineTo(ball.x, ball.y);
          ctx.fillStyle = ball.stripeColor;
          ctx.fill();
          ctx.restore();
        }

        // Spherical 3D shading gradient overlay
        ctx.save();
        const sphereGrad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          1,
          ball.x,
          ball.y,
          ball.radius
        );
        sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        sphereGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Center White Number Circle (except Cue Ball)
        if (ball.id !== 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius * 0.46, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.fillStyle = '#09090b';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ball.id.toString(), ball.x, ball.y);
          ctx.restore();
        } else {
          // Cue ball red spin spot
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Specular gloss reflection curve
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius - 2.5, -Math.PI * 0.8, -Math.PI * 0.25);
        ctx.stroke();
      });

      // 5. SINKING BALLS ANIMATION
      s.sinkingBalls.forEach((b) => {
        ctx.save();
        ctx.globalAlpha = b.alpha;
        ctx.translate(b.x, b.y);
        ctx.scale(b.scale, b.scale);
        ctx.beginPath();
        ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = BALL_COLORS[b.id]?.color || '#ffffff';
        ctx.fill();
        ctx.restore();
      });

      // 6. AIMING GUIDELINE, IMPACT PREDICTION & GHOST BALL (Miniclip 8 Ball Pool Style!)
      const cue = s.balls[0];
      const canAim = !s.isRolling && !winner && (s.gameMode === '2P' || s.currentPlayer === 1);

      if (canAim && cue && !cue.isPocketed) {
        const rayAngle = s.aimAngle;
        const rayCos = Math.cos(rayAngle);
        const raySin = Math.sin(rayAngle);
        let nearestDist = 380;
        let hitBall: Ball | null = null;

        // Ray intersection with object balls
        s.balls.forEach((ball) => {
          if (ball.isPocketed || ball.id === 0) return;
          const ox = ball.x - cue.x;
          const oy = ball.y - cue.y;
          const proj = ox * rayCos + oy * raySin;
          if (proj > 0 && proj < nearestDist) {
            const perpSq = ox * ox + oy * oy - proj * proj;
            const radSum = cue.radius + ball.radius;
            if (perpSq <= radSum * radSum) {
              const intersectDist = proj - Math.sqrt(Math.max(0, radSum * radSum - perpSq));
              if (intersectDist < nearestDist && intersectDist > 0) {
                nearestDist = intersectDist;
                hitBall = ball;
              }
            }
          }
        });

        const hitX = cue.x + rayCos * nearestDist;
        const hitY = cue.y + raySin * nearestDist;

        // Dotted Cue Trajectory Line
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cue.x, cue.y);
        ctx.lineTo(hitX, hitY);
        ctx.stroke();
        ctx.restore();

        // Ghost Cue Ball at point of impact
        if (hitBall) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.setLineDash([3, 3]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hitX, hitY, cue.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Target Ball Deflection Path Vector!
          const deflectAngle = Math.atan2((hitBall as Ball).y - hitY, (hitBall as Ball).x - hitX);
          const deflectLen = 90;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo((hitBall as Ball).x, (hitBall as Ball).y);
          ctx.lineTo(
            (hitBall as Ball).x + Math.cos(deflectAngle) * deflectLen,
            (hitBall as Ball).y + Math.sin(deflectAngle) * deflectLen
          );
          ctx.stroke();
          ctx.restore();
        }

        // 7. DETAILED PROFESSIONAL POOL CUE STICK
        const cueSkin = s.selectedCue;
        const pullDistance = 28 + (shotPower / 100) * 45 - s.strikeAnimation * 3.5;
        const cueBackX = cue.x - rayCos * pullDistance;
        const cueBackY = cue.y - raySin * pullDistance;
        const cueLength = 220;
        const cueTailX = cueBackX - rayCos * cueLength;
        const cueTailY = cueBackY - raySin * cueLength;

        ctx.save();
        // Cue stick drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;

        // Cue Shaft (Tapered)
        ctx.strokeStyle = cueSkin.shaftColor;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(cueBackX, cueBackY);
        ctx.lineTo(cueBackX - rayCos * 140, cueBackY - raySin * 140);
        ctx.stroke();

        // Cue Butt (Thicker handle)
        ctx.strokeStyle = cueSkin.buttColor;
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(cueBackX - rayCos * 140, cueBackY - raySin * 140);
        ctx.lineTo(cueTailX, cueTailY);
        ctx.stroke();

        // Decorative Inlay Rings
        ctx.strokeStyle = cueSkin.ringColor;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(cueBackX - rayCos * 142, cueBackY - raySin * 142);
        ctx.lineTo(cueBackX - rayCos * 146, cueBackY - raySin * 146);
        ctx.stroke();

        // Cue Tip & Chalk (Blue/Cyan ferrule tip)
        ctx.strokeStyle = cueSkin.tipColor;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(cueBackX, cueBackY);
        ctx.lineTo(cueBackX + rayCos * 6, cueBackY + raySin * 6);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // restore felt clip
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pockets, winner, shotPower]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-2 sm:p-4 select-none">
      {/* 1. TOP MINICLIP-STYLE 8 BALL POOL MATCH HEADER */}
      <div className="w-full max-w-4xl bg-gradient-to-r from-[#172033] via-[#0f172a] to-[#172033] border border-blue-500/30 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* PLAYER 1 (Left) */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full p-0.5 transition-all ${
                  currentPlayer === 1 && !winner
                    ? 'ring-4 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)] animate-pulse'
                    : 'ring-2 ring-blue-500/50'
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-blue-300">
                  <User className="w-6 h-6 text-blue-300" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] px-1 rounded-full shadow">
                ★ 32
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide">Player 1 (You)</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase">
                  {player1Suit ? `${player1Suit} (${player1Suit === 'solids' ? remainingSolids : remainingStripes} Left)` : 'Open Table'}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER MATCH POT */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full shadow-inner">
              <span className="text-xs">💰</span>
              <span className="font-mono font-extrabold text-xs text-amber-300 tracking-wider">2,000</span>
            </div>
            <span className="text-[10px] text-blue-200/80 mt-1 uppercase tracking-widest font-semibold">
              {winner ? 'Match Concluded' : currentPlayer === 1 ? 'Your Turn' : gameMode === 'AI' ? 'AI Turn' : 'Player 2'}
            </span>
          </div>

          {/* PLAYER 2 / AI (Right) */}
          <div className="flex items-center gap-3 flex-row-reverse">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full p-0.5 transition-all ${
                  currentPlayer === 2 && !winner
                    ? 'ring-4 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)] animate-pulse'
                    : 'ring-2 ring-blue-500/50'
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-cyan-300">
                  {gameMode === 'AI' ? <Cpu className="w-6 h-6 text-cyan-300" /> : <User className="w-6 h-6 text-cyan-300" />}
                </div>
              </div>
              <span className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 font-bold text-[10px] px-1 rounded-full shadow">
                ★ 28
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white tracking-wide">
                {gameMode === 'AI' ? 'Billiards AI' : 'Player 2'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase">
                  {player2Suit ? `${player2Suit} (${player2Suit === 'solids' ? remainingSolids : remainingStripes} Left)` : 'Open Table'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Live speech bubble if active */}
        {activeChat && (
          <div className={`mt-2 text-center text-xs font-semibold animate-in fade-in zoom-in duration-200 ${
            activeChat.sender === 'P1' ? 'text-emerald-300' : 'text-cyan-300'
          }`}>
            <span className="bg-black/60 border border-white/20 px-3 py-1 rounded-full">
              {activeChat.sender === 'P1' ? 'You' : 'Opponent'}: {activeChat.text}
            </span>
          </div>
        )}
      </div>

      {/* Ball in Hand Notice */}
      {ballInHand && (
        <div className="w-full max-w-4xl mb-2 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 text-xs font-extrabold py-1.5 px-4 rounded-xl text-center shadow-lg animate-pulse">
          🎱 BALL IN HAND: Click or tap anywhere on table to place cue ball!
        </div>
      )}

      {/* 2. MAIN POOL TABLE VIEWPORT */}
      <div className="relative w-full max-w-4xl aspect-[16/9] bg-[#022c22] border-4 border-amber-950/80 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={860}
          height={480}
          onMouseMove={(e) => handlePointerInteraction(e.clientX, e.clientY)}
          onTouchMove={(e) => {
            if (e.touches[0]) handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onClick={(e) => {
            if (ballInHand) {
              handlePointerInteraction(e.clientX, e.clientY, true);
            } else if (!isShooting && !winner && (gameMode === '2P' || currentPlayer === 1)) {
              shootCue(shotPower, stateRef.current.aimAngle);
            }
          }}
          className="w-full h-full object-contain cursor-crosshair touch-none select-none"
        />

        {/* Victory / Defeat Overlay Screen */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-3 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.5)]">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-1">Match Concluded</span>
            <h2 className="text-3xl font-extrabold text-white mb-2">{winner}</h2>
            <p className="text-xs text-slate-400 mb-6">Incredible pool mastery &amp; shot precision!</p>

            <button
              onClick={initBalls}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold px-7 py-3 rounded-xl transition-all shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rack Again</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. SHOT POWER METER & CONTROLS */}
      <div className="w-full max-w-4xl mt-3 bg-gradient-to-b from-[#1b2333] to-[#0f172a] border border-blue-500/40 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Power Gauge */}
        <div className="flex items-center gap-3 w-full sm:w-2/3">
          <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">Cue Power:</span>
          <input
            type="range"
            min="15"
            max="100"
            value={shotPower}
            onChange={(e) => {
              setShotPower(parseInt(e.target.value, 10));
              stateRef.current.power = parseInt(e.target.value, 10);
            }}
            disabled={isShooting || !!winner || ballInHand}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <span className="text-xs font-mono font-bold text-emerald-400 w-10 text-right">{shotPower}%</span>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            if (!isShooting && !winner && !ballInHand && (gameMode === '2P' || currentPlayer === 1)) {
              shootCue(shotPower, stateRef.current.aimAngle);
            }
          }}
          disabled={isShooting || !!winner || ballInHand || (gameMode === 'AI' && currentPlayer === 2)}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs px-8 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
        >
          {isShooting ? 'Balls Rolling...' : 'Strike Cue'}
        </button>
      </div>

      {/* 4. BOTTOM ACTION TOOLBAR */}
      <div className="w-full max-w-4xl mt-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Chat Button */}
          <button
            onClick={() => setShowChatModal(true)}
            aria-label="Quick Chat"
            className="p-2 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Cue Skin Armory */}
          <button
            onClick={() => setShowCueModal(true)}
            aria-label="Custom Cues"
            className="flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-2 rounded-xl transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Cue: {selectedCue.name}</span>
          </button>

          {/* Mode Switcher */}
          <button
            onClick={() => {
              setGameMode(gameMode === 'AI' ? '2P' : 'AI');
              initBalls();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-xl transition-colors"
          >
            {gameMode === 'AI' ? <Cpu className="w-4 h-4 text-cyan-400" /> : <User className="w-4 h-4 text-emerald-400" />}
            <span>{gameMode === 'AI' ? 'vs AI' : 'Pass & Play'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Restart */}
          <button
            onClick={initBalls}
            aria-label="Restart Match"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info ticker */}
      <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span>{gameStatus}</span>
      </div>

      {/* 5. CUE CUSTOMIZER MODAL */}
      {showCueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-blue-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowCueModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Pool Cue Armory</h3>
            <p className="text-xs text-slate-400 mb-4">Select your custom cue stick.</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {CUE_SKINS.map((cue) => (
                <button
                  key={cue.id}
                  onClick={() => {
                    setSelectedCue(cue);
                    sounds.playClick();
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    selectedCue.id === cue.id
                      ? 'bg-blue-500/20 border-blue-400 shadow-md ring-2 ring-blue-400/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-full h-4 rounded-full flex items-center overflow-hidden border border-white/20">
                    <div className="w-2/3 h-full" style={{ backgroundColor: cue.shaftColor }} />
                    <div className="w-1/3 h-full" style={{ backgroundColor: cue.buttColor }} />
                  </div>
                  <span className="text-xs font-semibold text-white">{cue.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCueModal(false)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Equip Cue
            </button>
          </div>
        </div>
      )}

      {/* 6. QUICK CHAT MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-blue-500/40 rounded-2xl max-w-xs w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowChatModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-3">Quick Chat</h3>
            <div className="flex flex-col gap-2">
              {CHAT_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  onClick={() => triggerChat(msg)}
                  className="w-full text-left bg-slate-900/80 hover:bg-blue-500/20 border border-slate-800 hover:border-blue-400/50 text-xs font-medium text-slate-200 hover:text-blue-300 py-2.5 px-3.5 rounded-xl transition-colors"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
