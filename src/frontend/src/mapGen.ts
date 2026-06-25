import {
  BUILD_PATHS,
  GRAVITY,
  MAP_H,
  MAP_W,
  PLAYER_SPEED,
  RESOURCES,
  T,
  TILE,
  TILE_COLOR_CACHE,
} from "./gameData";
import type {
  BuildPathKey,
  CargoItem,
  PlayerState,
  PlayerStats,
} from "./gameTypes";

// ─── Map Generation ───────────────────────────────────────────────────────────
export function generateMap(deepDive = false, richSeam = false): Uint8Array {
  const map = new Uint8Array(MAP_W * MAP_H);
  const idx = (x: number, y: number) => y * MAP_W + x;
  const oreDensityMult = (deepDive ? 1.5 : 1.0) * (richSeam ? 2.0 : 1.0);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (y < 5) map[idx(x, y)] = T.EMPTY;
      else if (y === 5) map[idx(x, y)] = T.DIRT;
      else {
        const depth = y - 5;
        const r = Math.random();
        if (depth < 20)
          map[idx(x, y)] = r < 0.02 ? T.HARD_ROCK : r < 0.15 ? T.STONE : T.DIRT;
        else if (depth < 50)
          map[idx(x, y)] = r < 0.08 ? T.HARD_ROCK : r < 0.35 ? T.STONE : T.DIRT;
        else if (depth < 100)
          map[idx(x, y)] = r < 0.18 ? T.HARD_ROCK : r < 0.55 ? T.STONE : T.DIRT;
        else
          map[idx(x, y)] = r < 0.3 ? T.HARD_ROCK : r < 0.65 ? T.STONE : T.DIRT;
      }
    }
  }
  // Deep Dive: carve out tunnels in the top ~45 rows so player isn't entombed
  if (deepDive) {
    for (let y = 5; y < 43; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (y < 5) map[idx(x, y)] = T.EMPTY;
        else if (y === 5) map[idx(x, y)] = T.DIRT;
        else map[idx(x, y)] = T.EMPTY;
      }
    }
  }
  // Ore placement
  for (let y = 6; y < MAP_H; y++) {
    const depth = y - 5;
    const deepOreMult = depth > 80 ? 1.1 * oreDensityMult : oreDensityMult;
    for (let x = 0; x < MAP_W; x++) {
      const tile = map[idx(x, y)];
      if (tile === T.EMPTY) continue;
      const r = Math.random();
      let placed = false;
      // Depth-based scarcity: rare ores only appear at appropriate depths
      // 120m+: only highest-tier ores
      if (depth >= 145 && r < 0.008 * oreDensityMult && !placed) {
        map[idx(x, y)] = T.BOB_SEAM;
        placed = true;
      }
      if (depth >= 120 && depth < 145 && r < 0.009 * deepOreMult && !placed) {
        map[idx(x, y)] = T.CHAIN_FUSION;
        placed = true;
      }
      if (depth >= 120 && r < 0.007 * deepOreMult && !placed) {
        map[idx(x, y)] = T.VOID_SHARD;
        placed = true;
      }
      if (deepDive && depth >= 100 && r < 0.008 * deepOreMult && !placed) {
        map[idx(x, y)] = T.QUANTUM_BOB;
        placed = true;
      }
      if (depth >= 100 && depth < 130 && r < 0.008 * deepOreMult && !placed) {
        map[idx(x, y)] = T.SERAPH_TOKEN;
        placed = true;
      }
      if (depth >= 60 && depth < 110 && r < 0.012 * deepOreMult && !placed) {
        map[idx(x, y)] = T.DEGEN_CRYSTAL;
        placed = true;
      }
      if (depth >= 110 && depth < 135 && r < 0.01 * deepOreMult && !placed) {
        map[idx(x, y)] = T.DRAGGINZ_SCALE;
        placed = true;
      }
      if (depth >= 100 && depth < 125 && r < 0.011 * deepOreMult && !placed) {
        map[idx(x, y)] = T.NNS_TOKEN;
        placed = true;
      }
      if (depth >= 154 && r < 0.014 && !placed) {
        map[idx(x, y)] = T.BOB_SEAM;
        placed = true;
      }
      if (depth >= 130 && r < 0.01 * deepOreMult && !placed) {
        map[idx(x, y)] = T.BOB_VEIN;
        placed = true;
      }
      if (depth >= 120 && r < 0.012 * deepOreMult && !placed) {
        map[idx(x, y)] = T.BOB_INGOT;
        placed = true;
      }
      // 80-120m: rare ores concentrate here
      if (depth >= 100 && depth < 130 && r < 0.016 * deepOreMult && !placed) {
        map[idx(x, y)] = T.BOB_CORE;
        placed = true;
      }
      if (depth >= 85 && depth < 120 && r < 0.018 * deepOreMult && !placed) {
        map[idx(x, y)] = T.BOB_CRYSTAL;
        placed = true;
      }
      if (depth >= 80 && depth < 120 && r < 0.02 * deepOreMult && !placed) {
        map[idx(x, y)] = T.BOB_CORE;
        placed = true;
      }
      // 40-80m: mid-tier ores
      if (depth >= 65 && depth < 90 && r < 0.022 && !placed) {
        map[idx(x, y)] = T.BOB_CHIP;
        placed = true;
      }
      if (depth >= 45 && depth < 85 && r < 0.024 && !placed) {
        map[idx(x, y)] = T.BOB_SHARD;
        placed = true;
      }
      if (depth >= 40 && depth < 70 && r < 0.026 && !placed) {
        map[idx(x, y)] = T.BOB_FRAGMENT;
        placed = true;
      }
      // 0-40m: common ores dominant
      if (depth >= 15 && depth < 50 && r < 0.03 && !placed) {
        map[idx(x, y)] = T.BOB_FRAGMENT;
        placed = true;
      }
      if (depth >= 8 && depth < 40 && r < 0.04 && !placed) {
        map[idx(x, y)] = T.BOB_FLECK;
        placed = true;
      }
      if (depth < 40 && r < 0.06 && !placed) {
        map[idx(x, y)] = T.BOB_DUST;
      } else if (depth < 80 && r < 0.03 && !placed) {
        map[idx(x, y)] = T.BOB_DUST;
      }
    }
  }
  // Cave pockets with treasure
  const ORE_TIERS = [
    T.BOB_DUST,
    T.BOB_FLECK,
    T.BOB_FRAGMENT,
    T.BOB_SHARD,
    T.BOB_CHIP,
    T.BOB_CRYSTAL,
    T.BOB_CORE,
    T.BOB_INGOT,
    T.BOB_VEIN,
    T.BOB_SEAM,
    T.NNS_TOKEN,
    T.CHAIN_FUSION,
    T.DRAGGINZ_SCALE,
    T.SERAPH_TOKEN,
    T.VOID_SHARD,
    T.DEGEN_CRYSTAL,
    T.QUANTUM_BOB,
  ];
  const numCaves = 15 + Math.floor(Math.random() * 6);
  for (let c = 0; c < numCaves; c++) {
    let cx = Math.floor(Math.random() * MAP_W);
    let cy = Math.floor(10 + Math.random() * (MAP_H - 12));
    const caveDepth = cy - 5;
    const steps = 4 + Math.floor(Math.random() * 5);
    const caveCells: Array<{ x: number; y: number }> = [];
    for (let s = 0; s < steps; s++) {
      if (cx >= 0 && cx < MAP_W && cy >= 0 && cy < MAP_H) {
        map[idx(cx, cy)] = T.EMPTY;
        caveCells.push({ x: cx, y: cy });
      }
      const dir = Math.floor(Math.random() * 4);
      if (dir === 0) cx++;
      else if (dir === 1) cx--;
      else if (dir === 2) cy++;
      else cy--;
    }
    // 20% chance: place treasure chest
    if (Math.random() < 0.2 && caveCells.length > 0) {
      const tc = caveCells[Math.floor(Math.random() * caveCells.length)];
      map[idx(tc.x, tc.y)] = 33; // TREASURE_CHEST
    }
    // Dense ore cluster with 2-tier bonus
    if (caveDepth > 5 && Math.random() < 0.6) {
      const baseOreIdx = Math.min(9, Math.floor(caveDepth / 16));
      const boostedIdx = Math.min(9, baseOreIdx + 2);
      const oreTile = ORE_TIERS[boostedIdx];
      for (const cell of caveCells) {
        const neighbors = [
          { x: cell.x - 1, y: cell.y },
          { x: cell.x + 1, y: cell.y },
          { x: cell.x, y: cell.y - 1 },
          { x: cell.x, y: cell.y + 1 },
        ];
        for (const n of neighbors) {
          if (
            n.x >= 0 &&
            n.x < MAP_W &&
            n.y >= 0 &&
            n.y < MAP_H &&
            map[idx(n.x, n.y)] !== T.EMPTY &&
            map[idx(n.x, n.y)] !== 33
          ) {
            if (Math.random() < 0.4) map[idx(n.x, n.y)] = oreTile;
          }
        }
      }
    }
  }

  // World hazards
  for (let y = 6; y < MAP_H; y++) {
    const depth = y - 5;
    for (let x = 0; x < MAP_W; x++) {
      const t = map[idx(x, y)];
      if (t === T.EMPTY) continue;
      // CAVE_IN boulders: depth >= 30, increasing frequency
      if (depth >= 30 && (t === T.DIRT || t === T.STONE || t === T.HARD_ROCK)) {
        const freq = 0.01 + (depth - 30) * 0.00015;
        if (Math.random() < freq) {
          map[idx(x, y)] = 30;
        }
      }
    }
  }
  // GAS_POCKET clusters: depth >= 50
  const numGasClusters = 8 + Math.floor(Math.random() * 6);
  for (let g = 0; g < numGasClusters; g++) {
    const gx = Math.floor(Math.random() * MAP_W);
    const gy = Math.floor(55 + Math.random() * (MAP_H - 57));
    const size = 2 + Math.floor(Math.random() * 3);
    for (let dy2 = 0; dy2 < size; dy2++) {
      for (let dx2 = 0; dx2 < size; dx2++) {
        const nx = gx + dx2;
        const ny = gy + dy2;
        if (
          nx >= 0 &&
          nx < MAP_W &&
          ny >= 0 &&
          ny < MAP_H &&
          map[idx(nx, ny)] === T.EMPTY
        ) {
          map[idx(nx, ny)] = 31; // GAS_POCKET
        }
      }
    }
  }
  // WATER_TILE horizontal bands: depth >= 40, rare
  for (let wy = 0; wy < 6; wy++) {
    const waterY = Math.floor(45 + Math.random() * (MAP_H - 47));
    const waterX = Math.floor(Math.random() * (MAP_W - 8));
    const waterLen = 3 + Math.floor(Math.random() * 6);
    for (let wxi = 0; wxi < waterLen; wxi++) {
      const nx = waterX + wxi;
      if (
        nx >= 0 &&
        nx < MAP_W &&
        waterY >= 0 &&
        waterY < MAP_H &&
        map[idx(nx, waterY)] === T.EMPTY
      ) {
        map[idx(nx, waterY)] = 32; // WATER_TILE
      }
    }
  }

  // LAVA_TILE bands: depth >= 130, rare horizontal bands
  for (let ly = 0; ly < 4; ly++) {
    const lavaY = Math.floor(135 + Math.random() * (MAP_H - 140));
    const lavaX = Math.floor(Math.random() * (MAP_W - 6));
    const lavaLen = 2 + Math.floor(Math.random() * 5);
    for (let lxi = 0; lxi < lavaLen; lxi++) {
      const nx = lavaX + lxi;
      if (
        nx >= 0 &&
        nx < MAP_W &&
        lavaY >= 0 &&
        lavaY < MAP_H &&
        map[idx(nx, lavaY)] !== T.EMPTY
      ) {
        map[idx(nx, lavaY)] = T.LAVA_TILE;
      }
    }
  }

  // LAVA_TUBE fast-travel horizontal tunnels: depth 60-130m
  // Direct placement instead of 7600-iteration probability loop
  const tubeCount = 12 + Math.floor(Math.random() * 6);
  for (let ti = 0; ti < tubeCount; ti++) {
    const ltY = 65 + Math.floor(Math.random() * 65); // depth 60-130m
    const ltX = 1 + Math.floor(Math.random() * (MAP_W - 20));
    const ltLen = 12 + Math.floor(Math.random() * 7);
    // Only place if there's solid ground above and below to carve into
    let canPlace = true;
    for (let li = 0; li < ltLen; li++) {
      const nx = ltX + li;
      if (nx < 0 || nx >= MAP_W || ltY < 0 || ltY >= MAP_H) {
        canPlace = false;
        break;
      }
      if (
        map[idx(nx, ltY)] === T.EMPTY ||
        map[idx(nx, ltY)] === T.BOB_GENESIS
      ) {
        canPlace = false;
        break;
      }
    }
    if (canPlace) {
      for (let li = 0; li < ltLen; li++) {
        map[idx(ltX + li, ltY)] = T.LAVA_TUBE;
      }
    }
  }

  // CRYSTAL_WALL cave biomes: 3-4 clusters between depth 90-140m
  const crystalCaves = 3 + Math.floor(Math.random() * 2);
  for (let cc = 0; cc < crystalCaves; cc++) {
    const ccY = Math.floor(95 + Math.random() * 45); // depth 90-140m
    const ccX = Math.floor(5 + Math.random() * (MAP_W - 14));
    for (let dy2 = 0; dy2 < 6; dy2++) {
      for (let dx2 = 0; dx2 < 8; dx2++) {
        const tx2 = ccX + dx2;
        const ty2 = ccY + dy2;
        if (
          tx2 >= 0 &&
          tx2 < MAP_W &&
          ty2 >= 0 &&
          ty2 < MAP_H &&
          map[idx(tx2, ty2)] === T.STONE
        ) {
          map[idx(tx2, ty2)] = T.CRYSTAL_WALL;
        }
      }
    }
  }

  map[idx(Math.floor(MAP_W / 2), MAP_H - 2)] = T.BOB_GENESIS;
  for (let x = 0; x < MAP_W; x++) map[idx(x, 5)] = T.DIRT;

  // Lore rooms: horizontal chambers 5-wide, 3-tall, at least 15 tiles off center
  const ORE_TIERS2 = [
    T.BOB_DUST,
    T.BOB_FLECK,
    T.BOB_FRAGMENT,
    T.BOB_SHARD,
    T.BOB_CHIP,
    T.BOB_CRYSTAL,
    T.BOB_CORE,
    T.BOB_INGOT,
    T.BOB_VEIN,
    T.BOB_SEAM,
    T.NNS_TOKEN,
    T.CHAIN_FUSION,
    T.DRAGGINZ_SCALE,
    T.SERAPH_TOKEN,
    T.VOID_SHARD,
    T.DEGEN_CRYSTAL,
    T.QUANTUM_BOB,
  ];
  const numLoreRooms = 8 + Math.floor(Math.random() * 3);
  for (let lr = 0; lr < numLoreRooms; lr++) {
    const side = lr % 2 === 0 ? 1 : -1;
    const roomX =
      Math.floor(MAP_W / 2) + side * (15 + Math.floor(Math.random() * 18));
    const roomY = Math.floor(12 + Math.random() * (MAP_H - 55));
    if (roomX < 2 || roomX + 6 >= MAP_W) continue;
    const depth = roomY - 5;
    const oreIdx = Math.min(9, Math.floor(depth / 16));
    const lootTile = ORE_TIERS2[Math.min(9, oreIdx + 1)];
    // Carve the room
    for (let dy = 0; dy < 3; dy++)
      for (let dx = 0; dx < 5; dx++) {
        const tx2 = roomX + dx;
        const ty2 = roomY + dy;
        if (tx2 >= 0 && tx2 < MAP_W && ty2 >= 0 && ty2 < MAP_H)
          map[idx(tx2, ty2)] = T.EMPTY;
      }
    // Scatter ore on floor/ceiling edges
    for (let dx = -1; dx <= 5; dx++) {
      const nx1 = roomX + dx;
      const ny1 = roomY - 1;
      const nx2 = roomX + dx;
      const ny2 = roomY + 3;
      if (
        nx1 >= 0 &&
        nx1 < MAP_W &&
        ny1 >= 0 &&
        ny1 < MAP_H &&
        map[idx(nx1, ny1)] !== T.EMPTY
      )
        map[idx(nx1, ny1)] = lootTile;
      if (
        nx2 >= 0 &&
        nx2 < MAP_W &&
        ny2 >= 0 &&
        ny2 < MAP_H &&
        map[idx(nx2, ny2)] !== T.EMPTY
      )
        map[idx(nx2, ny2)] = lootTile;
    }
    // Place a LORE_ROOM marker at center of room (acts as interactable tile)
    const lrCx = roomX + 2;
    const lrCy = roomY + 1;
    if (lrCx >= 0 && lrCx < MAP_W && lrCy >= 0 && lrCy < MAP_H)
      map[idx(lrCx, lrCy)] = T.LORE_ROOM;
  }

  return map;
}

