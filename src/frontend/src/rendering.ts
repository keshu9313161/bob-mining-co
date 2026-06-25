import {
  GLOWING_TILES,
  ORE_GLOW_COLORS,
  RESOURCES,
  SHOP_H,
  SHOP_W,
  T,
  TILE,
  TILE_COLOR_CACHE,
} from "./gameData";
import type { PlayerState } from "./gameTypes";
import { getTileColor } from "./mapGen";

// ─── Pixel Art Drawing Helpers ────────────────────────────────────────────────

export function drawDetailedTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileType: number,
  depth: number,
  frame: number,
) {
  const S = TILE;
  // ── Terrain tiles ──
  if (tileType === T.DIRT) {
    const d = Math.min(1, Math.max(0, depth / 150));
    const r = Math.round(0x6a + (0x38 - 0x6a) * d);
    const g = Math.round(0x42 + (0x22 - 0x42) * d);
    const b = Math.round(0x1a + (0x0c - 0x1a) * d);
    // Vary slightly per tile
    const vr = ((sx * 7 + sy * 13) % 12) - 6;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + vr))},${Math.max(0, Math.min(255, g + vr / 2))},${Math.max(0, Math.min(255, b))})`;
    ctx.fillRect(sx, sy, S, S);
    // Pebbles - mixed 1px and 2px
    const dark = `rgb(${Math.max(0, r - 28)},${Math.max(0, g - 18)},${Math.max(0, b - 6)})`;
    ctx.fillStyle = dark;
    ctx.fillRect(sx + 5, sy + 6, 3, 3);
    ctx.fillRect(sx + 19, sy + 21, 2, 2);
    ctx.fillRect(sx + 27, sy + 9, 3, 3);
    ctx.fillRect(sx + 11, sy + 25, 2, 2);
    ctx.fillRect(sx + 23, sy + 17, 1, 1);
    ctx.fillRect(sx + 8, sy + 15, 1, 1);
    // Root lines (seeded by tile position)
    const rootY = ((sx * 3 + sy * 5) % 16) + 4;
    ctx.fillStyle = `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 28)},0,0.55)`;
    ctx.fillRect(sx + 13, sy + rootY, 1, 7);
    ctx.fillRect(sx + 13, sy + rootY + 3, 4, 1);
    ctx.fillRect(sx + 21, sy + rootY + 6, 1, 5);
    // Highlight edge top-left
    ctx.fillStyle = "rgba(255,200,100,0.07)";
    ctx.fillRect(sx, sy, S, 2);
    ctx.fillRect(sx, sy, 2, S);
    // Darker bottom-right shadow
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(sx, sy + S - 2, S, 2);
    ctx.fillRect(sx + S - 2, sy, 2, S);
    return;
  }
  if (tileType === T.STONE) {
    const d = Math.min(1, Math.max(0, depth / 150));
    const v = Math.round(0x52 + (0x28 - 0x52) * d);
    const vv = ((sx * 11 + sy * 7) % 10) - 5;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, v + vv))},${Math.max(0, Math.min(255, v + vv))},${Math.max(0, Math.min(255, v + vv + 4))})`;
    ctx.fillRect(sx, sy, S, S);
    // Diagonal mineral streaks (stair-step approximation)
    ctx.fillStyle = "rgba(180,180,200,0.12)";
    for (let i = 0; i < 3; i++) {
      const ox = ((sx * 3 + sy * 7 + i * 11) % (S - 8)) + 2;
      const oy = ((sx * 5 + sy * 3 + i * 7) % (S - 8)) + 2;
      ctx.fillRect(sx + ox, sy + oy, 1, 1);
      ctx.fillRect(sx + ox + 1, sy + oy + 1, 1, 1);
      ctx.fillRect(sx + ox + 2, sy + oy + 2, 1, 1);
      ctx.fillRect(sx + ox + 3, sy + oy + 3, 1, 1);
    }
    // Crack pattern from corner
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(sx + 4, sy + 3, 1, 11);
    ctx.fillRect(sx + 5, sy + 13, 9, 1);
    ctx.fillRect(sx + 22, sy + 9, 1, 13);
    ctx.fillRect(sx + 14, sy + 21, 8, 1);
    ctx.fillRect(sx + 9, sy + 6, 1, 5);
    ctx.fillRect(sx + 10, sy + 11, 5, 1);
    // Highlight face
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(sx + 2, sy + 2, S - 4, 2);
    ctx.fillRect(sx + 2, sy + 2, 2, S - 4);
    // Shadow opposite
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(sx, sy + S - 3, S, 3);
    ctx.fillRect(sx + S - 3, sy, 3, S);
    return;
  }
  if (tileType === T.HARD_ROCK) {
    const d = Math.min(1, Math.max(0, depth / 150));
    const v = Math.round(0x2c + (0x12 - 0x2c) * d);
    // Deep rocks shift slightly blue-grey
    const bShift = depth > 120 ? 8 : 0;
    ctx.fillStyle = `rgb(${Math.max(0, v - 2)},${Math.max(0, v - 2)},${Math.max(0, v + bShift)})`;
    ctx.fillRect(sx, sy, S, S);
    // Crystalline inclusions
    ctx.fillStyle = "rgba(165,180,252,0.20)";
    ctx.fillRect(sx + 5, sy + 5, 2, 2);
    ctx.fillRect(sx + 7, sy + 5, 1, 1);
    ctx.fillRect(sx + 22, sy + 16, 2, 2);
    ctx.fillRect(sx + 24, sy + 14, 1, 1);
    ctx.fillRect(sx + 13, sy + 24, 2, 2);
    // Crack network
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(sx + 3, sy + 4, 1, 14);
    ctx.fillRect(sx + 4, sy + 17, 8, 1);
    ctx.fillRect(sx + 19, sy + 5, 1, 10);
    ctx.fillRect(sx + 15, sy + 5, 5, 1);
    ctx.fillRect(sx + 19, sy + 14, 6, 1);
    ctx.fillRect(sx + 8, sy + 20, 1, 9);
    // Angular veins
    ctx.fillStyle = "rgba(140,140,180,0.14)";
    ctx.fillRect(sx + 5, sy + 5, 1, 12);
    ctx.fillRect(sx + 6, sy + 5, 8, 1);
    ctx.fillRect(sx + 21, sy + 15, 1, 9);
    ctx.fillRect(sx + 18, sy + 15, 4, 1);
    // Dark border
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx, sy, S, 2);
    ctx.fillRect(sx, sy, 2, S);
    return;
  }

  // ── LAVA_TUBE tile — glowing orange fast-travel tunnel ──
  if (tileType === T.LAVA_TUBE) {
    const shimmer = 0.25 + 0.15 * Math.sin(frame * 0.08 + sx * 0.1);
    // Dark tunnel interior
    ctx.fillStyle = "#1a0800";
    ctx.fillRect(sx, sy, S, S);
    // Amber/orange floor glow
    ctx.fillStyle = `rgba(255,100,0,${0.2 + shimmer})`;
    ctx.fillRect(sx, sy, S, S);
    // Orange glowing edges
    ctx.fillStyle = "#cc4400";
    ctx.fillRect(sx, sy, S, 2); // top edge
    ctx.fillRect(sx, sy + S - 2, S, 2); // bottom edge
    // Bright amber shimmer spots
    ctx.fillStyle = `rgba(255,200,0,${shimmer * 2.0})`;
    const shimX = ((frame * 2 + sx) % (S * 3)) - S;
    if (shimX >= 0 && shimX < S) {
      ctx.fillRect(sx + shimX, sy + 4, 3, S - 8);
    }
    // Hot spots
    ctx.fillStyle = `rgba(255,220,80,${0.6 + shimmer})`;
    ctx.fillRect(sx + 4, sy + S / 2 - 2, 4, 4);
    ctx.fillRect(sx + S - 8, sy + S / 2 - 2, 4, 4);
    // Center glow
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#ff6600";
    ctx.fillStyle = `rgba(255,100,0,${shimmer * 1.2})`;
    ctx.fillRect(sx + 6, sy + 4, S - 12, S - 8);
    ctx.shadowBlur = 0;
    return;
  }

  // ── LORE_ROOM tile — glowing carved stone archway ──
  if (tileType === T.LORE_ROOM) {
    const glow = 0.15 + 0.08 * Math.sin(frame * 0.05);
    // Base dark stone
    ctx.fillStyle = "#2d1a0a";
    ctx.fillRect(sx, sy, S, S);
    // Arch border pixels (amber stone frame)
    ctx.fillStyle = "#b07020";
    // Arch top horizontal bar
    ctx.fillRect(sx + 4, sy + 4, S - 8, 2);
    // Left upright
    ctx.fillRect(sx + 4, sy + 4, 2, S - 10);
    // Right upright
    ctx.fillRect(sx + S - 6, sy + 4, 2, S - 10);
    // Arch bottom threshold
    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(sx + 6, sy + S - 5, S - 12, 5);
    // Inner arch glow fill
    ctx.fillStyle = `rgba(255,180,30,${glow})`;
    ctx.fillRect(sx + 6, sy + 6, S - 12, S - 16);
    // Corner blocks
    ctx.fillStyle = "#8a5010";
    ctx.fillRect(sx + 4, sy + 4, 3, 3);
    ctx.fillRect(sx + S - 7, sy + 4, 3, 3);
    // Two small gem/eye shapes on arch sides
    ctx.fillStyle = "#f5c542";
    ctx.fillRect(sx + 8, sy + 8, 3, 3);
    ctx.fillRect(sx + S - 11, sy + 8, 3, 3);
    // Inner bright gem highlight
    ctx.fillStyle = "#ffe066";
    ctx.fillRect(sx + 9, sy + 9, 1, 1);
    ctx.fillRect(sx + S - 10, sy + 9, 1, 1);
    // Faint inner keyhole shape
    ctx.fillStyle = `rgba(255,200,60,${glow * 1.5})`;
    ctx.fillRect(sx + S / 2 - 2, sy + 10, 4, 8);
    ctx.fillRect(sx + S / 2 - 3, sy + 16, 6, 4);
    // Subtle edge highlight
    ctx.fillStyle = "rgba(255,180,30,0.12)";
    ctx.fillRect(sx, sy, S, 2);
    ctx.fillRect(sx, sy, 2, S);
    return;
  }

  // ── Ore tiles ──
  const res = RESOURCES[tileType];
  if (!res) return;

  // Dark ore cavity background
  ctx.fillStyle = "#0d0804";
  ctx.fillRect(sx, sy, S, S);
  // Slight cavity texture
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);

  // Ore name label above sprite (small, faint)
  // Draw the ore sprite
  switch (tileType) {
    case T.BOB_DUST: {
      // Dom's Dust — DFINITY-inspired golden dust
      // Glow halo
      ctx.shadowBlur = 10 + 4 * Math.sin(frame * 0.06);
      ctx.shadowColor = "#fbbf24";
      // Dark background
      ctx.fillStyle = "#12090000";
      // Gold ring (DFINITY circle motif)
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(sx + 8, sy + 4, 16, 2); // top arc
      ctx.fillRect(sx + 4, sy + 8, 2, 16); // left
      ctx.fillRect(sx + 26, sy + 8, 2, 16); // right
      ctx.fillRect(sx + 8, sy + 26, 16, 2); // bottom
      ctx.fillRect(sx + 6, sy + 5, 2, 3);
      ctx.fillRect(sx + 24, sy + 5, 2, 3); // corners
      ctx.fillRect(sx + 6, sy + 24, 2, 3);
      ctx.fillRect(sx + 24, sy + 24, 2, 3);
      // Bright gold inner ring
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(sx + 11, sy + 8, 10, 2);
      ctx.fillRect(sx + 8, sy + 11, 2, 10);
      ctx.fillRect(sx + 22, sy + 11, 2, 10);
      ctx.fillRect(sx + 11, sy + 22, 10, 2);
      // Infinity-style fill inside
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(sx + 10, sy + 10, 5, 5);
      ctx.fillRect(sx + 17, sy + 17, 5, 5);
      // Sparkle dots
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 3, sy + 3, 2, 2);
      ctx.fillRect(sx + 27, sy + 3, 2, 2);
      ctx.fillRect(sx + 3, sy + 27, 2, 2);
      ctx.fillRect(sx + 15, sy + 14, 2, 2);
      // Depth shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(sx, sy + S - 3, S, 3);
      // Extra sparkle specks
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,230,100,0.7)";
      ctx.fillRect(sx + 9, sy + 17, 2, 2);
      ctx.fillRect(sx + 20, sy + 11, 1, 1);
      ctx.fillRect(sx + 6, sy + 22, 1, 1);
      break;
    }
    case T.BOB_FLECK: {
      // Cycle Shard — cyan crystal cluster
      ctx.shadowBlur = 10 + 4 * Math.sin(frame * 0.07);
      ctx.shadowColor = "#22d3ee";
      // Glow bg
      ctx.fillStyle = "rgba(34,211,238,0.1)";
      ctx.fillRect(sx + 4, sy + 4, S - 8, S - 8);
      // Center tall shard
      ctx.fillStyle = "#0891b2"; // shadow edge
      ctx.fillRect(sx + 13, sy + 5, 6, 20);
      ctx.fillStyle = "#22d3ee"; // main
      ctx.fillRect(sx + 14, sy + 4, 4, 18);
      ctx.fillStyle = "#e0f7ff"; // highlight edge
      ctx.fillRect(sx + 14, sy + 4, 2, 16);
      // Left shard
      ctx.fillStyle = "#0891b2";
      ctx.fillRect(sx + 6, sy + 10, 5, 14);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(sx + 7, sy + 9, 4, 13);
      ctx.fillStyle = "#e0f7ff";
      ctx.fillRect(sx + 7, sy + 9, 2, 11);
      // Right shard
      ctx.fillStyle = "#0891b2";
      ctx.fillRect(sx + 21, sy + 12, 5, 12);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(sx + 21, sy + 11, 4, 11);
      ctx.fillStyle = "#e0f7ff";
      ctx.fillRect(sx + 21, sy + 11, 2, 9);
      // Spark tips
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 15, sy + 3, 2, 2);
      ctx.fillRect(sx + 8, sy + 7, 2, 2);
      ctx.fillRect(sx + 22, sy + 10, 2, 2);
      // Base
      ctx.fillStyle = "#164e63";
      ctx.fillRect(sx + 6, sy + 24, 20, 4);
      // Detail specks
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(224,247,255,0.6)";
      ctx.fillRect(sx + 11, sy + 19, 1, 1);
      ctx.fillRect(sx + 19, sy + 15, 1, 1);
      ctx.fillRect(sx + 24, sy + 20, 1, 1);
      break;
    }
    case T.BOB_FRAGMENT: {
      // NNS Nugget — governance hexagon
      ctx.shadowBlur = 10 + 3 * Math.sin(frame * 0.05);
      ctx.shadowColor = "#3b82f6";
      // Hex outline (approximated with rects)
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(sx + 10, sy + 5, 12, 3); // top
      ctx.fillRect(sx + 5, sy + 9, 4, 14); // left
      ctx.fillRect(sx + 23, sy + 9, 4, 14); // right
      ctx.fillRect(sx + 10, sy + 24, 12, 3); // bottom
      ctx.fillRect(sx + 7, sy + 7, 3, 3); // top-left corner
      ctx.fillRect(sx + 22, sy + 7, 3, 3); // top-right corner
      ctx.fillRect(sx + 7, sy + 22, 3, 3); // bot-left corner
      ctx.fillRect(sx + 22, sy + 22, 3, 3); // bot-right corner
      // Node dots inside (NNS neurons)
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 14, sy + 9, 4, 4); // top node
      ctx.fillRect(sx + 8, sy + 19, 4, 4); // left node
      ctx.fillRect(sx + 20, sy + 19, 4, 4); // right node
      // Connector lines
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(sx + 16, sy + 13, 2, 7); // top to center
      ctx.fillRect(sx + 10, sy + 21, 6, 2); // left-center
      ctx.fillRect(sx + 16, sy + 21, 6, 2); // center-right
      ctx.fillRect(sx + 14, sy + 19, 2, 2); // center dot
      // Center fill
      ctx.fillStyle = "rgba(59,130,246,0.3)";
      ctx.fillRect(sx + 9, sy + 9, 14, 14);
      // Detail specks
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(147,197,253,0.65)";
      ctx.fillRect(sx + 12, sy + 20, 2, 1);
      ctx.fillRect(sx + 20, sy + 12, 1, 2);
      ctx.fillRect(sx + 16, sy + 16, 1, 1);
      break;
    }
    case T.BOB_SHARD: {
      // Banfield Ore — camera lens (orange, streaming live)
      ctx.shadowBlur = 10 + 4 * Math.sin(frame * 0.06);
      ctx.shadowColor = "#f97316";
      // Outer ring
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(sx + 8, sy + 4, 16, 3); // top
      ctx.fillRect(sx + 3, sy + 8, 3, 16); // left
      ctx.fillRect(sx + 26, sy + 8, 3, 16); // right
      ctx.fillRect(sx + 8, sy + 25, 16, 3); // bottom
      ctx.fillRect(sx + 5, sy + 5, 3, 4);
      ctx.fillRect(sx + 24, sy + 5, 3, 4);
      ctx.fillRect(sx + 5, sy + 23, 3, 4);
      ctx.fillRect(sx + 24, sy + 23, 3, 4);
      // Bright ring
      ctx.fillStyle = "#f97316";
      ctx.fillRect(sx + 10, sy + 6, 12, 2);
      ctx.fillRect(sx + 6, sy + 10, 2, 12);
      ctx.fillRect(sx + 24, sy + 10, 2, 12);
      ctx.fillRect(sx + 10, sy + 24, 12, 2);
      // Aperture blades (4 dark shapes)
      ctx.fillStyle = "#1a0800";
      ctx.fillRect(sx + 14, sy + 10, 4, 6);
      ctx.fillRect(sx + 10, sy + 14, 6, 4);
      ctx.fillRect(sx + 18, sy + 14, 4, 4);
      ctx.fillRect(sx + 14, sy + 18, 4, 4);
      // Bright center glow
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(sx + 14, sy + 14, 4, 4);
      // YouTube-red REC indicator
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(sx + 9, sy + 27, 6, 3);
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 10, sy + 27, 1, 1);
      // Lens glare
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(sx + 11, sy + 8, 2, 2);
      // Detail specks
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(253,186,116,0.7)";
      ctx.fillRect(sx + 20, sy + 9, 2, 2);
      ctx.fillRect(sx + 8, sy + 20, 1, 1);
      ctx.fillRect(sx + 23, sy + 21, 1, 1);
      break;
    }
    case T.BOB_CHIP: {
      // Dragginz Crystal — faceted gem
      ctx.shadowBlur = 12 + 5 * Math.sin(frame * 0.07);
      ctx.shadowColor = "#a855f7";
      // Shadow base
      ctx.fillStyle = "#3b0764";
      ctx.fillRect(sx + 8, sy + 6, 16, 20);
      // Diamond outline
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(sx + 12, sy + 4, 8, 2); // top edge
      ctx.fillRect(sx + 4, sy + 12, 2, 8); // left
      ctx.fillRect(sx + 26, sy + 12, 2, 8); // right
      ctx.fillRect(sx + 12, sy + 26, 8, 2); // bottom
      ctx.fillRect(sx + 6, sy + 6, 6, 6); // top-left
      ctx.fillRect(sx + 20, sy + 6, 6, 6); // top-right
      ctx.fillRect(sx + 6, sy + 20, 6, 6); // bot-left
      ctx.fillRect(sx + 20, sy + 20, 6, 6); // bot-right
      // Top facet highlight
      ctx.fillStyle = "#e879f9";
      ctx.fillRect(sx + 12, sy + 6, 8, 8);
      // Middle facets
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(sx + 8, sy + 14, 16, 8);
      // Lower shadow section
      ctx.fillStyle = "#6d28d9";
      ctx.fillRect(sx + 10, sy + 22, 12, 4);
      // Internal facet lines
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(sx + 16, sy + 6, 1, 20);
      ctx.fillRect(sx + 8, sy + 16, 16, 1);
      // Sparkle
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 14, sy + 7, 2, 2);
      // Claw scratch marks on surrounding rock
      ctx.fillStyle = "#444";
      ctx.fillRect(sx + 2, sy + 8, 3, 1);
      ctx.fillRect(sx + 2, sy + 10, 4, 1);
      ctx.fillRect(sx + 27, sy + 14, 3, 1);
      ctx.fillRect(sx + 26, sy + 16, 4, 1);
      // Detail specks
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(232,121,249,0.75)";
      ctx.fillRect(sx + 10, sy + 18, 2, 1);
      ctx.fillRect(sx + 20, sy + 10, 1, 2);
      ctx.fillRect(sx + 18, sy + 22, 1, 1);
      break;
    }
    case T.BOB_CRYSTAL: {
      // ckBTC Chunk — Bitcoin symbol embedded in amber ore
      ctx.shadowBlur = 10 + 5 * Math.sin(frame * 0.06);
      ctx.shadowColor = "#f59e0b";
      // Ore chunk irregular shape
      ctx.fillStyle = "#92400e";
      ctx.fillRect(sx + 3, sy + 8, S - 6, S - 12);
      ctx.fillRect(sx + 6, sy + 5, S - 12, S - 10);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(sx + 5, sy + 7, S - 10, S - 12);
      // Top highlight face
      ctx.fillStyle = "#d97706";
      ctx.fillRect(sx + 6, sy + 6, S - 12, 6);
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(sx + 7, sy + 6, 5, 3); // warm highlight
      // Chain-link border
      ctx.fillStyle = "#b45309";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(sx + 2 + i * 5, sy + 2, 3, 2);
        ctx.fillRect(sx + 2 + i * 5, sy + S - 4, 3, 2);
      }
      ctx.fillStyle = "#fbbf24";
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(sx + 2, sy + 2 + i * 5, 2, 3);
        ctx.fillRect(sx + S - 4, sy + 2 + i * 5, 2, 3);
      }
      // Bitcoin ₿ symbol in center
      ctx.fillStyle = "#1a0e00";
      ctx.fillRect(sx + 13, sy + 8, 3, 16); // vertical bar
      ctx.fillRect(sx + 16, sy + 8, 6, 3); // top serif
      ctx.fillRect(sx + 16, sy + 14, 6, 3); // mid serif
      ctx.fillRect(sx + 16, sy + 21, 6, 3); // bottom serif
      ctx.fillRect(sx + 22, sy + 10, 3, 3); // top bump
      ctx.fillRect(sx + 22, sy + 17, 3, 3); // bot bump
      // Amber glow
      ctx.fillStyle = "rgba(245,158,11,0.2)";
      ctx.fillRect(sx + 4, sy + 4, S - 8, S - 8);
      ctx.shadowBlur = 0;
      break;
    }
    case T.BOB_CORE: {
      // SNS Sliver — circuit board DAO tile
      const corePulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      ctx.shadowBlur = 8 + 4 * corePulse;
      ctx.shadowColor = "#22c55e";
      // Red circuit board background
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(sx + 3, sy + 3, S - 6, S - 6);
      // Circuit trace lines (H + V paths)
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(sx + 4, sy + 8, 24, 1); // H trace top
      ctx.fillRect(sx + 4, sy + 16, 24, 1); // H trace mid
      ctx.fillRect(sx + 4, sy + 24, 18, 1); // H trace bot
      ctx.fillRect(sx + 8, sy + 4, 1, 24); // V trace left
      ctx.fillRect(sx + 16, sy + 4, 1, 10); // V trace mid-top
      ctx.fillRect(sx + 16, sy + 16, 1, 12); // V trace mid-bot
      ctx.fillRect(sx + 24, sy + 8, 1, 16); // V trace right
      ctx.fillRect(sx + 4, sy + 8, 4, 8); // L corner
      ctx.fillRect(sx + 22, sy + 16, 2, 8); // L corner 2
      // LED dots (3 green LEDs)
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(sx + 7, sy + 7, 3, 3);
      ctx.fillRect(sx + 15, sy + 15, 3, 3);
      ctx.fillRect(sx + 23, sy + 23, 3, 3);
      // LED glow
      ctx.fillStyle = "rgba(34,197,94,0.3)";
      ctx.fillRect(sx + 5, sy + 5, 7, 7);
      ctx.fillRect(sx + 13, sy + 13, 7, 7);
      // Chip in center
      ctx.fillStyle = "#555";
      ctx.fillRect(sx + 12, sy + 10, 8, 8);
      ctx.fillStyle = "#888";
      ctx.fillRect(sx + 13, sy + 11, 6, 6);
      // Chip pin stubs
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(sx + 11, sy + 12, 2, 1);
      ctx.fillRect(sx + 11, sy + 15, 2, 1);
      ctx.fillRect(sx + 21, sy + 12, 2, 1);
      ctx.fillRect(sx + 21, sy + 15, 2, 1);
      ctx.shadowBlur = 0;
      break;
    }
    case T.BOB_INGOT: {
      // OpenChat Ore — large chat bubble
      const ingotPulse = 0.5 + 0.5 * Math.sin(frame * 0.07);
      ctx.shadowBlur = 9 + 4 * ingotPulse;
      ctx.shadowColor = "#22c55e";
      // Chat bubble (rectangle with tail)
      ctx.fillStyle = "#166534";
      ctx.fillRect(sx + 3, sy + 4, 26, 18);
      ctx.fillStyle = "#15803d";
      ctx.fillRect(sx + 4, sy + 5, 24, 16);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(sx + 5, sy + 6, 22, 14);
      // Bubble tail (bottom-left)
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(sx + 5, sy + 20, 8, 3);
      ctx.fillRect(sx + 5, sy + 23, 5, 2);
      ctx.fillRect(sx + 5, sy + 25, 3, 2);
      // Text lines inside bubble
      ctx.fillStyle = "#bbf7d0";
      ctx.fillRect(sx + 8, sy + 10, 8, 2);
      ctx.fillRect(sx + 8, sy + 14, 14, 2);
      ctx.fillRect(sx + 8, sy + 18, 6, 2);
      // WiFi signal bars (top-right of bubble)
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 20, sy + 8, 2, 2);
      ctx.fillRect(sx + 22, sy + 7, 2, 3);
      ctx.fillRect(sx + 24, sy + 6, 2, 4);
      // Notification dot
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(sx + 25, sy + 5, 4, 4);
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 26, sy + 6, 2, 2);
      ctx.shadowBlur = 0;
      break;
    }
    case T.BOB_VEIN: {
      // BOB Seam — animated meme coin face
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      const coinR = Math.round(253);
      const coinG = Math.round(200 + 24 * pulse);
      const coinB = Math.round(40 + 10 * pulse);
      // Coin body
      ctx.fillStyle = `rgb(${coinR},${coinG},${coinB})`;
      ctx.fillRect(sx + 6, sy + 4, 20, 4); // top
      ctx.fillRect(sx + 4, sy + 8, 4, 16); // left
      ctx.fillRect(sx + 24, sy + 8, 4, 16); // right
      ctx.fillRect(sx + 6, sy + 24, 20, 4); // bottom
      ctx.fillRect(sx + 8, sy + 8, 16, 16); // fill
      // Crown on top
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(sx + 10, sy + 2, 4, 3); // left spike
      ctx.fillRect(sx + 14, sy + 1, 4, 4); // center spike
      ctx.fillRect(sx + 18, sy + 2, 4, 3); // right spike
      ctx.fillRect(sx + 10, sy + 4, 12, 2); // crown base
      // Pixel eyes
      ctx.fillStyle = "#1a0800";
      ctx.fillRect(sx + 11, sy + 13, 3, 3);
      ctx.fillRect(sx + 18, sy + 13, 3, 3);
      // Pixel grin (curved row)
      ctx.fillRect(sx + 10, sy + 21, 12, 2);
      ctx.fillRect(sx + 10, sy + 19, 2, 2);
      ctx.fillRect(sx + 20, sy + 19, 2, 2);
      // Highlight arc top-left
      ctx.fillStyle = `rgba(255,255,200,${0.4 + 0.2 * pulse})`;
      ctx.fillRect(sx + 9, sy + 9, 6, 2);
      ctx.fillRect(sx + 9, sy + 11, 2, 4);
      break;
    }
    case T.BOB_SEAM: {
      // Singularity Seam — animated black hole
      const ang = (frame * 0.04) % (Math.PI * 2);
      // Near-black background
      ctx.fillStyle = "#07000f";
      ctx.fillRect(sx, sy, S, S);
      // Accretion disk ring (outer)
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(sx + 4, sy + 4, 24, 4);
      ctx.fillRect(sx + 4, sy + 24, 24, 4);
      ctx.fillRect(sx + 4, sy + 8, 4, 16);
      ctx.fillRect(sx + 24, sy + 8, 4, 16);
      // Inner accretion disk
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(sx + 8, sy + 8, 16, 3);
      ctx.fillRect(sx + 8, sy + 21, 16, 3);
      ctx.fillRect(sx + 8, sy + 11, 3, 10);
      ctx.fillRect(sx + 21, sy + 11, 3, 10);
      // Void center (dark)
      ctx.fillStyle = "#030008";
      ctx.fillRect(sx + 11, sy + 11, 10, 10);
      // Spiral arms (animated with frame)
      const armOffset = Math.floor(ang / (Math.PI / 2)) % 4;
      ctx.fillStyle = "#c084fc";
      if (armOffset === 0) {
        ctx.fillRect(sx + 11, sy + 9, 5, 2);
        ctx.fillRect(sx + 20, sy + 16, 5, 2);
      } else if (armOffset === 1) {
        ctx.fillRect(sx + 20, sy + 11, 2, 5);
        ctx.fillRect(sx + 11, sy + 20, 2, 5);
      } else if (armOffset === 2) {
        ctx.fillRect(sx + 16, sy + 9, 5, 2);
        ctx.fillRect(sx + 11, sy + 16, 5, 2);
      } else {
        ctx.fillRect(sx + 9, sy + 11, 2, 5);
        ctx.fillRect(sx + 20, sy + 20, 2, 5);
      }
      // Distortion flicker pixels
      const fl = frame % 7;
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 3 + fl, sy + fl, 1, 1);
      ctx.fillRect(sx + S - 4 - fl, sy + S - 2 - fl, 1, 1);
      ctx.fillRect(sx + fl * 2, sy + S - fl, 1, 1);
      break;
    }
    case T.NNS_TOKEN: {
      // NNS Token — deep purple crystal cluster
      const pulse2 = 0.5 + 0.5 * Math.sin(frame * 0.09 + sx * 0.1);
      ctx.fillStyle = "#1a0a2e";
      ctx.fillRect(sx, sy, S, S);
      // Crystal facets
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(sx + 4, sy + 4, 8, 20);
      ctx.fillRect(sx + 20, sy + 6, 8, 18);
      ctx.fillStyle = "#6d28d9";
      ctx.fillRect(sx + 10, sy + 2, 6, 24);
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(sx + 5, sy + 5, 4, 12);
      ctx.fillRect(sx + 21, sy + 8, 4, 10);
      ctx.fillRect(sx + 11, sy + 3, 4, 8);
      // Inner glow facets
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(sx + 11, sy + 4, 2, 4);
      ctx.fillRect(sx + 6, sy + 6, 2, 4);
      ctx.fillRect(sx + 22, sy + 9, 2, 4);
      // Glow pulse
      ctx.fillStyle = `rgba(167,139,250,${0.15 * pulse2})`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      // Sparkle dots
      if (frame % 4 < 2) {
        ctx.fillStyle = "#ede9fe";
        ctx.fillRect(sx + 13, sy + 5, 1, 1);
        ctx.fillRect(sx + 7, sy + 7, 1, 1);
        ctx.fillRect(sx + 23, sy + 10, 1, 1);
      }
      break;
    }
    case T.CHAIN_FUSION: {
      // Chain Fusion Shard — iridescent rainbow crystal
      const hue2 = (frame * 3 + sx + sy) % 360;
      ctx.fillStyle = "#0f0824";
      ctx.fillRect(sx, sy, S, S);
      // Outer frame iridescent
      ctx.fillStyle = `hsl(${hue2},90%,35%)`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, 4);
      ctx.fillRect(sx + 2, sy + S - 6, S - 4, 4);
      ctx.fillStyle = `hsl(${(hue2 + 60) % 360},90%,35%)`;
      ctx.fillRect(sx + 2, sy + 2, 4, S - 4);
      ctx.fillRect(sx + S - 6, sy + 2, 4, S - 4);
      // Central prismatic crystal
      ctx.fillStyle = `hsl(${(hue2 + 120) % 360},85%,50%)`;
      ctx.fillRect(sx + 8, sy + 4, 6, 24);
      ctx.fillStyle = `hsl(${(hue2 + 180) % 360},85%,50%)`;
      ctx.fillRect(sx + 14, sy + 6, 6, 20);
      ctx.fillStyle = `hsl(${(hue2 + 240) % 360},85%,55%)`;
      ctx.fillRect(sx + 20, sy + 4, 6, 24);
      // Chain links pixel art
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(sx + 6, sy + 12, 4, 2);
      ctx.fillRect(sx + 12, sy + 16, 4, 2);
      ctx.fillRect(sx + 18, sy + 12, 4, 2);
      // Shimmer
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(frame * 0.15)})`;
      ctx.fillRect(sx + 9, sy + 5, 2, 6);
      ctx.fillRect(sx + 21, sy + 5, 2, 6);
      break;
    }
    case T.DRAGGINZ_SCALE: {
      // Dragginz Scale — green-gold scaly texture
      const scaleShimmer = 0.5 + 0.5 * Math.sin(frame * 0.07 + sy * 0.05);
      ctx.fillStyle = "#051a0a";
      ctx.fillRect(sx, sy, S, S);
      // Scale pattern rows
      const scaleColors = ["#14532d", "#15803d", "#16a34a", "#22c55e"];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const offset = row % 2 === 0 ? 0 : 4;
          const ci = (row + col) % scaleColors.length;
          ctx.fillStyle = scaleColors[ci];
          ctx.fillRect(sx + 2 + col * 7 + offset, sy + 3 + row * 7, 6, 6);
          // Scale highlight
          ctx.fillStyle = "#4ade80";
          ctx.fillRect(sx + 2 + col * 7 + offset + 1, sy + 3 + row * 7, 2, 1);
        }
      }
      // Gold accent lines
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(sx + 1, sy + 1, S - 2, 2);
      ctx.fillRect(sx + 1, sy + S - 3, S - 2, 2);
      // Shimmer overlay
      ctx.fillStyle = `rgba(74,222,128,${0.12 * scaleShimmer})`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      // Eye-like gem dot
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(sx + 13, sy + 13, 3, 3);
      ctx.fillStyle = "#1a1a00";
      ctx.fillRect(sx + 14, sy + 14, 1, 1);
      break;
    }
    case T.BOB_GENESIS: {
      // BOB Genesis Block — ornate legendary artifact
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
      const hue = (frame * 2) % 360;
      ctx.shadowBlur = 22 * pulse;
      ctx.shadowColor = `hsl(${hue},100%,60%)`;
      // Triple nested border
      ctx.fillStyle = "#92400e";
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(sx + 4, sy + 4, S - 8, S - 8);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(sx + 6, sy + 6, S - 12, S - 12);
      // Gold shimmer
      ctx.fillStyle = `rgba(255,255,200,${0.3 * pulse})`;
      ctx.fillRect(sx + 6, sy + 6, S - 12, 5);
      // Pixel "BOB" (B-O-B in 3x5 style, squeezed into tile)
      ctx.fillStyle = "#1a0800";
      // B (left)
      ctx.fillRect(sx + 7, sy + 10, 2, 12);
      ctx.fillRect(sx + 9, sy + 10, 3, 2);
      ctx.fillRect(sx + 9, sy + 15, 3, 2);
      ctx.fillRect(sx + 9, sy + 20, 3, 2);
      ctx.fillRect(sx + 12, sy + 12, 1, 3);
      ctx.fillRect(sx + 12, sy + 17, 1, 3);
      // O (center)
      ctx.fillRect(sx + 14, sy + 10, 4, 2);
      ctx.fillRect(sx + 14, sy + 20, 4, 2);
      ctx.fillRect(sx + 13, sy + 12, 2, 8);
      ctx.fillRect(sx + 18, sy + 12, 2, 8);
      // B (right)
      ctx.fillRect(sx + 21, sy + 10, 2, 12);
      ctx.fillRect(sx + 23, sy + 10, 3, 2);
      ctx.fillRect(sx + 23, sy + 15, 3, 2);
      ctx.fillRect(sx + 23, sy + 20, 3, 2);
      ctx.fillRect(sx + 26, sy + 12, 1, 3);
      ctx.fillRect(sx + 26, sy + 17, 1, 3);
      // Corner gemstones
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 7, sy + 7, 3, 3);
      ctx.fillRect(sx + S - 10, sy + 7, 3, 3);
      ctx.fillRect(sx + 7, sy + S - 10, 3, 3);
      ctx.fillRect(sx + S - 10, sy + S - 10, 3, 3);
      ctx.shadowBlur = 0;
      break;
    }
    case T.SERAPH_TOKEN: {
      // Seraph Token — white/gold governance token with angelic glow
      const sAng = (frame * 0.05) % (Math.PI * 2);
      const sPulse = 0.5 + 0.5 * Math.sin(frame * 0.1);
      ctx.fillStyle = "#fffde7";
      ctx.fillRect(sx, sy, S, S);
      // Outer ring - gold
      ctx.fillStyle = "#d97706";
      ctx.fillRect(sx + 2, sy + 2, S - 4, 3);
      ctx.fillRect(sx + 2, sy + S - 5, S - 4, 3);
      ctx.fillRect(sx + 2, sy + 2, 3, S - 4);
      ctx.fillRect(sx + S - 5, sy + 2, 3, S - 4);
      // Inner token face - white shimmer
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx + 5, sy + 5, S - 10, S - 10);
      // Gold S-like symbol in center
      ctx.fillStyle = "#92400e";
      ctx.fillRect(sx + 10, sy + 8, 12, 3);
      ctx.fillRect(sx + 10, sy + 14, 12, 3);
      ctx.fillRect(sx + 10, sy + 20, 12, 3);
      ctx.fillRect(sx + 10, sy + 11, 4, 3);
      ctx.fillRect(sx + 18, sy + 17, 4, 3);
      // Angelic glow pulse
      ctx.fillStyle = `rgba(255,249,196,${0.35 * sPulse})`;
      ctx.fillRect(sx + 5, sy + 5, S - 10, S - 10);
      // Corner sparkles
      const sf = Math.floor(sAng / (Math.PI / 2)) % 4;
      ctx.fillStyle = "#fef08a";
      if (sf === 0) {
        ctx.fillRect(sx + 3, sy + 3, 2, 2);
        ctx.fillRect(sx + S - 5, sy + S - 5, 2, 2);
      } else if (sf === 1) {
        ctx.fillRect(sx + S - 5, sy + 3, 2, 2);
        ctx.fillRect(sx + 3, sy + S - 5, 2, 2);
      } else if (sf === 2) {
        ctx.fillRect(sx + 13, sy + 3, 2, 2);
        ctx.fillRect(sx + 13, sy + S - 5, 2, 2);
      } else {
        ctx.fillRect(sx + 3, sy + 13, 2, 2);
        ctx.fillRect(sx + S - 5, sy + 13, 2, 2);
      }
      break;
    }
    case T.VOID_SHARD: {
      // Void Shard — dark purple/black crystal with purple glow
      const vPulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      const vFrame = frame % 8;
      // Deep black background
      ctx.fillStyle = "#0a0010";
      ctx.fillRect(sx, sy, S, S);
      // Void crystal shapes - layered dark purple
      ctx.fillStyle = "#2e1065";
      ctx.fillRect(sx + 6, sy + 2, 8, 28);
      ctx.fillRect(sx + 14, sy + 4, 6, 24);
      ctx.fillRect(sx + 3, sy + 8, 5, 16);
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(sx + 7, sy + 4, 5, 20);
      ctx.fillRect(sx + 15, sy + 6, 4, 16);
      ctx.fillRect(sx + 4, sy + 10, 3, 12);
      // Purple inner glow facets
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(sx + 8, sy + 6, 3, 8);
      ctx.fillRect(sx + 16, sy + 8, 2, 6);
      // Bright purple shimmer at tips
      ctx.fillStyle = "#a855f7";
      ctx.fillRect(sx + 9, sy + 5, 2, 2);
      ctx.fillRect(sx + 16, sy + 7, 2, 2);
      ctx.fillRect(sx + 5, sy + 9, 2, 2);
      // Void distortion - random dark flicker
      ctx.fillStyle = "#000000";
      if (vFrame < 3) {
        ctx.fillRect(sx + 8 + vFrame, sy + 10 + vFrame, 1, 1);
      }
      // Purple glow overlay
      ctx.fillStyle = `rgba(124,58,237,${0.18 * vPulse})`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      // Tiny white distortion pixels
      ctx.fillStyle = "#e9d5ff";
      ctx.fillRect(sx + 10, sy + 12, 1, 1);
      ctx.fillRect(sx + 14, sy + 18, 1, 1);
      break;
    }
    case T.DEGEN_CRYSTAL: {
      // Degen Crystal — pink/magenta crystallized hopium
      const dPulse = 0.5 + 0.5 * Math.sin(frame * 0.12 + sx * 0.05);
      const dSpark = frame % 5;
      ctx.fillStyle = "#1a0015";
      ctx.fillRect(sx, sy, S, S);
      // Pink crystal columns
      ctx.fillStyle = "#9d174d";
      ctx.fillRect(sx + 4, sy + 2, 7, 28);
      ctx.fillRect(sx + 18, sy + 4, 7, 24);
      ctx.fillRect(sx + 11, sy + 6, 5, 20);
      // Magenta facets
      ctx.fillStyle = "#be185d";
      ctx.fillRect(sx + 5, sy + 4, 4, 20);
      ctx.fillRect(sx + 19, sy + 6, 4, 16);
      ctx.fillRect(sx + 12, sy + 8, 3, 12);
      // Bright pink highlights
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(sx + 6, sy + 5, 2, 6);
      ctx.fillRect(sx + 20, sy + 7, 2, 5);
      ctx.fillRect(sx + 13, sy + 9, 2, 4);
      // White shimmer tips
      ctx.fillStyle = "#fce7f3";
      ctx.fillRect(sx + 7, sy + 3, 2, 2);
      ctx.fillRect(sx + 21, sy + 5, 2, 2);
      // Hopium sparkle
      if (dSpark < 2) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx + 8, sy + 4, 1, 1);
        ctx.fillRect(sx + 22, sy + 6, 1, 1);
      }
      // Pink glow overlay
      ctx.fillStyle = `rgba(244,114,182,${0.2 * dPulse})`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      break;
    }
    case T.QUANTUM_BOB: {
      // Quantum BOB — purple/cyan superposition gem
      const qCycle = (frame * 0.08) % (Math.PI * 2);
      const qPulse = 0.5 + 0.5 * Math.sin(qCycle);
      const qInv = 1 - qPulse;
      // Alternating purple/cyan background
      const r = Math.floor(100 * qInv + 50 * qPulse);
      const g = Math.floor(20 * qInv + 180 * qPulse);
      const b = Math.floor(180 * qInv + 250 * qPulse);
      ctx.fillStyle = "#0a0015";
      ctx.fillRect(sx, sy, S, S);
      // Gem body — hexagonal-ish
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(sx + 8, sy + 2, 16, 4);
      ctx.fillRect(sx + 4, sy + 6, 24, 18);
      ctx.fillRect(sx + 8, sy + 24, 16, 4);
      // Inner facets
      ctx.fillStyle = `rgba(200,180,255,${0.5 + 0.4 * qPulse})`;
      ctx.fillRect(sx + 10, sy + 8, 12, 14);
      // Quantum shimmer
      ctx.fillStyle = `rgba(${255 - r},${255 - g},${255 - b},${0.3 * qInv})`;
      ctx.fillRect(sx + 12, sy + 10, 8, 8);
      // White center spark when at peak
      if (qPulse > 0.85) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(sx + 14, sy + 13, 4, 4);
      }
      // Glow overlay
      ctx.fillStyle = `rgba(167,139,250,${0.3 * qPulse})`;
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      break;
    }
    case 30: {
      // CAVE_IN — cracked boulder
      ctx.fillStyle = "#4a3a20";
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = "#6b5233";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      ctx.fillStyle = "#8a6a44";
      ctx.fillRect(sx + 4, sy + 4, S - 8, S - 8);
      ctx.fillStyle = "#a08060";
      ctx.fillRect(sx + 6, sy + 6, S - 12, S - 12);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(sx + 7, sy + 4, 2, 13);
      ctx.fillRect(sx + 9, sy + 16, 10, 2);
      ctx.fillRect(sx + 19, sy + 11, 2, 15);
      ctx.fillRect(sx + 13, sy + 5, 8, 2);
      ctx.fillRect(sx + 4, sy + 20, 8, 2);
      ctx.fillRect(sx + 16, sy + 8, 4, 4);
      ctx.fillStyle = "rgba(255,240,180,0.1)";
      ctx.fillRect(sx + 4, sy + 4, S - 8, 3);
      ctx.fillRect(sx + 4, sy + 4, 3, S - 8);
      break;
    }
    case 31: {
      // GAS_POCKET
      ctx.fillStyle = "rgba(10,30,5,0.8)";
      ctx.fillRect(sx, sy, S, S);
      const gf = 0.4 + 0.3 * Math.sin(frame * 0.07 + sx * 0.1);
      ctx.fillStyle = `rgba(80,200,40,${gf * 0.4})`;
      ctx.fillRect(sx + 2, sy + 4, S - 4, S - 8);
      ctx.fillStyle = `rgba(130,250,60,${gf * 0.3})`;
      ctx.fillRect(sx + 6, sy + 8, S - 12, S - 16);
      ctx.fillStyle = `rgba(180,255,80,${gf * 0.55})`;
      ctx.fillRect(sx + 9, sy + 11, 4, 4);
      ctx.fillRect(sx + 19, sy + 17, 3, 3);
      ctx.fillRect(sx + 11, sy + 21, 3, 3);
      ctx.fillRect(sx + 20, sy + 9, 2, 2);
      break;
    }
    case 32: {
      // WATER_TILE
      const wv = frame % 4;
      ctx.fillStyle = "#061830";
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = "rgba(20,80,180,0.75)";
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = "rgba(80,160,255,0.45)";
      ctx.fillRect(sx, sy + 6 + (wv < 2 ? 0 : 1), S, 4);
      ctx.fillRect(sx, sy + 16 + (wv < 2 ? 0 : 1), S, 4);
      ctx.fillRect(sx, sy + 26, S, 3);
      ctx.fillStyle = "rgba(200,240,255,0.3)";
      ctx.fillRect(sx + 3, sy + 4 + (wv < 2 ? 0 : 2), 9, 2);
      ctx.fillRect(sx + 17, sy + 14 + (wv < 2 ? 0 : 2), 9, 2);
      // Bubble dots
      ctx.fillStyle = "rgba(180,220,255,0.5)";
      ctx.fillRect(sx + 7, sy + 22, 2, 2);
      ctx.fillRect(sx + 22, sy + 10, 2, 2);
      break;
    }
    case 33: {
      // TREASURE_CHEST
      const tc = 0.5 + 0.5 * Math.sin(frame * 0.1);
      // Chest body
      ctx.fillStyle = "#3d1f00";
      ctx.fillRect(sx + 3, sy + 11, S - 6, S - 15);
      ctx.fillStyle = "#7a3e0a";
      ctx.fillRect(sx + 5, sy + 13, S - 10, S - 18);
      // Lid
      ctx.fillStyle = "#6b3508";
      ctx.fillRect(sx + 3, sy + 8, S - 6, 6);
      ctx.fillStyle = "#c07030";
      ctx.fillRect(sx + 5, sy + 9, S - 10, 4);
      // Metal bands
      ctx.fillStyle = "#b45309";
      ctx.fillRect(sx + 3, sy + 17, S - 6, 2);
      ctx.fillRect(sx + S / 2 - 2, sy + 8, 4, S - 12);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(sx + 4, sy + 18, 4, 1);
      ctx.fillRect(sx + S - 8, sy + 18, 4, 1);
      // Lock (animated glow)
      ctx.fillStyle = `rgba(255,210,30,${0.8 + 0.2 * tc})`;
      ctx.fillRect(sx + S / 2 - 3, sy + 13, 6, 7);
      ctx.fillStyle = "#1a0800";
      ctx.fillRect(sx + S / 2 - 1, sy + 15, 2, 3);
      ctx.fillRect(sx + S / 2 - 2, sy + 13, 4, 3); // U-arch
      // Glow aura
      ctx.fillStyle = `rgba(255,200,30,${tc * 0.2})`;
      ctx.fillRect(sx, sy + 6, S, S - 6);
      // Rivets on chest
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(sx + 6, sy + 14, 2, 2);
      ctx.fillRect(sx + S - 8, sy + 14, 2, 2);
      ctx.fillRect(sx + 6, sy + 22, 2, 2);
      ctx.fillRect(sx + S - 8, sy + 22, 2, 2);
      break;
    }
    case 34: {
      // LAVA_TILE — glowing orange/red with animated flicker
      const lf = 0.6 + 0.4 * Math.sin(frame * 0.15 + sx * 0.07);
      const lf2 = 0.6 + 0.4 * Math.sin(frame * 0.22 + sy * 0.09);
      ctx.fillStyle = `rgb(${Math.round(200 + 55 * lf)},${Math.round(40 + 30 * lf2)},0)`;
      ctx.fillRect(sx, sy, S, S);
      // Bright lava rivers
      ctx.fillStyle = `rgba(255,${Math.round(120 + 80 * lf)},0,0.7)`;
      ctx.fillRect(sx + 3, sy + 5, S - 6, 4);
      ctx.fillRect(sx + 8, sy + 14, S - 14, 3);
      ctx.fillRect(sx + 2, sy + 22, S - 8, 4);
      // Bubbles
      ctx.fillStyle = `rgba(255,200,0,${0.5 + 0.4 * lf2})`;
      ctx.fillRect(sx + 6, sy + 8, 3, 3);
      ctx.fillRect(sx + 18, sy + 18, 4, 4);
      ctx.fillRect(sx + 10, sy + 25, 3, 3);
      // Dark crust patches
      ctx.fillStyle = "rgba(60,10,0,0.5)";
      ctx.fillRect(sx + 1, sy + 1, 8, 4);
      ctx.fillRect(sx + S - 9, sy + 12, 7, 5);
      ctx.fillRect(sx + 5, sy + S - 6, 10, 4);
      break;
    }
    case 35: {
      // CRYSTAL_WALL — purple/violet with sparkle facets
      const cf = 0.5 + 0.5 * Math.sin(frame * 0.1 + sx * 0.05 + sy * 0.07);
      ctx.fillStyle = "#3b1b6b";
      ctx.fillRect(sx, sy, S, S);
      // Crystal facets
      ctx.fillStyle = `rgba(168,85,247,${0.7 + 0.3 * cf})`;
      ctx.fillRect(sx + 4, sy + 2, 6, 14);
      ctx.fillRect(sx + 12, sy + 6, 5, 16);
      ctx.fillRect(sx + 20, sy + 3, 7, 12);
      ctx.fillRect(sx + 8, sy + 18, 4, 10);
      // Highlights
      ctx.fillStyle = `rgba(216,180,254,${0.6 + 0.4 * cf})`;
      ctx.fillRect(sx + 5, sy + 2, 2, 6);
      ctx.fillRect(sx + 13, sy + 6, 2, 5);
      ctx.fillRect(sx + 21, sy + 3, 2, 5);
      // Sparkle dots
      if (frame % 20 < 10) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fillRect(sx + 5, sy + 3, 2, 2);
        ctx.fillRect(sx + 22, sy + 4, 2, 2);
        ctx.fillRect(sx + 14, sy + 20, 2, 2);
      }
      break;
    }
    default: {
      ctx.fillStyle = res.color;
      ctx.fillRect(sx + 4, sy + 4, S - 8, S - 8);
      break;
    }
  }
}

export function drawShopBuilding(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
  frame: number,
) {
  const x = worldX;
  const y = worldY;
  const W = SHOP_W * TILE; // 128
  const H = SHOP_H * TILE; // 96

  // Foundation / base shadow
  ctx.fillStyle = "#2a1500";
  ctx.fillRect(x - 2, y + H - 2, W + 4, 6);

  // Main walls
  ctx.fillStyle = "#7a3008";
  ctx.fillRect(x, y, W, H - 4);

  // Brick rows — alternating offset courses
  for (let row = 0; row < Math.ceil(H / 10); row++) {
    const offset = (row % 2) * 9;
    const lighter = row % 3 === 0;
    ctx.fillStyle = lighter ? "#6a2a06" : "#8c3810";
    for (let col = -1; col < Math.ceil(W / 18) + 1; col++) {
      const bx = x + col * 18 + offset;
      const by = y + row * 10;
      ctx.fillRect(bx, by, 15, 9); // brick face
      ctx.fillStyle = "#3a1504"; // mortar
      ctx.fillRect(bx + 15, by, 3, 9);
      ctx.fillRect(bx, by + 9, 18, 1);
      ctx.fillStyle = lighter ? "#6a2a06" : "#8c3810";
    }
  }
  // Wall highlight top-left
  ctx.fillStyle = "rgba(255,180,100,0.06)";
  ctx.fillRect(x, y, 3, H);
  ctx.fillRect(x, y, W, 3);
  // Wall shadow bottom-right
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + W - 3, y, 3, H);

  // Roof with overhang
  ctx.fillStyle = "#b05820";
  ctx.fillRect(x - 6, y - 2, W + 12, 12);
  ctx.fillStyle = "#d07030";
  ctx.fillRect(x - 4, y, W + 8, 8);
  // Roof tiles
  ctx.fillStyle = "#e8904a";
  for (let i = 0; i < Math.ceil((W + 8) / 14); i++) {
    ctx.fillRect(x - 4 + i * 14, y + 1, 12, 6);
    ctx.fillStyle = "#c07030";
    ctx.fillRect(x - 4 + i * 14 + 10, y + 1, 2, 6); // tile gap
    ctx.fillStyle = "#e8904a";
  }
  ctx.fillStyle = "#a04818";
  ctx.fillRect(x - 6, y - 2, W + 12, 3); // roof cap
  // Chimney
  ctx.fillStyle = "#5a2a08";
  ctx.fillRect(x + W - 28, y - 18, 12, 18);
  ctx.fillStyle = "#7a3a10";
  ctx.fillRect(x + W - 30, y - 20, 16, 5);
  // Smoke puffs
  const sf = frame % 90;
  if (sf < 50) {
    ctx.fillStyle = `rgba(200,180,160,${0.5 - sf * 0.01})`;
    ctx.fillRect(x + W - 26, y - 20 - sf * 0.4, 6 + sf * 0.06, 6 + sf * 0.06);
  }
  // Antenna
  ctx.fillStyle = "#888";
  ctx.fillRect(x + 20, y - 28, 2, 30);
  // Antenna tip blinking light
  ctx.fillStyle = frame % 60 < 30 ? "#ff0000" : "#880000";
  ctx.fillRect(x + 19, y - 30, 4, 4);

  // Neon sign board with animated glow
  const signX = x + W / 2 - 38;
  const signY = y + 12;
  const buzz = Math.random() < 0.04 ? 0.4 : 0; // occasional buzz dip
  const glow = Math.max(0.1, 0.5 + 0.5 * Math.sin(frame * 0.07) - buzz);
  // Sign backing
  ctx.fillStyle = "#1a0a00";
  ctx.fillRect(signX - 3, signY - 3, 80, 22);
  ctx.fillStyle = "#2a1500";
  ctx.fillRect(signX - 1, signY - 1, 76, 18);
  // Neon glow layer
  ctx.fillStyle = `rgba(245,197,66,${glow * 0.25})`;
  ctx.fillRect(signX - 4, signY - 4, 82, 24);
  // Sign text
  ctx.fillStyle = `rgba(245,197,66,${0.8 + 0.2 * glow})`;
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText("BOB SHOP", x + W / 2, signY + 12);
  // Corner bolts on sign
  ctx.fillStyle = "#888";
  ctx.fillRect(signX - 2, signY - 2, 3, 3);
  ctx.fillRect(signX + 74, signY - 2, 3, 3);
  ctx.fillRect(signX - 2, signY + 15, 3, 3);
  ctx.fillRect(signX + 74, signY + 15, 3, 3);

  // BOB logo mural on wall (left side)
  ctx.fillStyle = "rgba(245,197,66,0.15)";
  ctx.fillRect(x + 8, y + 36, 24, 24); // mural bg
  ctx.fillStyle = "rgba(245,197,66,0.5)";
  // Circle
  ctx.fillRect(x + 10, y + 38, 20, 3);
  ctx.fillRect(x + 10, y + 55, 20, 3);
  ctx.fillRect(x + 8, y + 41, 3, 14);
  ctx.fillRect(x + 29, y + 41, 3, 14);
  // B letter
  ctx.fillRect(x + 14, y + 41, 2, 14);
  ctx.fillRect(x + 16, y + 41, 5, 2);
  ctx.fillRect(x + 16, y + 47, 5, 2);
  ctx.fillRect(x + 16, y + 53, 5, 2);

  // Windows
  const winY = y + 42;
  const winH = 24;
  const winW = 26;
  // Left window
  ctx.fillStyle = "#0d0700";
  ctx.fillRect(x + 40, winY, winW, winH);
  // Warm interior light
  ctx.fillStyle = `rgba(255,180,50,${0.3 + 0.1 * Math.sin(frame * 0.03)})`;
  ctx.fillRect(x + 40, winY, winW, winH);
  // Curtains
  ctx.fillStyle = "rgba(180,60,20,0.6)";
  ctx.fillRect(x + 40, winY, 7, winH);
  ctx.fillRect(x + 40 + winW - 7, winY, 7, winH);
  // Window cross frame
  ctx.fillStyle = "#7a3a10";
  ctx.fillRect(x + 40 + winW / 2 - 1, winY, 2, winH);
  ctx.fillRect(x + 40, winY + winH / 2 - 1, winW, 2);
  // Window frame surround
  ctx.fillStyle = "#c07030";
  ctx.fillRect(x + 38, winY - 3, winW + 4, 4);
  ctx.fillRect(x + 38, winY + winH, winW + 4, 4);
  ctx.fillRect(x + 38, winY - 3, 4, winH + 7);
  ctx.fillRect(x + 38 + winW + 1, winY - 3, 4, winH + 7);

  // Door frame
  const doorX = x + W / 2 - 18;
  const doorY = y + H - 4 - 46;
  const doorW = 36;
  const doorH = 46;
  // Door surround
  ctx.fillStyle = "#3a1804";
  ctx.fillRect(doorX - 5, doorY - 5, doorW + 10, doorH + 5);
  // Door opening
  ctx.fillStyle = "#080300";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  // Door arch top
  ctx.fillStyle = "#5a2a08";
  ctx.fillRect(doorX, doorY - 5, doorW, 6);
  ctx.fillStyle = "#ca8a04";
  ctx.fillRect(doorX + doorW / 2 - 6, doorY - 8, 12, 4); // keystone
  // Interior door panels
  ctx.fillStyle = "rgba(255,150,30,0.08)";
  ctx.fillRect(doorX + 2, doorY + 4, doorW / 2 - 4, doorH - 8);
  ctx.fillRect(doorX + doorW / 2 + 2, doorY + 4, doorW / 2 - 4, doorH - 8);
  // Door handles
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(doorX + doorW / 2 - 6, doorY + doorH / 2 - 3, 5, 6);
  ctx.fillRect(doorX + doorW / 2 + 1, doorY + doorH / 2 - 3, 5, 6);
  // Step at base
  ctx.fillStyle = "#5a3a18";
  ctx.fillRect(doorX - 4, doorY + doorH, doorW + 8, 6);
  ctx.fillStyle = "#7a5028";
  ctx.fillRect(doorX - 2, doorY + doorH, doorW + 4, 3);

  // Animated light orbs above door
  const orb = 0.6 + 0.4 * Math.sin(frame * 0.07);
  ctx.fillStyle = `rgba(255,220,80,${orb * 0.9})`;
  ctx.beginPath();
  ctx.arc(doorX - 2, doorY - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(doorX + doorW + 2, doorY - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  // Orb glow halos
  ctx.fillStyle = `rgba(255,200,60,${orb * 0.25})`;
  ctx.beginPath();
  ctx.arc(doorX - 2, doorY - 8, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(doorX + doorW + 2, doorY - 8, 10, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDetailedVehicle(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  facingRight: boolean,
  isDrilling: boolean,
  drillDx: number,
  drillDy: number,
  frame: number,
  upgradeLevels?: {
    drillLevel: number;
    hullLevel: number;
    engineLevel: number;
    fuelLevel: number;
    shieldLevel: number;
    thrusterLevel?: number;
    coolantLevel?: number;
  },
  drillSurgeActive?: boolean,
) {
  const S = TILE;
  ctx.save();

  if (!facingRight) {
    ctx.translate(px + S / 2, py + S / 2);
    ctx.scale(-1, 1);
    ctx.translate(-(px + S / 2), -(py + S / 2));
  }

  // ── TRACKS ──
  // Track base (black rubber)
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(px + 1, py + S - 11, S - 2, 9);
  // Tread links — alternating dark/medium
  const trackAnim = frame % 6; // always animate treads
  for (let i = 0; i < 10; i++) {
    const tx = px + 2 + ((i * 6 + trackAnim) % (S - 4));
    if (tx > px + S - 5) continue;
    ctx.fillStyle = i % 2 === 0 ? "#1a1a1a" : "#333";
    ctx.fillRect(tx, py + S - 10, 5, 8);
    // Pin dot between treads
    ctx.fillStyle = "#555";
    ctx.fillRect(tx + 5, py + S - 8, 1, 4);
  }
  // Two large end wheels
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(px + 1, py + S - 14, 9, 12);
  ctx.fillRect(px + S - 10, py + S - 14, 9, 12);
  ctx.fillStyle = "#444";
  ctx.fillRect(px + 2, py + S - 12, 6, 8);
  ctx.fillRect(px + S - 9, py + S - 12, 6, 8);
  // Wheel hub bolts
  ctx.fillStyle = "#666";
  ctx.fillRect(px + 4, py + S - 10, 2, 2);
  ctx.fillRect(px + S - 7, py + S - 10, 2, 2);
  // Rubber outer edge strip
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(px + 1, py + S - 2, S - 2, 2);

  // ── UPGRADE TIER CHASSIS ──
  // Determine overall visual tier from upgrade totals
  const _ulUpg = upgradeLevels ?? {
    drillLevel: 0,
    hullLevel: 0,
    engineLevel: 0,
    fuelLevel: 0,
    shieldLevel: 0,
    thrusterLevel: 0,
    coolantLevel: 0,
  };
  const totalUpgrade =
    (_ulUpg.drillLevel +
      _ulUpg.hullLevel +
      _ulUpg.engineLevel +
      _ulUpg.fuelLevel +
      _ulUpg.shieldLevel) /
    5;
  const chassisTier =
    totalUpgrade >= 4
      ? 4
      : totalUpgrade >= 3
        ? 3
        : totalUpgrade >= 2
          ? 2
          : totalUpgrade >= 1
            ? 1
            : 0;

  // Tier 0: basic grey/brown — starting miner
  // Tier 1: blue-tinted trim — upgraded novice
  // Tier 2: orange glow highlights — veteran miner
  // Tier 3: purple/gold armor — elite excavator
  // Tier 4: glowing cyan frame — legendary drill master

  const chassisBase =
    chassisTier >= 4
      ? "#0a1a20"
      : chassisTier >= 3
        ? "#180820"
        : chassisTier >= 2
          ? "#201408"
          : chassisTier >= 1
            ? "#152030"
            : "#1a1400";

  const chassisMain =
    chassisTier >= 4
      ? "#0d3040"
      : chassisTier >= 3
        ? "#301048"
        : chassisTier >= 2
          ? "#3a2208"
          : chassisTier >= 1
            ? "#1e3a5a"
            : "#7a6010";

  const chassisHighlight =
    chassisTier >= 4
      ? "#00d4ff"
      : chassisTier >= 3
        ? "#c084fc"
        : chassisTier >= 2
          ? "#f97316"
          : chassisTier >= 1
            ? "#38bdf8"
            : "#c8a030";

  const chassisAccent =
    chassisTier >= 4
      ? "#00e5ff"
      : chassisTier >= 3
        ? "#ffd700"
        : chassisTier >= 2
          ? "#fb923c"
          : chassisTier >= 1
            ? "#7dd3fc"
            : "#e8c040";

  // ── CHASSIS BASE PLATE ──
  ctx.fillStyle = chassisBase;
  ctx.fillRect(px + 2, py + 6, S - 4, S - 17);
  // Undercarriage cross-brace
  ctx.fillStyle = chassisBase;
  ctx.fillRect(px + 4, py + S - 16, S - 8, 2);
  ctx.fillRect(px + S / 2 - 1, py + 8, 2, S - 24);

  // ── MAIN CHASSIS BODY ──
  ctx.fillStyle = chassisMain;
  ctx.fillRect(px + 3, py + 8, S - 6, S - 20);
  // Top panel highlight
  ctx.fillStyle = chassisAccent;
  ctx.fillRect(px + 4, py + 8, S - 8, 3);
  ctx.fillStyle = chassisHighlight;
  ctx.fillRect(px + 4, py + 8, S - 8, 1); // bright top edge
  // Mid-section panel
  ctx.fillStyle = chassisMain;
  ctx.fillRect(px + 3, py + 14, S - 6, 5);
  // Lower panel
  ctx.fillStyle = chassisBase;
  ctx.fillRect(px + 3, py + 19, S - 6, S - 31);

  // Tier-specific detail panels
  if (chassisTier >= 1) {
    // Tier 1+: side panel trim lines
    ctx.fillStyle = chassisHighlight;
    ctx.fillRect(px + 4, py + 11, S - 8, 1);
    ctx.fillRect(px + 4, py + 17, S - 8, 1);
  }
  if (chassisTier >= 2) {
    // Tier 2+: orange side vent glow slots
    ctx.fillStyle = chassisHighlight;
    ctx.fillRect(px + S - 8, py + 15, 4, 1);
    ctx.fillRect(px + S - 8, py + 17, 4, 1);
    ctx.fillRect(px + S - 8, py + 19, 4, 1);
    // Warm glow ambient
    const glow2 = 0.08 + 0.05 * Math.abs(Math.sin(frame * 0.08));
    ctx.fillStyle = `rgba(249,115,22,${glow2})`;
    ctx.fillRect(px - 2, py - 2, S + 4, S + 4);
  }
  if (chassisTier >= 3) {
    // Tier 3: purple energy conduit lines on body
    ctx.fillStyle = chassisHighlight;
    ctx.fillRect(px + 6, py + 9, 2, S - 21); // left conduit
    ctx.fillRect(px + S - 8, py + 9, 2, S - 21); // right conduit
    ctx.fillStyle = chassisAccent;
    ctx.fillRect(px + 6, py + 9, 2, 1);
    ctx.fillRect(px + S - 8, py + 9, 2, 1);
    // Gold trim accent bars
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(px + 3, py + 8, S - 6, 1);
    ctx.fillRect(px + 3, py + S - 20, S - 6, 1);
  }
  if (chassisTier >= 4) {
    // Tier 4: full cyan energy glow around chassis
    const cyGlow = 0.12 + 0.08 * Math.abs(Math.sin(frame * 0.1));
    ctx.fillStyle = `rgba(0,212,255,${cyGlow})`;
    ctx.fillRect(px - 3, py - 3, S + 6, S + 6);
    ctx.fillStyle = `rgba(0,229,255,${cyGlow * 1.5})`;
    ctx.fillRect(px, py, S, 2); // top glow bar
    ctx.fillRect(px, py + S - 13, S, 2); // bottom glow bar
    // Energy grid lines
    ctx.fillStyle = "rgba(0,212,255,0.3)";
    ctx.fillRect(px + S / 2 - 1, py + 8, 2, S - 20);
    ctx.fillRect(px + 3, py + S / 2 - 1, S - 6, 2);
  }

  // Side vent slots (base)
  if (chassisTier === 0) {
    ctx.fillStyle = "#5a3a08";
    ctx.fillRect(px + S - 8, py + 15, 4, 1);
    ctx.fillRect(px + S - 8, py + 17, 4, 1);
    ctx.fillRect(px + S - 8, py + 19, 4, 1);
  }
  // Left side darker
  ctx.fillStyle = chassisBase;
  ctx.fillRect(px + 3, py + 8, 2, S - 18);
  // Rivet dots at panel corners
  ctx.fillStyle = chassisTier >= 3 ? chassisAccent : "#555";
  ctx.fillRect(px + 5, py + 9, 3, 3);
  ctx.fillRect(px + S - 8, py + 9, 3, 3);
  ctx.fillRect(px + 5, py + S - 14, 3, 3);
  ctx.fillRect(px + S - 8, py + S - 14, 3, 3);
  // Fuel hose (thin curved line from left side)
  ctx.fillStyle = "#333";
  ctx.fillRect(px + 2, py + 16, 2, 6);
  ctx.fillRect(px, py + 22, 3, 2);

  // ── COCKPIT / CAB ──
  const cabColor =
    chassisTier >= 4
      ? "#0a2030"
      : chassisTier >= 3
        ? "#200838"
        : chassisTier >= 2
          ? "#282010"
          : chassisTier >= 1
            ? "#102030"
            : "#b89028";
  const cabRoof =
    chassisTier >= 4
      ? "#0d3040"
      : chassisTier >= 3
        ? "#2a0c48"
        : chassisTier >= 2
          ? "#3a2810"
          : chassisTier >= 1
            ? "#183048"
            : "#d4a030";
  ctx.fillStyle = cabColor;
  ctx.fillRect(px + 5, py + 2, S - 10, 8); // cab sides
  ctx.fillStyle = cabRoof;
  ctx.fillRect(px + 6, py + 2, S - 12, 7); // cab roof
  // Cab frame
  ctx.fillStyle = chassisTier >= 2 ? chassisHighlight : "#8a6818";
  ctx.fillRect(px + 5, py + 2, 2, 8);
  ctx.fillRect(px + S - 7, py + 2, 2, 8);
  ctx.fillRect(px + 5, py + 2, S - 10, 2); // top cap
  // Antenna
  ctx.fillStyle = "#777";
  ctx.fillRect(px + 8, py - 5, 2, 7);
  ctx.fillStyle = frame % 60 < 30 ? "#ff4444" : "#990000";
  ctx.fillRect(px + 8, py - 7, 3, 3);
  // Windshield (large, realistic)
  ctx.fillStyle = "rgba(180,210,255,0.75)";
  ctx.fillRect(px + 14, py + 3, 12, 7);
  // Glare dots on windshield
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(px + 15, py + 4, 3, 2);
  ctx.fillRect(px + 20, py + 5, 2, 2);
  // Seat silhouette behind glass
  ctx.fillStyle = "rgba(42,26,8,0.5)";
  ctx.fillRect(px + 17, py + 6, 5, 4);
  // Instrument panel bar at bottom of windshield
  ctx.fillStyle = "#3a2808";
  ctx.fillRect(px + 14, py + 9, 12, 2);
  // Headlights
  const lightGlow = 0.7 + 0.3 * Math.sin(frame * 0.12);
  ctx.fillStyle = `rgba(255,230,100,${lightGlow})`;
  ctx.fillRect(px + S - 6, py + 9, 5, 3);
  ctx.fillRect(px + S - 6, py + 14, 5, 3);
  // Headlight beam (trapezoid projection) - only underground
  ctx.fillStyle = `rgba(255,220,80,${lightGlow * 0.25})`;
  ctx.fillRect(px + S - 2, py + 8, 8, 11);
  ctx.fillRect(px + S + 4, py + 6, 6, 15);
  // Exhaust pipe
  ctx.fillStyle = "#444";
  ctx.fillRect(px + 2, py + 5, 5, 5);
  ctx.fillStyle = "#222";
  ctx.fillRect(px + 2, py + 5, 2, 8);
  // Smoke puff when moving
  if (!isDrilling && frame % 10 < 5) {
    const sf = (frame % 10) * 0.3;
    ctx.fillStyle = `rgba(160,160,140,${0.5 - sf})`;
    ctx.fillRect(px, py + 3 - (frame % 3), 5, 5);
  }

  // ── DRILL ARM ──
  if (drillDy === 1) {
    // Drilling down — segmented bit with rotation
    ctx.fillStyle = "#777";
    ctx.fillRect(px + S / 2 - 4, py + S - 12, 8, 14);
    ctx.fillStyle = "#999";
    ctx.fillRect(px + S / 2 - 3, py + S - 12, 6, 12);
    // Rotating drill tip
    ctx.save();
    ctx.translate(px + S / 2, py + S + 4);
    if (isDrilling) ctx.rotate((frame % 60) * 0.105);
    // Segmented bit
    const bitSpin = isDrilling ? frame % 4 : 0;
    for (let seg = 0; seg < 4; seg++) {
      ctx.fillStyle = seg % 2 === (bitSpin < 2 ? 0 : 1) ? "#aaa" : "#ccc";
      ctx.fillRect(-4 + seg * 2, -4, 2, 5);
    }
    ctx.fillStyle = "#f97316"; // orange tip
    ctx.fillRect(-3, 0, 6, 4);
    ctx.fillStyle = "#fed7aa"; // tip highlight
    ctx.fillRect(-1, 0, 2, 2);
    ctx.restore();
  } else if (drillDx !== 0) {
    // Drilling sideways
    const wobble = isDrilling ? Math.sin(frame * 0.6) * 1.5 : 0;
    const extX = drillDx > 0 ? S - 2 : -8;
    ctx.fillStyle = "#777";
    ctx.fillRect(px + (drillDx > 0 ? S - 8 : 2), py + 12 + wobble, 8, 5);
    ctx.fillStyle = "#999";
    ctx.fillRect(px + (drillDx > 0 ? S - 6 : 2), py + 12 + wobble, 6, 5);
    // Segmented bit sideways
    const bitSpin2 = isDrilling ? frame % 4 : 0;
    for (let seg = 0; seg < 4; seg++) {
      ctx.fillStyle = seg % 2 === (bitSpin2 < 2 ? 0 : 1) ? "#aaa" : "#ccc";
      ctx.fillRect(
        px + extX + (drillDx > 0 ? seg : 3 - seg),
        py + 11 + wobble,
        2,
        7,
      );
    }
    ctx.fillStyle = "#f97316";
    ctx.fillRect(px + extX + (drillDx > 0 ? 4 : -4), py + 11 + wobble, 4, 7);
    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(px + extX + (drillDx > 0 ? 6 : -4), py + 13 + wobble, 2, 3);
  } else {
    // Idle — drill at front, resting
    ctx.fillStyle = "#666";
    ctx.fillRect(px + S - 7, py + 13, 5, 5);
    ctx.fillStyle = "#999";
    ctx.fillRect(px + S - 5, py + 12, 7, 7);
    ctx.fillStyle = "#f97316";
    ctx.fillRect(px + S + 1, py + 13, 5, 5);
    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(px + S + 3, py + 14, 2, 2);
  }

  // ── THRUST FLAMES ── (when moving up)
  const isThrusting = drillDy === 0 && drillDx === 0; // proxy: will be true during flight
  if (isThrusting && frame % 2 === 0) {
    // Downward exhaust cone
    ctx.fillStyle = "rgba(255,140,0,0.65)";
    ctx.fillRect(px + 8, py + S - 8, 4, 6);
    ctx.fillRect(px + 14, py + S - 8, 6, 8);
    ctx.fillRect(px + 20, py + S - 8, 4, 6);
    ctx.fillStyle = "rgba(255,255,100,0.4)";
    ctx.fillRect(px + 12, py + S - 6, 6, 5);
  }

  // ── UPGRADE VISUAL LAYERS ──
  const ul = upgradeLevels ?? {
    drillLevel: 0,
    hullLevel: 0,
    engineLevel: 0,
    fuelLevel: 0,
    shieldLevel: 0,
    thrusterLevel: 0,
    coolantLevel: 0,
  };
  const ulThruster = ul.thrusterLevel ?? 0;
  const ulCoolant = ul.coolantLevel ?? 0;

  // Drill upgrade: grows significantly larger each tier (scale 1.0 to 2.0x)
  if (ul.drillLevel >= 1) {
    const drillScale = 1.0 + (ul.drillLevel - 1) * 0.25; // 1.0, 1.25, 1.5, 1.75, 2.0
    const drillColor =
      ul.drillLevel >= 5
        ? "#00ffff" // tier 4+: glowing cyan
        : ul.drillLevel >= 4
          ? "#c084fc" // tier 3+: purple
          : ul.drillLevel >= 3
            ? "#f97316" // tier 2+: orange
            : ul.drillLevel >= 2
              ? "#38bdf8" // tier 1+: blue
              : "#fde68a"; // tier 0: yellow/basic
    const drillTx = px + (facingRight ? S : -Math.round(8 * drillScale));
    const drillW = Math.round(8 * drillScale);
    const drillH = Math.round(14 * drillScale);
    const drillOffY = py + Math.round(S / 2 - drillH / 2);
    // Drill body grows with level
    ctx.fillStyle = "#555";
    ctx.fillRect(
      drillTx - (facingRight ? drillW - 4 : 0),
      drillOffY,
      drillW - 4,
      drillH,
    );
    // Drill tip (tapers)
    ctx.fillStyle = drillColor;
    const tipW = Math.round(4 * drillScale);
    ctx.fillRect(
      drillTx + (facingRight ? -tipW + drillW : -tipW),
      drillOffY + Math.round(drillH * 0.15),
      tipW,
      Math.round(drillH * 0.7),
    );
    // Drill teeth (more at higher levels)
    ctx.fillStyle = ul.drillLevel >= 4 ? "#ffff00" : "#fde68a";
    const toothCount = 2 + ul.drillLevel;
    const toothSize = Math.round(2 * drillScale);
    const toothSpacing = Math.round((drillH * 0.7) / toothCount);
    for (let i = 0; i < toothCount; i++) {
      ctx.fillRect(
        drillTx + (facingRight ? drillW - 2 : -2),
        drillOffY + Math.round(drillH * 0.15) + i * toothSpacing,
        toothSize,
        toothSize,
      );
    }
    // Glow effect at higher levels
    if (ul.drillLevel >= 3) {
      ctx.fillStyle = `rgba(249,115,22,${0.15 * (ul.drillLevel - 2) * Math.abs(Math.sin(frame * 0.15))})`;
      ctx.fillRect(
        drillTx - 2 - (facingRight ? drillW - 4 : 0),
        drillOffY - 2,
        drillW + 4,
        drillH + 4,
      );
    }
    // Drill Surge — gold pulsing aura around drill tip
    if (drillSurgeActive) {
      const surgeAlpha = 0.4 + 0.3 * Math.sin(frame * 0.3);
      const tipCx = drillTx + (facingRight ? drillW - tipW / 2 : tipW / 2 - 2);
      const tipCy = drillOffY + drillH / 2;
      ctx.save();
      ctx.globalAlpha = surgeAlpha;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#ffd700";
      ctx.beginPath();
      ctx.arc(tipCx, tipCy, 10 + 4 * Math.sin(frame * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = "#ffd700";
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // Hull upgrade: bold armor panels
  if (ul.hullLevel >= 1) {
    // Bold side armor panels (6px wide, full chassis height)
    const armorColor =
      ul.hullLevel >= 5
        ? "#64748b"
        : ul.hullLevel >= 4
          ? "#475569"
          : ul.hullLevel >= 3
            ? "#374151"
            : ul.hullLevel >= 2
              ? "#2d3748"
              : "#1f2937";
    ctx.fillStyle = armorColor;
    ctx.fillRect(px, py + 6, 6, S - 14); // left full armor plate
    ctx.fillRect(px + S - 6, py + 6, 6, S - 14); // right full armor plate
    // Inner highlight
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(px + 1, py + 7, 1, S - 16);
    ctx.fillRect(px + S - 2, py + 7, 1, S - 16);
    // Rivets
    ctx.fillStyle = "#94a3b8";
    const rivetCount = Math.min(ul.hullLevel + 1, 5);
    for (let i = 0; i < rivetCount; i++) {
      ctx.fillRect(px + 2, py + 8 + i * 4, 2, 2);
      ctx.fillRect(px + S - 4, py + 8 + i * 4, 2, 2);
    }
    // Level 5: gold trim on armor edges
    if (ul.hullLevel >= 5) {
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px, py + 6, 2, S - 14);
      ctx.fillRect(px + S - 2, py + 6, 2, S - 14);
    }
  }
  if (ul.hullLevel >= 3) {
    // Shoulder guards at top corners
    ctx.fillStyle = ul.hullLevel >= 5 ? "#fbbf24" : "#4b5563";
    ctx.fillRect(px - 2, py + 4, 10, 5); // left shoulder
    ctx.fillRect(px + S - 8, py + 4, 10, 5); // right shoulder
    // Front armor plating
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(px + 4, py + 4, S - 8, 3);
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(px + 6, py + 4, 4, 2); // highlight
  }

  // Engine upgrade: bigger exhaust + more flames
  if (ul.engineLevel >= 2) {
    // Always-visible flame cones (not frame-gated)
    const flameH =
      (10 + ul.engineLevel * 3) * (0.7 + 0.3 * Math.sin(frame * 0.3));
    ctx.fillStyle =
      ul.engineLevel >= 4 ? "rgba(255,80,0,0.95)" : "rgba(255,140,0,0.85)";
    ctx.fillRect(px + 5, py + S - 6, 6, flameH);
    ctx.fillRect(px + 13, py + S - 6, 6, flameH * 1.2);
    ctx.fillRect(px + 21, py + S - 6, 6, flameH);
    ctx.fillStyle = "rgba(255,220,50,0.6)";
    ctx.fillRect(px + 8, py + S - 4, 4, flameH * 0.8);
    ctx.fillRect(px + 15, py + S - 4, 4, flameH * 0.9);
    // Level 4+: blue-white hot core
    if (ul.engineLevel >= 4) {
      ctx.fillStyle = "rgba(200,230,255,0.85)";
      ctx.fillRect(px + 7, py + S - 5, 3, flameH * 0.5);
      ctx.fillRect(px + 14, py + S - 5, 4, flameH * 0.6);
      ctx.fillRect(px + 22, py + S - 5, 3, flameH * 0.5);
    }
    // Extra exhaust nozzles
    ctx.fillStyle = "#374151";
    ctx.fillRect(px + 5, py + S - 10, 7, 4);
    ctx.fillRect(px + 13, py + S - 10, 7, 4);
    ctx.fillRect(px + 20, py + S - 10, 7, 4);
  }

  // Fuel tank upgrade: visible side tank with fuel gauge
  if (ul.fuelLevel >= 2) {
    const tankW = 8 + ul.fuelLevel;
    const tankH = 14 + ul.fuelLevel * 2;
    const tankX = px - tankW - 2;
    const tankY = py + 8;
    // Tank body
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(tankX - 1, tankY - 1, tankW + 2, tankH + 2);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(tankX, tankY, tankW, tankH);
    // Fuel level gauge bar (visual only, shows at ~80% for aesthetics)
    const gaugeH = Math.floor(tankH * 0.75);
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(tankX + 1, tankY + (tankH - gaugeH), tankW - 2, gaugeH);
    ctx.fillStyle = "#60a5fa";
    ctx.fillRect(tankX + 1, tankY + (tankH - gaugeH), tankW - 2, 2);
    // Tank highlight
    ctx.fillStyle = "rgba(147,197,253,0.4)";
    ctx.fillRect(tankX + 1, tankY + 1, 2, tankH - 2);
    // Tank cap
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(tankX + 2, tankY - 3, 4, 3);
    // Fuel label
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(tankX + 2, tankY + 4, tankW - 4, 1);
  } else if (ul.fuelLevel >= 1) {
    const tankSize = 5;
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(px - tankSize - 1, py + 10, tankSize, 12);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(px - tankSize, py + 11, tankSize - 2, 10);
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(px - tankSize + 1, py + 10, 2, 2);
  }

  // Shield upgrade: glowing aura with layered glow effect
  if (ul.shieldLevel >= 1) {
    const shieldPulse = 0.3 + 0.6 * Math.abs(Math.sin(frame * 0.1));
    const baseAlpha = 0.12 + 0.08 * ul.shieldLevel;
    // Outer bloom layers (3 overlapping rects for glow depth)
    for (let sl = 3; sl >= 0; sl--) {
      const offset = 2 + sl * 3;
      const layerAlpha = baseAlpha * shieldPulse * (1 - sl * 0.2);
      ctx.fillStyle = `rgba(96,165,250,${layerAlpha})`;
      ctx.fillRect(px - offset, py - offset, S + offset * 2, S + offset * 2);
    }
    // Solid inner ring
    ctx.strokeStyle = `rgba(147,197,253,${0.4 + shieldPulse * 0.4})`;
    ctx.lineWidth = 1.5 + ul.shieldLevel * 0.5;
    ctx.strokeRect(px - 3, py - 3, S + 6, S + 6);
    // Corner energy nodes
    const nodeAlpha = 0.6 + shieldPulse * 0.4;
    ctx.fillStyle = `rgba(147,197,253,${nodeAlpha})`;
    ctx.fillRect(px - 4, py - 4, 4, 4);
    ctx.fillRect(px + S, py - 4, 4, 4);
    ctx.fillRect(px - 4, py + S, 4, 4);
    ctx.fillRect(px + S, py + S, 4, 4);
    // Level 3+: secondary outer ring
    if (ul.shieldLevel >= 3) {
      ctx.strokeStyle = `rgba(96,165,250,${shieldPulse * 0.25})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(px - 8, py - 8, S + 16, S + 16);
    }
  }

  // Thruster upgrade: dual rocket nozzles
  if (ulThruster >= 1) {
    const isMovingUp = drillDy === 0 && drillDx === 0;
    // Left nozzle
    ctx.fillStyle = "#374151";
    ctx.fillRect(px + 1, py + S - 16, 5, 6);
    ctx.fillRect(px - 2, py + S - 14, 5, 8);
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(px, py + S - 15, 3, 5);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(px - 3, py + S - 10, 7, 4);
    // Right nozzle (mirrored)
    ctx.fillStyle = "#374151";
    ctx.fillRect(px + S - 6, py + S - 16, 5, 6);
    ctx.fillRect(px + S - 3, py + S - 14, 5, 8);
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(px + S - 3, py + S - 15, 3, 5);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(px + S - 4, py + S - 10, 7, 4);
    // Flames when thrusting upward (bigger than base)
    if (isMovingUp) {
      const tf = 0.7 + 0.3 * Math.sin(frame * 0.5);
      const fh = (8 + ulThruster * 4) * (frame % 2 === 0 ? 1.0 : 0.85);
      // Left flame
      ctx.fillStyle = `rgba(255,140,0,${tf})`;
      ctx.fillRect(px - 3, py + S - 6, 7, fh);
      ctx.fillStyle = `rgba(255,255,100,${tf * 0.8})`;
      ctx.fillRect(px - 1, py + S - 5, 3, fh * 0.7);
      // Right flame
      ctx.fillStyle = `rgba(255,140,0,${tf})`;
      ctx.fillRect(px + S - 4, py + S - 6, 7, fh);
      ctx.fillStyle = `rgba(255,255,100,${tf * 0.8})`;
      ctx.fillRect(px + S - 2, py + S - 5, 3, fh * 0.7);
    }
  }

  // Coolant upgrade: blue cooling pipes on vehicle sides
  if (ulCoolant >= 1) {
    const pipeCount = ulCoolant;
    ctx.fillStyle = "#3b82f6";
    for (let i = 0; i < pipeCount; i++) {
      const pipeY = py + 10 + i * 5;
      // Left side pipe
      ctx.fillRect(px + 2, pipeY, S - 4, 2);
      // Connector dots
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(px + 3, pipeY - 1, 3, 4);
      ctx.fillRect(px + S - 6, pipeY - 1, 3, 4);
      ctx.fillStyle = "#3b82f6";
    }
  }

  ctx.restore();
}
