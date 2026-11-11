import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Gauge,
  Flame,
  Zap,
  Sliders,
  Shield,
  Trophy,
  Sparkles,
} from 'lucide-react';
import * as THREE from 'three';
import { sounds } from '../utils/audio';
import { getStoredScore, saveStoredScore } from '../types';

interface CarRacingProps {
  onBack: () => void;
}

type GraphicsQuality = 'ultra' | 'high' | 'medium' | 'low';

interface TrafficCar3D {
  id: number;
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
  lane: number;
  z: number;
  speed: number;
  color: number;
  isTruck: boolean;
}

interface Collectible3D {
  id: number;
  mesh: THREE.Group;
  type: 'coin' | 'nitro' | 'fuel';
  lane: number;
  z: number;
  collected: boolean;
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export const CarRacingGame: React.FC<CarRacingProps> = ({ onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // HUD & Game State
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'>('IDLE');
  const [distance, setDistance] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => getStoredScore('car-racing'));
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [fuel, setFuel] = useState<number>(100);
  const [isNitroActive, setIsNitroActive] = useState<boolean>(false);
  const [quality, setQuality] = useState<GraphicsQuality>('ultra');
  const [soundMuted, setSoundMuted] = useState<boolean>(!sounds.enabled);
  const [overtakeAlert, setOvertakeAlert] = useState<boolean>(false);

  // Engine state for 60fps loop
  const engineRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    dirLight: null as THREE.DirectionalLight | null,
    playerCar: null as THREE.Group | null,
    playerWheels: [] as THREE.Mesh[],
    playerFrontWheels: [] as THREE.Mesh[],
    nitroFlames: [] as THREE.Mesh[],
    nitroLight: null as THREE.PointLight | null,
    taillightMesh: null as THREE.Mesh | null,
    roadSegments: [] as THREE.Group[],
    traffic: [] as TrafficCar3D[],
    collectibles: [] as Collectible3D[],
    particles: [] as Particle3D[],
    // Player kinematics
    playerX: 0,
    targetPlayerX: 0,
    playerZ: 0,
    speed: 0,
    maxNormalSpeed: 1.35,
    maxNitroSpeed: 2.15,
    acceleration: 0.018,
    braking: 0.035,
    steerAngle: 0,
    carRoll: 0,
    cameraFov: 58,
    shakeIntensity: 0,
    // Fuel & Nitro
    fuel: 100,
    nitroFuel: 100,
    isNitroPressed: false,
    // Inputs
    keys: {
      left: false,
      right: false,
      up: false,
      down: false,
      nitro: false,
    },
    quality: 'ultra' as GraphicsQuality,
    gameState: 'IDLE' as 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER',
    score: 0,
    distance: 0,
    spawnTrafficTimer: 0,
    spawnItemTimer: 0,
    lastTime: performance.now(),
  });

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Build ultra-detailed PBR Sports Car
  const createPlayerSportsCar = () => {
    const car = new THREE.Group();
    const wheels: THREE.Mesh[] = [];
    const frontWheels: THREE.Mesh[] = [];

    // Metallic PBR Paint
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc2626, // Crimson Red Metallic
      metalness: 0.9,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.6,
      roughness: 0.35,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Glossy aero tinted glass
      transmission: 0.7,
      transparent: true,
      roughness: 0.05,
      metalness: 0.1,
      ior: 1.5,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.1,
    });

    const tyreMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.1,
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(2.1, 0.42, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Front aerodynamic bumper & splitter
    const splitterGeo = new THREE.BoxGeometry(2.15, 0.12, 0.7);
    const splitter = new THREE.Mesh(splitterGeo, carbonMat);
    splitter.position.set(0, 0.22, 2.2);
    splitter.castShadow = true;
    car.add(splitter);

    // Sculpted Hood
    const hoodGeo = new THREE.BoxGeometry(1.9, 0.22, 1.6);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.62, 1.2);
    hood.rotation.x = -0.06;
    hood.castShadow = true;
    car.add(hood);

    // Aerodynamic Cabin / Cockpit Roof
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.55, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.88, -0.3);
    cabin.castShadow = true;
    car.add(cabin);

    // Carbon fiber roof panel
    const roofGeo = new THREE.BoxGeometry(1.48, 0.08, 1.4);
    const roof = new THREE.Mesh(roofGeo, carbonMat);
    roof.position.set(0, 1.16, -0.3);
    car.add(roof);

    // Rear engine deck & diffuser
    const rearDeckGeo = new THREE.BoxGeometry(1.9, 0.32, 1.2);
    const rearDeck = new THREE.Mesh(rearDeckGeo, bodyMat);
    rearDeck.position.set(0, 0.56, -1.55);
    rearDeck.castShadow = true;
    car.add(rearDeck);

    // Rear GT Carbon Spoiler Wing
    const wingGeo = new THREE.BoxGeometry(2.3, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, 1.22, -2.1);
    wing.castShadow = true;
    car.add(wing);

    // Wing struts
    const strutGeo = new THREE.BoxGeometry(0.08, 0.45, 0.15);
    const strutL = new THREE.Mesh(strutGeo, carbonMat);
    strutL.position.set(-0.65, 0.95, -2.05);
    car.add(strutL);
    const strutR = new THREE.Mesh(strutGeo, carbonMat);
    strutR.position.set(0.65, 0.95, -2.05);
    car.add(strutR);

    // Front LED Headlights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const hlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.2);
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.78, 0.52, 2.15);
    car.add(hlL);
    const hlR = new THREE.Mesh(hlGeo, headlightMat);
    hlR.position.set(0.78, 0.52, 2.15);
    car.add(hlR);

    // Rear Crimson LED Lightbar
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const tlGeo = new THREE.BoxGeometry(1.9, 0.12, 0.15);
    const taillightMesh = new THREE.Mesh(tlGeo, taillightMat);
    taillightMesh.position.set(0, 0.55, -2.18);
    car.add(taillightMesh);

    // 4 Alloy Wheels with Rubber Tyres
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 24);
    wheelGeo.rotateZ(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.36, 16);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelPositions: [number, number, number, boolean][] = [
      [-1.08, 0.42, 1.35, true],  // Front Left
      [1.08, 0.42, 1.35, true],   // Front Right
      [-1.08, 0.42, -1.35, false], // Rear Left
      [1.08, 0.42, -1.35, false],  // Rear Right
    ];

    wheelPositions.forEach(([wx, wy, wz, isFront]) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(wx, wy, wz);

      const tyre = new THREE.Mesh(wheelGeo, tyreMat);
      tyre.castShadow = true;
      wheelGroup.add(tyre);

      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wheelGroup.add(rim);

      car.add(wheelGroup);
      wheels.push(tyre);
      if (isFront) frontWheels.push(wheelGroup as unknown as THREE.Mesh);
    });

    // Dual Nitro Exhaust Pipes & Flame Meshes
    const nitroFlames: THREE.Mesh[] = [];
    const flameGeo = new THREE.ConeGeometry(0.18, 0.8, 12);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    });

    const flameL = new THREE.Mesh(flameGeo, flameMat);
    flameL.position.set(-0.45, 0.32, -2.55);
    car.add(flameL);
    nitroFlames.push(flameL);

    const flameR = new THREE.Mesh(flameGeo, flameMat);
    flameR.position.set(0.45, 0.32, -2.55);
    car.add(flameR);
    nitroFlames.push(flameR);

    // Nitro Point Light behind car
    const nitroLight = new THREE.PointLight(0x06b6d4, 0, 8, 2);
    nitroLight.position.set(0, 0.4, -2.8);
    car.add(nitroLight);

    return { car, wheels, frontWheels, nitroFlames, nitroLight, taillightMesh };
  };

  // Build AI Traffic Car / Truck
  const createTrafficVehicle = (colorHex: number, isTruck = false) => {
    const group = new THREE.Group();
    const wheels: THREE.Mesh[] = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.8,
      roughness: 0.25,
    });

    const tyreMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });

    if (isTruck) {
      // Big Highway Delivery Box Truck
      const cabGeo = new THREE.BoxGeometry(2.3, 1.6, 2.2);
      const cab = new THREE.Mesh(cabGeo, bodyMat);
      cab.position.set(0, 1.0, 1.8);
      cab.castShadow = true;
      group.add(cab);

      // Freight Container
      const boxGeo = new THREE.BoxGeometry(2.4, 2.2, 5.0);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(0, 1.4, -1.8);
      box.castShadow = true;
      group.add(box);
    } else {
      // Standard Traffic Sedan / Coupe
      const bodyGeo = new THREE.BoxGeometry(2.0, 0.5, 4.2);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, 0.45, 0);
      body.castShadow = true;
      group.add(body);

      const cabinGeo = new THREE.BoxGeometry(1.5, 0.5, 2.0);
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.9, -0.2);
      cabin.castShadow = true;
      group.add(cabin);

      // Taillights
      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.12, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xdc2626 })
      );
      tl.position.set(0, 0.52, -2.1);
      group.add(tl);
    }

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
    wGeo.rotateZ(Math.PI / 2);
    [
      [-1.05, 0.38, 1.4],
      [1.05, 0.38, 1.4],
      [-1.05, 0.38, -1.4],
      [1.05, 0.38, -1.4],
    ].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, tyreMat);
      w.position.set(wx, wy, wz);
      w.castShadow = true;
      group.add(w);
      wheels.push(w);
    });

    return { group, wheels };
  };

  // Build Procedural Highway Chunks
  const createRoadSegment = (length: number) => {
    const segment = new THREE.Group();

    // 4-lane Asphalt Road
    const roadWidth = 15;
    const roadGeo = new THREE.PlaneGeometry(roadWidth, length);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    segment.add(road);

    // Outer Red/White Racing Kerbs
    const kerbWidth = 0.8;
    const kerbGeo = new THREE.BoxGeometry(kerbWidth, 0.18, length);
    const kerbMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const kerbL = new THREE.Mesh(kerbGeo, kerbMat);
    kerbL.position.set(-roadWidth / 2 - kerbWidth / 2, 0.08, 0);
    segment.add(kerbL);

    const kerbR = new THREE.Mesh(kerbGeo, kerbMat);
    kerbR.position.set(roadWidth / 2 + kerbWidth / 2, 0.08, 0);
    segment.add(kerbR);

    // Metallic Guardrails
    const railGeo = new THREE.BoxGeometry(0.2, 0.8, length);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-roadWidth / 2 - 1.2, 0.45, 0);
    railL.castShadow = true;
    segment.add(railL);

    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(roadWidth / 2 + 1.2, 0.45, 0);
    railR.castShadow = true;
    segment.add(railR);

    // Dashed White Lane Lines (3 divider lines across 4 lanes)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const numDashes = Math.floor(length / 6);
    const dashLength = 3.2;

    for (let l = 1; l <= 3; l++) {
      const laneX = -roadWidth / 2 + l * (roadWidth / 4);
      for (let d = 0; d < numDashes; d++) {
        const dashGeo = new THREE.PlaneGeometry(0.22, dashLength);
        const dash = new THREE.Mesh(dashGeo, lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(laneX, 0.01, -length / 2 + d * 6 + dashLength / 2);
        segment.add(dash);
      }
    }

    // Roadside Streetlights & Palm Trees
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 12);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let z = -length / 2 + 10; z < length / 2; z += 30) {
      // Left pole
      const poleL = new THREE.Mesh(poleGeo, poleMat);
      poleL.position.set(-roadWidth / 2 - 3.5, 3.75, z);
      segment.add(poleL);

      const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), lampMat);
      lampL.position.set(-roadWidth / 2 - 2.8, 7.4, z);
      segment.add(lampL);

      // Right pole
      const poleR = new THREE.Mesh(poleGeo, poleMat);
      poleR.position.set(roadWidth / 2 + 3.5, 3.75, z);
      segment.add(poleR);

      const lampR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), lampMat);
      lampR.position.set(roadWidth / 2 + 2.8, 7.4, z);
      segment.add(lampR);
    }

    return segment;
  };

  // Build Collectible Item
  const createCollectibleMesh = (type: 'coin' | 'nitro' | 'fuel') => {
    const group = new THREE.Group();

    if (type === 'coin') {
      const coinGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.18, 20);
      coinGeo.rotateX(Math.PI / 2);
      const coinMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0xca8a04,
        emissiveIntensity: 0.4,
      });
      const coin = new THREE.Mesh(coinGeo, coinMat);
      group.add(coin);
    } else if (type === 'nitro') {
      // Blue Nitro Bottle
      const bottleGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16);
      const bottleMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x0891b2,
        emissiveIntensity: 0.6,
      });
      const bottle = new THREE.Mesh(bottleGeo, bottleMat);
      group.add(bottle);
    } else {
      // Red Fuel Canister
      const canGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
      const canMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        metalness: 0.6,
        roughness: 0.3,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.5,
      });
      const can = new THREE.Mesh(canGeo, canMat);
      group.add(can);
    }

    return group;
  };

  // Start new race
  const startRace = useCallback(() => {
    const engine = engineRef.current;
    engine.playerX = 0;
    engine.targetPlayerX = 0;
    engine.playerZ = 0;
    engine.speed = 0.6;
    engine.fuel = 100;
    engine.nitroFuel = 100;
    engine.score = 0;
    engine.distance = 0;
    engine.shakeIntensity = 0;

    // Clear active traffic & items
    engine.traffic.forEach((t) => engine.scene?.remove(t.mesh));
    engine.traffic = [];

    engine.collectibles.forEach((c) => engine.scene?.remove(c.mesh));
    engine.collectibles = [];

    engine.gameState = 'PLAYING';
    setGameState('PLAYING');
    setScore(0);
    setDistance(0);
    setFuel(100);
    setNitroFuel(100);
    setIsNitroActive(false);
    sounds.playClick();
  }, []);

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

  // Change Graphics Settings
  const applyQualitySettings = (q: GraphicsQuality) => {
    setQuality(q);
    const engine = engineRef.current;
    engine.quality = q;
    if (!engine.renderer) return;

    if (q === 'ultra') {
      engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      engine.renderer.shadowMap.enabled = true;
      engine.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (engine.dirLight) engine.dirLight.castShadow = true;
    } else if (q === 'high') {
      engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      engine.renderer.shadowMap.enabled = true;
      engine.renderer.shadowMap.type = THREE.BasicShadowMap;
      if (engine.dirLight) engine.dirLight.castShadow = true;
    } else if (q === 'medium') {
      engine.renderer.setPixelRatio(1.0);
      engine.renderer.shadowMap.enabled = false;
      if (engine.dirLight) engine.dirLight.castShadow = false;
    } else {
      // low
      engine.renderer.setPixelRatio(0.85);
      engine.renderer.shadowMap.enabled = false;
      if (engine.dirLight) engine.dirLight.castShadow = false;
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = engineRef.current.keys;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = true;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        k.nitro = true;
      }
      if (e.code === 'KeyP') togglePause();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = engineRef.current.keys;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = false;
      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        k.nitro = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Three.js 3D Racing World
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 450;

    // Scene & Sunset Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.016);

    // Chase Camera
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 200);
    camera.position.set(0, 4.2, 7.5);
    camera.lookAt(0, 1.2, -10);

    // High performance Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Directional Sunlight & Shadows
    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x1e293b, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.6);
    dirLight.position.set(20, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 120;
    const shadowSize = 25;
    dirLight.shadow.camera.left = -shadowSize;
    dirLight.shadow.camera.right = shadowSize;
    dirLight.shadow.camera.top = shadowSize;
    dirLight.shadow.camera.bottom = -shadowSize;
    scene.add(dirLight);

    // Build Seamless Highway Chunks (3 chunks of 90m length)
    const roadChunkLength = 90;
    const roadSegments: THREE.Group[] = [];
    for (let c = 0; c < 3; c++) {
      const seg = createRoadSegment(roadChunkLength);
      seg.position.z = -c * roadChunkLength;
      scene.add(seg);
      roadSegments.push(seg);
    }

    // Build Player Sports Car
    const { car: playerCar, wheels: playerWheels, frontWheels: playerFrontWheels, nitroFlames, nitroLight, taillightMesh } = createPlayerSportsCar();
    playerCar.position.set(0, 0, 0);
    scene.add(playerCar);

    // Save references
    const engine = engineRef.current;
    engine.scene = scene;
    engine.camera = camera;
    engine.renderer = renderer;
    engine.dirLight = dirLight;
    engine.playerCar = playerCar;
    engine.playerWheels = playerWheels;
    engine.playerFrontWheels = playerFrontWheels;
    engine.nitroFlames = nitroFlames;
    engine.nitroLight = nitroLight;
    engine.taillightMesh = taillightMesh;
    engine.roadSegments = roadSegments;

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId = 0;
    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.045, (time - engine.lastTime) / 1000);
      engine.lastTime = time;

      if (engine.gameState === 'PLAYING') {
        const k = engine.keys;

        // Nitro Logic
        const isNitro = (k.nitro || engine.isNitroPressed) && engine.nitroFuel > 0;
        setIsNitroActive(isNitro);

        if (isNitro) {
          engine.nitroFuel = Math.max(0, engine.nitroFuel - dt * 28);
          setNitroFuel(Math.round(engine.nitroFuel));
        } else if (engine.nitroFuel < 100) {
          // Slow passive regen
          engine.nitroFuel = Math.min(100, engine.nitroFuel + dt * 4);
          setNitroFuel(Math.round(engine.nitroFuel));
        }

        // Acceleration & Speed
        const maxSpd = isNitro ? engine.maxNitroSpeed : engine.maxNormalSpeed;
        if (k.up || isNitro) {
          engine.speed = Math.min(maxSpd, engine.speed + engine.acceleration * (isNitro ? 2.2 : 1.0));
        } else if (k.down) {
          engine.speed = Math.max(0.3, engine.speed - engine.braking);
        } else {
          // Coasting
          if (engine.speed > 0.8) engine.speed -= 0.008;
          else if (engine.speed < 0.8) engine.speed += 0.008;
        }

        // Taillights brighten on braking
        if (engine.taillightMesh) {
          const mat = engine.taillightMesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(k.down ? 0xff0000 : 0xdc2626);
        }

        // Nitro exhaust flames visual
        engine.nitroFlames.forEach((flame) => {
          const mat = flame.material as THREE.MeshBasicMaterial;
          if (isNitro) {
            mat.opacity = 0.8 + Math.random() * 0.2;
            flame.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.4, 1);
          } else {
            mat.opacity = 0;
          }
        });
        if (engine.nitroLight) {
          engine.nitroLight.intensity = isNitro ? 3.5 : 0;
        }

        // Camera FOV punch during Nitro
        const targetFov = isNitro ? 66 : 58;
        engine.cameraFov += (targetFov - engine.cameraFov) * 0.1;
        camera.fov = engine.cameraFov;
        camera.updateProjectionMatrix();

        // Steering & Lateral physics
        const steerSpeed = 8.5;
        if (k.left) engine.targetPlayerX -= steerSpeed * dt;
        if (k.right) engine.targetPlayerX += steerSpeed * dt;

        // Clamp to 4-lane highway boundaries (road is 15m wide, car is 2.1m wide)
        engine.targetPlayerX = Math.max(-5.8, Math.min(5.8, engine.targetPlayerX));
        engine.playerX += (engine.targetPlayerX - engine.playerX) * 0.18;

        // Dynamic chassis banking & wheel turning
        const steerDelta = engine.targetPlayerX - engine.playerX;
        engine.steerAngle = Math.max(-0.4, Math.min(0.4, steerDelta * 0.45));
        engine.carRoll = -engine.steerAngle * 0.25;

        // Fuel consumption
        engine.fuel -= dt * 1.2 * (isNitro ? 1.8 : 1.0);
        setFuel(Math.max(0, Math.round(engine.fuel)));
        if (engine.fuel <= 0) {
          // Out of fuel game over
          engine.gameState = 'GAMEOVER';
          setGameState('GAMEOVER');
          sounds.playGameOver();
          const newBest = saveStoredScore('car-racing', engine.score);
          setBestScore(newBest);
        }

        // Update distance & score
        const forwardDistance = engine.speed * 45 * dt;
        engine.distance += forwardDistance;
        engine.score += Math.round(forwardDistance * (isNitro ? 2.5 : 1.2));
        setDistance(Math.round(engine.distance));
        setScore(engine.score);
        setSpeedKmh(Math.round(engine.speed * 140));

        // Position & Rotate Player Car
        if (engine.playerCar) {
          engine.playerCar.position.x = engine.playerX;
          engine.playerCar.rotation.y = -engine.steerAngle * 0.4;
          engine.playerCar.rotation.z = engine.carRoll;
        }

        // Spin wheels matching speed
        const wheelSpin = engine.speed * 28 * dt;
        engine.playerWheels.forEach((w) => {
          w.rotation.x += wheelSpin;
        });
        engine.playerFrontWheels.forEach((fw) => {
          fw.rotation.y = -engine.steerAngle * 0.6;
        });

        // Infinite Road Segment Recycling
        roadSegments.forEach((seg) => {
          seg.position.z += engine.speed * 45 * dt;
          if (seg.position.z > 45) {
            seg.position.z -= roadChunkLength * 3;
          }
        });

        // Spawn AI Traffic Vehicles
        engine.spawnTrafficTimer += dt;
        if (engine.spawnTrafficTimer > Math.max(1.0, 2.2 - engine.distance * 0.0003)) {
          engine.spawnTrafficTimer = 0;
          const lane = Math.floor(Math.random() * 4); // 0, 1, 2, 3
          const laneX = -5.4 + lane * 3.6;
          const isTruck = Math.random() < 0.28;
          const trafficColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0x8b5cf6, 0xf1f5f9];
          const color = trafficColors[Math.floor(Math.random() * trafficColors.length)];

          const { group, wheels } = createTrafficVehicle(color, isTruck);
          group.position.set(laneX, 0, -85 - Math.random() * 20);
          scene.add(group);

          engine.traffic.push({
            id: Math.random(),
            mesh: group,
            wheels,
            lane,
            z: group.position.z,
            speed: 0.35 + Math.random() * 0.35, // Drives forward slower than player
            color,
            isTruck,
          });
        }

        // Spawn Collectibles (Coins, Nitro, Fuel)
        engine.spawnItemTimer += dt;
        if (engine.spawnItemTimer > 2.8) {
          engine.spawnItemTimer = 0;
          const lane = Math.floor(Math.random() * 4);
          const laneX = -5.4 + lane * 3.6;
          const rand = Math.random();
          const type: 'coin' | 'nitro' | 'fuel' = rand < 0.5 ? 'coin' : rand < 0.78 ? 'nitro' : 'fuel';

          const itemMesh = createCollectibleMesh(type);
          itemMesh.position.set(laneX, 0.9, -80);
          scene.add(itemMesh);

          engine.collectibles.push({
            id: Math.random(),
            mesh: itemMesh,
            type,
            lane,
            z: itemMesh.position.z,
            collected: false,
          });
        }

        // Update Traffic Movements & Collision Detection
        for (let i = engine.traffic.length - 1; i >= 0; i--) {
          const t = engine.traffic[i];
          // Relative movement: player speed minus traffic car speed
          t.mesh.position.z += (engine.speed - t.speed) * 45 * dt;

          // Rotate traffic wheels
          t.wheels.forEach((w) => (w.rotation.x += t.speed * 20 * dt));

          // Check AABB Box Collision with Player Car
          const dx = Math.abs(engine.playerX - t.mesh.position.x);
          const dz = Math.abs(t.mesh.position.z); // Player is at Z = 0
          const collisionWidth = t.isTruck ? 2.3 : 1.9;
          const collisionLength = t.isTruck ? 5.2 : 3.8;

          if (dx < collisionWidth * 0.85 && dz < collisionLength * 0.65) {
            // HIGH-SPEED CRASH!
            engine.gameState = 'GAMEOVER';
            engine.shakeIntensity = 0.8;
            setGameState('GAMEOVER');
            sounds.playGameOver();

            const newBest = saveStoredScore('car-racing', engine.score);
            setBestScore(newBest);
            break;
          }

          // Close overtake detection bonus
          if (dz < 2.0 && dx > 2.1 && dx < 3.4) {
            engine.score += 15;
            setOvertakeAlert(true);
            setTimeout(() => setOvertakeAlert(false), 500);
          }

          // Clean up past traffic
          if (t.mesh.position.z > 25) {
            scene.remove(t.mesh);
            engine.traffic.splice(i, 1);
          }
        }

        // Update Collectibles
        for (let i = engine.collectibles.length - 1; i >= 0; i--) {
          const c = engine.collectibles[i];
          c.mesh.position.z += engine.speed * 45 * dt;
          c.mesh.rotation.y += 0.04;

          const dx = Math.abs(engine.playerX - c.mesh.position.x);
          const dz = Math.abs(c.mesh.position.z);

          if (!c.collected && dx < 1.6 && dz < 1.8) {
            c.collected = true;
            scene.remove(c.mesh);

            if (c.type === 'coin') {
              engine.score += 350;
              sounds.playWin();
            } else if (c.type === 'nitro') {
              engine.nitroFuel = 100;
              setNitroFuel(100);
              sounds.playFireball();
            } else {
              engine.fuel = Math.min(100, engine.fuel + 35);
              setFuel(Math.round(engine.fuel));
              sounds.playFireball();
            }
            engine.collectibles.splice(i, 1);
          } else if (c.mesh.position.z > 20) {
            scene.remove(c.mesh);
            engine.collectibles.splice(i, 1);
          }
        }

        // Dynamic Camera Tracking & Shake
        let shakeX = 0;
        let shakeY = 0;
        if (engine.shakeIntensity > 0) {
          shakeX = (Math.random() - 0.5) * engine.shakeIntensity;
          shakeY = (Math.random() - 0.5) * engine.shakeIntensity;
          engine.shakeIntensity = Math.max(0, engine.shakeIntensity - dt * 2.5);
        }

        // Camera chase positioning
        camera.position.x = engine.playerX * 0.6 + shakeX;
        camera.position.y = 3.6 + (engine.speed > 1.2 ? 0.3 : 0) + shakeY;
        camera.position.z = 6.8 + (isNitro ? 0.8 : 0);
        camera.lookAt(engine.playerX * 0.4, 1.2, -18);
      }

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
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-2 sm:p-4 select-none">
      {/* Top Controls Navbar */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 mb-3 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Arcade</span>
          </button>
          <span className="text-sm font-black tracking-wider text-white">HIGHWAY RACER 3D</span>
        </div>

        {/* Graphics Quality Preset Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg">
          <span className="text-[10px] font-bold text-slate-400 px-1 uppercase hidden sm:inline">GFX:</span>
          {(['ultra', 'high', 'medium', 'low'] as GraphicsQuality[]).map((q) => (
            <button
              key={q}
              onClick={() => applyQualitySettings(q)}
              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition-all ${
                quality === q
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {q}
            </button>
          ))}
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
            onClick={startRace}
            aria-label="Restart"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 3D Highway Viewport */}
      <div className="relative w-full max-w-3xl aspect-[16/10] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center select-none touch-none">
        {/* Three.js Canvas */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Digital Speedometer & Cockpit HUD Overlay */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          {/* Speedometer Gauge */}
          <div className="flex items-center gap-2.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl">
            <Gauge className={`w-5 h-5 ${isNitroActive ? 'text-cyan-400 animate-spin' : 'text-red-500'}`} />
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-white tracking-tight">
                  {speedKmh}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">km/h</span>
              </div>
              <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full transition-all duration-75 ${
                    isNitroActive
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-md'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (speedKmh / 260) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overtake Alert Toast */}
          {overtakeAlert && (
            <div className="bg-amber-500/90 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-lg border border-amber-300 animate-bounce">
              ⚡ CLOSE OVERTAKE +15!
            </div>
          )}

          {/* Nitro & Fuel Gauges */}
          <div className="flex items-center gap-4 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-2xl shadow-xl">
            {/* Nitro Meter */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-slate-300">NITRO</span>
              </div>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-1">
                <div
                  className={`h-full transition-all ${
                    isNitroActive ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${nitroFuel}%` }}
                />
              </div>
            </div>

            {/* Fuel Meter */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[10px] font-bold text-slate-300">FUEL</span>
              </div>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-1">
                <div
                  className={`h-full transition-all ${fuel > 25 ? 'bg-rose-500' : 'bg-rose-600 animate-pulse'}`}
                  style={{ width: `${fuel}%` }}
                />
              </div>
            </div>

            {/* Score */}
            <div className="text-right pl-2 border-l border-slate-700">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Score</div>
              <div className="text-base font-black font-mono text-white leading-tight">{score}</div>
            </div>
          </div>
        </div>

        {/* Mobile Driving Controls Bar */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-20 pointer-events-auto">
            {/* Steering Left / Right */}
            <div className="flex items-center gap-2">
              <button
                onPointerDown={() => (engineRef.current.keys.left = true)}
                onPointerUp={() => (engineRef.current.keys.left = false)}
                onPointerLeave={() => (engineRef.current.keys.left = false)}
                className="w-16 h-16 rounded-2xl bg-slate-900/90 border-2 border-slate-700 text-white font-black text-2xl flex items-center justify-center shadow-xl active:scale-95 active:bg-slate-800"
              >
                ◀
              </button>
              <button
                onPointerDown={() => (engineRef.current.keys.right = true)}
                onPointerUp={() => (engineRef.current.keys.right = false)}
                onPointerLeave={() => (engineRef.current.keys.right = false)}
                className="w-16 h-16 rounded-2xl bg-slate-900/90 border-2 border-slate-700 text-white font-black text-2xl flex items-center justify-center shadow-xl active:scale-95 active:bg-slate-800"
              >
                ▶
              </button>
            </div>

            {/* Pedals: Brake and NITRO Boost */}
            <div className="flex items-center gap-3">
              <button
                onPointerDown={() => (engineRef.current.keys.down = true)}
                onPointerUp={() => (engineRef.current.keys.down = false)}
                onPointerLeave={() => (engineRef.current.keys.down = false)}
                className="px-4 py-3.5 rounded-2xl bg-slate-900/90 border-2 border-slate-700 text-red-400 font-bold text-xs flex flex-col items-center justify-center shadow-xl active:scale-95 active:bg-slate-800"
              >
                <span>BRAKE</span>
              </button>

              <button
                onPointerDown={() => (engineRef.current.isNitroPressed = true)}
                onPointerUp={() => (engineRef.current.isNitroPressed = false)}
                onPointerLeave={() => (engineRef.current.isNitroPressed = false)}
                className={`w-20 h-20 rounded-2xl border-2 font-black text-xs flex flex-col items-center justify-center shadow-2xl transition-transform active:scale-90 ${
                  nitroFuel > 0
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 border-cyan-300 text-white shadow-cyan-500/40 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-500'
                }`}
              >
                <Zap className="w-6 h-6 fill-white mb-0.5" />
                <span>NITRO</span>
              </button>
            </div>
          </div>
        )}

        {/* Start Game Modal */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mb-3 text-red-500 shadow-xl shadow-red-500/20">
              <Gauge className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-wide mb-2">HIGHWAY RACER 3D</h2>
            <p className="text-xs text-slate-300 mb-6 max-w-sm leading-relaxed">
              Ultra-HD 3D highway racing with realistic PBR car paint, dynamic traffic, and nitro boost! Weave through traffic, grab coins and fuel, and unleash top speeds!
            </p>
            <button
              onClick={startRace}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black px-8 py-3.5 rounded-xl transition-all shadow-xl shadow-red-500/25 active:scale-95 text-sm uppercase tracking-wider"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START RACE</span>
            </button>
          </div>
        )}

        {/* Paused Modal */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-2xl font-bold text-white mb-4">Race Paused</h2>
            <button
              onClick={togglePause}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors border border-slate-700 shadow-lg"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume</span>
            </button>
          </div>
        )}

        {/* Game Over Modal */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-red-500 text-xs font-bold tracking-widest uppercase mb-1">
              {fuel <= 0 ? 'Out of Fuel' : 'Traffic Wreck'}
            </div>
            <h2 className="text-3xl font-black text-white mb-4">RACE CRASHED</h2>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-56 mb-6 shadow-xl">
              <div className="text-xs text-slate-400 mb-1">Distance Driven</div>
              <div className="text-2xl font-mono font-black text-white">{distance}m</div>
              <div className="text-xs text-slate-400 mt-2 mb-1">Total Score</div>
              <div className="text-2xl font-mono font-black text-amber-400">{score}</div>
              <div className="text-xs text-slate-400 mt-2 font-mono flex items-center justify-center gap-1 font-semibold">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Best: {bestScore}
              </div>
            </div>
            <button
              onClick={startRace}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-xl shadow-red-500/25 active:scale-95 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Race Again</span>
            </button>
          </div>
        )}
      </div>

      {/* Cross-platform Controls Bar */}
      <div className="w-full max-w-3xl mt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>Desktop: <strong>A / D</strong> or <strong>Left / Right</strong> to Steer · <strong>W / Up</strong> for Gas · <strong>Spacebar</strong> for NITRO</span>
        <span>Mobile: <strong>On-Screen Steering &amp; NITRO Buttons</strong></span>
      </div>
    </div>
  );
};