export function getTileColor(t: number, depth = 0): string {
  const d = Math.min(1, Math.max(0, depth / 150));
  switch (t) {
    case T.EMPTY:
      return "transparent";
    case T.DIRT: {
      const r = Math.round(0x5c + (0x3a - 0x5c) * d);
      const g = Math.round(0x3d + (0x25 - 0x3d) * d);
      const b = Math.round(0x1e + (0x10 - 0x1e) * d);
      return `rgb(${r},${g},${b})`;
    }
    case T.STONE: {
      const v = Math.round(0x4a + (0x25 - 0x4a) * d);
      return `rgb(${v},${v},${v})`;
    }
    case T.HARD_ROCK: {
      const v = Math.round(0x2a + (0x11 - 0x2a) * d);
      return `rgb(${v},${v},${v})`;
    }
    case T.LAVA_TILE:
      return "#ff4500";
    case T.CRYSTAL_WALL:
      return "#7c3aed";
    default:
      return RESOURCES[t]?.color ?? "#fff";
  }
}

export function getTileHardness(t: number): number {
  switch (t) {
    case T.DIRT:
      return 1.0;
    case T.STONE:
      return 1.8;
    case T.HARD_ROCK:
      return 4.0;
    case 30: // CAVE_IN
      return 4.0;
    case T.LAVA_TILE:
      return 999; // undrillable
    case T.CRYSTAL_WALL:
      return 1.8; // same as stone
    case T.LORE_ROOM:
      return 0.5; // easy to break through
    default:
      return RESOURCES[t]?.hardness ?? 1.0;
  }
}

