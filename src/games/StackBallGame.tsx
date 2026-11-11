import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Volume2, VolumeX, Flame, Trophy, Sparkles } from 'lucide-react';
import * as THREE from 'three';
import { sounds } from '../utils/audio';
import { getStoredScore, saveStoredScore } from '../types';

interface StackBallGameProps {
  onBack: () => void;
}

// Level visual schemes
interface LevelTheme {
  name: string;
  pillarColor: number;
  blockColor: number;
  ballColor: number;
  bgColorTop: string;
  bgColorBottom: string;
}

const LEVEL_THEMES: LevelTheme[] = [
  {
    name: 'Citrus Sun',
    pillarColor: 0xffffff, // White pillar
    blockColor: 0xfacc15,  // Vivid Yellow (Reference 2)
    ballColor: 0x3b82f6,   // Glossy Blue ball
    bgColorTop: '#f97316',
    bgColorBottom: '#7c2d12',
  },
  {
    name: 'Toxic Lime',
    pillarColor: 0x8b5cf6, // Purple pillar (Reference 1)
    blockColor: 0x4ade80,  // Vivid Lime Green
    ballColor: 0xef4444,   // Crimson Red ball
    bgColorTop: '#38bdf8',
    bgColorBottom: '#1e1b4b',
  },
  {
    name: 'Neon Coral',
    pillarColor: 0x1e293b, // Dark Slate pillar
    blockColor: 0xf97316,  // Orange / Coral
    ballColor: 0x06b6d4,   // Cyan ball
    bgColorTop: '#4f46e5',
    bgColorBottom: '#0f172a',
  },
  {
    name: 'Cyber Magenta',
    pillarColor: 0x0f172a, // Deep Navy pillar
    blockColor: 0xec4899,  // Hot Pink / Magenta
    ballColor: 0xfacc15,   // Yellow ball
    bgColorTop: '#701a75',
    bgColorBottom: '#18181b',
  },
  {
    name: 'Electric Cyan',
    pillarColor: 0xe2e8f0, // Silver / White pillar
    blockColor: 0x06b6d4,  // Cyan
    ballColor: 0x8b5cf6,   // Purple ball
    bgColorTop: '#047857',
    bgColorBottom: '#022c22',
  },
];

interface SectorData {
  isDangerous: boolean;
  startAngle: number;
  sweepAngle: number;
  mesh: THREE.Mesh;
}

interface PlatformData {
  y: number;
  group: THREE.Group;
  sectors: SectorData[];
  broken: boolean;
  rotationSpeed: number;
}

interface DebrisChunk {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  life: number;
}

