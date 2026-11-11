export type GameCategory = 'all' | 'arcade' | 'board' | 'sports' | 'puzzle';

export interface GameInfo {
  id: string;
  title: string;
  category: 'arcade' | 'board' | 'sports' | 'puzzle';
  categoryLabel: string;
  shortDesc: string;
  thumbnail: string;
  features: string[];
  controls: {
    desktop: string;
    mobile: string;
  };
}

export const GAMES: GameInfo[] = [
  {
    id: 'stack-ball',
    title: 'Stack Ball – Crash Platform',
    category: 'arcade',
    categoryLabel: 'Arcade',
    shortDesc: 'Smash through rotating platforms to reach the base. Dodge black obstacles and activate fireball combos!',
    thumbnail: '/src/assets/images/thumb_stack_ball_1794046311429.jpg',
    features: [
      '3D rotating platform tower',
      'Hold to smash & break colored slices',
      'Lethal black platform hazard',
      'Fireball frenzy combo overdrive',
      'Procedural levels & high scores'
    ],
    controls: {
      desktop: 'Hold Left Mouse Button or Spacebar to smash',
      mobile: 'Tap and hold screen to smash down'
    }
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    category: 'board',
    categoryLabel: 'Board & Classic',
    shortDesc: 'Classic 3x3 strategic battle with 3 AI difficulties (Easy, Medium, Master Minimax) or local 2-player.',
    thumbnail: '/src/assets/images/thumb_tic_tac_toe_1794046312502.jpg',
    features: [
      'Player vs AI with 3 distinct intelligence levels',
      'Local 2-player turn-based mode',
      'Animated strike lines and victory detection',
      'Round scoreboard with win/draw tracking'
    ],
    controls: {
      desktop: 'Click any empty cell to place your symbol',
      mobile: 'Tap any empty cell to play'
    }
  },
  {
    id: '8-ball-pool',
    title: '8 Ball Pool',
    category: 'sports',
    categoryLabel: 'Sports & Physics',
    shortDesc: 'Realistic top-down billiards with accurate 16-ball physics, solids vs stripes, cue aiming, and fouls.',
    thumbnail: '/src/assets/images/thumb_pool_8ball_1794046313161.jpg',
    features: [
      'Full 16-ball set (7 solids, 7 stripes, 8-ball, cue ball)',
      'Realistic momentum, restitution & friction physics',
      'Precise guideline aiming & adjustable power cue',
      'Official solids vs stripes rules & 8-ball endgame',
      'Play vs intelligent Billiards AI or local 2-Player'
    ],
    controls: {
      desktop: 'Move mouse to aim, drag cue back to charge shot & release',
      mobile: 'Touch to rotate cue aim, pull back power slider & release'
    }
  },
  {
    id: 'gun-sprint',
    title: 'Gun Sprint',
    category: 'arcade',
    categoryLabel: 'Arcade FPS',
    shortDesc: 'First-person 3D bottle shooting FPS! Aim your pistol, blast glass bottles across the shooting range, and master recoil.',
    thumbnail: '/assets/aistudio/image_b81373ac.png',
    features: [
      'First-person FPS camera with 3D hands and tactical pistol',
      'Realistic glass bottle shattering physics & particle bursts',
      'Shooting range with near, mid and long range targets',
      'Touch-and-drag mobile aiming with dedicated FIRE button',
      'Combo multipliers, accuracy scoring, and stage progression'
    ],
    controls: {
      desktop: 'Move mouse to aim crosshair, Left Click / Spacebar / FIRE button to shoot, R to reload',
      mobile: 'Drag screen to aim crosshair, tap FIRE button to shoot, tap RELOAD for fresh magazine'
    }
  },
  {
    id: 'ludo',
    title: 'Ludo',
    category: 'board',
    categoryLabel: 'Board & Classic',
    shortDesc: 'Authentic 4-color classic Ludo. Roll 6 to enter, capture opponents, navigate safe spots, and race home.',
    thumbnail: '/src/assets/images/thumb_ludo_board_1794046314420.jpg',
    features: [
      'Complete authentic 4-color board (Red, Green, Yellow, Blue)',
      'Roll a 6 to liberate tokens & gain bonus turns',
      'Capturing opponent tokens sends them back to yard',
      'Protected star safe zones & colored home corridors',
      'Play against 1–3 Computer bots or 2–4 Local players'
    ],
    controls: {
      desktop: 'Click the 3D dice to roll, click your token to move',
      mobile: 'Tap dice to roll, tap token to move'
    }
  },
  {
    id: 'snakes-and-ladders',
    title: 'Snakes and Ladders',
    category: 'board',
    categoryLabel: 'Board & Classic',
    shortDesc: 'Traditional 100-square board game with animated climbing ladders, slippery snakes, and 2-4 player fun.',
    thumbnail: '/src/assets/images/thumb_snakes_ladders_1794046314464.jpg',
    features: [
      '1 to 100 alternating boustrophedon board layout',
      'Climb fast ladders and slide down treacherous snakes',
      'Play 1-Player vs Smart AI or 2-4 local players',
      'Smooth animated token stepping and celebration win'
    ],
    controls: {
      desktop: 'Click the Roll Dice button on your turn',
      mobile: 'Tap Roll Dice button'
    }
  },
  {
    id: 'carrom',
    title: 'Carrom',
    category: 'sports',
    categoryLabel: 'Sports & Physics',
    shortDesc: 'Authentic tabletop carrom with 9 white, 9 black, red Queen, striker positioning, pocketing, and cover rules.',
    thumbnail: '/src/assets/images/thumb_carrom_board_1794046315335.jpg',
    features: [
      '9 White (10 pts), 9 Black (5 pts), and Red Queen (3 pts)',
      'Striker slide placement along baseline',
      'Accurate circle-circle elastic collision physics & rebound',
      'Pocketing Queen cover rules and penalty foul logic',
      'Play vs Computer Carrom bot or Local 2-Player'
    ],
    controls: {
      desktop: 'Slide striker on baseline, drag back to aim & shoot',
      mobile: 'Touch baseline slider, pull back aim arrow & release'
    }
  },
  {
    id: 'car-racing',
    title: 'Car Racing',
    category: 'arcade',
    categoryLabel: 'Arcade',
    shortDesc: 'Adrenaline-packed highway racer! Dodge heavy traffic, collect fuel & coins, shift lanes, and hit top speeds.',
    thumbnail: '/src/assets/images/thumb_car_racing_1794046315790.jpg',
    features: [
      'Responsive sports car steering, brakes, and turbo boost',
      'Dynamically spawning multi-lane traffic cars & trucks',
      'Road bonuses: fuel canisters, speed boosts, gold coins',
      'Increasing velocity, distance scoring, and best records',
      'Full desktop keys and responsive mobile touch buttons'
    ],
    controls: {
      desktop: 'A/D or Left/Right Arrow to steer, W/Up to accelerate, S/Down to brake',
      mobile: 'On-screen Left / Right steering buttons and Gas pedal'
    }
  }
];

export function getStoredScore(gameId: string): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(`pixel_arcade_best_${gameId}`);
  return val ? parseInt(val, 10) || 0 : 0;
}

export function saveStoredScore(gameId: string, score: number): number {
  if (typeof window === 'undefined') return score;
  const current = getStoredScore(gameId);
  if (score > current) {
    localStorage.setItem(`pixel_arcade_best_${gameId}`, score.toString());
    return score;
  }
  return current;
}