export function getActiveSynergies(stats: PlayerStats): BuildPathKey[] {
  const active: BuildPathKey[] = [];
  for (const [k, path] of Object.entries(BUILD_PATHS) as [
    BuildPathKey,
    (typeof BUILD_PATHS)[BuildPathKey],
  ][]) {
    const count = (path.keys as readonly string[]).filter(
      (key) => (stats[key] ?? 0) >= 1,
    ).length;
    if (count >= 3) active.push(k);
  }
  return active;
}

export function initPlayer(): PlayerState {
  return {
    x: 3 * TILE,
    y: 5 * TILE - (TILE - 2),
    vx: 0,
    vy: 0,
    onGround: true,
    drilling: null,
    cargo: [],
    facingRight: true,
    fallFrom: 5 * TILE - (TILE - 2),
    stats: {
      hull: 100,
      maxHull: 100,
      fuel: 100,
      maxFuel: 100,
      cargoWeight: 0,
      maxCargo: 50,
      bob: 0,
      drillLevel: 0,
      engineLevel: 0,
      hullLevel: 0,
      fuelLevel: 0,
      cargoLevel: 0,
      shieldLevel: 0,
      radarLevel: 0,
      thrusterLevel: 0,
      coolantLevel: 0,
      sonarCount: 0,
      chargesCount: 0,
      surfaceCallCount: 0,
      refinementKitCount: 0,
    },
  };
}

export function cargoTotalValue(cargo: CargoItem[]): number {
  return cargo.reduce(
    (sum, c) => sum + (RESOURCES[c.tile]?.value ?? 0) * c.count,
    0,
  );
}

export function getDepthZone(depth: number): string {
  if (depth < 15) return "DOM'S DOMAIN";
  if (depth < 40) return "CYCLE BELT";
  if (depth < 70) return "NNS DEPTHS";
  if (depth < 100) return "BANFIELD TERRITORY";
  if (depth < 125) return "SNS STRATA";
  if (depth < 145) return "SINGULARITY CORE";
  return "ORIGIN CORE";
}

export function getCachedTileColor(t: number, depth: number): string {
  const key = t * 256 + Math.min(255, Math.max(0, Math.floor(depth / 0.6)));
  let c = TILE_COLOR_CACHE.get(key);
  if (!c) {
    c = getTileColor(t, depth);
    TILE_COLOR_CACHE.set(key, c);
  }
  return c;
}
