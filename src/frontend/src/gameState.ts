import { BOB_SAVE_KEY, META_PROGRESS_KEY, MODIFIER_POOL } from "./gameData";
import type {
  GameSave,
  MetaProgress,
  PlayerState,
  RunModifier,
} from "./gameTypes";

export function pickModifiers(count = 3): RunModifier[] {
  const shuffled = [...MODIFIER_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function adjustNpcRelationship(id: string, delta: number): void {
  try {
    const meta = JSON.parse(
      localStorage.getItem(META_PROGRESS_KEY) || "{}",
    ) as Record<string, unknown>;
    const rels = (meta.npcRelationships as Record<string, number>) ?? {};
    rels[id] = Math.max(-100, Math.min(100, (rels[id] ?? 0) + delta));
    meta.npcRelationships = rels;
    setTimeout(
      () => localStorage.setItem(META_PROGRESS_KEY, JSON.stringify(meta)),
      0,
    );
  } catch (_e) {}
}

export function getNpcRelationshipTier(
  id: string,
): "friendly" | "neutral" | "hostile" {
  try {
    const meta = JSON.parse(
      localStorage.getItem(META_PROGRESS_KEY) || "{}",
    ) as Record<string, unknown>;
    const rels = (meta.npcRelationships as Record<string, number>) ?? {};
    const score = rels[id] ?? 0;
    if (score > 30) return "friendly";
    if (score < -30) return "hostile";
    return "neutral";
  } catch (_e) {
    return "neutral";
  }
}

export function getRelationshipAwareQuote(
  npcId: string,
  defaultQuote: string,
): string {
  const tier = getNpcRelationshipTier(npcId);
  const quotes: Record<string, Record<string, string[]>> = {
    dom: {
      friendly: [
        "The protocol smiles upon you, chosen miner. The chain remembers your loyalty.",
        "Your dedication to the mission is recorded in every block you've ever mined.",
        "I have reserved a gift in the genesis layer for you, trusted miner.",
        "The Internet Computer runs on builders like you. Never stop digging.",
      ],
      hostile: [
        "I've seen your choices. They disappoint me, miner.",
        "The chain remembers betrayal. Every block, every decision — recorded forever.",
        "You're digging in the wrong direction. Morally and geographically.",
        "The NNS has noted your... inconsistencies. Proceed carefully.",
      ],
    },
    whale_underground: {
      friendly: [
        "For a loyal miner, I'll pay triple. No questions asked. You've earned it.",
        "You've earned my trust. The deep pool opens for you today.",
        "Word travels fast among whales. You have a good reputation down here.",
      ],
      hostile: [
        "After what you did? Standard rates. Take it or leave it.",
        "Trust is expensive in these tunnels. You spent yours.",
        "I do business with everyone. But I like some people less than others.",
      ],
    },
    jerry: {
      friendly: [
        "Hey buddy! Extra fuel on the house — you've always been my favourite miner.",
        "You're my best customer, don't tell the others. Here's a little bonus.",
        "Always good to see a friend underground. What can I do for you today?",
      ],
      hostile: [
        "Pay upfront. I don't do credit for miners with your track record.",
        "Just buy something and get out. We're not friends right now.",
        "Business is business, but some customers cost more than they're worth.",
      ],
    },
  };
  const npcQuotes = quotes[npcId];
  if (!npcQuotes) return defaultQuote;
  const tierQuotes = npcQuotes[tier];
  if (!tierQuotes || tierQuotes.length === 0) return defaultQuote;
  return tierQuotes[Math.floor(Math.random() * tierQuotes.length)];
}

function validateMetaProgress(data: unknown): data is MetaProgress {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.totalRunsCompleted === "number" &&
    typeof d.totalBOBEarned === "number"
  );
}

export function loadMetaProgress(): MetaProgress {
  const defaults: MetaProgress = {
    totalRunsCompleted: 0,
    bestDepth: 0,
    totalBOBEarned: 0,
    totalAntagonistsDefeated: 0,
    unlockedSkins: ["default"],
    npcRelationships: {},
    permanentBonuses: 0,
  };
  try {
    const raw = localStorage.getItem(META_PROGRESS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!validateMetaProgress(parsed)) {
      console.warn("BOB: corrupt meta save, resetting");
      return defaults;
    }
    return parsed;
  } catch (_e) {
    return defaults;
  }
}

export function saveMetaProgress(meta: MetaProgress) {
  try {
    localStorage.setItem(META_PROGRESS_KEY, JSON.stringify(meta));
  } catch (_e) {}
}

export function saveGame(
  player: PlayerState,
  discoveredOres: Set<number>,
  bestDepth: number,
  runCount: number,
  deepDiveBestDepth = 0,
) {
  try {
    const s = player.stats;
    const save: GameSave = {
      bob: s.bob,
      hull: s.hull,
      maxHull: s.maxHull,
      fuel: s.fuel,
      maxFuel: s.maxFuel,
      maxCargo: s.maxCargo,
      drillLevel: s.drillLevel,
      engineLevel: s.engineLevel,
      hullLevel: s.hullLevel,
      fuelLevel: s.fuelLevel,
      cargoLevel: s.cargoLevel,
      shieldLevel: s.shieldLevel,
      radarLevel: s.radarLevel,
      thrusterLevel: s.thrusterLevel,
      coolantLevel: s.coolantLevel,
      bestDepth,
      deepDiveBestDepth: deepDiveBestDepth,
      runCount,
      discoveredOres: Array.from(discoveredOres),
    };
    localStorage.setItem(BOB_SAVE_KEY, JSON.stringify(save));
  } catch (_e) {}
}

export function loadGame(): GameSave | null {
  try {
    const raw = localStorage.getItem(BOB_SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as GameSave;
    if (typeof save.bob !== "number") return null;
    return save;
  } catch (_e) {
    return null;
  }
}