interface FlameParticle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export const StackBallGame: React.FC<StackBallGameProps> = ({ onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // React state for HUD
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => getStoredScore('stack-ball'));
  const [level, setLevel] = useState<number>(1);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_CLEAR'>('IDLE');
  const [isSmashing, setIsSmashing] = useState<boolean>(false);
  const [comboRatio, setComboRatio] = useState<number>(0); // 0 to 1 for arc meter
  const [isFireball, setIsFireball] = useState<boolean>(false);
  const [progressRatio, setProgressRatio] = useState<number>(0); // 0 to 1
  const [soundMuted, setSoundMuted] = useState<boolean>(!sounds.enabled);

  // Mutable internal state for 60fps loop
  const engineRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    pillarMesh: null as THREE.Mesh | null,
    ballMesh: null as THREE.Mesh | null,
    baseMesh: null as THREE.Mesh | null,
    fireLight: null as THREE.PointLight | null,
    shadowPlane: null as THREE.Mesh | null,
    platforms: [] as PlatformData[],
    debris: [] as DebrisChunk[],
    particles: [] as FlameParticle[],
    particleGeo: null as THREE.BufferGeometry | null,
    particleMat: null as THREE.MeshBasicMaterial | null,
    gameState: 'IDLE' as 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_CLEAR',
    isSmashing: false,
    level: 1,
    score: 0,
    comboCount: 0,
    fireballTimer: 0,
    ballY: 0,
    ballVy: 0,
    ballBouncePhase: 0,
    cameraY: 0,
    cameraTargetY: 0,
    shakeIntensity: 0,
    currentPlatformIndex: 0,
    totalPlatforms: 30,
    theme: LEVEL_THEMES[0],
    reqId: 0,
    lastTime: performance.now(),
  });

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Build sector geometry: 3D chamfered curved wedge block
  const createSectorGeometry = (innerR: number, outerR: number, height: number, sweep: number) => {
    const shape = new THREE.Shape();
    const segments = 12;
    // Outer arc
    for (let i = 0; i <= segments; i++) {
      const theta = (sweep * i) / segments;
      const x = outerR * Math.cos(theta);
      const y = outerR * Math.sin(theta);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    // Inner arc back
    for (let i = segments; i >= 0; i--) {
      const theta = (sweep * i) / segments;
      const x = innerR * Math.cos(theta);
      const y = innerR * Math.sin(theta);
      shape.lineTo(x, y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelOffset: 0,
      bevelSegments: 2,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Orient so extrusion is along Y axis
    geo.rotateX(Math.PI / 2);
    return geo;
  };

  // Generate platforms for current level
  const generateLevel = useCallback((lvl: number) => {
    const engine = engineRef.current;
    if (!engine.scene) return;

    // Remove existing platforms
    engine.platforms.forEach((p) => {
      p.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      engine.scene?.remove(p.group);
    });
    engine.platforms = [];

    // Clear active debris and particles
    engine.debris.forEach((d) => {
      engine.scene?.remove(d.mesh);
      d.mesh.geometry.dispose();
    });
    engine.debris = [];

    engine.particles.forEach((pt) => {
      engine.scene?.remove(pt.mesh);
    });
    engine.particles = [];

    const theme = LEVEL_THEMES[(lvl - 1) % LEVEL_THEMES.length];
    engine.theme = theme;

    const platformCount = Math.min(60, 24 + lvl * 4);
    engine.totalPlatforms = platformCount;
    engine.currentPlatformIndex = 0;

    const platformSpacing = 0.85;
    const innerRadius = 1.05;
    const outerRadius = 2.4;
    const blockHeight = 0.35;

    // Shared materials for performance
    const breakableMaterial = new THREE.MeshStandardMaterial({
      color: theme.blockColor,
      roughness: 0.25,
      metalness: 0.05,
      flatShading: false,
    });

    const dangerousMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Charcoal black hazard block
      roughness: 0.4,
      metalness: 0.3,
      flatShading: false,
    });

    // Update pillar color & height
    const totalHeight = platformCount * platformSpacing + 10;
    if (engine.pillarMesh) {
      (engine.pillarMesh.material as THREE.MeshStandardMaterial).color.setHex(theme.pillarColor);
      engine.pillarMesh.position.y = -totalHeight / 2 + 5;
      engine.pillarMesh.scale.set(1, totalHeight / 80, 1);
    }

    // Update ball color
    if (engine.ballMesh) {
      const ballMat = engine.ballMesh.material as THREE.MeshPhysicalMaterial;
      ballMat.color.setHex(theme.ballColor);
      ballMat.emissive.setHex(0x000000);
      ballMat.emissiveIntensity = 0;
    }

    const dangerRatio = Math.min(0.5, 0.18 + lvl * 0.035);

    for (let i = 0; i < platformCount; i++) {
      const y = -i * platformSpacing;
      const group = new THREE.Group();
      group.position.y = y;

      const numSlices = 6 + (i % 3);
      const sliceAngle = (Math.PI * 2) / numSlices;
      const gapAngle = 0.04;
      const sweepAngle = sliceAngle - gapAngle;

      const sectors: SectorData[] = [];
      const baseDanger = i < platformCount - 1 && Math.random() < dangerRatio;

      for (let s = 0; s < numSlices; s++) {
        // Last 2 platforms near base have no hazard blocks for fair finish
        const isDangerous = i < platformCount - 2 ? (baseDanger && (s === 0 || s === 1 || s === Math.floor(numSlices / 2))) : false;
        const mat = isDangerous ? dangerousMaterial : breakableMaterial;
        const geo = createSectorGeometry(innerRadius, outerRadius, blockHeight, sweepAngle);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position rotation within group
        const startAngle = s * sliceAngle;
        mesh.rotation.y = startAngle;

        group.add(mesh);
        sectors.push({
          isDangerous,
          startAngle,
          sweepAngle,
          mesh,
        });
      }

      // Initial stagger angle
      group.rotation.y = (i * 0.4) % (Math.PI * 2);

      engine.scene.add(group);
      engine.platforms.push({
        y,
        group,
        sectors,
        broken: false,
        rotationSpeed: 0.015 + ((i % 2 === 0 ? 1 : -1) * 0.005),
      });
    }

    // Base podium pad
    if (engine.baseMesh) {
      engine.baseMesh.position.y = -platformCount * platformSpacing - 0.2;
    }

    // Set initial ball & camera
    engine.ballY = 1.0;
    engine.ballVy = 0;
    engine.ballBouncePhase = 0;
    engine.cameraY = 3.5;
    engine.cameraTargetY = 3.5;
    engine.comboCount = 0;
    engine.fireballTimer = 0;

    setProgressRatio(0);
    setComboRatio(0);
    setIsFireball(false);
  }, []);

  // Shatter an entire platform into flying 3D debris
  const shatterPlatform = (platform: PlatformData) => {
    const engine = engineRef.current;
    if (!engine.scene) return;

    platform.broken = true;
    engine.scene.remove(platform.group);

    // Create debris pieces from each sector
    platform.sectors.forEach((sec) => {
      // Calculate world transform of this sector
      const blockMat = sec.mesh.material;
      const blockGeo = sec.mesh.geometry.clone();
      const debrisMesh = new THREE.Mesh(blockGeo, blockMat);

      // World position and rotation
      const worldPos = new THREE.Vector3();
      sec.mesh.getWorldPosition(worldPos);
      const worldQuat = new THREE.Quaternion();
      sec.mesh.getWorldQuaternion(worldQuat);

      debrisMesh.position.copy(worldPos);
      debrisMesh.quaternion.copy(worldQuat);
      debrisMesh.castShadow = false;

      engine.scene?.add(debrisMesh);

      // Outward blast vector
      const angle = sec.startAngle + platform.group.rotation.y + sec.sweepAngle / 2;
      const speed = 4.5 + Math.random() * 4.0;
      engine.debris.push({
        mesh: debrisMesh,
        vx: Math.cos(angle) * speed,
        vy: 2.5 + Math.random() * 3.5,
        vz: Math.sin(angle) * speed,
        vRotX: (Math.random() - 0.5) * 8.0,
        vRotY: (Math.random() - 0.5) * 8.0,
        vRotZ: (Math.random() - 0.5) * 8.0,
        life: 1.0,
      });
    });

    // Spawn burst particles on impact
    const isFire = engine.fireballTimer > 0;
    const particleCount = isFire ? 18 : 8;
    for (let p = 0; p < particleCount; p++) {
      if (!engine.particleGeo || !engine.particleMat) continue;
      const pMesh = new THREE.Mesh(
        engine.particleGeo,
        new THREE.MeshBasicMaterial({
          color: isFire ? (Math.random() > 0.4 ? 0xf97316 : 0xfde047) : engine.theme.blockColor,
          transparent: true,
          opacity: 1,
        })
      );
      pMesh.position.set(0, platform.y + 0.2, 1.8);
      pMesh.scale.setScalar(0.08 + Math.random() * 0.1);
      engine.scene.add(pMesh);

      const pAngle = Math.random() * Math.PI * 2;
      const pSpeed = 2 + Math.random() * 5;
      engine.particles.push({
        mesh: pMesh,
        vx: Math.cos(pAngle) * pSpeed,
        vy: 1.5 + Math.random() * 3,
        vz: Math.sin(pAngle) * pSpeed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
      });
    }
  };

  // Start new game
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    engine.score = 0;
    engine.level = 1;
    engine.gameState = 'PLAYING';
    setScore(0);
    setLevel(1);
    setGameState('PLAYING');
    generateLevel(1);
    sounds.playClick();
  }, [generateLevel]);

  // Advance to next level
  const nextLevel = useCallback(() => {
    const engine = engineRef.current;
    const nextLvl = engine.level + 1;
    engine.level = nextLvl;
    engine.gameState = 'PLAYING';
    setLevel(nextLvl);
    setGameState('PLAYING');
    generateLevel(nextLvl);
    sounds.playWin();
  }, [generateLevel]);

  const togglePause = () => {
    const engine = engineRef.current;
    if (gameState === 'PLAYING') {
      engine.gameState = 'PAUSED';
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      engine.gameState = 'PLAYING';
      engine.lastTime = performance.now();
      setGameState('PLAYING');
    }
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 620;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    // Camera: angled downwards to see tower, ball and falling chunks
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.0, 7.8);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 30;
    const shadowD = 6;
    dirLight.shadow.camera.left = -shadowD;
    dirLight.shadow.camera.right = shadowD;
    dirLight.shadow.camera.top = shadowD;
    dirLight.shadow.camera.bottom = -shadowD;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Dynamic fireball point light
    const fireLight = new THREE.PointLight(0xf97316, 0, 10, 1.8);
    fireLight.position.set(0, 1.0, 1.8);
    scene.add(fireLight);

    // Central Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.95, 0.95, 80, 40);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
    });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.receiveShadow = true;
    scene.add(pillarMesh);

    // The Ball (Positioned at front of pillar, z = 1.8)
    const ballGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const ballMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(0, 1.0, 1.8);
    ballMesh.castShadow = true;
    ballMesh.receiveShadow = true;
    scene.add(ballMesh);

    // Base podium pad at tower base
    const baseGeo = new THREE.CylinderGeometry(2.8, 3.2, 0.8, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x10b981, // Emerald green victory pad
      roughness: 0.2,
      metalness: 0.2,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -30, 0);
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Reusable debris particle geometry
    const particleGeo = new THREE.DodecahedronGeometry(1, 0);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    // Store references
    const engine = engineRef.current;
    engine.scene = scene;
    engine.camera = camera;
    engine.renderer = renderer;
    engine.pillarMesh = pillarMesh;
    engine.ballMesh = ballMesh;
    engine.baseMesh = baseMesh;
    engine.fireLight = fireLight;
    engine.particleGeo = particleGeo;
    engine.particleMat = particleMat;

    generateLevel(1);

    // Handle container resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Main animation loop
    let animId = 0;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.045, (time - engine.lastTime) / 1000);
      engine.lastTime = time;

      // Rotate intact platforms
      engine.platforms.forEach((p) => {
        if (!p.broken) {
          p.group.rotation.y += p.rotationSpeed;
        }
      });

      // Active debris simulation
      for (let i = engine.debris.length - 1; i >= 0; i--) {
        const d = engine.debris[i];
        d.vy -= 14.0 * dt; // gravity
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        d.mesh.rotation.x += d.vRotX * dt;
        d.mesh.rotation.y += d.vRotY * dt;
        d.mesh.rotation.z += d.vRotZ * dt;
        d.life -= dt * 1.1;

        if (d.life <= 0) {
          scene.remove(d.mesh);
          d.mesh.geometry.dispose();
          engine.debris.splice(i, 1);
        } else {
          // Shrink debris as it fades
          const sc = Math.max(0.01, d.life);
          d.mesh.scale.set(sc, sc, sc);
        }
      }

      // Active particle sparks simulation
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.vy -= 8.0 * dt;
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.mesh.position.z += pt.vz * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          scene.remove(pt.mesh);
          engine.particles.splice(i, 1);
        } else {
          const sc = pt.life / pt.maxLife;
          pt.mesh.scale.setScalar(sc * 0.12);
        }
      }

      // GAME LOGIC
      if (engine.gameState === 'PLAYING') {
        // Fireball timer countdown
        if (engine.fireballTimer > 0) {
          engine.fireballTimer -= dt;
          if (engine.fireballTimer <= 0) {
            engine.fireballTimer = 0;
            setIsFireball(false);
            if (engine.ballMesh) {
              const ballMat = engine.ballMesh.material as THREE.MeshPhysicalMaterial;
              ballMat.color.setHex(engine.theme.ballColor);
              ballMat.emissive.setHex(0x000000);
              ballMat.emissiveIntensity = 0;
            }
            if (engine.fireLight) engine.fireLight.intensity = 0;
          }
        }

        const isCurrentlyFireball = engine.fireballTimer > 0;

        // Visual effects for fireball
        if (isCurrentlyFireball) {
          if (engine.ballMesh) {
            const ballMat = engine.ballMesh.material as THREE.MeshPhysicalMaterial;
            ballMat.color.setHex(0xf97316);
            ballMat.emissive.setHex(0xff3300);
            ballMat.emissiveIntensity = 2.5 + Math.sin(time * 0.02) * 0.8;
          }
          if (engine.fireLight) {
            engine.fireLight.intensity = 2.8;
            engine.fireLight.position.set(0, engine.ballY, 1.8);
          }
        }

        // Current platform target
        const currentPlat = engine.platforms[engine.currentPlatformIndex];

        if (currentPlat && !currentPlat.broken) {
          const platTopY = currentPlat.y + 0.35 / 2;

          if (engine.isSmashing) {
            // SMASHING DOWNWARD RAPIDLY
            const smashSpeed = isCurrentlyFireball ? 28 : 22;
            engine.ballY -= smashSpeed * dt;

            // Stretch ball along vertical
            if (engine.ballMesh) {
              engine.ballMesh.scale.set(0.75, 1.45, 0.75);
              engine.ballMesh.position.y = engine.ballY;
            }

            // Check if ball contacted current platform
            if (engine.ballY <= platTopY + 0.25) {
              // Calculate sector currently under the ball at front (angle = Math.PI / 2)
              // Ball is at (0, y, 1.8) -> world angle is Math.PI / 2
              const frontAngle = Math.PI / 2;
              const localAngle = ((frontAngle - currentPlat.group.rotation.y) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

              const hitSector = currentPlat.sectors.find((sec) => {
                const end = sec.startAngle + sec.sweepAngle;
                return localAngle >= sec.startAngle && localAngle <= end;
              }) || currentPlat.sectors[0];

              if (hitSector.isDangerous && !isCurrentlyFireball) {
                // Crashed into dangerous black block without fireball!
                engine.gameState = 'GAMEOVER';
                engine.shakeIntensity = 0.5;
                setGameState('GAMEOVER');
                sounds.playGameOver();

                const newBest = saveStoredScore('stack-ball', engine.score);
                setBestScore(newBest);

                // Ball deflects and stops
                engine.ballVy = 6;
                engine.ballY = platTopY + 0.4;
              } else {
                // Smashed through platform!
                shatterPlatform(currentPlat);
                engine.currentPlatformIndex++;
                engine.shakeIntensity = isCurrentlyFireball ? 0.25 : 0.12;

                // Combo calculation
                engine.comboCount++;
                const comboRatioVal = Math.min(1.0, engine.comboCount / 3);
                setComboRatio(comboRatioVal);

                if (engine.comboCount >= 3 && !isCurrentlyFireball) {
                  engine.fireballTimer = 2.4; // 2.4s of fireball invincibility
                  setIsFireball(true);
                  sounds.playFireball();
                } else if (isCurrentlyFireball) {
                  sounds.playFireball();
                } else {
                  sounds.playSmash();
                }

                // Points
                const pts = isCurrentlyFireball ? 25 : 10 + Math.min(30, engine.comboCount * 5);
                engine.score += pts;
                setScore(engine.score);

                // Update progress ratio
                const prog = Math.min(1.0, engine.currentPlatformIndex / engine.totalPlatforms);
                setProgressRatio(prog);

                // Check victory condition
                if (engine.currentPlatformIndex >= engine.totalPlatforms) {
                  engine.gameState = 'LEVEL_CLEAR';
                  engine.ballY = engine.baseMesh ? engine.baseMesh.position.y + 0.5 : 0;
                  setGameState('LEVEL_CLEAR');
                  sounds.playWin();

                  const newBest = saveStoredScore('stack-ball', engine.score);
                  setBestScore(newBest);
                }
              }
            }
          } else {
            // NOT SMASHING: Bouncing safely in place on top of current platform
            engine.comboCount = 0;
            setComboRatio(0);

            // Sine wave bounce
            engine.ballBouncePhase += 14.0 * dt;
            const bounceHeight = 1.35;
            const bounceCycle = Math.abs(Math.sin(engine.ballBouncePhase));
            const prevY = engine.ballY;
            engine.ballY = platTopY + 0.38 + bounceCycle * bounceHeight;

            // Squash & stretch on landing
            if (engine.ballMesh) {
              if (bounceCycle < 0.15) {
                // Squashing on impact
                const sq = 1 - (0.15 - bounceCycle) * 2.2;
                engine.ballMesh.scale.set(1.3, sq, 1.3);
                if (prevY > engine.ballY && bounceCycle < 0.05) {
                  sounds.playBounce();
                }
              } else {
                // Restoring shape
                engine.ballMesh.scale.set(1, 1, 1);
              }
              engine.ballMesh.position.y = engine.ballY;
            }
          }
        }
      }

      // Camera smoothly tracking ball Y
      engine.cameraTargetY = engine.ballY + 3.0;
      engine.cameraY += (engine.cameraTargetY - engine.cameraY) * 0.15;

      // Screen shake decay
      let shakeOffsetX = 0;
      let shakeOffsetY = 0;
      if (engine.shakeIntensity > 0) {
        shakeOffsetX = (Math.random() - 0.5) * engine.shakeIntensity;
        shakeOffsetY = (Math.random() - 0.5) * engine.shakeIntensity;
        engine.shakeIntensity = Math.max(0, engine.shakeIntensity - dt * 2.5);
      }

      camera.position.y = engine.cameraY + shakeOffsetY;
      camera.position.x = shakeOffsetX;
      camera.lookAt(0, engine.cameraY - 2.5, 0);

      // Render Three.js frame
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [generateLevel]);

  // Pointer & keyboard smash controls
  const handlePointerDown = () => {
    const engine = engineRef.current;
    if (engine.gameState === 'PLAYING') {
      engine.isSmashing = true;
      setIsSmashing(true);
    } else if (engine.gameState === 'IDLE' || engine.gameState === 'GAMEOVER') {
      startGame();
    } else if (engine.gameState === 'LEVEL_CLEAR') {
      nextLevel();
    }
  };

  const handlePointerUp = () => {
    const engine = engineRef.current;
    engine.isSmashing = false;
    setIsSmashing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        e.preventDefault();
        const engine = engineRef.current;
        if (engine.gameState === 'PLAYING') {
          engine.isSmashing = true;
          setIsSmashing(true);
        } else if (engine.gameState === 'IDLE' || engine.gameState === 'GAMEOVER') {
          startGame();
        } else if (engine.gameState === 'LEVEL_CLEAR') {
          nextLevel();
        }
      } else if (e.code === 'KeyP') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowDown') {
        const engine = engineRef.current;
        engine.isSmashing = false;
        setIsSmashing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [startGame, nextLevel]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 select-none">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 mb-3 backdrop-blur-sm shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Arcade</span>
          </button>
          <span className="text-sm font-bold tracking-wider text-white">STACK BALL 3D</span>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={togglePause}
            aria-label="Pause"
            disabled={gameState !== 'PLAYING' && gameState !== 'PAUSED'}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50 disabled:opacity-40"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={startGame}
            aria-label="Restart"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport matching Reference Images */}
      <div
        className="relative w-full max-w-[420px] aspect-[9/16] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Three.js Canvas container */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* In-Game Top HUD Overlay (Matches Reference Image 2) */}
        <div className="absolute top-4 inset-x-4 flex flex-col items-center pointer-events-none z-10">
          {/* Level Progress Bar: (Level N) ───────●─────── (Level N+1) */}
          <div className="w-full max-w-[280px] flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-lg border border-sky-300">
              {level}
            </div>
            <div className="flex-1 h-3 bg-slate-900/80 rounded-full border border-sky-500/40 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full transition-all duration-75 shadow-sm"
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-lg border border-sky-400">
              {level + 1}
            </div>
          </div>

          {/* Current Score Display */}
          <div className="mt-3 flex flex-col items-center">
            <span className="text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {score}
            </span>
            <span className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase drop-shadow-md">
              Best: {bestScore}
            </span>
          </div>

          {/* Fireball Arc / Combo Gauge (Matches Reference Image 1) */}
          {comboRatio > 0 && (
            <div className="mt-2 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-orange-500/60 shadow-lg">
              <Flame className={`w-4 h-4 ${isFireball ? 'text-amber-300 fill-amber-300 animate-bounce' : 'text-orange-500'}`} />
              <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-orange-500/30">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    isFireball ? 'bg-gradient-to-r from-amber-400 to-red-500 animate-pulse' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.round(comboRatio * 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold ${isFireball ? 'text-amber-300' : 'text-orange-400'}`}>
                {isFireball ? 'FIREBALL!' : 'COMBO'}
              </span>
            </div>
          )}
        </div>

        {/* Status Prompt at bottom */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-5 inset-x-4 flex justify-center pointer-events-none z-10">
            <div className="bg-slate-950/75 backdrop-blur-sm border border-slate-700/60 text-slate-200 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
              {isSmashing
                ? (isFireball ? '🔥 FIREBALL CRASH! ALL BLOCKS BREAKABLE!' : '⚡ SMASHING DOWN!')
                : 'HOLD SCREEN TO SMASH · AVOID BLACK HAZARDS'}
            </div>
          </div>
        )}

        {/* Start Game Modal */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center mb-4 text-sky-400 shadow-xl shadow-sky-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-wide mb-2">STACK BALL 3D</h2>
            <p className="text-xs text-slate-300 mb-6 max-w-xs leading-relaxed">
              Hold mouse, spacebar, or tap screen to smash downward through rotating 3D platforms! Smash multiple blocks to unleash <span className="text-orange-400 font-bold">Fireball Mode</span>.
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-sky-500/25 active:scale-95"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>TAP TO CRASH</span>
            </button>
          </div>
        )}

        {/* Paused Modal */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
            <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
            <button
              onClick={togglePause}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-slate-700 shadow-lg"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume Game</span>
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-red-500 text-xs font-bold tracking-widest uppercase mb-1">
              Crashed on Black Sector
            </div>
            <h2 className="text-3xl font-black text-white mb-4">CRASHED!</h2>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-56 mb-6 shadow-xl">
              <div className="text-xs text-slate-400 mb-1">Level {level} Score</div>
              <div className="text-3xl font-mono font-black text-white">{score}</div>
              <div className="text-xs text-amber-400 mt-2 font-mono flex items-center justify-center gap-1 font-semibold">
                <Trophy className="w-3.5 h-3.5" /> Best: {bestScore}
              </div>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-xl shadow-red-500/25 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Level Complete Modal */}
        {gameState === 'LEVEL_CLEAR' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
              Tower Demolished!
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Level {level} Complete!</h2>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-56 mb-6 shadow-xl">
              <div className="text-xs text-slate-400 mb-1">Total Score</div>
              <div className="text-3xl font-mono font-black text-emerald-400">{score}</div>
            </div>
            <button
              onClick={nextLevel}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Next Level</span>
            </button>
          </div>
        )}
      </div>

      {/* Helpful Key / Touch Hint */}
      <div className="mt-3 text-center">
        <span className="text-xs text-slate-400 font-medium">
          Hold Mouse / Touch / Spacebar to crash platforms · Avoid Black Hazards · 3x Combos unlock Fireball!
        </span>
      </div>
    </div>
  );
};
