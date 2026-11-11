import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, User, Cpu, Trophy, Sparkles, MessageSquare, Palette, X, Info } from 'lucide-react';
import { sounds } from '../utils/audio';

interface CarromProps {
  onBack: () => void;
}

type CoinType = 'white' | 'black' | 'queen';

interface CarromCoin {
  id: number;
  type: CoinType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vRot: number;
  isPocketed: boolean;
}

interface SinkingCoin {
  id: number;
  type: CoinType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  alpha: number;
  progress: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

interface StrikerSkin {
  id: string;
  name: string;
  themeColor: string;
  ringColor: string;
  accentColor: string;
  symbol: 'star' | 'sun' | 'bolt' | 'crown';
}

const STRIKER_SKINS: StrikerSkin[] = [
  {
    id: 'aqua-nova',
    name: 'Aqua Nova',
    themeColor: '#06b6d4',
    ringColor: '#22d3ee',
    accentColor: '#ffffff',
    symbol: 'star',
  },
  {
    id: 'crimson-comet',
    name: 'Crimson Comet',
    themeColor: '#e11d48',
    ringColor: '#fb7185',
    accentColor: '#fde047',
    symbol: 'star',
  },
  {
    id: 'thunder-bolt',
    name: 'Thunder Bolt',
    themeColor: '#2563eb',
    ringColor: '#60a5fa',
    accentColor: '#facc15',
    symbol: 'bolt',
  },
  {
    id: 'imperial-gold',
    name: 'Imperial Gold',
    themeColor: '#d97706',
    ringColor: '#fbbf24',
    accentColor: '#ffffff',
    symbol: 'crown',
  },
];

const CHAT_MESSAGES = [
  'Nice shot! 🎯',
  'Well played! 👏',
  'Good game! 👍',
  'Oops! 😅',
  'Lucky bounce! 🍀',
  'Rematch soon! ⚔️',
];

export const CarromGame: React.FC<CarromProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameMode, setGameMode] = useState<'AI' | '2P'>('AI');
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [p1Score, setP1Score] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);
  const [p1Pucks, setP1Pucks] = useState<number>(0);
  const [p2Pucks, setP2Pucks] = useState<number>(0);
  const [queenCoverStatus, setQueenCoverStatus] = useState<string | null>(null);
  const [strikerBaselineX, setStrikerBaselineX] = useState<number>(310);
  const [shotPower, setShotPower] = useState<number>(55);
  const [gameStatus, setGameStatus] = useState<string>('Your Turn: Position striker on baseline, drag to aim & shoot!');
  const [isShooting, setIsShooting] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [selectedSkin, setSelectedSkin] = useState<StrikerSkin>(STRIKER_SKINS[0]);
  const [showSkinModal, setShowSkinModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [activeChat, setActiveChat] = useState<{ sender: 'P1' | 'P2'; text: string } | null>(null);

  // Board dimensions inside canvas (620 x 620 high-DPI coordinates)
  const BOARD_SIZE = 620;
  const PLAY_OFFSET = 44; // Frame cushion thickness
  const PLAY_SIZE = BOARD_SIZE - PLAY_OFFSET * 2;
  const POCKET_RADIUS = 25;
  const COIN_RADIUS = 13;
  const STRIKER_RADIUS = 18;

  // Pocket coordinates
  const pockets = useMemo(
    () => [
      { x: PLAY_OFFSET + 18, y: PLAY_OFFSET + 18 },
      { x: BOARD_SIZE - PLAY_OFFSET - 18, y: PLAY_OFFSET + 18 },
      { x: PLAY_OFFSET + 18, y: BOARD_SIZE - PLAY_OFFSET - 18 },
      { x: BOARD_SIZE - PLAY_OFFSET - 18, y: BOARD_SIZE - PLAY_OFFSET - 18 },
    ],
    []
  );

  // Mutable Game Loop State
  const stateRef = useRef({
    coins: [] as CarromCoin[],
    sinkingCoins: [] as SinkingCoin[],
    particles: [] as SparkParticle[],
    striker: {
      x: 310,
      y: 508, // Bottom baseline
      vx: 0,
      vy: 0,
      radius: STRIKER_RADIUS,
      isPocketed: false,
    },
    aimAngle: -Math.PI / 2, // Aiming up
    power: 55,
    isAiming: false,
    isRolling: false,
    dragStart: null as { x: number; y: number } | null,
    dragCurrent: null as { x: number; y: number } | null,
    isDraggingStriker: false,
    currentPlayer: 1 as 1 | 2,
    gameMode: 'AI' as 'AI' | '2P',
    pocketedThisTurn: [] as CarromCoin[],
    queenPocketedBy: null as 1 | 2 | null,
    queenCoverAwaiting: false,
    strikerPocketed: false,
    p1CoinsPotted: 0,
    p2CoinsPotted: 0,
    selectedSkin: STRIKER_SKINS[0],
    woodTextureCanvas: null as HTMLCanvasElement | null,
  });

  // Sound toggle
  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Generate procedural realistic wood grain texture once
  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = 620;
    off.height = 620;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    // Base warm maple / birch wood gradient
    const bgGrad = ctx.createRadialGradient(310, 310, 30, 310, 310, 360);
    bgGrad.addColorStop(0, '#fef3c7');
    bgGrad.addColorStop(0.5, '#fde68a');
    bgGrad.addColorStop(0.85, '#f59e0b');
    bgGrad.addColorStop(1, '#d97706');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 620, 620);

    // Fine organic wood grain lines
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 620; i += 3) {
      ctx.beginPath();
      const wave = Math.sin(i * 0.05) * 4;
      ctx.moveTo(0, i + wave);
      ctx.bezierCurveTo(200, i + wave + 2, 420, i + wave - 2, 620, i + wave);
      ctx.stroke();
    }

    stateRef.current.woodTextureCanvas = off;
  }, []);

  // Update skin ref
  useEffect(() => {
    stateRef.current.selectedSkin = selectedSkin;
  }, [selectedSkin]);

  // Spawn celebratory spark particles
  const spawnPocketSparks = (x: number, y: number, color = '#facc15') => {
    const s = stateRef.current;
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        life: 0,
      });
    }
  };

  // Initialize Board with authentic circular carrom array
  const initBoard = () => {
    const list: CarromCoin[] = [];
    let id = 1;
    const cx = BOARD_SIZE / 2;
    const cy = BOARD_SIZE / 2;

    // Red Queen in the very center
    list.push({
      id: id++,
      type: 'queen',
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      radius: COIN_RADIUS,
      rotation: 0,
      vRot: 0,
      isPocketed: false,
    });

    // Ring 1: 6 coins tightly clustered around Queen (alternating White and Black)
    const ring1Dist = COIN_RADIUS * 2 + 0.5;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const type: CoinType = i % 2 === 0 ? 'white' : 'black';
      list.push({
        id: id++,
        type,
        x: cx + Math.cos(angle) * ring1Dist,
        y: cy + Math.sin(angle) * ring1Dist,
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        rotation: Math.random() * Math.PI,
        vRot: 0,
        isPocketed: false,
      });
    }

    // Ring 2: 12 coins forming outer layer (alternating White and Black)
    const ring2Dist = ring1Dist * 1.95;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + 0.26;
      const type: CoinType = i % 2 === 0 ? 'white' : 'black';
      list.push({
        id: id++,
        type,
        x: cx + Math.cos(angle) * ring2Dist,
        y: cy + Math.sin(angle) * ring2Dist,
        vx: 0,
        vy: 0,
        radius: COIN_RADIUS,
        rotation: Math.random() * Math.PI,
        vRot: 0,
        isPocketed: false,
      });
    }

    stateRef.current.coins = list;
    stateRef.current.sinkingCoins = [];
    stateRef.current.particles = [];
    stateRef.current.striker.x = 310;
    stateRef.current.striker.y = 508;
    stateRef.current.striker.vx = 0;
    stateRef.current.striker.vy = 0;
    stateRef.current.striker.isPocketed = false;
    stateRef.current.isRolling = false;
    stateRef.current.currentPlayer = 1;
    stateRef.current.pocketedThisTurn = [];
    stateRef.current.queenPocketedBy = null;
    stateRef.current.queenCoverAwaiting = false;
    stateRef.current.strikerPocketed = false;
    stateRef.current.p1CoinsPotted = 0;
    stateRef.current.p2CoinsPotted = 0;

    setCurrentPlayer(1);
    setP1Score(0);
    setP2Score(0);
    setP1Pucks(0);
    setP2Pucks(0);
    setQueenCoverStatus(null);
    setStrikerBaselineX(310);
    setWinner(null);
    setIsShooting(false);
    setGameStatus('Player 1: Set position on baseline, drag back to aim and shoot!');
  };

  useEffect(() => {
    initBoard();
  }, [gameMode]);

  // Shoot Striker with power and angle
  const shootStriker = (powerPct: number, angle: number) => {
    const s = stateRef.current;
    if (s.isRolling || s.striker.isPocketed) return;

    sounds.playBallHit(0.35, 360);
    const speed = (powerPct / 100) * 23 + 4;
    s.striker.vx = Math.cos(angle) * speed;
    s.striker.vy = Math.sin(angle) * speed;

    s.isRolling = true;
    s.pocketedThisTurn = [];
    s.strikerPocketed = false;
    setIsShooting(true);
  };

  // Bot Turn Intelligence
  const triggerAiTurn = () => {
    const s = stateRef.current;
    if (s.currentPlayer !== 2 || s.isRolling || !!winner) return;

    setGameStatus('AI is sizing up the shot...');
    setTimeout(() => {
      // AI positions striker on top baseline (Y: 112)
      // Legal baseline X range: 170 to 450
      const botX = 180 + Math.random() * 260;
      s.striker.x = botX;
      s.striker.y = 112; // Top baseline
      setStrikerBaselineX(botX);

      // Select target: prefer Black coins, or Queen
      const activeCoins = s.coins.filter((c) => !c.isPocketed);
      if (activeCoins.length === 0) return;

      const targetCoins = activeCoins.filter((c) => c.type === 'black' || c.type === 'queen');
      const chosen = targetCoins.length > 0 ? targetCoins[Math.floor(Math.random() * targetCoins.length)] : activeCoins[0];

      // Aim toward chosen coin with slight realistic aim variance
      const dx = chosen.x - botX;
      const dy = chosen.y - 112;
      const baseAim = Math.atan2(dy, dx);
      const aiAim = baseAim + (Math.random() - 0.5) * 0.06;
      s.aimAngle = aiAim;

      const aiPower = 50 + Math.floor(Math.random() * 35);
      setShotPower(aiPower);

      setTimeout(() => {
        shootStriker(aiPower, aiAim);
      }, 500);
    }, 850);
  };

  // Turn resolution after all movement stops
  const handleTurnResolution = () => {
    const s = stateRef.current;
    const curP = s.currentPlayer;
    let switchTurn = true;
    let statusMsg = '';

    // Check Foul: Striker Pocketed
    if (s.strikerPocketed) {
      sounds.playGameOver();
      statusMsg = `Foul! Striker was pocketed. Penalty awarded.`;
      if (curP === 1) {
        setP1Score((sc) => Math.max(0, sc - 5));
      } else {
        setP2Score((sc) => Math.max(0, sc - 5));
      }
      switchTurn = true;
    }

    // Queen Cover Logic
    if (s.queenCoverAwaiting) {
      // Must pocket another coin this turn to cover
      const hasCover = s.pocketedThisTurn.some((c) => c.type !== 'queen');
      if (hasCover && !s.strikerPocketed) {
        // Queen successfully covered!
        sounds.playWin();
        statusMsg = `${curP === 1 ? 'Player 1' : 'Player 2'} covered the Queen (+3 pts)!`;
        if (curP === 1) setP1Score((sc) => sc + 3);
        else setP2Score((sc) => sc + 3);
        s.queenCoverAwaiting = false;
        setQueenCoverStatus(null);
        switchTurn = false;
      } else {
        // Queen cover failed! Return Queen to center
        sounds.playGameOver();
        const queen = s.coins.find((c) => c.type === 'queen');
        if (queen) {
          queen.isPocketed = false;
          queen.x = BOARD_SIZE / 2;
          queen.y = BOARD_SIZE / 2;
          queen.vx = 0;
          queen.vy = 0;
        }
        statusMsg = `Queen cover failed! Queen returned to center.`;
        s.queenCoverAwaiting = false;
        setQueenCoverStatus(null);
        switchTurn = true;
      }
    }

    // Process coins pocketed this turn
    if (s.pocketedThisTurn.length > 0 && !s.strikerPocketed) {
      let turnPoints = 0;
      let pocketedP1 = 0;
      let pocketedP2 = 0;

      s.pocketedThisTurn.forEach((coin) => {
        if (coin.type === 'white') {
          turnPoints += 10;
          pocketedP1++;
        } else if (coin.type === 'black') {
          turnPoints += 5;
          pocketedP2++;
        } else if (coin.type === 'queen') {
          // Queen potted: needs cover next shot
          s.queenCoverAwaiting = true;
          s.queenPocketedBy = curP;
          setQueenCoverStatus(`${curP === 1 ? 'Player 1' : 'Player 2'} potted Queen! Pocket another coin to COVER!`);
        }
      });

      if (curP === 1) {
        setP1Score((sc) => sc + turnPoints);
        setP1Pucks((pk) => pk + pocketedP1);
      } else {
        setP2Score((sc) => sc + turnPoints);
        setP2Pucks((pk) => pk + pocketedP2);
      }

      // Check if player potted their own color to retain turn
      const pottedOwn = curP === 1 ? pocketedP1 > 0 : pocketedP2 > 0;
      if (pottedOwn || s.queenCoverAwaiting) {
        switchTurn = false;
        if (!statusMsg) {
          statusMsg = `${curP === 1 ? 'Player 1' : 'Player 2'} pocketed coin! Extra shot.`;
        }
      }
    }

    // Reset striker back to baseline for next turn
    const nextP: 1 | 2 = switchTurn ? (curP === 1 ? 2 : 1) : curP;
    s.currentPlayer = nextP;
    setCurrentPlayer(nextP);

    s.striker.x = 310;
    s.striker.y = nextP === 1 ? 508 : 112;
    s.striker.vx = 0;
    s.striker.vy = 0;
    s.striker.isPocketed = false;
    setStrikerBaselineX(310);
    s.aimAngle = nextP === 1 ? -Math.PI / 2 : Math.PI / 2;

    // Check Victory Condition
    const whiteRemain = s.coins.filter((c) => !c.isPocketed && c.type === 'white').length;
    const blackRemain = s.coins.filter((c) => !c.isPocketed && c.type === 'black').length;
    const queenRemain = s.coins.filter((c) => !c.isPocketed && c.type === 'queen').length;

    if (whiteRemain === 0 || blackRemain === 0 || (whiteRemain === 0 && blackRemain === 0 && queenRemain === 0)) {
      const victoryTitle = p1Score >= p2Score ? 'Player 1 (You) Wins!' : s.gameMode === 'AI' ? 'Master AI Wins!' : 'Player 2 Wins!';
      setWinner(victoryTitle);
      sounds.playWin();
      spawnPocketSparks(BOARD_SIZE / 2, BOARD_SIZE / 2, '#38bdf8');
      return;
    }

    setGameStatus(statusMsg || `${nextP === 1 ? 'Player 1 (You)' : s.gameMode === 'AI' ? 'Master AI' : 'Player 2'}'s turn`);

    if (s.gameMode === 'AI' && nextP === 2) {
      triggerAiTurn();
    }
  };

  // Baseline change slider
  const handleBaselineChange = (newX: number) => {
    if (isShooting || !!winner) return;
    setStrikerBaselineX(newX);
    stateRef.current.striker.x = newX;
  };

  // Canvas Drag & Touch Aiming (Carrom Pool Style Slingshot/Aiming)
  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || stateRef.current.isRolling || !!winner) return;
    if (stateRef.current.gameMode === 'AI' && stateRef.current.currentPlayer === 2) return;

    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;

    const str = stateRef.current.striker;
    const distToStr = Math.hypot(x - str.x, y - str.y);

    stateRef.current.dragStart = { x, y };
    stateRef.current.dragCurrent = { x, y };
    stateRef.current.isAiming = true;
    stateRef.current.isDraggingStriker = distToStr < STRIKER_RADIUS * 2.5;

    // Aim angle toward pointer
    const angle = Math.atan2(y - str.y, x - str.x);
    stateRef.current.aimAngle = angle;
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    const s = stateRef.current;
    if (!s.isAiming || s.isRolling || !!winner) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = BOARD_SIZE / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;

    s.dragCurrent = { x, y };
    const str = s.striker;

    if (s.isDraggingStriker && s.dragStart) {
      // Slingshot mode: pulling back calculates power and angle
      const pullDx = s.dragStart.x - x;
      const pullDy = s.dragStart.y - y;
      const pullDist = Math.hypot(pullDx, pullDy);

      if (pullDist > 8) {
        s.aimAngle = Math.atan2(pullDy, pullDx);
        const pwr = Math.min(100, Math.max(15, Math.floor((pullDist / 120) * 100)));
        s.power = pwr;
        setShotPower(pwr);
      }
    } else {
      // Direct aim line
      s.aimAngle = Math.atan2(y - str.y, x - str.x);
    }
  };

  const handlePointerUp = () => {
    const s = stateRef.current;
    if (!s.isAiming || s.isRolling || !!winner) return;

    s.isAiming = false;
    const isSlingshot = s.isDraggingStriker && s.dragStart && s.dragCurrent;
    const pullDist = isSlingshot ? Math.hypot(s.dragStart!.x - s.dragCurrent!.x, s.dragStart!.y - s.dragCurrent!.y) : 0;

    s.dragStart = null;
    s.dragCurrent = null;

    if (pullDist > 16) {
      // Release shot from slingshot pull
      shootStriker(s.power, s.aimAngle);
    }
  };

  // Send quick chat message
  const triggerChat = (msg: string) => {
    setActiveChat({ sender: 'P1', text: msg });
    setShowChatModal(false);
    sounds.playClick();

    setTimeout(() => {
      // Bot reply if in AI mode
      if (gameMode === 'AI' && !winner) {
        const botReplies = ['Well played! 👏', 'Good luck! 🎯', 'Thanks! 😊', 'Game on! 🔥'];
        setActiveChat({ sender: 'P2', text: botReplies[Math.floor(Math.random() * botReplies.length)] });
        setTimeout(() => setActiveChat(null), 2500);
      } else {
        setActiveChat(null);
      }
    }, 2000);
  };

  // Main High-Fidelity Physics & Graphics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const updatePhysics = () => {
      const s = stateRef.current;
      const allObjects: CarromCoin[] = [...s.coins.filter((c) => !c.isPocketed)];
      if (!s.striker.isPocketed) allObjects.push(s.striker as unknown as CarromCoin);

      let moving = false;

      // SUB-STEPPING (5 physics sub-steps to completely eradicate tunneling)
      const SUB_STEPS = 5;
      for (let step = 0; step < SUB_STEPS; step++) {
        allObjects.forEach((obj) => {
          // Friction deceleration
          obj.vx *= 0.997;
          obj.vy *= 0.997;

          // Rotation decay
          if (obj.vRot !== undefined) {
            obj.rotation = (obj.rotation || 0) + obj.vRot;
            obj.vRot *= 0.97;
          }

          if (Math.hypot(obj.vx, obj.vy) < 0.04) {
            obj.vx = 0;
            obj.vy = 0;
          } else {
            moving = true;
          }

          obj.x += obj.vx / SUB_STEPS;
          obj.y += obj.vy / SUB_STEPS;

          // Cushion Bounds Collision
          const minX = PLAY_OFFSET + obj.radius;
          const maxX = BOARD_SIZE - PLAY_OFFSET - obj.radius;
          const minY = PLAY_OFFSET + obj.radius;
          const maxY = BOARD_SIZE - PLAY_OFFSET - obj.radius;

          if (obj.x < minX) {
            obj.x = minX;
            obj.vx = -obj.vx * 0.9;
            sounds.playBallHit(0.1, 280);
          } else if (obj.x > maxX) {
            obj.x = maxX;
            obj.vx = -obj.vx * 0.9;
            sounds.playBallHit(0.1, 280);
          }

          if (obj.y < minY) {
            obj.y = minY;
            obj.vy = -obj.vy * 0.9;
            sounds.playBallHit(0.1, 280);
          } else if (obj.y > maxY) {
            obj.y = maxY;
            obj.vy = -obj.vy * 0.9;
            sounds.playBallHit(0.1, 280);
          }

          // Pocket Detection & Smooth Sinking
          pockets.forEach((p) => {
            const dist = Math.hypot(obj.x - p.x, obj.y - p.y);
            if (dist < POCKET_RADIUS && !obj.isPocketed) {
              obj.isPocketed = true;
              obj.vx = 0;
              obj.vy = 0;
              sounds.playPocket();

              // Add to sinking animation list
              s.sinkingCoins.push({
                id: obj.id,
                type: obj.type || 'white',
                x: obj.x,
                y: obj.y,
                targetX: p.x,
                targetY: p.y,
                scale: 1,
                alpha: 1,
                progress: 0,
              });

              spawnPocketSparks(p.x, p.y, obj.type === 'queen' ? '#f43f5e' : obj.type === 'black' ? '#94a3b8' : '#facc15');

              if (obj === (s.striker as unknown as CarromCoin)) {
                s.strikerPocketed = true;
              } else {
                s.pocketedThisTurn.push(obj);
              }
            }
          });
        });

        // Circle-to-Circle Elastic Collisions
        for (let i = 0; i < allObjects.length; i++) {
          const o1 = allObjects[i];
          if (o1.isPocketed) continue;

          for (let j = i + 1; j < allObjects.length; j++) {
            const o2 = allObjects[j];
            if (o2.isPocketed) continue;

            const dx = o2.x - o1.x;
            const dy = o2.y - o1.y;
            const dist = Math.hypot(dx, dy);

            if (dist < o1.radius + o2.radius) {
              const overlap = o1.radius + o2.radius - dist;
              const nx = dx / (dist || 1);
              const ny = dy / (dist || 1);

              // Position separation
              o1.x -= nx * overlap * 0.5;
              o1.y -= ny * overlap * 0.5;
              o2.x += nx * overlap * 0.5;
              o2.y += ny * overlap * 0.5;

              // Elastic impulse resolution
              const kx = o1.vx - o2.vx;
              const ky = o1.vy - o2.vy;
              const p = 2 * (nx * kx + ny * ky) / 2;

              o1.vx -= p * nx * 0.95;
              o1.vy -= p * ny * 0.95;
              o2.vx += p * nx * 0.95;
              o2.vy += p * ny * 0.95;

              // Spin imparting
              o1.vRot = (Math.random() - 0.5) * 0.08;
              o2.vRot = (Math.random() - 0.5) * 0.08;

              const imp = Math.hypot(kx, ky);
              if (imp > 0.4 && step === 0) {
                sounds.playBallHit(Math.min(0.28, imp * 0.035), 440 + Math.random() * 80);
              }
            }
          }
        }
      }

      // Update Sinking Coins
      s.sinkingCoins.forEach((c) => {
        c.progress += 0.07;
        c.x += (c.targetX - c.x) * 0.18;
        c.y += (c.targetY - c.y) * 0.18;
        c.scale = Math.max(0, 1 - c.progress * 0.9);
        c.alpha = Math.max(0, 1 - c.progress);
      });
      s.sinkingCoins = s.sinkingCoins.filter((c) => c.alpha > 0);

      // Update Particles
      s.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.alpha -= 0.03;
      });
      s.particles = s.particles.filter((p) => p.alpha > 0);

      // Settle turn when all movement ceases
      if (s.isRolling && !moving && s.sinkingCoins.length === 0) {
        s.isRolling = false;
        setIsShooting(false);
        handleTurnResolution();
      }
    };

    // Render Carrom Pool Board & Components
    const render = () => {
      animId = requestAnimationFrame(render);
      updatePhysics();

      const s = stateRef.current;
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // 1. OUTER MAHOGANY POLISHED WOODEN FRAME
      ctx.save();
      // Outer drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 12;

      // Dark bevelled mahogany frame with rounded corners
      const frameGrad = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
      frameGrad.addColorStop(0, '#3e160a');
      frameGrad.addColorStop(0.3, '#582110');
      frameGrad.addColorStop(0.7, '#2b0c05');
      frameGrad.addColorStop(1, '#1a0602');
      ctx.fillStyle = frameGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, BOARD_SIZE, BOARD_SIZE, 32);
      ctx.fill();
      ctx.restore();

      // Outer gold/brass rim inlay
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(8, 8, BOARD_SIZE - 16, BOARD_SIZE - 16, 26);
      ctx.stroke();

      // Four Corner Protective Bumpers (Yellow/Gold accents as in reference screenshot)
      const bumperSize = 28;
      const bumpers = [
        { x: 4, y: 4, angle: 0 },
        { x: BOARD_SIZE - 4 - bumperSize, y: 4, angle: Math.PI / 2 },
        { x: BOARD_SIZE - 4 - bumperSize, y: BOARD_SIZE - 4 - bumperSize, angle: Math.PI },
        { x: 4, y: BOARD_SIZE - 4 - bumperSize, angle: -Math.PI / 2 },
      ];
      bumpers.forEach((b) => {
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(b.x, b.y, bumperSize, bumperSize, 8);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // 2. PLAYING SURFACE WITH MAPLE WOOD TEXTURE
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(PLAY_OFFSET, PLAY_OFFSET, PLAY_SIZE, PLAY_SIZE, 12);
      ctx.clip();

      if (s.woodTextureCanvas) {
        ctx.drawImage(s.woodTextureCanvas, 0, 0);
      } else {
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(PLAY_OFFSET, PLAY_OFFSET, PLAY_SIZE, PLAY_SIZE);
      }

      // Inner cushion bevel shadow
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 6;
      ctx.strokeRect(PLAY_OFFSET, PLAY_OFFSET, PLAY_SIZE, PLAY_SIZE);

      // Soft vignette on board perimeter
      const vignette = ctx.createRadialGradient(
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        180,
        BOARD_SIZE / 2,
        BOARD_SIZE / 2,
        310
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(67, 20, 7, 0.35)');
      ctx.fillStyle = vignette;
      ctx.fillRect(PLAY_OFFSET, PLAY_OFFSET, PLAY_SIZE, PLAY_SIZE);

      // 3. TRADITIONAL CARROM BOARD MARKINGS
      const cx = BOARD_SIZE / 2;
      const cy = BOARD_SIZE / 2;

      // Center Concentric Rings
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.stroke();

      // Ornate Center Mandala Flower (Petal vectors)
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.55)';
      ctx.lineWidth = 1.5;
      for (let p = 0; p < 12; p++) {
        const pAng = (Math.PI * 2 * p) / 12;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(pAng) * 52, cy + Math.sin(pAng) * 52, 22, 11, pAng, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center Red Queen Core Circle
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Outer Double Baseline Squares & Corner Target Arrows
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.5;

      // 4 Baseline Strips with End Circles
      // 4 Baseline Strips with End Circles
      const hBaseLines = [
        { y: 508, x1: 170, x2: 450 },
        { y: 112, x1: 170, x2: 450 },
      ];
      const vBaseLines = [
        { x: 112, y1: 170, y2: 450 },
        { x: 508, y1: 170, y2: 450 },
      ];

      hBaseLines.forEach((bl) => {
        // Double line
        ctx.beginPath();
        ctx.moveTo(bl.x1, bl.y - 5);
        ctx.lineTo(bl.x2, bl.y - 5);
        ctx.moveTo(bl.x1, bl.y + 5);
        ctx.lineTo(bl.x2, bl.y + 5);
        ctx.stroke();

        // End circles
        [bl.x1, bl.x2].forEach((bx) => {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(bx, bl.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(bx, bl.y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      vBaseLines.forEach((bl) => {
        ctx.beginPath();
        ctx.moveTo(bl.x - 5, bl.y1);
        ctx.lineTo(bl.x - 5, bl.y2);
        ctx.moveTo(bl.x + 5, bl.y1);
        ctx.lineTo(bl.x + 5, bl.y2);
        ctx.stroke();

        [bl.y1, bl.y2].forEach((by) => {
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(bl.x, by, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(bl.x, by, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Diagonal Pocket Guide Arrows
      const arrowGuides = [
        { sx: 170, sy: 170, tx: pockets[0].x + 14, ty: pockets[0].y + 14 },
        { sx: 450, sy: 170, tx: pockets[1].x - 14, ty: pockets[1].y + 14 },
        { sx: 170, sy: 450, tx: pockets[2].x + 14, ty: pockets[2].y - 14 },
        { sx: 450, sy: 450, tx: pockets[3].x - 14, ty: pockets[3].y - 14 },
      ];
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.45)';
      ctx.lineWidth = 1.5;
      arrowGuides.forEach((ag) => {
        ctx.beginPath();
        ctx.moveTo(ag.sx, ag.sy);
        ctx.lineTo(ag.tx, ag.ty);
        ctx.stroke();
      });

      // 4. FOUR DEEP CORNER POCKETS (Dark 3D interior with metallic rim)
      pockets.forEach((p) => {
        // Deep interior gradient
        const pGrad = ctx.createRadialGradient(p.x - 2, p.y - 2, 2, p.x, p.y, POCKET_RADIUS);
        pGrad.addColorStop(0, '#020617');
        pGrad.addColorStop(0.7, '#0f172a');
        pGrad.addColorStop(1, '#334155');

        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = pGrad;
        ctx.fill();

        // Pocket brass mesh rim
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner depth rim
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS - 2, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 5. CARROM COINS RENDERING (3D Discs with Specular Highlights & Shadows)
      s.coins.forEach((coin) => {
        if (coin.isPocketed) return;

        ctx.save();
        // Drop shadow onto wooden board
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 7;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);

        if (coin.type === 'white') {
          // Ivory white puck with gloss bevel
          const wGrad = ctx.createRadialGradient(
            coin.x - 4,
            coin.y - 4,
            2,
            coin.x,
            coin.y,
            coin.radius
          );
          wGrad.addColorStop(0, '#ffffff');
          wGrad.addColorStop(0.6, '#fef08a');
          wGrad.addColorStop(0.9, '#f59e0b');
          wGrad.addColorStop(1, '#b45309');
          ctx.fillStyle = wGrad;
          ctx.fill();
        } else if (coin.type === 'black') {
          // Polished obsidian black puck
          const bGrad = ctx.createRadialGradient(
            coin.x - 4,
            coin.y - 4,
            2,
            coin.x,
            coin.y,
            coin.radius
          );
          bGrad.addColorStop(0, '#64748b');
          bGrad.addColorStop(0.5, '#1e293b');
          bGrad.addColorStop(1, '#09090b');
          ctx.fillStyle = bGrad;
          ctx.fill();
        } else {
          // Red Queen with ruby lacquer
          const qGrad = ctx.createRadialGradient(
            coin.x - 4,
            coin.y - 4,
            2,
            coin.x,
            coin.y,
            coin.radius
          );
          qGrad.addColorStop(0, '#fda4af');
          qGrad.addColorStop(0.4, '#f43f5e');
          qGrad.addColorStop(0.85, '#e11d48');
          qGrad.addColorStop(1, '#881337');
          ctx.fillStyle = qGrad;
          ctx.fill();
        }
        ctx.restore(); // restore shadow

        // Concentric carved grooves on coin face
        ctx.strokeStyle = coin.type === 'black' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius * 0.32, 0, Math.PI * 2);
        ctx.stroke();

        // Queen central gold star
        if (coin.type === 'queen') {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Specular gloss arc highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(coin.x, coin.y, coin.radius - 2.5, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.stroke();
      });

      // 6. SINKING COINS ANIMATION INTO POCKETS
      s.sinkingCoins.forEach((c) => {
        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(c.x, c.y);
        ctx.scale(c.scale, c.scale);

        ctx.beginPath();
        ctx.arc(0, 0, COIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = c.type === 'queen' ? '#e11d48' : c.type === 'white' ? '#fde047' : '#1e293b';
        ctx.fill();
        ctx.restore();
      });

      // 7. PARTICLES
      s.particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 8. HIGH-FIDELITY STRIKER RENDERING
      const str = s.striker;
      if (!str.isPocketed) {
        ctx.save();
        // Drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 5;

        // Outer Metallic Rim
        const skin = s.selectedSkin;
        const strGrad = ctx.createRadialGradient(
          str.x - 5,
          str.y - 5,
          3,
          str.x,
          str.y,
          str.radius
        );
        strGrad.addColorStop(0, '#ffffff');
        strGrad.addColorStop(0.3, skin.ringColor);
        strGrad.addColorStop(0.7, skin.themeColor);
        strGrad.addColorStop(1, '#0f172a');

        ctx.beginPath();
        ctx.arc(str.x, str.y, str.radius, 0, Math.PI * 2);
        ctx.fillStyle = strGrad;
        ctx.fill();
        ctx.restore();

        // Chrome bevel ring
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(str.x, str.y, str.radius - 2, 0, Math.PI * 2);
        ctx.stroke();

        // Inner Gem Core
        ctx.fillStyle = skin.themeColor;
        ctx.beginPath();
        ctx.arc(str.x, str.y, str.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Striker Sigil (Star / Crown / Bolt)
        ctx.fillStyle = skin.accentColor;
        ctx.beginPath();
        if (skin.symbol === 'bolt') {
          // Lightning Bolt
          ctx.moveTo(str.x - 2, str.y - 6);
          ctx.lineTo(str.x + 4, str.y - 1);
          ctx.lineTo(str.x, str.y);
          ctx.lineTo(str.x + 2, str.y + 6);
          ctx.lineTo(str.x - 4, str.y + 1);
          ctx.lineTo(str.x - 1, str.y);
        } else {
          // Star Emblem
          ctx.arc(str.x, str.y, 4, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();

        // Specular highlight rim
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(str.x, str.y, str.radius - 3, -Math.PI * 0.85, -Math.PI * 0.2);
        ctx.stroke();

        // 9. AIMING GUIDELINE & IMPACT PREDICTION (Carrom Pool Style!)
        const canAim = !s.isRolling && !winner && (s.gameMode === '2P' || s.currentPlayer === 1);

        if (canAim) {
          // Circular aiming reticle around striker
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(str.x, str.y, 48, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Calculate first obstacle intersection along aim ray
          const rayAngle = s.aimAngle;
          const rayCos = Math.cos(rayAngle);
          const raySin = Math.sin(rayAngle);
          let nearestDist = 320;
          let hitCoin: CarromCoin | null = null;

          // Check intersection with all active coins
          s.coins.forEach((coin) => {
            if (coin.isPocketed) return;
            // Vector from striker to coin
            const ox = coin.x - str.x;
            const oy = coin.y - str.y;
            const proj = ox * rayCos + oy * raySin;
            if (proj > 0 && proj < nearestDist) {
              const perpSq = ox * ox + oy * oy - proj * proj;
              const radSum = str.radius + coin.radius;
              if (perpSq <= radSum * radSum) {
                const intersectDist = proj - Math.sqrt(Math.max(0, radSum * radSum - perpSq));
                if (intersectDist < nearestDist && intersectDist > 0) {
                  nearestDist = intersectDist;
                  hitCoin = coin;
                }
              }
            }
          });

          const hitX = str.x + rayCos * nearestDist;
          const hitY = str.y + raySin * nearestDist;

          // Striker trajectory line (colored by power)
          const pwrColor = s.power > 75 ? '#f43f5e' : s.power > 45 ? '#facc15' : '#22c55e';
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = pwrColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(str.x, str.y);
          ctx.lineTo(hitX, hitY);
          ctx.stroke();
          ctx.restore();

          // Ghost Striker at point of collision
          if (hitCoin) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hitX, hitY, str.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Projected deflection line of hit coin!
            const hitAngle = Math.atan2((hitCoin as CarromCoin).y - hitY, (hitCoin as CarromCoin).x - hitX);
            const deflectLen = 70;
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
            ctx.beginPath();
            ctx.moveTo((hitCoin as CarromCoin).x, (hitCoin as CarromCoin).y);
            ctx.lineTo(
              (hitCoin as CarromCoin).x + Math.cos(hitAngle) * deflectLen,
              (hitCoin as CarromCoin).y + Math.sin(hitAngle) * deflectLen
            );
            ctx.stroke();
            ctx.restore();
          }

          // Directional Power Arrow inside striker reticle
          const arrowLen = 22 + (s.power / 100) * 24;
          const arrowX = str.x + rayCos * arrowLen;
          const arrowY = str.y + raySin * arrowLen;

          ctx.strokeStyle = pwrColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(str.x, str.y);
          ctx.lineTo(arrowX, arrowY);
          ctx.stroke();

          // Arrow head
          const headLen = 8;
          ctx.fillStyle = pwrColor;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - rayCos * headLen - raySin * 5, arrowY - raySin * headLen + rayCos * 5);
          ctx.lineTo(arrowX - rayCos * headLen + raySin * 5, arrowY - raySin * headLen - rayCos * 5);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore(); // restore play field clip
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pockets, winner]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 sm:p-4 select-none">
      {/* 1. TOP CARROM POOL HUD (Inspired by Miniclip Carrom Pool) */}
      <div className="w-full max-w-xl bg-gradient-to-r from-[#20051e] via-[#330b2e] to-[#20051e] border border-amber-500/30 rounded-2xl p-3 sm:p-4 mb-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* PLAYER 1 (Left) */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full p-0.5 transition-all ${
                  currentPlayer === 1 && !winner
                    ? 'ring-4 ring-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.6)] animate-pulse'
                    : 'ring-2 ring-amber-500/50'
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-amber-300">
                  <User className="w-6 h-6 text-amber-300" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[10px] px-1 rounded-full shadow">
                ★ 26
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-wide">Player 1 (You)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* White Puck Icon */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-white via-amber-100 to-amber-300 border border-amber-400 flex items-center justify-center shadow-xs">
                  <span className="text-[8px] font-bold text-slate-900">{p1Pucks}</span>
                </div>
                <span className="font-mono font-extrabold text-sm text-white">{p1Score} pts</span>
              </div>
            </div>
          </div>

          {/* CENTER MATCH POT */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/40 px-3 py-1 rounded-full shadow-inner">
              <span className="text-xs">💰</span>
              <span className="font-mono font-extrabold text-xs text-amber-300 tracking-wider">1,000</span>
            </div>
            <span className="text-[10px] text-amber-200/80 mt-1 uppercase tracking-widest font-semibold">
              {winner ? 'Match Ended' : currentPlayer === 1 ? 'Your Shot' : gameMode === 'AI' ? 'AI Shot' : 'Player 2'}
            </span>
          </div>

          {/* PLAYER 2 / AI (Right) */}
          <div className="flex items-center gap-2.5 flex-row-reverse">
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full p-0.5 transition-all ${
                  currentPlayer === 2 && !winner
                    ? 'ring-4 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.6)] animate-pulse'
                    : 'ring-2 ring-amber-500/50'
                }`}
              >
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-amber-300">
                  {gameMode === 'AI' ? (
                    <Cpu className="w-6 h-6 text-cyan-300" />
                  ) : (
                    <User className="w-6 h-6 text-cyan-300" />
                  )}
                </div>
              </div>
              <span className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 font-bold text-[10px] px-1 rounded-full shadow">
                ★ 24
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white tracking-wide">
                {gameMode === 'AI' ? 'Master AI' : 'Player 2'}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-mono font-extrabold text-sm text-white">{p2Score} pts</span>
                {/* Black Puck Icon */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-600 via-slate-800 to-black border border-slate-500 flex items-center justify-center shadow-xs">
                  <span className="text-[8px] font-bold text-white">{p2Pucks}</span>
                </div>
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

      {/* Queen Cover Alert Ribbon */}
      {queenCoverStatus && (
        <div className="w-full max-w-xl mb-2 bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white text-xs font-bold py-1.5 px-4 rounded-xl text-center shadow-lg animate-pulse flex items-center justify-center gap-2">
          <span>👑</span>
          <span>{queenCoverStatus}</span>
        </div>
      )}

      {/* 2. MAIN CARROM BOARD VIEWPORT */}
      <div className="relative w-full max-w-xl aspect-square bg-[#1a051d] border-4 border-amber-900/60 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={620}
          height={620}
          onPointerDown={(e) => handlePointerDown(e.clientX, e.clientY)}
          onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full object-contain cursor-crosshair touch-none select-none"
        />

        {/* Match Victory Overlay */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-3 text-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.5)]">
              <Trophy className="w-8 h-8" />
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold mb-1">Match Completed</span>
            <h2 className="text-3xl font-extrabold text-white mb-2">{winner}</h2>

            {/* Score cards */}
            <div className="grid grid-cols-2 gap-3 w-64 my-4">
              <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl text-center">
                <span className="text-[11px] text-slate-400">Player 1</span>
                <div className="text-xl font-mono font-bold text-amber-400">{p1Score} pts</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-700 p-3 rounded-xl text-center">
                <span className="text-[11px] text-slate-400">{gameMode === 'AI' ? 'Master AI' : 'Player 2'}</span>
                <div className="text-xl font-mono font-bold text-cyan-400">{p2Score} pts</div>
              </div>
            </div>

            <button
              onClick={initBoard}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-7 py-3 rounded-xl transition-all shadow-lg active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. DEDICATED CARROM POOL BASELINE SLIDER TRACK */}
      <div className="w-full max-w-xl mt-3 bg-gradient-to-b from-[#2a0e28] to-[#1a051d] border border-amber-500/40 rounded-2xl p-3 shadow-lg flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-amber-200/90 font-medium px-1">
          <span>Baseline Position</span>
          <span className="font-mono font-bold text-amber-400">{Math.round(((strikerBaselineX - 170) / 280) * 100)}%</span>
        </div>

        {/* Polished wooden / metallic slider track */}
        <div className="relative w-full h-8 bg-[#120314] rounded-full border-2 border-amber-800/80 p-1 flex items-center shadow-inner">
          <input
            type="range"
            min="170"
            max="450"
            value={strikerBaselineX}
            onChange={(e) => handleBaselineChange(parseInt(e.target.value, 10))}
            disabled={isShooting || !!winner || (gameMode === 'AI' && currentPlayer === 2)}
            className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-10"
          />

          {/* Visual Miniature Striker Puck Handle on Track */}
          <div
            className="absolute h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center pointer-events-none transition-transform"
            style={{
              left: `calc(${((strikerBaselineX - 170) / 280) * 100}% - 12px)`,
              backgroundColor: selectedSkin.themeColor,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white shadow-xs" />
          </div>
        </div>

        {/* Power meter and quick action controls */}
        <div className="flex items-center justify-between gap-3 mt-1">
          {/* Shot power slider */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Power:</span>
            <input
              type="range"
              min="15"
              max="100"
              value={shotPower}
              onChange={(e) => {
                setShotPower(parseInt(e.target.value, 10));
                stateRef.current.power = parseInt(e.target.value, 10);
              }}
              disabled={isShooting || !!winner}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-amber-400 w-8">{shotPower}%</span>
          </div>

          {/* Strike Button */}
          <button
            onClick={() => {
              if (!isShooting && !winner && (gameMode === '2P' || currentPlayer === 1)) {
                shootStriker(shotPower, stateRef.current.aimAngle);
              }
            }}
            disabled={isShooting || !!winner || (gameMode === 'AI' && currentPlayer === 2)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
          >
            {isShooting ? 'Rolling...' : 'Strike'}
          </button>
        </div>
      </div>

      {/* 4. BOTTOM ACTION TOOLBAR */}
      <div className="w-full max-w-xl mt-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arcade</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Chat / Emote button */}
          <button
            onClick={() => setShowChatModal(true)}
            aria-label="Quick Chat"
            className="p-2 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Striker Skin Armory */}
          <button
            onClick={() => setShowSkinModal(true)}
            aria-label="Custom Strikers"
            className="flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-2 rounded-xl transition-colors"
          >
            <Palette className="w-4 h-4" />
            <span>Striker</span>
          </button>

          {/* Mode Switcher */}
          <button
            onClick={() => {
              setGameMode(gameMode === 'AI' ? '2P' : 'AI');
              initBoard();
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
            onClick={initBoard}
            aria-label="Restart Match"
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status ticker */}
      <div className="mt-2 text-center flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span>{gameStatus}</span>
      </div>

      {/* 5. STRIKER CUSTOMIZER MODAL */}
      {showSkinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b061d] border border-amber-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowSkinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Striker Armory</h3>
            <p className="text-xs text-slate-400 mb-4">Choose your custom striker design.</p>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {STRIKER_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => {
                    setSelectedSkin(skin);
                    sounds.playClick();
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    selectedSkin.id === skin.id
                      ? 'bg-amber-500/20 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md flex items-center justify-center"
                    style={{ backgroundColor: skin.themeColor }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: skin.accentColor }} />
                  </div>
                  <span className="text-xs font-semibold text-white">{skin.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSkinModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Equip Striker
            </button>
          </div>
        </div>
      )}

      {/* 6. QUICK CHAT MODAL */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b061d] border border-amber-500/40 rounded-2xl max-w-xs w-full p-5 shadow-2xl relative">
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
                  className="w-full text-left bg-slate-900/80 hover:bg-amber-500/20 border border-slate-800 hover:border-amber-400/50 text-xs font-medium text-slate-200 hover:text-amber-300 py-2.5 px-3.5 rounded-xl transition-colors"
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
