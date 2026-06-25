// ─── Game Types ──────────────────────────────────────────────────────────────
// Extracted from App.tsx for modularization

export interface RunModifier {
  id: string;
  label: string;
  description: string;
  effect: string;
}

export type TileType = number;

export interface Resource {
  name: string;
  era?: string;
  value: number;
  weight: number;
  color: string;
  hardness: number;
  depth: number;
}

export interface CargoItem {
  tile: TileType;
  count: number;
}

export interface MetaProgress {
  totalRunsCompleted: number;
  bestDepth: number;
  bestBobInOneRun?: number;
  totalBOBEarned: number;
  totalAntagonistsDefeated: number;
  unlockedSkins: string[];
  runsReaching100m?: number;
  totalQuestsCompleted?: number;
  deepDiveWins?: number;
  totalOreTypesEverCollected?: number;
  newMilestoneUnlocked?: string;
  whaleBetrayed?: boolean;
  runHistory?: Array<{
    bob: number;
    depth: number;
    date: string;
    won?: boolean;
    modifier?: string | null;
  }>;
  npcRelationships?: Record<string, number>;
  permanentBonuses?: number;
  veteranSellBonus?: number;
}

export interface GameSave {
  bob: number;
  hull: number;
  maxHull: number;
  fuel: number;
  maxFuel: number;
  maxCargo: number;
  drillLevel: number;
  engineLevel: number;
  hullLevel: number;
  fuelLevel: number;
  cargoLevel: number;
  shieldLevel: number;
  radarLevel: number;
  thrusterLevel: number;
  coolantLevel: number;
  bestDepth: number;
  deepDiveBestDepth?: number;
  runCount: number;
  discoveredOres: number[];
}

export interface PlayerStats {
  hull: number;
  maxHull: number;
  fuel: number;
  maxFuel: number;
  cargoWeight: number;
  maxCargo: number;
  bob: number;
  drillLevel: number;
  engineLevel: number;
  hullLevel: number;
  fuelLevel: number;
  cargoLevel: number;
  shieldLevel: number;
  radarLevel: number;
  thrusterLevel: number;
  coolantLevel: number;
  sonarCount: number;
  chargesCount: number;
  surfaceCallCount: number;
  refinementKitCount: number;
  [key: string]: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  drilling: {
    dx: number;
    dy: number;
    progress: number;
    tile: { tx: number; ty: number };
  } | null;
  cargo: CargoItem[];
  stats: PlayerStats;
  facingRight: boolean;
  fallFrom: number;
}

export type Screen =
  | "title"
  | "game"
  | "win"
  | "gameover"
  | "leaderboard"
  | "codex"
  | "cutscene"
  | "summary";

export interface RunQuest {
  id: string;
  npcId: string;
  description: string;
  type:
    | "mine_ore"
    | "reach_depth"
    | "defeat_antagonists"
    | "cargo_value"
    | "find_lore_rooms"
    | "collect_ore_types"
    | "survive_earthquake"
    | "sell_trip_value"
    | "defeat_btc_maxi"
    | "ghost_miner_encounter";
  targetOre?: number;
  goal: number;
  progress: number;
  reward: string;
  completed: boolean;
}

export interface Score {
  name: string;
  bob: bigint;
  depth: bigint;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  alive: boolean;
}

export type BuildPathKey = "RUNNER" | "DIVER" | "PRO";

export interface Antagonist {
  id: number;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy?: number;
  hp: number;
  maxHp?: number;
  phase?: number;
  message: string;
  messageTimer: number;
  effectApplied: boolean;
  freezeTimer?: number;
  contactCooldown?: number;
  patrolDir?: number;
  patrolTimer?: number;
  rugHideTimer?: number;
  rugDashing?: boolean;
  isCharging?: boolean;
  revealed?: boolean;
  chargeStartTime?: number;
}

export interface ShopDeal {
  id: string;
  label: string;
  desc: string;
  cost: number;
}
