import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Crosshair,
  Trophy,
  Flame,
  Sparkles,
  RefreshCw,
  Zap,
} from 'lucide-react';
import * as THREE from 'three';
import { sounds } from '../utils/audio';
import { getStoredScore, saveStoredScore } from '../types';

interface GunSprintProps {
  onBack: () => void;
}

interface BottleTarget {
  id: number;
  mesh: THREE.Group;
  basePos: THREE.Vector3;
  color: number;
  isHit: boolean;
  isHazard: boolean;
  moveRange: number;
  moveSpeed: number;
  moveAxis: 'x' | 'y';
  initialOffset: number;
}

interface GlassShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  life: number;
}

interface BulletImpact {
  mesh: THREE.Mesh;
  life: number;
}

export const GunSprintGame: React.FC<GunSprintProps> = ({ onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // HUD State
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_CLEAR'>('IDLE');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => getStoredScore('gun-sprint'));
  const [level, setLevel] = useState<number>(1);
  const [ammo, setAmmo] = useState<number>(8);
  const [maxAmmo] = useState<number>(8);
  const [reserveAmmo, setReserveAmmo] = useState<number>(24);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [bottlesLeft, setBottlesLeft] = useState<number>(0);
  const [totalBottles, setTotalBottles] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [showHitMarker, setShowHitMarker] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(!sounds.enabled);

  // Engine mutable state for 60fps render loop
  const engineRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    viewmodel: null as THREE.Group | null,
    gunMesh: null as THREE.Group | null,
    muzzleFlash: null as THREE.Mesh | null,
    flashLight: null as THREE.PointLight | null,
    bottles: [] as BottleTarget[],
    shards: [] as GlassShard[],
    impacts: [] as BulletImpact[],
    raycaster: new THREE.Raycaster(),
    gameState: 'IDLE' as 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVEL_CLEAR',
    // Camera look orientation (Euler angles)
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    // Sway & Recoil
    swayTime: 0,
    recoilAmount: 0,
    recoilRot: 0,
    flashTimer: 0,
    shakeAmount: 0,
    // Gameplay counters
    ammo: 8,
    maxAmmo: 8,
    reserveAmmo: 24,
    isReloading: false,
    score: 0,
    level: 1,
    combo: 1,
    // Touch tracking
    isDragging: false,
    lastTouchX: 0,
    lastTouchY: 0,
    lastTime: performance.now(),
  });

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setSoundMuted(!sounds.enabled);
  };

  // Build high-detail 3D Viewmodel (Gun & Hands from First-Person Perspective)
  const createFPSViewmodel = () => {
    const viewmodelGroup = new THREE.Group();

    // 1. Hands (Right holding grip, Left supporting)
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Tactical dark glove
      roughness: 0.7,
      metalness: 0.1,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373, // Skin tone on wrist / fingertips
      roughness: 0.6,
      metalness: 0.05,
    });

    // Right Forearm & Hand
    const rightArmGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.4, 16);
    const rightArm = new THREE.Mesh(rightArmGeo, gloveMat);
    rightArm.position.set(0.38, -0.65, -0.3);
    rightArm.rotation.set(0.55, -0.2, -0.25);
    viewmodelGroup.add(rightArm);

    // Right Hand Grip
    const rightHandGeo = new THREE.BoxGeometry(0.24, 0.35, 0.28);
    const rightHand = new THREE.Mesh(rightHandGeo, gloveMat);
    rightHand.position.set(0.22, -0.24, -0.58);
    rightHand.rotation.set(0.1, 0, -0.15);
    viewmodelGroup.add(rightHand);

    // Left Supporting Hand (Cupping under magazine)
    const leftArmGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.2, 16);
    const leftArm = new THREE.Mesh(leftArmGeo, gloveMat);
    leftArm.position.set(-0.25, -0.65, -0.4);
    leftArm.rotation.set(0.65, 0.35, 0.4);
    viewmodelGroup.add(leftArm);

    const leftHandGeo = new THREE.BoxGeometry(0.22, 0.28, 0.26);
    const leftHand = new THREE.Mesh(leftHandGeo, gloveMat);
    leftHand.position.set(0.12, -0.38, -0.6);
    leftHand.rotation.set(0.2, -0.4, 0.3);
    viewmodelGroup.add(leftHand);

    // 2. Realistic 3D Tactical Pistol
    const gunGroup = new THREE.Group();

    // Gun Materials
    const slideMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Gunmetal slide
      metalness: 0.85,
      roughness: 0.2,
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Polymer frame
      metalness: 0.5,
      roughness: 0.4,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // Polished wood grip plates
      metalness: 0.15,
      roughness: 0.5,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
    });

    // Slide (top)
    const slideGeo = new THREE.BoxGeometry(0.18, 0.22, 1.1);
    const slide = new THREE.Mesh(slideGeo, slideMat);
    slide.position.set(0, 0.1, 0);
    slide.castShadow = true;
    gunGroup.add(slide);

    // Barrel bore (tip looking forward toward -Z)
    const barrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16);
    const barrel = new THREE.Mesh(barrelGeo, chromeMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, -0.6);
    gunGroup.add(barrel);

    // Frame (lower)
    const frameGeo = new THREE.BoxGeometry(0.16, 0.18, 0.95);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, -0.06, 0.05);
    gunGroup.add(frame);

    // Grip handle (angled back toward player)
    const gripGeo = new THREE.BoxGeometry(0.17, 0.65, 0.32);
    const grip = new THREE.Mesh(gripGeo, woodMat);
    grip.position.set(0, -0.38, 0.22);
    grip.rotation.x = 0.24;
    gunGroup.add(grip);

    // Trigger Guard & Trigger
    const guardGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 16, Math.PI);
    const guard = new THREE.Mesh(guardGeo, frameMat);
    guard.position.set(0, -0.2, -0.05);
    guard.rotation.y = Math.PI / 2;
    guard.rotation.x = Math.PI / 2;
    gunGroup.add(guard);

    // Iron Sights (Aligned directly with screen center!)
    // Front sight blade
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.05, 0.06), slideMat);
    frontSight.position.set(0, 0.23, -0.52);
    gunGroup.add(frontSight);

    // Rear sight notch (two posts with gap)
    const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.05), slideMat);
    rearSightL.position.set(-0.045, 0.23, 0.48);
    gunGroup.add(rearSightL);

    const rearSightR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.05), slideMat);
    rearSightR.position.set(0.045, 0.23, 0.48);
    gunGroup.add(rearSightR);

    // Muzzle Flash Effect (at tip of barrel, -Z forward)
    const flashGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0,
    });
    const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    muzzleFlash.position.set(0, 0.1, -0.75);
    gunGroup.add(muzzleFlash);

    // Dynamic Muzzle PointLight
    const flashLight = new THREE.PointLight(0xf59e0b, 0, 10, 2);
    flashLight.position.set(0, 0.1, -0.8);
    gunGroup.add(flashLight);

    // Position gun within first-person viewmodel (slightly to the right, aiming forward)
    gunGroup.position.set(0.2, -0.25, -0.7);
    viewmodelGroup.add(gunGroup);

    return { viewmodelGroup, gunGroup, muzzleFlash, flashLight };
  };

  // Build 3D Glass Bottle Target
  const createBottleMesh = (colorHex: number, isHazard = false) => {
    const group = new THREE.Group();

    if (isHazard) {
      // Red Hazard Bomb Skull Canister
      const hazardMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.8,
        roughness: 0.3,
      });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), hazardMat);
      sphere.castShadow = true;
      group.add(sphere);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.05, 8, 20), glowMat);
      group.add(ring);

      return group;
    }

    // High quality translucent 3D glass bottle
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: colorHex,
      transmission: 0.85,
      transparent: true,
      opacity: 0.95,
      roughness: 0.08,
      metalness: 0.05,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Lower cylinder body
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.8, 20);
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Shoulder
    const shoulderGeo = new THREE.CylinderGeometry(0.12, 0.24, 0.35, 20);
    const shoulder = new THREE.Mesh(shoulderGeo, glassMat);
    shoulder.position.y = 0.95;
    shoulder.castShadow = true;
    group.add(shoulder);

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.45, 16);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 1.35;
    neck.castShadow = true;
    group.add(neck);

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.62;
    cap.castShadow = true;
    group.add(cap);

    // Invisible larger bounding box for satisfying hit detection
    const hitBoxGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.7, 12);
    const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    hitBox.position.y = 0.85;
    group.add(hitBox);

    return group;
  };

  // Build the 3D Shooting Range Environment
  const buildShootingRange = (scene: THREE.Scene) => {
    // 1. Wooden shooting stall counter in front of player
    const counterGeo = new THREE.BoxGeometry(6, 0.8, 1.2);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.6,
      metalness: 0.1,
    });
    const counter = new THREE.Mesh(counterGeo, woodMat);
    counter.position.set(0, -0.6, -1.8);
    counter.receiveShadow = true;
    scene.add(counter);

    // Partition side walls for shooting stall
    const stallWallGeo = new THREE.BoxGeometry(0.2, 4, 3);
    const stallWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const leftWall = new THREE.Mesh(stallWallGeo, stallWallMat);
    leftWall.position.set(-2.8, 0.8, -1.5);
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(stallWallGeo, stallWallMat);
    rightWall.position.set(2.8, 0.8, -1.5);
    scene.add(rightWall);

    // 2. Shooting Range Floor (sand / turf)
    const floorGeo = new THREE.PlaneGeometry(35, 45);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -1.0, -15);
    floor.receiveShadow = true;
    scene.add(floor);

    // 3. Sandbags and lane markers
    const sandbagGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.5, 12);
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 });
    for (let i = -3; i <= 3; i += 2) {
      const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
      bag.position.set(i * 1.8, -0.7, -7);
      bag.rotation.z = Math.PI / 2;
      scene.add(bag);
    }

    // 4. Backstop Target Wall with ballistic timber
    const backWallGeo = new THREE.BoxGeometry(32, 10, 1.5);
    const backWallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, 3.5, -24);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // 5. Target Shelves at different depths
    // Near Shelf (depth Z = -6.5m)
    const nearShelfGeo = new THREE.BoxGeometry(9, 0.25, 0.8);
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
    const nearShelf = new THREE.Mesh(nearShelfGeo, shelfMat);
    nearShelf.position.set(0, -0.1, -6.5);
    nearShelf.receiveShadow = true;
    scene.add(nearShelf);

    // Mid Shelf (depth Z = -11.5m)
    const midShelfGeo = new THREE.BoxGeometry(11, 0.25, 0.8);
    const midShelf = new THREE.Mesh(midShelfGeo, shelfMat);
    midShelf.position.set(0, 0.6, -11.5);
    midShelf.receiveShadow = true;
    scene.add(midShelf);

    // Long Range Moving Shelf (depth Z = -17m)
    const farShelfGeo = new THREE.BoxGeometry(13, 0.25, 0.8);
    const farShelf = new THREE.Mesh(farShelfGeo, shelfMat);
    farShelf.position.set(0, 1.4, -17.0);
    farShelf.receiveShadow = true;
    scene.add(farShelf);
  };

  // Generate targets for current level
  const generateLevel = useCallback((lvl: number) => {
    const engine = engineRef.current;
    if (!engine.scene) return;

    // Remove old bottles
    engine.bottles.forEach((b) => {
      engine.scene?.remove(b.mesh);
    });
    engine.bottles = [];

    // Clear active shards
    engine.shards.forEach((s) => {
      engine.scene?.remove(s.mesh);
      s.mesh.geometry.dispose();
    });
    engine.shards = [];

    const bottleColors = [0x10b981, 0x3b82f6, 0xf59e0b, 0xec4899, 0x06b6d4, 0x84cc16];
    const targets: BottleTarget[] = [];

    // Stage configuration
    // Stage 1: 5 static bottles across near and mid shelves
    // Stage 2: 7 bottles with 1 moving target
    // Stage 3+: 8-10 bottles with moving targets and hazard bomb canisters!
    const targetCount = Math.min(10, 5 + Math.floor(lvl * 0.8));
    const hasHazard = lvl >= 3;
    const hazardCount = hasHazard ? Math.min(2, 1 + Math.floor((lvl - 3) * 0.5)) : 0;
    const totalSlots = targetCount + hazardCount;

    let id = 0;
    const depths = [
      { z: -6.5, y: 0.05, count: Math.ceil(targetCount * 0.4) }, // Near
      { z: -11.5, y: 0.75, count: Math.ceil(targetCount * 0.4) }, // Mid
      { z: -17.0, y: 1.55, count: Math.max(1, targetCount - Math.ceil(targetCount * 0.4) * 2) }, // Far
    ];

    let createdGoodBottles = 0;

    depths.forEach((tier, tierIdx) => {
      const spacing = 1.6 - tierIdx * 0.2;
      const startX = -((tier.count - 1) * spacing) / 2;

      for (let i = 0; i < tier.count; i++) {
        const isHazard = hasHazard && id === totalSlots - 1;
        const color = isHazard ? 0xef4444 : bottleColors[(lvl + id) % bottleColors.length];
        const mesh = createBottleMesh(color, isHazard);

        const x = startX + i * spacing;
        const y = tier.y;
        const z = tier.z;
        mesh.position.set(x, y, z);
        engine.scene?.add(mesh);

        // Moving shelf target in tier 2 or 3
        const isMoving = lvl >= 2 && tierIdx >= 1 && i % 2 === 1;
        const moveRange = isMoving ? 1.8 + lvl * 0.2 : 0;
        const moveSpeed = isMoving ? 1.5 + lvl * 0.2 : 0;

        targets.push({
          id: id++,
          mesh,
          basePos: new THREE.Vector3(x, y, z),
          color,
          isHit: false,
          isHazard,
          moveRange,
          moveSpeed,
          moveAxis: 'x',
          initialOffset: i * 0.8,
        });

        if (!isHazard) createdGoodBottles++;
      }
    });

    engine.bottles = targets;
    engine.level = lvl;
    engine.combo = 1;
    engine.ammo = 8;
    engine.maxAmmo = 8;
    engine.reserveAmmo = 24;
    engine.isReloading = false;

    setAmmo(8);
    setReserveAmmo(24);
    setIsReloading(false);
    setBottlesLeft(createdGoodBottles);
    setTotalBottles(createdGoodBottles);
    setCombo(1);
  }, []);

  // Shatter a bottle into 3D glass fragments
  const shatterBottle = (bottle: BottleTarget) => {
    const engine = engineRef.current;
    if (!engine.scene) return;

    bottle.isHit = true;
    engine.scene.remove(bottle.mesh);

    const pos = bottle.mesh.position;
    const shardCount = bottle.isHazard ? 24 : 16;

    const glassShardMat = new THREE.MeshPhysicalMaterial({
      color: bottle.color,
      transmission: 0.8,
      transparent: true,
      roughness: 0.15,
      metalness: 0.05,
    });

    for (let i = 0; i < shardCount; i++) {
      const size = 0.12 + Math.random() * 0.2;
      const geo = new THREE.ConeGeometry(size, size * 1.4, 3);
      const shardMesh = new THREE.Mesh(geo, glassShardMat);

      shardMesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.3,
        pos.y + 0.6 + (Math.random() - 0.5) * 0.5,
        pos.z + (Math.random() - 0.5) * 0.3
      );

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.5;

      shardMesh.castShadow = true;
      engine.scene.add(shardMesh);

      engine.shards.push({
        mesh: shardMesh,
        vx: Math.cos(angle) * speed,
        vy: 2.0 + Math.random() * 4.0,
        vz: Math.sin(angle) * speed,
        vRotX: (Math.random() - 0.5) * 14,
        vRotY: (Math.random() - 0.5) * 14,
        vRotZ: (Math.random() - 0.5) * 14,
        life: 1.0,
      });
    }
  };

  // Reload action
  const reloadGun = useCallback(() => {
    const engine = engineRef.current;
    if (engine.isReloading || engine.ammo === engine.maxAmmo || engine.reserveAmmo <= 0) return;

    engine.isReloading = true;
    setIsReloading(true);
    sounds.playClick();

    setTimeout(() => {
      const needed = engine.maxAmmo - engine.ammo;
      const amount = Math.min(needed, engine.reserveAmmo);
      engine.ammo += amount;
      engine.reserveAmmo -= amount;
      engine.isReloading = false;

      setAmmo(engine.ammo);
      setReserveAmmo(engine.reserveAmmo);
      setIsReloading(false);
      sounds.playClick();
    }, 1100);
  }, []);

  // Shoot Gun Action
  const shootGun = useCallback(() => {
    const engine = engineRef.current;
    if (
      engine.gameState !== 'PLAYING' ||
      engine.isReloading ||
      engine.ammo <= 0 ||
      !engine.camera ||
      !engine.scene
    ) {
      if (engine.ammo <= 0 && !engine.isReloading) {
        reloadGun();
      }
      return;
    }

    sounds.playGunShot();

    // Consume 1 ammo
    engine.ammo--;
    setAmmo(engine.ammo);

    // Recoil Kickback Animation (gun jumps back toward player view and tilts up)
    engine.recoilAmount = 0.22;
    engine.recoilRot = 0.16;
    engine.flashTimer = 0.065;
    engine.shakeAmount = 0.12;

    if (engine.muzzleFlash) {
      (engine.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1;
    }
    if (engine.flashLight) {
      engine.flashLight.intensity = 5.0;
    }

    // Raycast from exact screen center (0, 0)
    engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);

    // Check intersection with all active bottle target meshes
    const activeTargets = engine.bottles.filter((b) => !b.isHit);
    const targetMeshes = activeTargets.map((b) => b.mesh);
    const intersects = engine.raycaster.intersectObjects(targetMeshes, true);

    if (intersects.length > 0) {
      const firstHit = intersects[0];
      // Find which bottle contains this hit mesh
      const hitBottle = activeTargets.find((b) => {
        let cur: THREE.Object3D | null = firstHit.object;
        while (cur) {
          if (cur === b.mesh) return true;
          cur = cur.parent;
        }
        return false;
      });

      if (hitBottle) {
        shatterBottle(hitBottle);

        // Flash red crosshair hit marker
        setShowHitMarker(true);
        setTimeout(() => setShowHitMarker(false), 160);

        if (hitBottle.isHazard) {
          // Hit hazard bomb -> GAME OVER!
          engine.gameState = 'GAMEOVER';
          engine.shakeAmount = 0.6;
          setGameState('GAMEOVER');
          sounds.playGameOver();
          const newBest = saveStoredScore('gun-sprint', engine.score);
          setBestScore(newBest);
        } else {
          // Smashed good bottle!
          sounds.playSmash();
          engine.shakeAmount = 0.16;

          // Combo & Score
          const pts = 150 * engine.combo;
          engine.score += pts;
          engine.combo++;
          setScore(engine.score);
          setCombo(engine.combo);

          // Update remaining target bottles count
          const remaining = engine.bottles.filter((bt) => !bt.isHit && !bt.isHazard).length;
          setBottlesLeft(remaining);

          // Check Stage Victory
          if (remaining === 0) {
            // Ammo bonus
            const bonus = (engine.ammo + engine.reserveAmmo) * 40;
            engine.score += bonus;
            setScore(engine.score);

            engine.gameState = 'LEVEL_CLEAR';
            setGameState('LEVEL_CLEAR');
            sounds.playWin();

            const newBest = saveStoredScore('gun-sprint', engine.score);
            setBestScore(newBest);
          }
        }
      }
    } else {
      // Missed shot: reset combo
      engine.combo = 1;
      setCombo(1);

      // Check if completely out of ammo with bottles remaining
      const remaining = engine.bottles.filter((bt) => !bt.isHit && !bt.isHazard).length;
      if (engine.ammo === 0 && engine.reserveAmmo === 0 && remaining > 0) {
        engine.gameState = 'GAMEOVER';
        setGameState('GAMEOVER');
        sounds.playGameOver();
        const newBest = saveStoredScore('gun-sprint', engine.score);
        setBestScore(newBest);
      }
    }
  }, [reloadGun]);

  // Start new game
  const startGame = useCallback(() => {
    const engine = engineRef.current;
    engine.score = 0;
    engine.level = 1;
    engine.combo = 1;
    engine.targetYaw = 0;
    engine.targetPitch = 0;
    engine.yaw = 0;
    engine.pitch = 0;
    engine.gameState = 'PLAYING';
    setScore(0);
    setLevel(1);
    setCombo(1);
    setGameState('PLAYING');
    generateLevel(1);
    sounds.playClick();
  }, [generateLevel]);

  // Next level
  const nextLevel = useCallback(() => {
    const engine = engineRef.current;
    const nextLvl = engine.level + 1;
    engine.level = nextLvl;
    engine.targetYaw = 0;
    engine.targetPitch = 0;
    engine.yaw = 0;
    engine.pitch = 0;
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

  // Touch & Mouse Drag Aiming handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger aim drag when clicking UI buttons
    if (target.closest('button')) return;

    engineRef.current.isDragging = true;
    engineRef.current.lastTouchX = e.clientX;
    engineRef.current.lastTouchY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine.isDragging || engine.gameState !== 'PLAYING') return;

    const dx = e.clientX - engine.lastTouchX;
    const dy = e.clientY - engine.lastTouchY;
    engine.lastTouchX = e.clientX;
    engine.lastTouchY = e.clientY;

    const sensitivity = 0.0035;
    engine.targetYaw -= dx * sensitivity;
    engine.targetPitch -= dy * sensitivity;

    // Clamp look angles to shooting range boundaries
    const maxYaw = 0.65; // ~37 degrees left/right
    const maxPitch = 0.35; // ~20 degrees up/down
    engine.targetYaw = Math.max(-maxYaw, Math.min(maxYaw, engine.targetYaw));
    engine.targetPitch = Math.max(-maxPitch, Math.min(maxPitch, engine.targetPitch));
  };

  const handlePointerUp = () => {
    engineRef.current.isDragging = false;
  };

  // Keyboard controls (Spacebar to fire, R to reload)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (engineRef.current.gameState === 'PLAYING') {
          shootGun();
        } else if (
          engineRef.current.gameState === 'IDLE' ||
          engineRef.current.gameState === 'GAMEOVER'
        ) {
          startGame();
        } else if (engineRef.current.gameState === 'LEVEL_CLEAR') {
          nextLevel();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        reloadGun();
      } else if (e.code === 'KeyP') {
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shootGun, reloadGun, startGame, nextLevel]);

  // Initialize Three.js First-Person Viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 440;

    // Scene & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    // First-Person Camera at eye-height (Y = 1.6m)
    const camera = new THREE.PerspectiveCamera(54, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 0);
    scene.add(camera);

    // Renderer
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

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(10, 15, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Build Range Environment
    buildShootingRange(scene);

    // Attach First-Person Viewmodel (Hands & Pistol) directly to Camera!
    const { viewmodelGroup, gunGroup, muzzleFlash, flashLight } = createFPSViewmodel();
    camera.add(viewmodelGroup);

    // Save references
    const engine = engineRef.current;
    engine.scene = scene;
    engine.camera = camera;
    engine.renderer = renderer;
    engine.viewmodel = viewmodelGroup;
    engine.gunMesh = gunGroup;
    engine.muzzleFlash = muzzleFlash;
    engine.flashLight = flashLight;

    generateLevel(1);

    // Resize listener
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

      // Smooth camera aiming interpolation
      engine.yaw += (engine.targetYaw - engine.yaw) * 0.2;
      engine.pitch += (engine.targetPitch - engine.pitch) * 0.2;

      // Screen shake decay
      let shakeX = 0;
      let shakeY = 0;
      if (engine.shakeAmount > 0) {
        shakeX = (Math.random() - 0.5) * engine.shakeAmount;
        shakeY = (Math.random() - 0.5) * engine.shakeAmount;
        engine.shakeAmount = Math.max(0, engine.shakeAmount - dt * 2.8);
      }

      camera.rotation.set(engine.pitch + shakeY, engine.yaw + shakeX, 0, 'YXZ');

      // First-person gun breathing sway & look lag
      engine.swayTime += dt;
      const breathX = Math.sin(engine.swayTime * 2.0) * 0.008;
      const breathY = Math.cos(engine.swayTime * 4.0) * 0.005;

      // Recoil restoration
      if (engine.recoilAmount > 0) {
        engine.recoilAmount = Math.max(0, engine.recoilAmount - dt * 3.2);
        engine.recoilRot = Math.max(0, engine.recoilRot - dt * 2.8);
      }

      // Muzzle flash decay
      if (engine.flashTimer > 0) {
        engine.flashTimer -= dt;
        if (engine.flashTimer <= 0) {
          if (engine.muzzleFlash) {
            (engine.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (engine.flashLight) {
            engine.flashLight.intensity = 0;
          }
        }
      }

      // Apply recoil and sway to viewmodel gun
      if (engine.gunMesh) {
        engine.gunMesh.position.set(
          0.2 + breathX,
          -0.25 + breathY + engine.recoilAmount * 0.4,
          -0.7 + engine.recoilAmount
        );
        engine.gunMesh.rotation.set(engine.recoilRot, 0, 0);
      }

      // Update moving targets
      engine.bottles.forEach((b) => {
        if (b.isHit || b.moveSpeed === 0) return;
        const offset = Math.sin(time * 0.001 * b.moveSpeed + b.initialOffset) * b.moveRange;
        b.mesh.position.x = b.basePos.x + offset;
      });

      // Update 3D glass shards
      for (let i = engine.shards.length - 1; i >= 0; i--) {
        const s = engine.shards[i];
        s.vy -= 12.0 * dt; // gravity
        s.mesh.position.x += s.vx * dt;
        s.mesh.position.y += s.vy * dt;
        s.mesh.position.z += s.vz * dt;
        s.mesh.rotation.x += s.vRotX * dt;
        s.mesh.rotation.y += s.vRotY * dt;
        s.mesh.rotation.z += s.vRotZ * dt;
        s.life -= dt * 1.2;

        if (s.life <= 0) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          engine.shards.splice(i, 1);
        } else {
          const sc = Math.max(0.02, s.life);
          s.mesh.scale.set(sc, sc, sc);
        }
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
  }, [generateLevel]);

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
          <div className="flex items-center gap-1.5">
            <Crosshair className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold tracking-wider text-white">BOTTLE SNIPER FPS</span>
          </div>
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

      {/* Main FPS Viewport */}
      <div
        className="relative w-full max-w-3xl aspect-[16/10] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center cursor-crosshair select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Three.js 3D First-Person Canvas */}
        <div ref={containerRef} className="absolute inset-0 w-full h-full" />

        {/* Tactical Center Crosshair HUD */}
        {gameState === 'PLAYING' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Outer Reticle Brackets */}
              <div className="absolute -top-3 w-1 h-2 bg-white/70 shadow-sm" />
              <div className="absolute -bottom-3 w-1 h-2 bg-white/70 shadow-sm" />
              <div className="absolute -left-3 h-1 w-2 bg-white/70 shadow-sm" />
              <div className="absolute -right-3 h-1 w-2 bg-white/70 shadow-sm" />

              {/* Center Dot */}
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  showHitMarker ? 'bg-red-500 scale-150' : 'bg-red-400 shadow-sm'
                }`}
              />

              {/* Red Hit Marker Flash */}
              {showHitMarker && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 font-black text-xl animate-ping">
                  ✕
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top FPS HUD (Matches Professional Mobile PvP/PvE shooter) */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
          {/* Target Bottles Left */}
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-lg">
            <span className="text-emerald-400 text-xs">🍾</span>
            <span className="text-xs font-bold text-slate-300">TARGETS</span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {bottlesLeft}/{totalBottles}
            </span>
          </div>

          {/* Level & Combo */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1 rounded-xl text-xs font-bold text-slate-200">
              STAGE {level}
            </div>
            {combo > 1 && (
              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 px-2.5 py-1 rounded-xl text-xs font-black text-amber-400 animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{combo}X COMBO</span>
              </div>
            )}
          </div>

          {/* Score Counter */}
          <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-xl shadow-lg">
            <span className="text-xs text-slate-400 font-medium">Score</span>
            <span className="font-mono font-black text-white text-base">{score}</span>
          </div>
        </div>

        {/* Bottom Mobile FPS Controls Overlay */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-4 inset-x-4 flex items-end justify-between z-20 pointer-events-auto">
            {/* Left: Magazine & Reload Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reloadGun();
                }}
                disabled={isReloading || ammo === maxAmmo || reserveAmmo <= 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs shadow-xl transition-all active:scale-95 ${
                  isReloading
                    ? 'bg-amber-600/30 border-amber-500 text-amber-400 animate-pulse'
                    : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-white cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
                <span>{isReloading ? 'RELOADING...' : 'RELOAD'}</span>
              </button>

              {/* Magazine Visual Count */}
              <div className="flex flex-col bg-slate-950/80 backdrop-blur-sm border border-slate-800 px-3 py-1.5 rounded-xl">
                <div className="flex items-center gap-1">
                  {Array.from({ length: maxAmmo }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-4 rounded-sm ${
                        i < ammo ? 'bg-amber-400 shadow-sm' : 'bg-slate-700 opacity-40'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                  {ammo} / <span className="text-slate-500">{reserveAmmo}</span>
                </div>
              </div>
            </div>

            {/* Right: Big Dedicated Mobile FIRE Button (Matches FPS Mobile Shooter standards) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                shootGun();
              }}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-orange-500 border-4 border-amber-400 shadow-2xl shadow-red-600/40 flex flex-col items-center justify-center text-white font-black active:scale-90 transition-transform cursor-pointer"
            >
              <Zap className="w-7 h-7 fill-white mb-0.5" />
              <span className="text-[11px] tracking-wider uppercase">FIRE</span>
            </button>
          </div>
        )}

        {/* Start Game Modal */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center mb-3 text-orange-400 shadow-xl shadow-orange-500/10">
              <Crosshair className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-wide mb-2">BOTTLE SNIPER FPS</h2>
            <p className="text-xs text-slate-300 mb-6 max-w-sm leading-relaxed">
              True first-person 3D bottle shooting arcade! Drag screen or move mouse to aim the center crosshair at glass bottles. Tap the dedicated <strong className="text-orange-400">FIRE</strong> button to shoot!
            </p>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-orange-500/25 active:scale-95 text-sm uppercase tracking-wider"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START SHOOTING</span>
            </button>
          </div>
        )}

        {/* Paused Modal */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
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
            <div className="text-rose-500 text-xs font-bold tracking-widest uppercase mb-1">
              Ammo Depleted or Hazard Detonated
            </div>
            <h2 className="text-3xl font-black text-white mb-4">MISSION FAILED</h2>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-56 mb-6 shadow-xl">
              <div className="text-xs text-slate-400 mb-1">Final Score</div>
              <div className="text-3xl font-mono font-black text-white">{score}</div>
              <div className="text-xs text-amber-400 mt-2 font-mono flex items-center justify-center gap-1 font-semibold">
                <Trophy className="w-3.5 h-3.5" /> Best: {bestScore}
              </div>
            </div>
            <button
              onClick={startGame}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-xl shadow-red-500/25 active:scale-95 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Level Complete Modal */}
        {gameState === 'LEVEL_CLEAR' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-1">
              Range Cleared!
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Stage {level} Complete!</h2>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 w-56 mb-6 shadow-xl">
              <div className="text-xs text-slate-400 mb-1">Total Score</div>
              <div className="text-3xl font-mono font-black text-emerald-400">{score}</div>
            </div>
            <button
              onClick={nextLevel}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95 text-sm"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Next Stage</span>
            </button>
          </div>
        )}
      </div>

      {/* Cross-platform Controls Bar */}
      <div className="w-full max-w-3xl mt-3 flex items-center justify-between text-xs text-slate-400 font-medium">
        <span>Desktop: <strong>Drag Mouse</strong> to Aim · <strong>Spacebar / Click FIRE</strong> to Shoot · <strong>R</strong> to Reload</span>
        <span>Mobile: <strong>Drag Screen</strong> to Aim · Tap <strong>FIRE</strong> Button</span>
      </div>
    </div>
  );
};
