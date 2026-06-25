import React, { useEffect, useRef, useState, useCallback } from "react";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

import {
  BOB_SAVE_KEY,
  BUILD_PATHS,
  DRILL_BASE_TIME,
  GLOWING_TILES,
  GRAVITY,
  JERRY_QUEST_POOL,
  MAP_H,
  MAP_W,
  META_PROGRESS_KEY,
  MODIFIER_POOL,
  NPC_QUEST_POOL,
  ORE_GLOW_COLORS,
  PLAYER_SPEED,
  RESOURCES,
  SHOP_H,
  SHOP_W,
  SHOP_X,
  SHOP_Y,
  SPEECH_POOLS,
  T,
  TILE,
  TILE_COLOR_CACHE,
  UPGRADES,
  UPGRADE_MAX_LEVEL,
} from "./gameData";
import {
  adjustNpcRelationship,
  getNpcRelationshipTier,
  getRelationshipAwareQuote,
  loadGame,
  loadMetaProgress,
  pickModifiers,
  saveGame,
  saveMetaProgress,
} from "./gameState";
import type {
  Antagonist,
  BuildPathKey,
  CargoItem,
  MetaProgress,
  Particle,
  PlayerState,
  PlayerStats,
  RunModifier,
  RunQuest,
  Score,
  Screen,
  ShopDeal,
  TileType,
} from "./gameTypes";
import {
  cargoTotalValue,
  generateMap,
  getActiveSynergies,
  getCachedTileColor,
  getDepthZone,
  getTileColor,
  getTileHardness,
  initPlayer,
} from "./mapGen";
import {
  drawDetailedTile,
  drawDetailedVehicle,
  drawShopBuilding,
} from "./rendering";

// ─── Summary Screen ──────────────────────────────────────────────────────────
function SeedDisplay({ seed }: { seed: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div
      className="flex items-center justify-center gap-2 mb-3 px-3 py-2 text-xs font-mono"
      style={{ border: "1px solid #2a1800", background: "rgba(0,0,0,0.4)" }}
    >
      <span style={{ color: "#6b7280" }}>Run Seed:</span>
      <span
        style={{
          color: "#d4a84b",
          fontWeight: "bold",
          letterSpacing: "0.15em",
        }}
      >
        {seed}
      </span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(seed).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="px-1.5 py-0.5 text-xs"
        style={{
          background: copied ? "rgba(34,197,94,0.2)" : "rgba(212,168,75,0.15)",
          border: `1px solid ${copied ? "#22c55e60" : "#d4a84b60"}`,
          color: copied ? "#86efac" : "#d4a84b",
          cursor: "pointer",
        }}
      >
        {copied ? "Copied!" : "📋"}
      </button>
    </div>
  );
}

function SummaryScreen({
  isWin,
  bob,
  depth,
  oresFound,
  questsCompleted,
  timePlayed,
  antagonistsDefeated,
  totalWins,
  newMilestone,
  isPersonalBest,
  runSeed,
  bestBob,
  bestDepth,
  newBonusUnlocked,
  discoveredOreCount,
  totalOreCount,
  onLeaderboard,
  onPlayAgain,
}: {
  isWin: boolean;
  bob: number;
  depth: number;
  oresFound: number;
  questsCompleted: number;
  timePlayed: string;
  antagonistsDefeated: number;
  totalWins?: number;
  newMilestone?: string;
  isPersonalBest?: boolean;
  runSeed?: string;
  bestBob?: number;
  bestDepth?: number;
  newBonusUnlocked?: string;
  discoveredOreCount?: number;
  totalOreCount?: number;
  onLeaderboard: () => void;
  onPlayAgain: () => void;
}) {
  const [displayStats, setDisplayStats] = React.useState({
    bob: 0,
    depth: 0,
    ores: 0,
    quests: 0,
    antagonists: 0,
  });
  const [showButtons, setShowButtons] = React.useState(false);

  React.useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const ease = 1 - (1 - progress) ** 3;
      setDisplayStats({
        bob: Math.floor(bob * ease),
        depth: Math.floor(depth * ease),
        ores: Math.floor(oresFound * ease),
        quests: Math.floor(questsCompleted * ease),
        antagonists: Math.floor(antagonistsDefeated * ease),
      });
      if (step >= steps) {
        clearInterval(timer);
        setDisplayStats({
          bob,
          depth,
          ores: oresFound,
          quests: questsCompleted,
          antagonists: antagonistsDefeated,
        });
        setTimeout(() => setShowButtons(true), 200);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [bob, depth, oresFound, questsCompleted, antagonistsDefeated]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center font-mono"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d0800 0%, #050302 100%)",
        padding: "16px",
      }}
    >
      <div
        className="relative px-6 py-8 text-center w-full"
        style={{
          maxWidth: 400,
          border: `2px solid ${isWin ? "#22c55e" : "#ef4444"}`,
          boxShadow: `0 0 40px ${isWin ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}, inset 0 0 40px rgba(0,0,0,0.5)`,
          background: "linear-gradient(180deg, #1a1208 0%, #0d0700 100%)",
        }}
      >
        {(
          [
            "top-1 left-1 border-t-2 border-l-2",
            "top-1 right-1 border-t-2 border-r-2",
            "bottom-1 left-1 border-b-2 border-l-2",
            "bottom-1 right-1 border-b-2 border-r-2",
          ] as const
        ).map((pos) => (
          <div
            key={pos}
            className={`absolute w-4 h-4 ${pos}`}
            style={{ borderColor: isWin ? "#22c55e" : "#ef4444" }}
          />
        ))}

        <div className="text-2xl mb-1">{isWin ? "🏆" : "💀"}</div>
        <div
          className="text-2xl font-black mb-4 tracking-widest"
          style={{
            color: isWin ? "#22c55e" : "#ef4444",
            textShadow: `0 0 20px ${isWin ? "#22c55e80" : "#ef444480"}`,
          }}
        >
          {isWin ? "RUN COMPLETE" : "DRILLED INTO OBLIVION"}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
          <div
            className="p-3 text-center"
            style={{
              background: "rgba(212,168,75,0.08)",
              border: "1px solid #3d2200",
            }}
          >
            <div className="text-yellow-400 font-black text-2xl tabular-nums">
              {displayStats.bob.toLocaleString()}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">⛏ BOB EARNED</div>
          </div>
          <div
            className="p-3 text-center"
            style={{
              background: "rgba(212,168,75,0.08)",
              border: "1px solid #3d2200",
            }}
          >
            <div className="text-white font-black text-2xl tabular-nums">
              {displayStats.depth}m
            </div>
            <div className="text-gray-500 text-xs mt-0.5">📏 MAX DEPTH</div>
          </div>
          <div
            className="p-3 text-center"
            style={{
              background: "rgba(100,150,255,0.08)",
              border: "1px solid #1a2060",
            }}
          >
            <div className="text-blue-400 font-black text-2xl tabular-nums">
              {displayStats.ores}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">💎 ORES FOUND</div>
          </div>
          <div
            className="p-3 text-center"
            style={{
              background: "rgba(100,255,100,0.08)",
              border: "1px solid #1a4020",
            }}
          >
            <div className="text-green-400 font-black text-2xl tabular-nums">
              {displayStats.quests}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">📋 QUESTS DONE</div>
          </div>
          <div
            className="p-3 text-center"
            style={{
              background: "rgba(255,120,0,0.08)",
              border: "1px solid #3d1800",
            }}
          >
            <div className="text-orange-400 font-black text-2xl tabular-nums">
              {displayStats.antagonists}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">
              ⚔ ANTAGONISTS SLAIN
            </div>
          </div>
          {totalWins !== undefined && totalWins > 0 && (
            <div
              className="p-3 text-center"
              style={{
                background: "rgba(212,168,75,0.10)",
                border: "1px solid #5a3a00",
              }}
            >
              <div className="text-yellow-300 font-black text-2xl tabular-nums">
                {totalWins}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">🏁 TOTAL WINS</div>
            </div>
          )}
          <div
            className={
              totalWins !== undefined && totalWins > 0
                ? "col-span-1 p-3 text-center"
                : "col-span-2 p-3 text-center"
            }
            style={{
              background: "rgba(212,168,75,0.05)",
              border: "1px solid #2a1800",
            }}
          >
            <div className="text-yellow-600 font-bold text-base">
              {timePlayed}
            </div>
            <div className="text-gray-500 text-xs mt-0.5">⏱ RUN TIME</div>
          </div>
        </div>

        {newBonusUnlocked && showButtons && (
          <div
            style={{
              border: "2px solid #ffd700",
              background:
                "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(212,168,75,0.08))",
              color: "#ffd700",
              padding: "10px",
              marginBottom: "8px",
              fontSize: "12px",
              fontWeight: "bold",
              letterSpacing: "0.08em",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(255,215,0,0.3)",
              animation: "pulse 0.8s ease-in-out infinite alternate",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 4 }}>
              🏛 LEGACY UNLOCKED
            </div>
            <div style={{ color: "#4ade80", fontSize: 11 }}>
              {newBonusUnlocked}
            </div>
          </div>
        )}

        {(bestBob !== undefined || bestDepth !== undefined) && showButtons && (
          <div
            className="grid grid-cols-2 gap-2 mb-4 text-xs"
            style={{ color: "#888" }}
          >
            {bestBob !== undefined && bestBob > 0 && (
              <div className="text-center">
                <span style={{ color: bob > bestBob ? "#4ade80" : "#666" }}>
                  {bob > bestBob
                    ? `+${(bob - bestBob).toLocaleString()} BOB vs best`
                    : `${(bob - bestBob).toLocaleString()} BOB vs best`}
                </span>
              </div>
            )}
            {bestDepth !== undefined && bestDepth > 0 && (
              <div className="text-center">
                <span style={{ color: depth > bestDepth ? "#4ade80" : "#666" }}>
                  {depth > bestDepth
                    ? `+${depth - bestDepth}m vs best`
                    : `${depth - bestDepth}m vs best`}
                </span>
              </div>
            )}
          </div>
        )}

        {isPersonalBest && showButtons && (
          <div
            style={{
              border: "1px solid #ffd700",
              background: "rgba(255,215,0,0.15)",
              color: "#ffd700",
              padding: "8px",
              marginBottom: "8px",
              fontSize: "13px",
              fontWeight: "bold",
              letterSpacing: "0.1em",
              textAlign: "center",
              animation: "pulse 0.8s ease-in-out infinite alternate",
            }}
          >
            ⭐ NEW PERSONAL BEST!
          </div>
        )}

        {newMilestone && showButtons && (
          <div
            style={{
              border: "1px solid #d4a84b",
              background: "rgba(212,168,75,0.1)",
              color: "#f5c542",
              padding: "8px",
              marginBottom: "8px",
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              animation: "milestoneReveal 0.6s ease-out forwards",
            }}
          >
            🎖 MILESTONE UNLOCKED: {newMilestone}
          </div>
        )}

        {showButtons && runSeed && <SeedDisplay seed={runSeed} />}
        {showButtons &&
          (() => {
            // Determine next goal
            const undiscovered =
              (totalOreCount ?? 0) - (discoveredOreCount ?? 0);
            const wins = totalWins ?? 0;
            const nextBonusLevel = wins + 1;

            let goalText = "";
            let goalSub = "";

            if (undiscovered > 0) {
              goalText = `${undiscovered} ore${undiscovered > 1 ? "s" : ""} still undiscovered`;
              if (undiscovered > 5)
                goalSub = "Try going past 60m to find rarer types";
              else if (undiscovered > 2)
                goalSub = "Push to 100m+ for the rarest seams";
              else goalSub = "You're close to a full Codex — go deeper!";
            } else if (nextBonusLevel <= 10) {
              goalText = `Win #${nextBonusLevel} unlocks a legacy bonus`;
              goalSub = "+cargo, +fuel efficiency, +sell bonus stacks up";
            } else {
              goalText = "Full legacy achieved — try Deep Dive mode";
              goalSub = "Separate leaderboard, exclusive ores, harder enemies";
            }

            return (
              <div
                style={{
                  border: "1px solid #3d2200",
                  background: "rgba(212,168,75,0.07)",
                  padding: "10px 12px",
                  marginBottom: "10px",
                  textAlign: "center",
                  animation: "pulse 2s ease-in-out infinite alternate",
                }}
              >
                <div
                  style={{
                    color: "#6b7280",
                    fontSize: 9,
                    letterSpacing: "0.15em",
                    marginBottom: 4,
                  }}
                >
                  ▶ NEXT RUN
                </div>
                <div
                  style={{
                    color: "#d4a84b",
                    fontSize: 12,
                    fontWeight: "bold",
                    marginBottom: 2,
                  }}
                >
                  {goalText}
                </div>
                <div style={{ color: "#6b7280", fontSize: 10 }}>{goalSub}</div>
              </div>
            );
          })()}
        {showButtons && (
          <div className="space-y-2">
            <button
              type="button"
              data-ocid="summary.primary_button"
              onClick={onLeaderboard}
              className="w-full py-3 font-black text-black text-sm tracking-widest"
              style={{
                background: "linear-gradient(90deg, #d4a84b, #f5c542)",
                boxShadow: "0 0 16px rgba(212,168,75,0.4)",
              }}
            >
              🏆 LEADERBOARD
            </button>
            <button
              type="button"
              data-ocid="summary.secondary_button"
              onClick={onPlayAgain}
              className="w-full py-2 text-sm font-bold"
              style={{
                color: "#d4a84b",
                border: "1px solid #3d2200",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              ⛏ PLAY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function BobRocketCutscene({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const TOTAL_FRAMES = 480;

    // Starfield
    const stars = Array.from({ length: 250 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 2 + 0.3,
      alpha: Math.random(),
    }));

    // Flame trail particles for rocket
    const flameTrail: {
      x: number;
      y: number;
      r: number;
      life: number;
      maxLife: number;
      color: string;
    }[] = [];

    // Shop debris fragments (4 pieces)
    const shopFragments: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      rot: number;
      rotV: number;
      w: number;
      h: number;
    }[] = [
      {
        x: W / 2 - 80,
        y: 0,
        vx: -2.5,
        vy: 0.5,
        rot: 0,
        rotV: 0.04,
        w: 80,
        h: 90,
      },
      { x: W / 2, y: 0, vx: 2.5, vy: 0.4, rot: 0, rotV: -0.03, w: 80, h: 90 },
      { x: W / 2 - 40, y: 0, vx: -1, vy: -2, rot: 0, rotV: 0.07, w: 50, h: 40 },
      {
        x: W / 2 + 10,
        y: 0,
        vx: 1.5,
        vy: -1.5,
        rot: 0,
        rotV: -0.06,
        w: 45,
        h: 35,
      },
    ];
    let fragmentsInitialized = false;

    function drawPixelMoon(
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      r: number,
      alpha: number,
    ) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2);
      grad.addColorStop(0, "rgba(255,255,200,0.3)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fffde7";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0d890";
      for (const [x, y, cr] of [
        [cx - r * 0.3, cy - r * 0.2, r * 0.15],
        [cx + r * 0.2, cy + r * 0.3, r * 0.1],
        [cx - r * 0.1, cy + r * 0.4, r * 0.08],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawShopFragment(
      ctx: CanvasRenderingContext2D,
      frag: (typeof shopFragments)[0],
    ) {
      ctx.save();
      ctx.translate(frag.x, frag.y);
      ctx.rotate(frag.rot);
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(-frag.w / 2, -frag.h / 2, frag.w, frag.h);
      ctx.fillStyle = "#a0522d";
      ctx.fillRect(-frag.w / 2 + 3, -frag.h / 2 + 3, frag.w - 6, frag.h - 6);
      ctx.fillStyle = "#ffea00";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("BOB", 0, 4);
      ctx.restore();
    }

    function drawRocket(
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      scale: number,
    ) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      // Body dimensions 1.8x original
      const bW = 32;
      const bH = 126;
      const nosH = 54;
      const bX = -bW / 2;
      const bY = -nosH - bH / 2;

      // Exhaust glow
      const glowR = ctx.createRadialGradient(
        0,
        bY + bH + 20,
        5,
        0,
        bY + bH + 20,
        60,
      );
      glowR.addColorStop(0, "rgba(255,200,50,0.5)");
      glowR.addColorStop(1, "rgba(255,100,0,0)");
      ctx.fillStyle = glowR;
      ctx.fillRect(-60, bY + bH - 10, 120, 80);

      // Body gradient
      const bodyGrad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
      bodyGrad.addColorStop(0, "#e8a000");
      bodyGrad.addColorStop(0.3, "#ffd700");
      bodyGrad.addColorStop(0.6, "#ffea00");
      bodyGrad.addColorStop(1, "#ff9800");
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      (ctx as any).roundRect(bX, bY, bW, bH, 5);
      ctx.fill();

      // Panel lines
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1.5;
      for (let pi = 1; pi <= 4; pi++) {
        ctx.beginPath();
        ctx.moveTo(bX + 2, bY + (bH / 5) * pi);
        ctx.lineTo(bX + bW - 2, bY + (bH / 5) * pi);
        ctx.stroke();
      }

      // Nose cone
      ctx.fillStyle = "#ff5722";
      ctx.beginPath();
      ctx.moveTo(bX, bY);
      ctx.lineTo(0, bY - nosH);
      ctx.lineTo(bX + bW, bY);
      ctx.fill();
      // Nose highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.moveTo(bX + 4, bY);
      ctx.lineTo(0, bY - nosH + 10);
      ctx.lineTo(bX + bW / 2 - 2, bY);
      ctx.fill();

      // Porthole window
      ctx.fillStyle = "#ff9800";
      ctx.beginPath();
      ctx.arc(0, bY + bH * 0.3, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#87ceeb";
      ctx.beginPath();
      ctx.arc(0, bY + bH * 0.3, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BOB", 0, bY + bH * 0.3 - 3);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 7px monospace";
      ctx.fillText("ICP", 0, bY + bH * 0.3 + 6);

      // Fins
      ctx.fillStyle = "#ff5722";
      ctx.beginPath();
      ctx.moveTo(bX, bY + bH - 10);
      ctx.lineTo(bX - 28, bY + bH + 18);
      ctx.lineTo(bX, bY + bH + 18);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bX + bW, bY + bH - 10);
      ctx.lineTo(bX + bW + 28, bY + bH + 18);
      ctx.lineTo(bX + bW, bY + bH + 18);
      ctx.fill();
      // Center fin
      ctx.fillStyle = "#e64a19";
      ctx.beginPath();
      ctx.moveTo(-6, bY + bH - 5);
      ctx.lineTo(-6, bY + bH + 25);
      ctx.lineTo(6, bY + bH + 25);
      ctx.lineTo(6, bY + bH - 5);
      ctx.fill();

      // 3 exhaust nozzles
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-bW / 2 - 4, bY + bH + 18, 14, 12);
      ctx.fillRect(-7, bY + bH + 18, 14, 12);
      ctx.fillRect(bW / 2 - 10, bY + bH + 18, 14, 12);
      // Nozzle bells
      ctx.fillStyle = "#374151";
      ctx.fillRect(-bW / 2 - 6, bY + bH + 26, 18, 8);
      ctx.fillRect(-9, bY + bH + 26, 18, 8);
      ctx.fillRect(bW / 2 - 12, bY + bH + 26, 18, 8);

      // Active exhaust flames from 3 nozzles
      const flameLen = 25 + Math.sin(frameRef.current * 0.4) * 8;
      const flameColors = [
        "rgba(255,200,50,0.9)",
        "rgba(255,120,0,0.8)",
        "rgba(255,50,0,0.6)",
      ];
      const nozzleXs = [-bW / 2 + 3, 0, bW / 2 - 3];
      for (const nx of nozzleXs) {
        for (let fi = 0; fi < 3; fi++) {
          ctx.fillStyle = flameColors[fi];
          const fw = (10 - fi * 3) * (0.8 + Math.random() * 0.4);
          ctx.fillRect(
            nx - fw / 2,
            bY + bH + 34 + fi * (flameLen * 0.3),
            fw,
            flameLen * (1 - fi * 0.25),
          );
        }
      }

      ctx.restore();
    }

    function animate() {
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      // Apply launch shake for frames 55-80
      if (f >= 55 && f < 80) {
        ctx.save();
        ctx.translate(Math.sin(f * 7) * 3, Math.cos(f * 5) * 2);
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      const dayness = Math.max(0, 1 - f / 200);
      const r1 = Math.floor(10 + dayness * 100);
      const g1 = Math.floor(5 + dayness * 140);
      const b1 = Math.floor(20 + dayness * 200);
      skyGrad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
      skyGrad.addColorStop(
        1,
        `rgb(${Math.floor(r1 * 1.5)},${Math.floor(g1 * 1.2)},${Math.floor(b1 * 0.8)})`,
      );
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Stars with streak effect when ascending fast
      const starAlpha = Math.min(1, Math.max(0, (f - 100) / 150));
      if (starAlpha > 0) {
        const rocketSpeed = f > 80 ? Math.min(12, (f - 80) * 0.08) : 0;
        const streakLen = rocketSpeed * 8;
        for (const s of stars) {
          ctx.globalAlpha = s.alpha * starAlpha;
          if (streakLen > 2 && f > 120) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = s.r * 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y * 0.6);
            ctx.lineTo(s.x, s.y * 0.6 + streakLen * s.r);
            ctx.stroke();
          } else {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(s.x, s.y * 0.6, s.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }

      if (f > 200) {
        const moonProgress = Math.min(1, (f - 200) / 200);
        const moonY = H * 0.15 - moonProgress * H * 0.05;
        drawPixelMoon(ctx, W * 0.7, moonY, 70, Math.min(1, moonProgress * 2));
      }

      const groundY = H * 0.72;
      ctx.fillStyle = "#3d2200";
      ctx.fillRect(0, groundY, W, H - groundY);
      ctx.fillStyle = "#4a2d00";
      ctx.fillRect(0, groundY, W, 8);
      // Grass on top of ground
      ctx.fillStyle = "#2d5a1b";
      ctx.fillRect(0, groundY, W, 4);

      const shopY = groundY - 95;

      // Initialize fragment positions based on shopY
      if (!fragmentsInitialized) {
        shopFragments[0].y = shopY + 45;
        shopFragments[1].y = shopY + 45;
        shopFragments[2].y = shopY + 20;
        shopFragments[3].y = shopY + 25;
        fragmentsInitialized = true;
      }

      if (f < 100) {
        const splitStart = 40;
        const splitProgress =
          f < splitStart ? 0 : Math.min(1, (f - splitStart) / 60);

        if (splitProgress === 0) {
          // Intact shop using detailed pixel art
          ctx.save();
          // Brick walls
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(W / 2 - 105, shopY, 210, 95);
          ctx.fillStyle = "#a0522d";
          ctx.fillRect(W / 2 - 100, shopY + 5, 200, 80);
          // Brickwork pattern
          ctx.fillStyle = "#7a3d10";
          for (let brow = 0; brow < 6; brow++) {
            const offset = brow % 2 === 0 ? 0 : 20;
            for (let bcol = 0; bcol < 6; bcol++) {
              ctx.fillRect(
                W / 2 - 98 + bcol * 34 + offset,
                shopY + 8 + brow * 13,
                30,
                10,
              );
            }
          }
          // Roof
          ctx.fillStyle = "#5c2d00";
          ctx.beginPath();
          ctx.moveTo(W / 2 - 115, shopY);
          ctx.lineTo(W / 2, shopY - 32);
          ctx.lineTo(W / 2 + 115, shopY);
          ctx.fill();
          // Sign
          ctx.fillStyle = "#ffea00";
          ctx.shadowColor = "#ffea00";
          ctx.shadowBlur = 8;
          ctx.font = "bold 20px monospace";
          ctx.textAlign = "center";
          ctx.fillText("BOB SHOP", W / 2, shopY + 38);
          ctx.shadowBlur = 0;
          // Windows
          ctx.fillStyle = "#87CEEB";
          ctx.fillRect(W / 2 - 70, shopY + 50, 30, 25);
          ctx.fillRect(W / 2 + 40, shopY + 50, 30, 25);
          ctx.restore();
        } else {
          // Shop breaking apart - 4 fragments flying away
          const sp = splitProgress;
          for (let fi = 0; fi < shopFragments.length; fi++) {
            const frag = shopFragments[fi];
            frag.x += frag.vx * sp * 2;
            frag.y += frag.vy * sp * 1.5;
            frag.rot += frag.rotV * sp;
            drawShopFragment(ctx, frag);
          }
          // Central explosion glow
          const glowAlpha = splitProgress * 0.8;
          const glowGrad = ctx.createRadialGradient(
            W / 2,
            shopY + 40,
            0,
            W / 2,
            shopY + 40,
            120 * splitProgress,
          );
          glowGrad.addColorStop(0, `rgba(255,234,0,${glowAlpha})`);
          glowGrad.addColorStop(0.5, `rgba(255,100,0,${glowAlpha * 0.5})`);
          glowGrad.addColorStop(1, "rgba(255,0,0,0)");
          ctx.fillStyle = glowGrad;
          ctx.fillRect(W / 2 - 120, shopY - 30, 240, 140);
        }
      } else {
        // Fragments continue flying off screen
        const flyProgress = Math.min(1, (f - 100) / 80);
        for (let fi = 0; fi < shopFragments.length; fi++) {
          const frag = shopFragments[fi];
          frag.x += frag.vx * (1 + flyProgress * 3);
          frag.y += frag.vy * (1 + flyProgress * 2);
          frag.vy += 0.1; // gravity
          frag.rot += frag.rotV;
          if (Math.abs(frag.x - W / 2) < W && frag.y < H + 100) {
            drawShopFragment(ctx, frag);
          }
        }
      }

      // Countdown text (frames 20-79, before liftoff at 80)
      if (f >= 20 && f < 80) {
        const countdownAlpha =
          f < 30 ? (f - 20) / 10 : f > 70 ? (80 - f) / 10 : 1;
        const countdownNum = f < 40 ? 3 : f < 56 ? 2 : f < 72 ? 1 : null;
        const countdownText =
          countdownNum !== null ? String(countdownNum) : "LAUNCH!";
        const isLaunch = countdownNum === null;
        ctx.save();
        ctx.globalAlpha = countdownAlpha;
        ctx.font = `bold ${isLaunch ? 52 : 80}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isLaunch ? "#ffd700" : "#ffffff";
        ctx.shadowColor = isLaunch ? "#ffd700" : "#ff8800";
        ctx.shadowBlur = 30;
        ctx.fillText(countdownText, W / 2, H * 0.3);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Screen flash at liftoff (frames 60-75)
      if (f >= 60 && f < 75) {
        const flashA = Math.max(0, ((75 - f) / 15) * 0.9);
        ctx.fillStyle = `rgba(255,255,255,${flashA})`;
        ctx.fillRect(0, 0, W, H);
      }

      if (f >= 60) {
        const rocketStartFrame = 80;
        const rocketCY =
          f < rocketStartFrame
            ? shopY + 30
            : shopY +
              30 -
              ((f - rocketStartFrame) / (TOTAL_FRAMES - rocketStartFrame)) **
                1.5 *
                (H * 1.3);
        const rocketScale = Math.min(2.0, 1.4 + (f - 60) / 200);

        // White screen flash at liftoff moment
        if (f >= rocketStartFrame && f < rocketStartFrame + 10) {
          const liftAlpha = ((rocketStartFrame + 10 - f) / 10) * 0.4;
          ctx.save();
          ctx.globalAlpha = liftAlpha;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }

        // Add flame trail particles
        if (f >= rocketStartFrame) {
          // Extra burst particles at exact liftoff moment
          const burstCount = f === rocketStartFrame ? 8 : 3;
          for (let tp = 0; tp < burstCount; tp++) {
            const angle = f === rocketStartFrame ? (tp / 8) * Math.PI * 2 : 0;
            const speed = f === rocketStartFrame ? 3 + Math.random() * 4 : 0;
            flameTrail.push({
              x:
                W / 2 +
                (f === rocketStartFrame
                  ? Math.cos(angle) * 20
                  : (Math.random() - 0.5) * 30),
              y:
                rocketCY +
                60 * rocketScale +
                (f === rocketStartFrame
                  ? Math.sin(angle) * 20
                  : Math.random() * 20),
              r:
                f === rocketStartFrame
                  ? 8 + Math.random() * 6
                  : 4 + Math.random() * 8,
              life:
                f === rocketStartFrame
                  ? 30 + Math.floor(Math.random() * 20)
                  : 20 + Math.floor(Math.random() * 20),
              maxLife: f === rocketStartFrame ? 50 : 40,
              color: ["#ff8800", "#ffdd00", "#fff0a0", "#ff4400"][
                Math.floor(Math.random() * 4)
              ],
            });
            if (f === rocketStartFrame && speed > 0) {
              // Give burst particles velocity by nudging position
              flameTrail[flameTrail.length - 1].x += Math.cos(angle) * speed;
              flameTrail[flameTrail.length - 1].y += Math.sin(angle) * speed;
            }
          }
        }

        // Draw and update flame trail
        let trAlive = 0;
        for (let ti = 0; ti < flameTrail.length; ti++) {
          const tr = flameTrail[ti];
          tr.y += 1.5;
          tr.r *= 0.95;
          tr.life--;
          if (tr.life > 0) {
            flameTrail[trAlive++] = tr;
            ctx.globalAlpha = (tr.life / tr.maxLife) * 0.7;
            ctx.fillStyle = tr.color;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
        flameTrail.length = trAlive;

        drawRocket(ctx, W / 2, rocketCY, rocketScale);

        // Gold pulsing ring radiating outward from rocket
        if (f >= 80) {
          const ringAge = (f - 80) % 40;
          const ringAlpha = Math.max(0, 1 - ringAge / 40) * 0.6;
          const ringRadius = ringAge * 4 + 20;
          ctx.save();
          ctx.globalAlpha = ringAlpha;
          ctx.strokeStyle = "#ffd700";
          ctx.shadowColor = "#ffd700";
          ctx.shadowBlur = 12;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(W / 2, rocketCY + 10, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          // Second ring offset by 20 frames
          const ringAge2 = (f - 80 + 20) % 40;
          const ringAlpha2 = Math.max(0, 1 - ringAge2 / 40) * 0.4;
          const ringRadius2 = ringAge2 * 4 + 20;
          ctx.globalAlpha = ringAlpha2;
          ctx.beginPath();
          ctx.arc(W / 2, rocketCY + 10, ringRadius2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }

      if (f >= 55 && f < 80) {
        ctx.restore(); // end shake
      }

      // "BOB HAS LEFT THE BUILDING" when rocket exits
      if (f >= 270 && f < 340) {
        const buildingAlpha =
          f < 290 ? (f - 270) / 20 : f > 320 ? (340 - f) / 20 : 1;
        ctx.save();
        ctx.globalAlpha = buildingAlpha;
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 20;
        ctx.fillText("BOB HAS LEFT THE BUILDING", W / 2, H * 0.45);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      if (f >= 340) {
        const textAlpha = Math.min(1, (f - 340) / 60);
        ctx.globalAlpha = textAlpha;
        // Main "TO THE MOON" text
        ctx.font = "bold 64px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 30;
        ctx.fillText("🚀 TO THE MOON", W / 2, H * 0.38);
        ctx.shadowBlur = 0;
        // Subtitle
        ctx.font = "bold 22px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#00aaff";
        ctx.shadowBlur = 12;
        ctx.fillText("BOB GENESIS BLOCK SECURED", W / 2, H * 0.38 + 60);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      frameRef.current++;
      if (frameRef.current < TOTAL_FRAMES) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        background: "#000a1a",
      }}
    />
  );
}

// ─── NPC Portrait Component ────────────────────────────────────────────────────
function NpcPortrait({ npcId, size = 48 }: { npcId: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef2 = useRef(0);
  const blinkRef2 = useRef(false);
  const rafRef2 = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawPortrait = (yOffset = 0, blink = false) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const s = size;
      ctx.clearRect(0, 0, s, s);

      const px = (
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
      ) => {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round((x * s) / 16),
          Math.round((y * s) / 16) + yOffset,
          Math.round((w * s) / 16),
          Math.round((h * s) / 16),
        );
      };

      if (npcId === "jerry" || npcId === "jerry_underground") {
        // Jerry Banfield - enthusiastic shopkeeper, bright eyes, big smile
        // Spiky energetic hair
        px(5, 0, 1, 2, "#f97316"); // spike 1
        px(7, 0, 2, 1, "#f97316"); // spike 2
        px(9, 0, 1, 2, "#f97316"); // spike 3
        px(11, 0, 1, 3, "#f97316"); // spike 4
        px(3, 1, 10, 3, "#f97316"); // hair body
        px(2, 2, 2, 3, "#ea580c"); // hair side L
        px(12, 2, 2, 3, "#ea580c"); // hair side R
        // Face
        px(3, 4, 10, 7, "#fcd9a8"); // face wide
        px(2, 5, 1, 4, "#fcd9a8"); // ear L
        px(13, 5, 1, 4, "#fcd9a8"); // ear R
        px(2, 6, 1, 1, "#e8b888"); // ear detail L
        px(13, 6, 1, 1, "#e8b888"); // ear detail R
        // Raised excited eyebrows
        px(3, 4, 3, 1, "#d06010"); // eyebrow L arched
        px(10, 4, 3, 1, "#d06010"); // eyebrow R arched
        // Big bright eyes
        if (!blink) {
          px(4, 5, 3, 3, "#1a0a00"); // eye socket L
          px(10, 5, 3, 3, "#1a0a00"); // eye socket R
          px(4, 5, 3, 3, "#4b2e0d"); // eye L brown
          px(10, 5, 3, 3, "#4b2e0d"); // eye R brown
          px(5, 5, 1, 1, "#fff"); // eye shine L top
          px(4, 6, 1, 1, "#fff"); // eye shine L bottom
          px(11, 5, 1, 1, "#fff"); // eye shine R top
          px(10, 6, 1, 1, "#fff"); // eye shine R bottom
          // Bright excited pupils
          px(5, 6, 1, 1, "#8b4513"); // pupil L
          px(11, 6, 1, 1, "#8b4513"); // pupil R
        } else {
          px(4, 7, 3, 1, "#4b2e0d"); // blink L
          px(10, 7, 3, 1, "#4b2e0d"); // blink R
        }
        // Rosy cheeks (enthusiasm!)
        px(3, 8, 2, 2, "#ffaa88"); // blush L big
        px(11, 8, 2, 2, "#ffaa88"); // blush R big
        // Big wide smile
        px(4, 9, 8, 1, "#c04a10"); // smile top
        px(4, 9, 8, 2, "#e05010"); // smile area
        px(4, 9, 1, 1, "#fff"); // teeth
        px(5, 9, 1, 1, "#fff");
        px(6, 9, 1, 1, "#fff");
        px(7, 9, 1, 1, "#fff");
        px(8, 9, 1, 1, "#fff");
        px(9, 9, 1, 1, "#fff");
        px(10, 9, 1, 1, "#fff");
        px(4, 10, 8, 1, "#c04a10"); // smile bottom
        // Neck
        px(6, 11, 4, 1, "#fcd9a8");
        // Orange shirt + tie
        px(3, 12, 10, 4, "#ea580c"); // orange shirt
        px(6, 12, 4, 1, "#fbbf24"); // gold tie
        px(7, 13, 2, 2, "#f59e0b"); // tie detail
        // Microphone
        px(11, 12, 2, 3, "#888888"); // mic handle
        px(10, 11, 3, 2, "#cccccc"); // mic head
        px(11, 11, 1, 1, "#eee"); // mic shine
      } else if (npcId === "dom" || npcId === "dominic") {
        // Dom - visionary, serious, thoughtful expression
        // Distinguished dark hair
        px(4, 0, 8, 1, "#0a0500"); // hair top
        px(3, 1, 10, 3, "#1a0a00"); // hair body
        px(2, 2, 2, 4, "#0f0800"); // sideburn L
        px(12, 2, 2, 4, "#0f0800"); // sideburn R
        px(5, 1, 6, 1, "#2d1200"); // hair highlight
        // Thoughtful tanned face
        px(3, 4, 10, 7, "#d4956a"); // face
        px(2, 5, 1, 4, "#d4956a"); // ear L
        px(13, 5, 1, 4, "#d4956a"); // ear R
        px(2, 6, 1, 1, "#b87a50"); // ear detail L
        px(13, 6, 1, 1, "#b87a50"); // ear detail R
        // Strong intense eyebrows (slightly furrowed = thinking)
        px(3, 4, 4, 1, "#0a0500"); // eyebrow L thick
        px(3, 4, 4, 1, "#1a0a00"); // eyebrow L
        px(9, 4, 4, 1, "#0a0500"); // eyebrow R thick
        px(10, 4, 3, 1, "#1a0a00"); // eyebrow R
        px(6, 4, 1, 1, "#3a2010"); // furrow center
        // Deep set visionary eyes
        if (!blink) {
          px(3, 5, 4, 3, "#1a1a2e"); // eye socket L
          px(9, 5, 4, 3, "#1a1a2e"); // eye socket R
          px(4, 5, 2, 2, "#0d0d1e"); // iris L deep
          px(10, 5, 2, 2, "#0d0d1e"); // iris R deep
          px(4, 5, 2, 1, "#2a2a5e"); // iris highlight L
          px(10, 5, 2, 1, "#2a2a5e"); // iris highlight R
          px(5, 5, 1, 1, "#7bc8f6"); // eye shine L (visionary blue!)
          px(11, 5, 1, 1, "#7bc8f6"); // eye shine R
        } else {
          px(3, 6, 4, 1, "#1a1a2e"); // blink L
          px(9, 6, 4, 1, "#1a1a2e"); // blink R
        }
        // Slight stubble - gives gravitas
        px(4, 9, 1, 1, "#5a3018");
        px(6, 9, 1, 1, "#5a3018");
        px(9, 9, 1, 1, "#5a3018");
        px(11, 9, 1, 1, "#5a3018");
        px(5, 10, 1, 1, "#5a3018");
        px(8, 10, 1, 1, "#5a3018");
        px(10, 10, 1, 1, "#5a3018");
        // Firm mouth - determined, not quite smiling
        px(5, 8, 6, 1, "#aa5030"); // lips
        px(6, 8, 4, 1, "#c26040"); // lip highlight
        // Neck
        px(6, 11, 4, 1, "#d4956a");
        // ICP blue suit
        px(3, 12, 10, 4, "#1e3a8a"); // suit
        px(5, 12, 6, 1, "#f8f8ff"); // white shirt
        px(7, 12, 2, 4, "#f8f8ff"); // tie base
        px(7, 13, 2, 2, "#f5c542"); // gold tie
        px(7, 15, 2, 1, "#d4a830"); // tie point
        px(6, 12, 1, 1, "#f5c542"); // ICP lapel pin L
        px(9, 12, 1, 1, "#f5c542"); // ICP lapel pin R
        px(3, 13, 2, 3, "#0f172a"); // suit lapel L
        px(11, 13, 2, 3, "#0f172a"); // suit lapel R
      } else if (npcId === "kyle") {
        // Kyle Langham - energetic hype man, spiky warm golden hair, flashy orange shirt, gold chain
        // Wild spiky hair - warm golden with orange tips
        px(7, 0, 2, 1, "#fbbf24"); // top spike center
        px(5, 0, 2, 2, "#f59e0b"); // spike left
        px(9, 0, 2, 2, "#f59e0b"); // spike right
        px(3, 1, 2, 2, "#ea580c"); // outer spike L
        px(11, 1, 2, 2, "#ea580c"); // outer spike R
        px(1, 2, 2, 3, "#f97316"); // wide hair wing L
        px(13, 2, 2, 3, "#f97316"); // wide hair wing R
        px(3, 2, 10, 3, "#fbbf24"); // hair body golden
        px(5, 1, 6, 2, "#fcd34d"); // hair highlight bright
        // Face - warm golden tan
        px(3, 4, 10, 7, "#fed7aa"); // face warm
        px(2, 5, 1, 4, "#fed7aa"); // ear L
        px(13, 5, 1, 4, "#fed7aa"); // ear R
        px(2, 6, 1, 1, "#fbb68a"); // ear inner L
        px(13, 6, 1, 1, "#fbb68a"); // ear inner R
        // Arched excited eyebrows
        px(3, 4, 3, 1, "#d97706"); // brow L arched high
        px(10, 4, 3, 1, "#d97706"); // brow R arched high
        // Bright energetic eyes
        if (!blink) {
          px(4, 5, 3, 3, "#1a0a00"); // eye socket L
          px(9, 5, 3, 3, "#1a0a00"); // eye socket R
          px(4, 5, 3, 2, "#f97316"); // eye iris L orange (hype!)
          px(9, 5, 3, 2, "#f97316"); // eye iris R orange
          px(5, 5, 1, 1, "#fff"); // shine L top
          px(4, 6, 1, 1, "#fff"); // shine L bottom
          px(10, 5, 1, 1, "#fff"); // shine R top
          px(9, 6, 1, 1, "#fff"); // shine R bottom
          px(5, 6, 1, 1, "#b45309"); // pupil L
          px(10, 6, 1, 1, "#b45309"); // pupil R
        } else {
          px(4, 7, 3, 1, "#f97316"); // blink L
          px(9, 7, 3, 1, "#f97316"); // blink R
        }
        // Rosy hyped cheeks
        px(3, 8, 2, 2, "#fb923c"); // blush L
        px(11, 8, 2, 2, "#fb923c"); // blush R
        // Massive grin showing teeth
        px(4, 9, 8, 1, "#c2410c"); // smile top lip
        px(4, 10, 8, 1, "#ea580c"); // smile area
        px(4, 9, 1, 1, "#fff"); // teeth row
        px(5, 9, 1, 1, "#fff");
        px(6, 9, 1, 1, "#fff");
        px(7, 9, 1, 1, "#fff");
        px(8, 9, 1, 1, "#fff");
        px(9, 9, 1, 1, "#fff");
        px(10, 9, 1, 1, "#fff");
        px(4, 10, 8, 1, "#c2410c"); // smile bottom
        // Neck
        px(6, 11, 4, 1, "#fed7aa");
        // Flashy orange shirt
        px(2, 12, 12, 4, "#ea580c"); // orange shirt bold
        px(7, 12, 2, 4, "#dc2626"); // collar detail red
        // Gold chain (hype man essential)
        px(3, 12, 10, 1, "#fcd34d"); // gold chain
        px(5, 13, 6, 1, "#fbbf24"); // chain lower
        px(7, 14, 2, 1, "#f59e0b"); // chain pendant
        px(7, 14, 2, 1, "#fcd34d"); // pendant gleam
      } else if (npcId === "arthur") {
        // Arthur Falls - ICP media host, slick styled dark hair, charming smile, purple suit
        // Perfectly styled dark hair - swept back media look
        px(3, 0, 10, 1, "#0f0c20"); // hair very dark
        px(2, 0, 12, 3, "#1a1530"); // hair body dark
        px(2, 1, 2, 3, "#0f0c1a"); // hair side L
        px(12, 1, 2, 3, "#0f0c1a"); // hair side R
        px(5, 0, 6, 1, "#2e2850"); // hair highlight top
        px(4, 1, 4, 1, "#352d5a"); // shine streak 1
        px(8, 1, 3, 1, "#252048"); // hair depth
        // Pompadour front lift
        px(6, 0, 4, 1, "#3d3568"); // pompadour front
        // Face - charismatic TV host complexion (slightly warm)
        px(3, 3, 10, 8, "#f5d5aa"); // face warm ivory
        px(2, 5, 1, 4, "#f5d5aa"); // ear L
        px(13, 5, 1, 4, "#f5d5aa"); // ear R
        px(2, 6, 1, 2, "#d8b888"); // ear inner L
        px(13, 6, 1, 2, "#d8b888"); // ear inner R
        // Styled dark eyebrows - sharp and expressive
        px(4, 3, 3, 1, "#1a1530"); // brow L sharp
        px(9, 3, 3, 1, "#1a1530"); // brow R sharp
        px(4, 3, 1, 1, "#0f0c20"); // brow dark tip L
        px(9, 3, 1, 1, "#0f0c20"); // brow dark tip R
        // Charismatic deep blue-grey eyes with sparkle
        if (!blink) {
          px(4, 5, 3, 3, "#0f1525"); // eye socket L deep
          px(9, 5, 3, 3, "#0f1525"); // eye socket R deep
          px(4, 5, 3, 2, "#1a3a6e"); // iris L rich navy
          px(9, 5, 3, 2, "#1a3a6e"); // iris R rich navy
          px(4, 5, 3, 1, "#2454a0"); // upper iris lighter L
          px(9, 5, 3, 1, "#2454a0"); // upper iris lighter R
          px(5, 5, 1, 1, "#ffffff"); // shine L bright
          px(4, 6, 1, 1, "#93c5fd"); // iris rim L
          px(10, 5, 1, 1, "#ffffff"); // shine R bright
          px(9, 6, 1, 1, "#93c5fd"); // iris rim R
          px(5, 6, 1, 1, "#0c1830"); // pupil L
          px(10, 6, 1, 1, "#0c1830"); // pupil R
          px(6, 7, 1, 1, "#f5d5aa"); // lower eyelid highlight L
          px(11, 7, 1, 1, "#f5d5aa"); // lower eyelid highlight R
        } else {
          px(4, 7, 3, 1, "#1a3a6e"); // blink L
          px(9, 7, 3, 1, "#1a3a6e"); // blink R
        }
        // Defined nose
        px(7, 7, 2, 2, "#d8b888"); // nose
        // Big warm charismatic smile - teeth visible
        px(4, 9, 8, 1, "#a04020"); // lips top
        px(4, 9, 8, 2, "#c05030"); // mouth open
        px(5, 9, 6, 1, "#f5f5f5"); // teeth row
        px(5, 10, 6, 1, "#e8e0d8"); // teeth bottom row
        px(4, 10, 1, 1, "#a04020"); // corner L
        px(11, 10, 1, 1, "#a04020"); // corner R
        px(4, 11, 8, 1, "#a04020"); // lip bottom
        // Light laugh lines
        px(3, 9, 1, 2, "#e8c090"); // laugh line L
        px(12, 9, 1, 2, "#e8c090"); // laugh line R
        // Neck
        px(6, 12, 4, 1, "#f5d5aa");
        // Sharp purple media suit
        px(2, 13, 12, 3, "#4c1d95"); // purple suit body
        px(2, 13, 3, 3, "#3b1075"); // lapel shadow L
        px(11, 13, 3, 3, "#3b1075"); // lapel shadow R
        px(2, 14, 2, 2, "#3b1075"); // lapel L deeper
        px(12, 14, 2, 2, "#3b1075"); // lapel R deeper
        // Crisp white shirt
        px(5, 12, 6, 2, "#f8fafc"); // shirt collar white
        px(6, 13, 4, 3, "#f0f4f8"); // shirt chest
        // Purple-gold tie
        px(7, 13, 2, 3, "#7c3aed"); // tie
        px(7, 14, 2, 1, "#fbbf24"); // tie clip gold
        // TV station microphone - branded
        px(0, 8, 2, 7, "#374151"); // mic handle thin
        px(0, 8, 3, 3, "#f1f5f9"); // mic head foam
        px(1, 9, 1, 1, "#9ca3af"); // mic grille L
        px(0, 10, 1, 1, "#6b7280"); // mic grille pattern
        // Gold star badge on lapel
        px(3, 14, 2, 2, "#f59e0b"); // star badge
        px(3, 14, 1, 1, "#fde68a"); // badge shine
        px(4, 15, 1, 1, "#fbbf24"); // star point
      } else if (npcId === "whale" || npcId === "whale_underground") {
        // The Whale - large, mysterious, dark suit, gold chain, monocle
        px(3, 0, 10, 3, "#1e1b4b"); // massive dark hair
        px(2, 2, 12, 9, "#2d2040"); // large mysterious face
        px(1, 4, 2, 5, "#1e1b4b"); // wide side L
        px(13, 4, 2, 5, "#1e1b4b"); // wide side R
        px(3, 3, 3, 1, "#1e1b4b"); // thick brow L
        px(10, 3, 3, 1, "#1e1b4b"); // thick brow R
        if (!blink) {
          px(4, 5, 2, 2, "#ffd700"); // golden eye L
          px(10, 5, 2, 2, "#ffd700"); // golden eye R
          px(5, 5, 1, 1, "#fff5"); // subtle shine L
          // Monocle on R eye
          px(9, 4, 4, 4, "#888888"); // monocle frame (outline)
          px(10, 5, 2, 2, "#ffd700"); // golden eye R (redraw over monocle)
          px(11, 5, 1, 1, "#fff5"); // shine R
        } else {
          px(4, 6, 2, 1, "#ffd700"); // blink L
          px(10, 6, 2, 1, "#ffd700"); // blink R
        }
        px(6, 8, 4, 1, "#c084fc"); // enigmatic smile
        px(6, 9, 4, 1, "#2d2040"); // neck
        px(2, 10, 12, 5, "#312e81"); // dark suit
        px(5, 9, 6, 1, "#ffd700"); // gold chain around neck
        px(6, 11, 4, 1, "#ffd700"); // chain detail on suit
        px(7, 12, 2, 2, "#6d28d9"); // mysterious gem on chain
      } else if (npcId === "wenzel") {
        // Wenzel - tech/radar guy, glasses, headset antenna, lab coat
        // Lab coat - white/light gray head
        px(4, 0, 8, 2, "#374151"); // dark neat hair
        px(3, 1, 10, 2, "#4b5563"); // hair sides
        px(5, 0, 6, 1, "#6b7280"); // hair highlight
        // Pale scholarly face
        px(3, 3, 10, 8, "#e8d8c0"); // face pale tech worker
        px(2, 5, 1, 4, "#e8d8c0"); // ear L
        px(13, 5, 1, 4, "#e8d8c0"); // ear R
        px(2, 6, 1, 1, "#c8b090"); // ear inner L
        px(13, 6, 1, 1, "#c8b090"); // ear inner R
        // Focused narrow eyebrows
        px(4, 3, 3, 1, "#374151"); // brow L
        px(9, 3, 3, 1, "#374151"); // brow R
        // Thick-framed glasses + keen eyes
        if (!blink) {
          px(3, 4, 4, 3, "#065f46"); // thick glasses frame L green
          px(9, 4, 4, 3, "#065f46"); // thick glasses frame R green
          px(7, 5, 2, 1, "#065f46"); // glasses bridge
          px(4, 5, 2, 2, "#6ee7b7"); // eye behind glasses L teal
          px(10, 5, 2, 2, "#6ee7b7"); // eye behind glasses R teal
          px(4, 5, 1, 1, "#fff"); // shine L
          px(10, 5, 1, 1, "#fff"); // shine R
          px(5, 6, 1, 1, "#047857"); // pupil L
          px(11, 6, 1, 1, "#047857"); // pupil R
        } else {
          px(3, 6, 4, 1, "#065f46"); // blink L (glasses visible)
          px(9, 6, 4, 1, "#065f46"); // blink R
          px(7, 5, 2, 1, "#065f46"); // bridge
        }
        // Small analytical mouth
        px(6, 9, 4, 1, "#8b6040"); // thin mouth
        px(6, 9, 4, 1, "#9a7050"); // mouth
        // Neck
        px(6, 11, 4, 1, "#e8d8c0");
        // White lab coat
        px(2, 12, 12, 4, "#f3f4f6"); // lab coat white
        px(5, 12, 6, 1, "#e5e7eb"); // collar
        px(7, 12, 2, 3, "#d1d5db"); // shirt under
        px(2, 13, 2, 3, "#d1d5db"); // lapel L
        px(12, 13, 2, 3, "#d1d5db"); // lapel R
        // Pocket on lab coat with green LED
        px(3, 13, 3, 2, "#e5e7eb"); // pocket
        px(4, 13, 1, 1, "#22c55e"); // green LED blink
        // Headset/antenna on head - tech signature
        px(13, 2, 1, 3, "#6b7280"); // headset band R
        px(13, 2, 2, 1, "#9ca3af"); // headset ear piece
        px(14, 0, 1, 3, "#4b5563"); // antenna stem
        px(14, 0, 1, 1, "#22c55e"); // antenna tip green lit
      } else if (npcId === "diego") {
        // Diego - community mod, calm confident Latino face, detailed mod badge
        // Short dark hair with fade sides
        px(4, 0, 8, 1, "#1c1917"); // hair top
        px(3, 0, 10, 2, "#0f0e0d"); // hair body
        px(2, 1, 2, 3, "#1c1917"); // sideburn L fade
        px(12, 1, 2, 3, "#1c1917"); // sideburn R fade
        px(5, 0, 5, 1, "#2d2019"); // hair highlight
        // Face - warm latino/brown skin tone
        px(3, 3, 10, 8, "#c07844"); // face
        px(2, 5, 1, 4, "#c07844"); // ear L
        px(13, 5, 1, 4, "#c07844"); // ear R
        px(2, 6, 1, 2, "#a05e30"); // ear shadow L
        px(13, 6, 1, 2, "#a05e30"); // ear shadow R
        // Strong defined brow
        px(3, 3, 4, 1, "#3d1800"); // brow L thick
        px(9, 3, 4, 1, "#3d1800"); // brow R thick
        // Confident, slightly narrowed eyes - dark brown
        if (!blink) {
          px(3, 5, 4, 3, "#0f0a04"); // eye socket L deep
          px(9, 5, 4, 3, "#0f0a04"); // eye socket R deep
          px(4, 5, 2, 2, "#3b1a04"); // iris L brown
          px(10, 5, 2, 2, "#3b1a04"); // iris R brown
          px(4, 5, 1, 1, "#5a2c08"); // iris highlight L
          px(10, 5, 1, 1, "#5a2c08"); // iris highlight R
          px(5, 5, 1, 1, "#ffffffaa"); // eye shine L
          px(11, 5, 1, 1, "#ffffffaa"); // eye shine R
          // Upper eyelid shadow
          px(3, 5, 4, 1, "#0f0a04"); // lid L
          px(9, 5, 4, 1, "#0f0a04"); // lid R
        } else {
          px(3, 6, 4, 1, "#3b1a04"); // blink L
          px(9, 6, 4, 1, "#3b1a04"); // blink R
          px(3, 6, 4, 1, "#c07844"); // face over blink
        }
        // Defined nose
        px(7, 6, 2, 2, "#a05e30"); // nose bridge
        px(6, 7, 4, 1, "#a05e30"); // nose tip
        // Confident smirk - slight right raise
        px(5, 9, 5, 1, "#7a3d14"); // mouth closed
        px(9, 9, 1, 1, "#c07844"); // smirk right corner up
        px(6, 10, 3, 1, "#f5c097"); // lower lip highlight
        // Light stubble
        px(4, 9, 8, 1, "#7a4020"); // chin stubble
        // Neck
        px(6, 11, 4, 2, "#c07844");
        // Dark tactical navy shirt
        px(2, 12, 12, 4, "#0c1527"); // shirt body
        px(2, 12, 3, 4, "#091020"); // shirt shadow L
        px(11, 12, 3, 4, "#091020"); // shirt shadow R
        // Collar
        px(5, 12, 6, 1, "#162040"); // collar
        // Official MOD badge - blue glowing
        px(3, 13, 5, 3, "#0c2040"); // badge bg dark
        px(3, 13, 5, 1, "#1d4ed8"); // badge top stripe
        px(4, 14, 1, 1, "#60a5fa"); // MOD text pixel 1
        px(5, 14, 1, 1, "#60a5fa"); // MOD text pixel 2
        px(6, 14, 1, 1, "#60a5fa"); // MOD text pixel 3
        px(3, 15, 5, 1, "#1e3a8a"); // badge bottom stripe
        // Shield icon on badge
        px(7, 14, 1, 1, "#38bdf8"); // shield highlight
        // Headset earpiece
        px(2, 5, 1, 1, "#374151"); // earpiece
        px(2, 4, 1, 2, "#4b5563"); // headset band
      } else if (npcId === "jan") {
        // Jan Camenisch - Swiss cryptographer, silver hair, rectangular glasses, neat beard
        // Silver/grey professorial hair - slightly receding temples
        px(4, 0, 8, 1, "#9ca3af"); // hair top
        px(3, 0, 10, 2, "#6b7280"); // hair body
        px(2, 1, 2, 3, "#4b5563"); // temple L receding
        px(12, 1, 2, 3, "#4b5563"); // temple R receding
        px(3, 1, 3, 1, "#9ca3af"); // hair highlight L
        px(10, 1, 3, 1, "#9ca3af"); // hair highlight R
        // Pale scholarly European complexion
        px(3, 3, 10, 8, "#f0d8b8"); // face
        px(2, 5, 1, 4, "#f0d8b8"); // ear L
        px(13, 5, 1, 4, "#f0d8b8"); // ear R
        px(2, 6, 1, 2, "#d8b898"); // ear inner L
        px(13, 6, 1, 2, "#d8b898"); // ear inner R
        // Serious intellectual brows
        px(3, 3, 4, 1, "#4b5563"); // brow L strong
        px(9, 3, 4, 1, "#4b5563"); // brow R strong
        // Rectangular academic glasses - hallmark of Jan
        if (!blink) {
          // Glass frames - thick rectangular
          px(2, 4, 6, 4, "#374151"); // frame outline L
          px(2, 4, 6, 1, "#374151"); // frame top L
          px(2, 7, 6, 1, "#374151"); // frame bottom L
          px(2, 4, 1, 4, "#374151"); // frame side L
          px(7, 4, 1, 4, "#374151"); // frame inner L
          px(8, 5, 2, 1, "#4b5563"); // bridge
          px(8, 4, 6, 4, "#374151"); // frame outline R
          px(8, 4, 6, 1, "#374151"); // frame top R
          px(8, 7, 6, 1, "#374151"); // frame bottom R
          px(13, 4, 1, 4, "#374151"); // frame side R
          // Lens fill - slight blue tint (computer screens)
          px(3, 5, 4, 2, "#dde8f4"); // lens L
          px(9, 5, 4, 2, "#dde8f4"); // lens R
          // Eyes behind glasses
          px(4, 5, 2, 2, "#2c4a6e"); // iris L slate blue
          px(10, 5, 2, 2, "#2c4a6e"); // iris R slate blue
          px(5, 5, 1, 1, "#ffffff99"); // lens shine L
          px(11, 5, 1, 1, "#ffffff99"); // lens shine R
          px(5, 6, 1, 1, "#0f2040"); // pupil L
          px(11, 6, 1, 1, "#0f2040"); // pupil R
        } else {
          px(2, 6, 6, 1, "#374151"); // frame + blink L
          px(8, 6, 6, 1, "#374151"); // frame + blink R
          px(8, 5, 2, 1, "#4b5563"); // bridge
        }
        // Neat salt-and-pepper beard
        px(4, 8, 8, 1, "#9ca3af"); // beard top lighter
        px(3, 8, 10, 3, "#6b7280"); // beard body
        px(5, 9, 6, 1, "#4b5563"); // beard dark patches
        px(4, 10, 8, 1, "#6b7280"); // beard chin
        // Neck
        px(6, 11, 4, 1, "#f0d8b8");
        // Academic blue dress shirt
        px(2, 12, 12, 4, "#1e3a8a"); // shirt body
        px(2, 12, 3, 4, "#17306e"); // shirt shadow L
        px(11, 12, 3, 4, "#17306e"); // shirt shadow R
        // White collar
        px(5, 12, 6, 1, "#f0f4f8"); // collar white
        px(7, 12, 2, 1, "#e0e8f0"); // collar detail
        // Research paper / notebook tucked in pocket
        px(10, 12, 3, 3, "#f5f0e0"); // paper white
        px(10, 13, 3, 1, "#9ca3af"); // paper lines
        px(10, 14, 3, 1, "#9ca3af"); // paper lines 2
        // Cryptography formula hint on paper
        px(11, 12, 1, 1, "#374151"); // formula dot
      } else if (npcId === "bob_dog") {
        // BOB the Dog - cute golden retriever, big eyes, tongue out
        // Rounded golden head
        px(4, 0, 8, 1, "#f59e0b"); // fur top
        px(2, 1, 12, 11, "#fbbf24"); // big golden head
        px(1, 3, 2, 6, "#fbbf24"); // head side L
        px(13, 3, 2, 6, "#fbbf24"); // head side R
        // Big floppy ears with inner detail
        px(0, 2, 4, 9, "#d97706"); // ear L
        px(12, 2, 4, 9, "#d97706"); // ear R
        px(1, 3, 2, 7, "#b45309"); // ear inner L
        px(13, 3, 2, 7, "#b45309"); // ear inner R
        // Forehead lighter fur
        px(5, 1, 6, 3, "#fde68a"); // lighter forehead
        // Big cute eyes
        if (!blink) {
          // Eye socket (dark ring)
          px(3, 4, 4, 4, "#1c1917"); // eye socket L
          px(9, 4, 4, 4, "#1c1917"); // eye socket R
          // Iris (brown)
          px(3, 4, 4, 4, "#7c3a00"); // iris L
          px(9, 4, 4, 4, "#7c3a00"); // iris R
          // Pupil (very dark, large = cute)
          px(4, 4, 2, 3, "#0a0500"); // pupil L
          px(10, 4, 2, 3, "#0a0500"); // pupil R
          // Multiple eye shines = sparkling cute eyes
          px(4, 4, 1, 1, "#ffffff"); // shine L top-left
          px(5, 5, 1, 1, "#ffffffaa"); // shine L bottom
          px(10, 4, 1, 1, "#ffffff"); // shine R top-left
          px(11, 5, 1, 1, "#ffffffaa"); // shine R bottom
        } else {
          px(3, 6, 4, 1, "#92400e"); // blink L curved
          px(9, 6, 4, 1, "#92400e"); // blink R curved
        }
        // Snout - lighter with defined shape
        px(4, 8, 8, 4, "#f59e0b"); // snout area
        px(5, 8, 6, 5, "#fde68a"); // snout lighter center
        // Big shiny nose
        px(5, 8, 6, 2, "#1c1917"); // nose top
        px(6, 9, 4, 1, "#1c1917"); // nose bottom
        px(6, 8, 2, 1, "#555555"); // nose shine
        // Happy wide mouth line
        px(5, 10, 6, 1, "#7c3a00"); // mouth line
        px(4, 10, 1, 1, "#7c3a00"); // mouth corner L curve
        px(11, 10, 1, 1, "#7c3a00"); // mouth corner R curve
        // Big tongue out (happy panting)
        px(5, 11, 6, 1, "#fca5a5"); // tongue top
        px(4, 11, 7, 3, "#f87171"); // tongue body wide
        px(5, 12, 5, 2, "#f87171"); // tongue body
        px(6, 14, 3, 1, "#dc2626"); // tongue tip
        px(6, 11, 2, 1, "#fecaca"); // tongue highlight
        // Cheek blush dots
        px(2, 7, 2, 2, "#fca5a5"); // blush L
        px(12, 7, 2, 2, "#fca5a5"); // blush R
      } else if (npcId === "lomesh") {
        // Lomesh Dutta - Indian tech exec, sharp navy suit, confident smile, growth badge
        // Hair - thick, styled
        px(4, 0, 8, 1, "#1a0e05");
        px(3, 1, 10, 2, "#201008");
        px(2, 2, 2, 2, "#1a0e05"); // sideburn L
        px(12, 2, 2, 2, "#1a0e05"); // sideburn R
        px(4, 1, 8, 1, "#2d1a0a"); // hair highlight
        // Face - warm brown skin
        px(3, 3, 10, 7, "#b87030");
        px(2, 5, 1, 3, "#b87030"); // ear L
        px(13, 5, 1, 3, "#b87030"); // ear R
        px(3, 5, 1, 1, "#9a5e24"); // ear shadow L
        px(12, 5, 1, 1, "#9a5e24"); // ear shadow R
        // Strong confident eyebrows
        px(4, 3, 3, 1, "#1a0e05");
        px(9, 3, 3, 1, "#1a0e05");
        // Eyes - dark brown, confident
        if (!blink) {
          px(4, 5, 2, 2, "#3b1e08");
          px(10, 5, 2, 2, "#3b1e08");
          px(5, 5, 1, 1, "#fff"); // eye shine L
          px(11, 5, 1, 1, "#fff"); // eye shine R
          px(4, 4, 2, 1, "#1a0e05"); // upper eyelid L
          px(10, 4, 2, 1, "#1a0e05"); // upper eyelid R
        } else {
          px(4, 6, 2, 1, "#3b1e08");
          px(10, 6, 2, 1, "#3b1e08");
        }
        // Nose
        px(7, 6, 2, 2, "#9a5e24");
        px(6, 7, 4, 1, "#9a5e24");
        // Confident smile with teeth
        px(5, 9, 6, 1, "#7a3e14"); // lips
        px(6, 10, 4, 1, "#fff"); // teeth showing
        px(5, 10, 1, 1, "#c87040"); // corner L
        px(11, 10, 1, 1, "#c87040"); // corner R
        // Neck
        px(6, 11, 4, 1, "#b87030");
        // Sharp navy suit jacket
        px(2, 12, 12, 4, "#1e3a5f"); // jacket body
        px(2, 12, 3, 4, "#16304f"); // lapel shadow L
        px(11, 12, 3, 4, "#16304f"); // lapel shadow R
        // White collar shirt
        px(6, 11, 4, 2, "#f0f0f0");
        // Tie - gold
        px(7, 12, 2, 4, "#d4a017");
        px(7, 14, 2, 1, "#f5c542"); // tie knot highlight
        // Growth chart badge - green with bars
        px(3, 12, 4, 3, "#065f46"); // badge bg
        px(4, 14, 1, 1, "#4ade80"); // bar 1
        px(5, 13, 1, 2, "#4ade80"); // bar 2
        px(6, 12, 1, 3, "#22c55e"); // bar 3 tallest
        // Arrow pointing up above chart
        px(6, 11, 1, 1, "#86efac"); // arrow tip
      } else if (npcId === "dfinity_ghost") {
        // Dfinity Ghost - translucent blue ghost with circuit patterns
        const ghostPulse = 0.65 + 0.35 * Math.sin(frameRef2.current * 0.04);
        const ghostAlpha = Math.floor(ghostPulse * 200)
          .toString(16)
          .padStart(2, "0");
        // Outer aura glow
        ctx.save();
        ctx.shadowColor = "#00c8ff";
        ctx.shadowBlur = 14 * ghostPulse;
        // Ghost body shape - translucent blue
        px(4, 1, 8, 1, `#a0c8f0${ghostAlpha}`); // head top
        px(3, 2, 10, 3, `#b0d8ff${ghostAlpha}`); // head wide
        px(2, 4, 12, 6, `#a8d0f8${ghostAlpha}`); // body
        px(1, 8, 14, 3, `#90bce8${ghostAlpha}`); // lower body flare
        // Wispy ghost tail
        px(
          3,
          11,
          2,
          3,
          `#80acd0${Math.floor(ghostPulse * 140)
            .toString(16)
            .padStart(2, "0")}`,
        ); // wisp L
        px(
          7,
          12,
          2,
          2,
          `#80acd0${Math.floor(ghostPulse * 100)
            .toString(16)
            .padStart(2, "0")}`,
        ); // wisp mid
        px(
          11,
          11,
          2,
          3,
          `#80acd0${Math.floor(ghostPulse * 140)
            .toString(16)
            .padStart(2, "0")}`,
        ); // wisp R
        px(
          5,
          13,
          6,
          1,
          `#70a0c0${Math.floor(ghostPulse * 80)
            .toString(16)
            .padStart(2, "0")}`,
        ); // tail fade
        ctx.shadowBlur = 0;
        ctx.restore();
        // Circuit pattern on body
        ctx.save();
        ctx.globalAlpha = ghostPulse * 0.8;
        ctx.strokeStyle = "#40e0ff";
        ctx.lineWidth = 1;
        const s16 = size / 16;
        // Horizontal circuit line
        ctx.beginPath();
        ctx.moveTo(3 * s16, 6 * s16);
        ctx.lineTo(13 * s16, 6 * s16);
        ctx.stroke();
        // Vertical branches
        ctx.beginPath();
        ctx.moveTo(5 * s16, 6 * s16);
        ctx.lineTo(5 * s16, 9 * s16);
        ctx.moveTo(9 * s16, 6 * s16);
        ctx.lineTo(9 * s16, 4 * s16);
        ctx.moveTo(12 * s16, 6 * s16);
        ctx.lineTo(12 * s16, 8 * s16);
        ctx.stroke();
        // Circuit nodes
        ctx.fillStyle = "#80f0ff";
        ctx.beginPath();
        ctx.arc(5 * s16, 9 * s16, s16 * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(9 * s16, 4 * s16, s16 * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(12 * s16, 8 * s16, s16 * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Glowing cyan eyes
        if (!blink) {
          ctx.shadowColor = "#00d4ff";
          ctx.shadowBlur = 10 * ghostPulse + 3;
          px(4, 5, 2, 2, "#00e8ff"); // eye L
          px(10, 5, 2, 2, "#00e8ff"); // eye R
          px(5, 5, 1, 1, "#ffffff"); // shine L
          px(11, 5, 1, 1, "#ffffff"); // shine R
          ctx.shadowBlur = 0;
        }
        // DFINITY logo hint - infinity-like mark on forehead
        ctx.save();
        ctx.globalAlpha = ghostPulse * 0.7;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(6 * s16, 3 * s16, 2 * s16, 1.2 * s16, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(10 * s16, 3 * s16, 2 * s16, 1.2 * s16, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (npcId === "black_market_trader") {
        // Hooded figure - dark cloak, amber eyes, mysterious
        // Dark hood
        px(2, 0, 12, 5, "#111827"); // hood top
        px(1, 3, 14, 8, "#1f2937"); // hood sides and face shadow
        px(0, 5, 2, 6, "#111827"); // cloak L
        px(14, 5, 2, 6, "#111827"); // cloak R
        // Dark face in shadow
        px(4, 3, 8, 8, "#0f172a"); // deep shadow face
        // Amber glowing eyes in shadow
        if (!blink) {
          px(4, 5, 3, 2, "#f59e0b"); // amber eye L
          px(9, 5, 3, 2, "#f59e0b"); // amber eye R
          px(5, 5, 1, 1, "#fde68a"); // shine L
          px(10, 5, 1, 1, "#fde68a"); // shine R
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 6;
          px(4, 5, 3, 2, "#f59e0b");
          px(9, 5, 3, 2, "#f59e0b");
          ctx.shadowBlur = 0;
        } else {
          px(4, 6, 3, 1, "#d97706");
          px(9, 6, 3, 1, "#d97706");
        }
        // Thin visible mouth (smirk)
        px(5, 8, 6, 1, "#374151"); // thin smirk
        px(7, 8, 2, 1, "#4b5563"); // lighter center
        // Cloak body
        px(1, 9, 14, 7, "#111827");
        px(3, 10, 10, 5, "#1f2937"); // lighter front
        // Green coin bag peeking out
        px(1, 11, 3, 4, "#15803d"); // bag green
        px(2, 12, 2, 2, "#166534"); // bag shadow
        px(1, 11, 2, 1, "#22c55e"); // bag highlight
        // Hood outline
        px(2, 0, 12, 1, "#374151"); // hood rim
        px(1, 4, 1, 4, "#374151"); // hood edge L
        px(14, 4, 1, 4, "#374151"); // hood edge R
      } else {
        // Generic NPC fallback
        const colors: Record<string, string> = {};
        const bg = colors[npcId] ?? "#888";
        px(3, 1, 10, 2, bg);
        px(3, 3, 10, 7, "#fcd9a8");
        px(4, 5, 2, 2, "#333");
        px(10, 5, 2, 2, "#333");
        px(6, 8, 4, 1, bg);
        px(4, 10, 8, 4, bg);
      }
      // Blink overlay — cover eyes with skin tone
      if (blink) {
        ctx.fillStyle = "rgba(0,0,0,0.0)"; // just skip drawing eyes above by covering them
        // Cover typical eye rows with face color
        ctx.fillStyle = npcId === "bob_dog" ? "#fbbf24" : "#fcd9a8";
        ctx.fillRect(
          Math.round((3 * size) / 16),
          Math.round((5 * size) / 16),
          Math.round((10 * size) / 16),
          Math.round((2 * size) / 16),
        );
      }
    };

    // Draw initial frame
    drawPortrait(0, false);

    // Start rAF loop for idle animation
    const loop = () => {
      frameRef2.current++;
      if (frameRef2.current % 80 === 0) {
        blinkRef2.current = !blinkRef2.current;
      }
      const yBob = Math.round(Math.sin(frameRef2.current * 0.05) * 1.5);
      drawPortrait(yBob, blinkRef2.current);
      rafRef2.current = requestAnimationFrame(loop);
    };
    rafRef2.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef2.current);
    };
  }, [npcId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: "pixelated", display: "block" }}
    />
  );
}

// ─── OrePreviewTile Component ──────────────────────────────────────────────────
function OrePreviewTile({ tileId, label }: { tileId: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowColor = RESOURCES[tileId]?.color ?? "#ffffff";
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const depth = RESOURCES[tileId]?.depth ?? 0;
    // Dark background
    ctx.fillStyle = "#1a0e06";
    ctx.fillRect(0, 0, TILE, TILE);
    drawDetailedTile(ctx, 0, 0, tileId, depth, 0);
  }, [tileId]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        width={TILE}
        height={TILE}
        style={{
          width: 32,
          height: 32,
          imageRendering: "pixelated",
          boxShadow: `0 0 10px ${glowColor}80`,
          borderRadius: 2,
        }}
      />
      <span
        style={{
          color: "#d4a060",
          fontSize: "0.58rem",
          letterSpacing: "0.03em",
          whiteSpace: "nowrap",
          maxWidth: 60,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── PastRunsPanel Component ─────────────────────────────────────────────────
function PastRunsPanel({
  metaProgress,
}: {
  metaProgress: {
    runHistory?: Array<{
      bob: number;
      depth: number;
      date: string;
      won?: boolean;
      modifier?: string | null;
    }>;
  };
}) {
  const runs = metaProgress.runHistory ?? [];
  const lastFive = [...runs].reverse().slice(0, 5);
  if (lastFive.length === 0) return null;
  return (
    <div className="mt-2 w-full font-mono" style={{ maxWidth: 300 }}>
      <div
        className="text-center mb-1"
        style={{ fontSize: 9, color: "#6b7280", letterSpacing: "0.1em" }}
      >
        LAST RUNS
      </div>
      <div className="flex flex-col gap-0.5">
        {lastFive.map((r, i) => {
          const isWin = r.won;
          const clr = isWin ? "#fbbf24" : "#6b7280";
          const bg = isWin ? "rgba(251,191,36,0.08)" : "rgba(107,114,128,0.06)";
          const bdr = isWin
            ? "1px solid rgba(251,191,36,0.25)"
            : "1px solid rgba(107,114,128,0.15)";
          return (
            <div
              key={`${r.date}-${r.bob}-${r.depth}-${i}`}
              style={{
                fontSize: 9,
                color: clr,
                background: bg,
                border: bdr,
                padding: "2px 6px",
                borderRadius: 2,
                fontFamily: "monospace",
                display: "flex",
                justifyContent: "space-between",
                gap: 4,
              }}
            >
              <span>
                {isWin ? "WIN" : "run"} {r.depth}m
              </span>
              <span>{Number(r.bob).toLocaleString()} BOB</span>
              {r.modifier ? (
                <span style={{ color: "#f97316", fontSize: 8 }}>
                  {r.modifier.substring(0, 10)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TitleScreen Component ──────────────────────────────────────────────────
// ─── Modifier Select Overlay ─────────────────────────────────────────────────
function ModifierSelectOverlay({
  choices,
  onSelect,
}: {
  choices: RunModifier[];
  onSelect: (mod: RunModifier | null) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center font-mono"
      style={{ background: "rgba(0,0,0,0.96)" }}
    >
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,200,0,0.03) 3px, rgba(255,200,0,0.03) 4px)",
        }}
      />
      <div className="relative z-10 w-full max-w-2xl px-4 flex flex-col items-center gap-6">
        {/* Title */}
        <div className="text-center">
          <div
            className="text-2xl font-bold tracking-widest mb-1"
            style={{ color: "#ffd700", textShadow: "0 0 20px #ffd70080" }}
          >
            ⚡ CHOOSE YOUR RUN MODIFIER
          </div>
          <div className="text-xs tracking-widest" style={{ color: "#666" }}>
            SELECT A MODIFIER TO CHANGE YOUR FATE — OR DESCEND WITHOUT ONE
          </div>
        </div>

        {/* Modifier cards */}
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          {choices.map((mod) => (
            <button
              key={mod.id}
              type="button"
              data-ocid={`modifier.${mod.id}.button`}
              onClick={() => onSelect(mod)}
              className="flex-1 text-left p-4 transition-all duration-200 cursor-pointer group"
              style={{
                background: "rgba(20,14,2,0.95)",
                border: "1px solid #8B6914",
                boxShadow: "0 0 0px transparent",
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border =
                  "1px solid #ffd700";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 20px rgba(255,215,0,0.3)";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(40,28,4,0.98)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.border =
                  "1px solid #8B6914";
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 0px transparent";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(20,14,2,0.95)";
              }}
            >
              <div
                className="text-sm font-bold mb-2 tracking-wider"
                style={{ color: "#ffd700" }}
              >
                {mod.label}
              </div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: "#c4a255" }}
              >
                {mod.description}
              </div>
            </button>
          ))}
        </div>

        {/* No modifier button */}
        <button
          type="button"
          data-ocid="modifier.none.button"
          onClick={() => onSelect(null)}
          className="px-8 py-2 text-sm tracking-widest transition-colors"
          style={{
            background: "transparent",
            border: "1px solid #333",
            color: "#666",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#999";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#666";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#666";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#333";
          }}
        >
          NO MODIFIER — DESCEND RAW
        </button>
      </div>
    </div>
  );
}

function TitleScreen({
  startGame,
  openLeaderboard,
  syncScreen,
  onLogin,
  onLogout,
  isLoggedIn,
  isLoggingIn,
  principalShort,
}: {
  startGame: (resume?: boolean, deepDive?: boolean) => void;
  openLeaderboard: () => void;
  syncScreen: (s: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  isLoggingIn: boolean;
  principalShort: string;
}) {
  const titleCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredBtn, setHoveredBtn] = useState<number>(-1);
  const animRef = useRef<number>(0);
  const hasSave = loadGame() !== null;
  const _savedGame = loadGame();
  const _metaProgress = loadMetaProgress();
  const showDeepDive =
    _metaProgress.totalRunsCompleted > 0 ||
    (_savedGame !== null && _savedGame.bestDepth >= 150);

  const _ORE_PREVIEW = [
    { tileId: T.BOB_DUST, label: "Dom's Dust" },
    { tileId: T.BOB_FLECK, label: "Cycle Shard" },
    { tileId: T.BOB_FRAGMENT, label: "NNS Nugget" },
    { tileId: T.BOB_SHARD, label: "Banfield Ore" },
    { tileId: T.BOB_CHIP, label: "Dragginz Crystal" },
    { tileId: T.BOB_CRYSTAL, label: "ckBTC Chunk" },
    { tileId: T.BOB_CORE, label: "SNS Sliver" },
    { tileId: T.BOB_INGOT, label: "OpenChat Ore" },
    { tileId: T.BOB_VEIN, label: "BOB Seam" },
    { tileId: T.BOB_SEAM, label: "Singularity Seam" },
    { tileId: T.NNS_TOKEN, label: "NNS Token" },
    { tileId: T.CHAIN_FUSION, label: "Chain Fusion" },
    { tileId: T.DRAGGINZ_SCALE, label: "Dragginz Scale" },
    { tileId: T.BOB_GENESIS, label: "Genesis Block" },
  ];

  const MENU_BUTTONS = hasSave
    ? [
        {
          label: "\u25BA CONTINUE",
          ocid: "title.primary_button",
          onClick: () => startGame(true),
          primary: true,
        },
        {
          label: "\u25B6 NEW GAME",
          ocid: "title.new_game_button",
          onClick: () => startGame(false),
          primary: false,
        },
        {
          label: "LEADERBOARD",
          ocid: "title.secondary_button",
          onClick: openLeaderboard,
          primary: false,
        },
        {
          label: "\uD83D\uDCD6 CODEX",
          ocid: "title.codex_button",
          onClick: () => syncScreen("codex"),
          primary: false,
        },
      ]
    : [
        {
          label: "\u25B6  START MINING",
          ocid: "title.primary_button",
          onClick: () => startGame(false),
          primary: true,
        },
        {
          label: "LEADERBOARD",
          ocid: "title.secondary_button",
          onClick: openLeaderboard,
          primary: false,
        },
        {
          label: "\uD83D\uDCD6 CODEX",
          ocid: "title.codex_button",
          onClick: () => syncScreen("codex"),
          primary: false,
        },
      ];

  useEffect(() => {
    const canvas = titleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    let rafIdLanding: number | null = null;
    const debouncedLandingResize = () => {
      if (rafIdLanding !== null) cancelAnimationFrame(rafIdLanding);
      rafIdLanding = requestAnimationFrame(() => {
        resize();
        rafIdLanding = null;
      });
    };
    window.addEventListener("resize", debouncedLandingResize);
    const roLanding = new ResizeObserver(debouncedLandingResize);
    roLanding.observe(canvas);

    const LAYERS = [
      { color: "#3d1c00", darkColor: "#2a1000" },
      { color: "#5a2800", darkColor: "#3a1800" },
      { color: "#4a3828", darkColor: "#2e2218" },
      { color: "#2a2a3a", darkColor: "#1a1a2a" },
      { color: "#1a1230", darkColor: "#0e0820" },
      { color: "#300808", darkColor: "#200404" },
    ];

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.68,
      r: Math.random() * 1.2 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.01,
    }));
    const moon = { x: 0.82, y: 0.12, r: 22 };
    const bobTokens = Array.from({ length: 10 }, () => ({
      x: 0.42 + Math.random() * 0.5,
      y: Math.random() * 0.6,
      vy: Math.random() * 0.0003 + 0.0001,
      size: Math.floor(Math.random() * 3) + 4,
      alpha: Math.random() * 0.4 + 0.3,
      pulse: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.04,
    }));

    const ores = Array.from({ length: 55 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.22 + 0.74,
      size: Math.floor(Math.random() * 3) + 2,
      color: ["#f5c542", "#00e5ff", "#ff8800", "#cc66ff", "#44ff88", "#ff4444"][
        Math.floor(Math.random() * 6)
      ],
      glow: Math.random() * Math.PI * 2,
      glowSpeed: Math.random() * 0.04 + 0.01,
    }));

    const dirts = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vy: Math.random() * 0.4 + 0.15,
      size: Math.floor(Math.random() * 2) + 1,
      color: ["#8b5e3c", "#7a4e2a", "#a0703c"][Math.floor(Math.random() * 3)],
    }));

    const drill = { x: 0.65, y: 0.48, vy: 0.0006 };
    const fallingStars: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }> = [];
    let fallingStarTimer = 0;
    let t = 0;
    let scrollY = 0;
    let drillPhase = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      t++;
      scrollY += 0.3;
      drillPhase += 0.03;
      if (scrollY > H * 0.12) scrollY = 0;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.74);
      skyGrad.addColorStop(0, "#02010a");
      skyGrad.addColorStop(0.6, "#0a0418");
      skyGrad.addColorStop(1, "#0a0500");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H * 0.74);

      // Landing page clouds
      if (!("_lpClouds" in (ctx as unknown as Record<string, unknown>))) {
        (ctx as unknown as Record<string, unknown>)._lpClouds = [
          { x: 0.08, w: 90, speed: 0.00015 },
          { x: 0.35, w: 65, speed: 0.0001 },
          { x: 0.62, w: 110, speed: 0.00019 },
          { x: 0.8, w: 55, speed: 0.00013 },
        ];
        (ctx as unknown as Record<string, unknown>)._lpBirds = [
          { x: -0.05, speed: 0.00035 },
          { x: 0.6, speed: 0.00028 },
          { x: 1.1, speed: -0.0003 },
        ];
      }
      const lpClouds = (ctx as unknown as Record<string, unknown>)
        ._lpClouds as Array<{ x: number; w: number; speed: number }>;
      const lpBirds = (ctx as unknown as Record<string, unknown>)
        ._lpBirds as Array<{ x: number; speed: number }>;
      ctx.save();
      ctx.globalAlpha = 0.35;
      for (const c of lpClouds) {
        c.x += c.speed;
        if (c.x > 1.1) c.x = -0.12;
        const cx = c.x * W;
        const cy = (0.08 + Math.sin(t * 0.003 + c.w) * 0.02) * H * 0.72;
        ctx.fillStyle = "rgba(200,210,255,0.7)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, c.w * 0.5, c.w * 0.15, 0, 0, Math.PI * 2);
        ctx.ellipse(
          cx - c.w * 0.2,
          cy + 5,
          c.w * 0.28,
          c.w * 0.12,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(150,180,255,0.6)";
      ctx.lineWidth = 1.5;
      for (const b of lpBirds) {
        b.x += b.speed;
        if (b.x > 1.1) b.x = -0.06;
        if (b.x < -0.1) b.x = 1.05;
        const bx = b.x * W;
        const by = (0.12 + Math.sin(t * 0.002 + b.x * 5) * 0.03) * H * 0.72;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by - 2);
        ctx.lineTo(bx, by + 2);
        ctx.lineTo(bx + 5, by - 2);
        ctx.stroke();
      }
      ctx.restore();

      const groundStart = H * 0.72;
      const layerH = (H - groundStart) / LAYERS.length;
      for (let i = 0; i < LAYERS.length; i++) {
        const l = LAYERS[i];
        const y0 = groundStart + i * layerH + (scrollY % layerH) - layerH;
        ctx.fillStyle = l.color;
        ctx.fillRect(0, y0, W, layerH);
        ctx.fillStyle = l.darkColor;
        for (let px = 0; px < W; px += 8) {
          if ((px + i) % 3 === 0) ctx.fillRect(px, y0, 4, 2);
        }
      }

      ctx.fillStyle = "#5a3010";
      ctx.fillRect(0, H * 0.72 - 6, W, 8);
      ctx.fillStyle = "#7a4820";
      ctx.fillRect(0, H * 0.72 - 10, W, 4);
      ctx.fillStyle = "#2d5a00";
      ctx.fillRect(0, H * 0.72 - 14, W, 4);

      for (const s of stars) {
        s.twinkle += s.speed;
        const alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
        ctx.fillStyle = `rgba(255,255,240,${alpha})`;
        ctx.fillRect(
          Math.floor(s.x * W),
          Math.floor(s.y * H),
          s.r > 1 ? 2 : 1,
          s.r > 1 ? 2 : 1,
        );
      }

      // Moon
      {
        const mx = Math.floor(moon.x * W);
        const my = Math.floor(moon.y * H);
        ctx.save();
        ctx.shadowColor = "#fffbe8";
        ctx.shadowBlur = 30;
        ctx.fillStyle = "#fffbe8";
        ctx.beginPath();
        ctx.arc(mx, my, moon.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Crater details
        ctx.fillStyle = "rgba(200,180,120,0.25)";
        ctx.beginPath();
        ctx.arc(mx - 7, my + 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx + 8, my - 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Floating BOB tokens (with spin)
      for (const bt of bobTokens) {
        bt.y += bt.vy;
        bt.pulse += 0.02;
        (bt as { spin: number; spinSpeed: number }).spin += (
          bt as { spin: number; spinSpeed: number }
        ).spinSpeed;
        if (bt.y > 0.7) {
          bt.y = 0;
          bt.x = 0.42 + Math.random() * 0.5;
        }
        const bx = Math.floor(bt.x * W);
        const by = Math.floor(bt.y * H);
        const alpha = bt.alpha * (0.7 + 0.3 * Math.sin(bt.pulse));
        const spinAngle = (bt as { spin: number }).spin;
        // Squish horizontally by cos(spin) for coin-spin effect
        const scaleX = Math.abs(Math.cos(spinAngle));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(bx, by);
        ctx.scale(scaleX < 0.1 ? 0.1 : scaleX, 1);
        ctx.shadowColor = "#f5c542";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "#f5c542";
        ctx.beginPath();
        ctx.arc(0, 0, bt.size, 0, Math.PI * 2);
        ctx.fill();
        if (scaleX > 0.3) {
          ctx.fillStyle = "#1a1200";
          ctx.font = `bold ${bt.size + 2}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("B", 0, 0);
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Falling stars
      fallingStarTimer++;
      if (fallingStarTimer > 180 + Math.floor(Math.random() * 240)) {
        fallingStarTimer = 0;
        if (fallingStars.length < 3) {
          fallingStars.push({
            x: Math.random() * W * 0.7,
            y: Math.random() * H * 0.3,
            vx: 3 + Math.random() * 4,
            vy: 1 + Math.random() * 2,
            life: 0,
            maxLife: 30 + Math.floor(Math.random() * 20),
          });
        }
      }
      for (let fsi = fallingStars.length - 1; fsi >= 0; fsi--) {
        const fs2 = fallingStars[fsi];
        fs2.x += fs2.vx;
        fs2.y += fs2.vy;
        fs2.life++;
        const fsAlpha =
          fs2.life < 5
            ? fs2.life / 5
            : fs2.life > fs2.maxLife - 5
              ? (fs2.maxLife - fs2.life) / 5
              : 1;
        if (fsAlpha <= 0 || fs2.life >= fs2.maxLife) {
          fallingStars.splice(fsi, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = fsAlpha * 0.85;
        ctx.strokeStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fs2.x, fs2.y);
        ctx.lineTo(fs2.x - fs2.vx * 8, fs2.y - fs2.vy * 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      for (const o of ores) {
        o.glow += o.glowSpeed;
        const alpha = 0.5 + 0.5 * Math.abs(Math.sin(o.glow));
        const ox = Math.floor(o.x * W);
        const oy = Math.floor(o.y * H + scrollY * 0.3) % H;
        if (oy < H * 0.72) continue;
        ctx.shadowColor = o.color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = `${o.color}${Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0")}`;
        ctx.fillRect(ox, oy, o.size, o.size);
        ctx.shadowBlur = 0;
      }

      for (const d of dirts) {
        d.y += d.vy / 100;
        if (d.y > 1) d.y = 0.72;
        const dy = Math.floor(d.y * H);
        if (dy < H * 0.72) continue;
        ctx.fillStyle = d.color;
        ctx.fillRect(Math.floor(d.x * W), dy, d.size, d.size);
      }

      drill.y += drill.vy;
      if (drill.y > 0.68) {
        drill.y = 0.28;
        drill.x = 0.45 + Math.random() * 0.35;
      }
      const dvx = Math.floor(drill.x * W);
      const dvy = Math.floor(drill.y * H);
      const drillAnim = Math.sin(drillPhase) > 0;

      // Draw the real in-game vehicle sprite on the landing page
      ctx.save();
      drawDetailedVehicle(
        ctx,
        dvx - TILE / 2,
        dvy - TILE,
        true,
        drillAnim,
        0,
        1,
        t,
        {
          drillLevel: 1,
          hullLevel: 1,
          engineLevel: 1,
          fuelLevel: 1,
          shieldLevel: 0,
        },
      );
      ctx.restore();

      // Draw BOB SHOP building on the surface (right side) using the real drawShopBuilding
      {
        // Anchor shop near right edge so it is clear of the left-aligned menu card
        const shopDrawWidth = SHOP_W * TILE * 3;
        const shopLandX = Math.floor(W - shopDrawWidth - 20);
        const groundY = Math.floor(H * 0.72);
        const shopTopY = groundY - SHOP_H * TILE;

        ctx.save();
        drawShopBuilding(ctx, shopLandX, shopTopY, t);
        ctx.restore();

        // Draw NPC figures grouped to the left of the BOB SHOP building
        // Shop is at W*0.72 — place NPCs just to its left
        const npcScale = 3;
        const npcCharW = 16 * npcScale;
        const npcH = 20 * npcScale;
        const npcSpacing = npcCharW + 8;
        const npcBaseY = groundY - npcH - 4;
        const npcGroupW = npcSpacing * 3 + npcCharW;
        // Position NPC group to the left of shop with 24px gap
        const npcStartX = Math.max(
          Math.floor(W * 0.5),
          shopLandX - npcGroupW - 16,
        );

        // Only draw NPCs if there's at least 200px clearance from the menu card right edge (~360px)
        const MENU_CARD_RIGHT = Math.min(360, W * 0.45);
        const drawNPCsOnLanding = npcStartX > MENU_CARD_RIGHT + 20;

        const lpx = (
          nx: number,
          ny: number,
          nw: number,
          nh: number,
          color: string,
          baseX: number,
          baseY: number,
          scale: number,
        ) => {
          ctx.fillStyle = color;
          ctx.fillRect(
            baseX + nx * scale,
            baseY + ny * scale,
            nw * scale,
            nh * scale,
          );
        };

        if (drawNPCsOnLanding) {
          // Jerry Banfield - orange hair, friendly, microphone
          {
            const bx = npcStartX;
            const bobOff = Math.round(Math.sin(t * 0.05 + 0 * 1.2) * 1);
            const by = npcBaseY + bobOff;
            const s = npcScale;
            lpx(4, 0, 8, 2, "#f97316", bx, by, s);
            lpx(3, 2, 10, 7, "#fcd9a8", bx, by, s);
            lpx(4, 4, 2, 2, "#4b2e0d", bx, by, s);
            lpx(10, 4, 2, 2, "#4b2e0d", bx, by, s);
            lpx(5, 5, 1, 1, "#fff", bx, by, s);
            lpx(11, 5, 1, 1, "#fff", bx, by, s);
            lpx(5, 7, 6, 1, "#e05010", bx, by, s);
            lpx(3, 9, 10, 5, "#ea580c", bx, by, s);
            lpx(14, 10, 2, 4, "#888888", bx, by, s);
            lpx(13, 9, 3, 2, "#cccccc", bx, by, s);
            lpx(4, 14, 3, 4, "#1e3a8a", bx, by, s);
            lpx(9, 14, 3, 4, "#1e3a8a", bx, by, s);
          }
          // Dom (Dominic Williams) - dark hair, ICP blue suit
          {
            const bx = npcStartX + npcSpacing;
            const bobOff = Math.round(Math.sin(t * 0.05 + 1 * 1.2) * 1);
            const by = npcBaseY + bobOff;
            const s = npcScale;
            lpx(4, 0, 8, 2, "#1a0a00", bx, by, s);
            lpx(3, 2, 10, 7, "#d4956a", bx, by, s);
            lpx(4, 3, 2, 1, "#2d1200", bx, by, s);
            lpx(10, 3, 2, 1, "#2d1200", bx, by, s);
            lpx(4, 4, 2, 2, "#1a1a2e", bx, by, s);
            lpx(10, 4, 2, 2, "#1a1a2e", bx, by, s);
            lpx(5, 4, 1, 1, "#7bc8f6", bx, by, s);
            lpx(11, 4, 1, 1, "#7bc8f6", bx, by, s);
            lpx(3, 9, 10, 5, "#1e3a8a", bx, by, s);
            lpx(6, 10, 4, 2, "#f5c542", bx, by, s);
            lpx(4, 14, 3, 4, "#0f172a", bx, by, s);
            lpx(9, 14, 3, 4, "#0f172a", bx, by, s);
          }
          // BOB the Dog - golden retriever, floppy ears, tongue out
          {
            const bx = npcStartX + npcSpacing * 2;
            const bobOff = Math.round(Math.sin(t * 0.05 + 2 * 1.2) * 1);
            const by = npcBaseY + bobOff;
            const s = npcScale;
            lpx(3, 5, 10, 8, "#fbbf24", bx, by, s);
            lpx(4, 1, 8, 6, "#fbbf24", bx, by, s);
            lpx(2, 2, 3, 5, "#d97706", bx, by, s);
            lpx(11, 2, 3, 5, "#d97706", bx, by, s);
            lpx(5, 5, 6, 3, "#f59e0b", bx, by, s);
            lpx(7, 5, 2, 1, "#1c1917", bx, by, s);
            lpx(7, 8, 2, 2, "#f87171", bx, by, s);
            lpx(5, 3, 2, 2, "#1c1917", bx, by, s);
            lpx(9, 3, 2, 2, "#1c1917", bx, by, s);
            lpx(6, 3, 1, 1, "#ffffff", bx, by, s);
            lpx(10, 3, 1, 1, "#ffffff", bx, by, s);
            lpx(13, 3, 2, 5, "#fbbf24", bx, by, s);
            lpx(14, 2, 2, 2, "#d97706", bx, by, s);
            lpx(4, 13, 2, 5, "#d97706", bx, by, s);
            lpx(7, 13, 2, 5, "#d97706", bx, by, s);
            lpx(9, 13, 2, 5, "#d97706", bx, by, s);
            lpx(12, 13, 2, 5, "#d97706", bx, by, s);
          }
          // Fudder - hunched troll antagonist, FUD sign, hops
          {
            const bx = npcStartX + npcSpacing * 3;
            const fudderHop = Math.round(Math.sin(t * 0.08) * 1.5);
            const by = npcBaseY + fudderHop;
            const s = npcScale;
            lpx(3, 4, 10, 9, "#3d1a00", bx, by, s);
            lpx(4, 1, 8, 5, "#2d1200", bx, by, s);
            lpx(5, 3, 2, 2, "#dc2626", bx, by, s);
            lpx(9, 3, 2, 2, "#dc2626", bx, by, s);
            lpx(6, 6, 4, 1, "#991b1b", bx, by, s);
            lpx(12, 5, 4, 6, "#fbbf24", bx, by, s);
            lpx(12, 5, 4, 1, "#f59e0b", bx, by, s);
            lpx(5, 13, 2, 5, "#1c0a00", bx, by, s);
            lpx(9, 13, 2, 5, "#1c0a00", bx, by, s);
          }
        } // end if (drawNPCsOnLanding)
      }

      animRef.current = requestAnimationFrame(draw);
    };

    const styleEl = document.createElement("style");
    styleEl.textContent =
      "@keyframes pulse-glow { 0%,100%{box-shadow:0 0 12px #f5c54240,0 4px 0 #7a4800}50%{box-shadow:0 0 28px #f5c54280,0 0 50px #f5a00050,0 4px 0 #7a4800} }";
    document.head.appendChild(styleEl);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", debouncedLandingResize);
      roLanding.disconnect();
      if (rafIdLanding !== null) cancelAnimationFrame(rafIdLanding);
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start font-mono relative overflow-hidden"
      style={{ background: "#0a0500" }}
    >
      <canvas
        ref={titleCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
          zIndex: 1,
        }}
      />
      {/* Center UI panel — vertically centered in the middle column, shop on right, NPCs on left */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-start justify-center pointer-events-none overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "max(12px, 3%)",
          paddingRight: "0",
        }}
      >
        <div
          className="flex flex-col items-center pointer-events-auto px-4"
          style={{ width: "100%", maxWidth: "340px" }}
        >
          {/* Single unified card: title + slogan + buttons + controls hint */}
          <div
            className="flex flex-col items-center gap-2 w-full"
            style={{
              background: "rgba(0,0,0,0.72)",
              padding: "12px 16px 12px",
              borderRadius: "10px",
              border: "1px solid rgba(245,166,35,0.25)",
              backdropFilter: "blur(4px)",
              maxWidth: "380px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow:
                "0 4px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,166,35,0.08)",
            }}
          >
            {/* Title */}
            <div className="text-center leading-none">
              <div
                className="font-black tracking-wider leading-none select-none"
                style={{
                  fontSize: "clamp(3rem,12vw,6rem)",
                  color: "#f5c542",
                  textShadow:
                    "0 0 20px #f5a000,0 0 40px #f5a000,0 0 80px #f5700060,4px 4px 0px #7a4800",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                BOB
              </div>
              <div
                className="font-bold uppercase"
                style={{
                  fontSize: "clamp(0.7rem,3vw,1.3rem)",
                  color: "#ff8800",
                  textShadow: "0 0 12px #ff880080, 0 0 24px #ff440040",
                  letterSpacing: "0.45em",
                  marginTop: "-4px",
                }}
              >
                MINING CO.
              </div>
            </div>
            {/* Tagline + slogan on one row */}
            <div className="flex flex-col items-center gap-5 mt-4">
              <div
                style={{
                  color: "#f5c542",
                  fontSize: "clamp(0.6rem, 1.8vw, 0.78rem)",
                  textShadow: "0 0 12px #f5a00080, 0 1px 4px #000",
                  letterSpacing: "0.12em",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  background: "rgba(0,0,0,0.4)",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  border: "1px solid rgba(245,197,66,0.2)",
                }}
              >
                GET RICH OR DIE MINING.
              </div>
            </div>
            {/* Buttons */}
            <div className="flex flex-col items-center gap-2 w-full mt-4">
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                {MENU_BUTTONS.map((btn, i) => (
                  <button
                    key={btn.label}
                    type="button"
                    data-ocid={btn.ocid}
                    onClick={btn.onClick}
                    onMouseEnter={() => setHoveredBtn(i)}
                    onMouseLeave={() => setHoveredBtn(-1)}
                    className="relative w-full py-3 font-bold tracking-widest text-sm transition-all duration-150"
                    style={
                      btn.primary
                        ? {
                            background:
                              hoveredBtn === i ? "#f5d84e" : "#f5c542",
                            color: "#0a0500",
                            border: "2px solid #f5d84e",
                            boxShadow:
                              hoveredBtn === i
                                ? "0 0 24px #f5c54280, 0 0 48px #f5a00050, 0 4px 0 #7a4800"
                                : "0 0 12px #f5c54240, 0 4px 0 #7a4800",
                            transform:
                              hoveredBtn === i ? "translateY(-2px)" : "none",
                            animation: "pulse-glow 2s ease-in-out infinite",
                          }
                        : {
                            background:
                              hoveredBtn === i
                                ? "rgba(10,8,4,0.92)"
                                : "rgba(10,8,4,0.85)",
                            color: hoveredBtn === i ? "#f5c542" : "#e0b840",
                            border: `2px solid ${hoveredBtn === i ? "#f5c542" : "#f5a623"}`,
                            boxShadow:
                              hoveredBtn === i
                                ? "0 0 16px #f5c54240"
                                : "0 0 8px #f5a62320",
                            transform:
                              hoveredBtn === i ? "translateX(4px)" : "none",
                          }
                    }
                  >
                    {hoveredBtn === i && (
                      <span className="mr-2 text-yellow-400">&#9658;</span>
                    )}
                    {btn.label}
                  </button>
                ))}
              </div>
              {/* Deep Dive Mode button */}
              {showDeepDive && (
                <div className="flex flex-col items-center w-full max-w-xs mt-1">
                  <button
                    type="button"
                    data-ocid="title.deep_dive_button"
                    onClick={() => startGame(false, true)}
                    className="w-full py-2.5 font-bold tracking-widest text-sm transition-all duration-150"
                    style={{
                      background: "rgba(20,8,0,0.9)",
                      color: "#f97316",
                      border: "2px solid #f97316",
                      boxShadow: "0 0 12px #f9731640, 0 4px 0 #7a2800",
                    }}
                  >
                    🔥 DEEP DIVE MODE
                  </button>
                  {_savedGame && _savedGame.bestDepth > 0 && (
                    <div
                      className="mt-1 text-xs font-mono"
                      style={{ color: "#d4a84b", letterSpacing: "0.08em" }}
                    >
                      ⚡ BEST: {_savedGame.bestDepth}m
                      {_metaProgress.totalRunsCompleted > 0 && (
                        <div
                          className="text-xs font-mono mt-0.5"
                          style={{ color: "#6b7280", letterSpacing: "0.08em" }}
                        >
                          🏁 WINS: {_metaProgress.totalRunsCompleted}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* Depth badge when no deep dive */}
              {!showDeepDive && _savedGame && _savedGame.bestDepth > 0 && (
                <div
                  className="text-xs font-mono mt-1"
                  style={{ color: "#d4a84b", letterSpacing: "0.08em" }}
                >
                  ⚡ BEST: {_savedGame.bestDepth}m
                  {_metaProgress.totalRunsCompleted > 0 && (
                    <div
                      className="text-xs font-mono mt-0.5"
                      style={{ color: "#6b7280", letterSpacing: "0.08em" }}
                    >
                      🏁 WINS: {_metaProgress.totalRunsCompleted}
                    </div>
                  )}
                </div>
              )}
              {/* Veteran Sell Bonus */}
              {(_metaProgress.veteranSellBonus ?? 0) > 0 && (
                <div
                  className="mt-1 font-mono text-center"
                  style={{ fontSize: 8, color: "#fbbf24" }}
                >
                  ⭐ Veteran Sell Bonus: +
                  {(_metaProgress.veteranSellBonus ?? 0) * 5}%
                </div>
              )}
              {/* Permanent bonuses active */}
              {(_metaProgress.permanentBonuses ?? 0) > 0 && (
                <div
                  className="mt-1 w-full font-mono text-center"
                  style={{ maxWidth: 280 }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      color: "#22c55e",
                      letterSpacing: "0.08em",
                      marginBottom: 2,
                    }}
                  >
                    BONUSES ACTIVE
                  </div>
                  {(_metaProgress.permanentBonuses ?? 0) >= 1 && (
                    <div style={{ fontSize: 8, color: "#4ade80" }}>
                      +{(_metaProgress.permanentBonuses ?? 0) * 2}% cargo
                      capacity
                    </div>
                  )}
                  {(_metaProgress.permanentBonuses ?? 0) >= 2 && (
                    <div style={{ fontSize: 8, color: "#4ade80" }}>
                      +{_metaProgress.permanentBonuses ?? 0}% fuel efficiency
                    </div>
                  )}
                  {(_metaProgress.permanentBonuses ?? 0) >= 3 && (
                    <div style={{ fontSize: 8, color: "#4ade80" }}>
                      +{_metaProgress.permanentBonuses ?? 0}% sell bonus
                    </div>
                  )}
                  {(_metaProgress.permanentBonuses ?? 0) >= 4 && (
                    <div style={{ fontSize: 8, color: "#4ade80" }}>
                      +{Math.floor((_metaProgress.permanentBonuses ?? 0) / 2)}%
                      hull armor
                    </div>
                  )}
                  {(_metaProgress.permanentBonuses ?? 0) >= 5 && (
                    <div style={{ fontSize: 8, color: "#4ade80" }}>
                      +{_metaProgress.permanentBonuses ?? 0}% BOB from
                      antagonists
                    </div>
                  )}
                </div>
              )}
              {/* Past Runs collapsible */}
              <PastRunsPanel metaProgress={_metaProgress} />
            </div>
            {/* Internet Identity login/logout */}
            <div className="mt-3 flex flex-col items-center gap-1.5">
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono"
                    style={{
                      color: "#86efac",
                      background: "rgba(0,60,20,0.6)",
                      border: "1px solid #22c55e50",
                      padding: "2px 8px",
                      borderRadius: "3px",
                    }}
                  >
                    ✓ {principalShort}
                  </span>
                  <button
                    type="button"
                    data-ocid="title.logout_button"
                    onClick={onLogout}
                    className="text-xs font-mono px-2 py-0.5"
                    style={{
                      color: "#f87171",
                      border: "1px solid #7f1d1d60",
                      background: "rgba(30,0,0,0.5)",
                    }}
                  >
                    LOGOUT
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid="title.login_button"
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="w-full max-w-xs py-2 font-bold tracking-widest text-xs transition-all"
                  style={{
                    background: "rgba(10,8,4,0.85)",
                    color: isLoggingIn ? "#666" : "#7dd3fc",
                    border: "1px solid #0ea5e950",
                    boxShadow: "0 0 8px #0ea5e920",
                  }}
                >
                  {isLoggingIn
                    ? "CONNECTING..."
                    : "🔐 LOGIN WITH INTERNET IDENTITY"}
                </button>
              )}
            </div>
            <div
              className="mt-4 text-center"
              style={{
                color: "#9a7a40",
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                opacity: 0.75,
                fontStyle: "italic",
              }}
            >
              Drill deep. Find the Genesis Block.
            </div>
          </div>
        </div>
      </div>
      <footer
        className="absolute bottom-4 w-full text-center z-10"
        style={{ fontSize: "0.65rem", color: "#3a2808" }}
      >
        \u00a9 {new Date().getFullYear()}. Built with &#10084; using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          style={{ color: "#5a4020" }}
          className="hover:text-yellow-700 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  const { actor } = useActor();
  const {
    identity,
    login: iiLoginFn,
    clear: iiClearFn,
    isLoggingIn: isIILoggingIn,
  } = useInternetIdentity();
  const isIILoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const iiPrincipalShort = isIILoggedIn
    ? `${identity!.getPrincipal().toString().slice(0, 10)}...`
    : "";
  const [cloudSaveDialog, setCloudSaveDialog] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [codexTab, setCodexTab] = useState<"ores" | "upgrades" | "controls">(
    "ores",
  );
  const [hud, setHud] = useState({
    hull: 100,
    maxHull: 100,
    fuel: 100,
    maxFuel: 100,
    cargoW: 0,
    maxCargo: 50,
    bob: 0,
    depth: 0,
    drillTarget: "",
    sonarCount: 0,
    chargesCount: 0,
    surfaceCallCount: 0,
    drillHeat: 0,
    drillOverheated: false,
  });
  const [atSurface, setAtSurface] = useState(false);
  const [gameOver, setGameOver] = useState<{
    reason: string;
    bob: number;
    depth: number;
  } | null>(null);
  const [won, setWon] = useState<{
    bob: number;
    depth: number;
    oresFound?: number;
    questsCompleted?: number;
    upgradesPurchased?: number;
    antagonistsDefeated?: number;
  } | null>(null);
  const [summaryData, setSummaryData] = useState<{
    isWin: boolean;
    bob: number;
    depth: number;
    oresFound: number;
    questsCompleted: number;
    timePlayed: string;
    antagonistsDefeated?: number;
    newMilestone?: string;
    isPersonalBest?: boolean;
    discoveredOreCount?: number;
    totalOreCount?: number;
  } | null>(null);
  const [isDeepDive, setIsDeepDive] = useState(false);
  const [showDomEpilogue, setShowDomEpilogue] = useState(false);
  const domEpilogueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [questFanfare, setQuestFanfare] = useState<{ text: string } | null>(
    null,
  );
  const [leaderboardTab, setLeaderboardTab] = useState<"normal" | "deepdive">(
    "normal",
  );
  const [airdropCrate, setAirdropCrate] = useState<{
    x: number;
    timer: number;
    collected: boolean;
  } | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shopMsg, setShopMsg] = useState("");
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const autoAscentRef = useRef(false);
  const pendingWinRef = useRef<{
    bob: number;
    depth: number;
    oresFound?: number;
    questsCompleted?: number;
    upgradesPurchased?: number;
    antagonistsDefeated?: number;
  } | null>(null);
  const [autoAscending, setAutoAscending] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<Uint8Array>(new Uint8Array(0));
  const playerRef = useRef<PlayerState>(initPlayer());
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const screenRef = useRef<Screen>("title");
  const hudTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeRef = useRef({ x: 0, y: 0, frames: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const minimapOffRef = useRef<HTMLCanvasElement | null>(null);
  const minimapDirtyRef = useRef(true);
  const cloudsRef = useRef<
    Array<{ x: number; y: number; w: number; speed: number }>
  >([
    { x: 0.1, y: 0.05, w: 80, speed: 0.00018 },
    { x: 0.4, y: 0.09, w: 60, speed: 0.00012 },
    { x: 0.7, y: 0.03, w: 100, speed: 0.00022 },
    { x: 0.55, y: 0.07, w: 50, speed: 0.00015 },
    { x: 0.85, y: 0.11, w: 70, speed: 0.0002 },
  ]);
  const birdsRef = useRef<
    Array<{ x: number; y: number; speed: number; timer: number }>
  >([
    { x: -0.05, y: 0.04, speed: 0.0004, timer: 0 },
    { x: 1.1, y: 0.07, speed: -0.0003, timer: 200 },
    { x: -0.1, y: 0.02, speed: 0.00035, timer: 400 },
  ]);
  const cockpitMinimapRef = useRef<HTMLCanvasElement | null>(null);
  const drillAngleRef = useRef(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const lowFpsModeRef = useRef(false);
  const lastFrameTimeRef = useRef(performance.now());
  const dprCapRef = useRef(1.0);
  const dprDroppedRef = useRef(false);
  const zoneLabelRef = useRef({
    label: "",
    alpha: 0,
    frames: 0,
    currentZone: "",
  });
  const exploredRef = useRef<Uint8Array>(new Uint8Array(MAP_W * MAP_H));
  const tutorialStepRef = useRef(0);
  const prevHullRef = useRef(100);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const lastFuelWarnRef = useRef(0);
  const [gasWarning, setGasWarning] = useState(false);
  const [waterWarning, setWaterWarning] = useState(false);
  const [lavaWarning, setLavaWarning] = useState(false);
  const gasWarnRef = useRef(false);
  const waterWarnRef = useRef(false);
  const lavaWarnActiveRef = useRef(false);
  const hitFlashRef = useRef(0);
  // contactFlashColorRef removed — replaced by flashColorRGBRef
  const flashColorRGBRef = useRef<[number, number, number]>([220, 0, 0]);
  const prevHudRef = useRef({
    hull: 100,
    maxHull: 100,
    fuel: 100,
    maxFuel: 100,
    cargoW: 0,
    maxCargo: 50,
    bob: 0,
    depth: 0,
    drillTarget: "",
    sonarCount: 0,
    chargesCount: 0,
    surfaceCallCount: 0,
    drillHeat: 0,
    drillOverheated: false,
  });
  const prevControlsHintAlphaRef = useRef(1);
  const skyGradCacheRef = useRef<{ grad: CanvasGradient | null; camY: number }>(
    { grad: null, camY: -9999 },
  );
  const vignetteGradRef = useRef<{
    grad: CanvasGradient | null;
    cw: number;
    ch: number;
  }>({ grad: null, cw: 0, ch: 0 });
  const nnsSlowRef = useRef<number>(0);
  const antagonistSpeechRef = useRef<
    Map<number, { text: string; timer: number }>
  >(new Map());
  const fallingRocksRef = useRef<
    Array<{ x: number; y: number; vy: number; active: boolean }>
  >([]);
  const [cargoDropPending, setCargoDropPending] = useState<{
    tile: number;
    value: number;
    name: string;
  } | null>(null);
  const [eventMsg, setEventMsg] = useState("");
  const eventMsgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventTriggeredRef = useRef(false);
  const lastEventTimeRef = useRef(0);

  // NPC System
  const npcEncounteredRef = useRef<Set<string>>(new Set());
  const npcRewardsRef = useRef<{
    sellBoost?: number;
    cargoBoost?: boolean;
    cloakActive?: boolean;
    fameBuff?: boolean;
    radarPingActive?: boolean;
    drillBoost?: boolean;
  }>({});
  const [activeNpc, setActiveNpc] = useState<{
    id: string;
    name: string;
    quote: string;
    reward: string;
    color: string;
  } | null>(null);
  const [surfaceNpc, setSurfaceNpc] = useState<{
    id: string;
    name: string;
    quote: string;
    reward: string;
    color: string;
  } | null>(null);
  const surfaceNpcShownRef = useRef(false);
  const firstSurfaceEverRef = useRef(!localStorage.getItem("bob_jerry_met"));

  // Antagonist System
  const antagonistsRef = useRef<Antagonist[]>([]);
  const antagonistIdCounter = useRef(0);
  const lastAntagonistSpawnRef = useRef(0);
  const marketCrashRef = useRef(false);
  const marketCrashTimerRef = useRef(0);
  const marketCrashLiteRef = useRef(false);
  const marketCrashLiteTimerRef = useRef(0);
  const playerFrozenRef = useRef(0);
  const drillSlowRef = useRef(false);
  const headFudderSpawnedRef = useRef(false);
  const headFudderWarningFiredRef = useRef(false);
  const lastSurfaceTimeRef = useRef<number>(0);
  const bossAnnouncementRef = useRef<{ alpha: number; frames: number } | null>(
    null,
  );
  const lastBiomeDepthRef = useRef(0);
  const depthMilestonesReachedRef = useRef<Set<number>>(new Set<number>());
  const deepDiveModeRef = useRef(false);
  const deepDiveBestDepthRef = useRef(0);
  const lastHazardEventTimeRef = useRef(0);
  const lastLuckyEventTimeRef = useRef(0);
  const airdropCrateRef = useRef<{
    x: number;
    timer: number;
    collected: boolean;
  } | null>(null);

  // Status effect refs
  const drillOverheatRef = useRef(false);
  const drillOverheatTimerRef = useRef(0);
  const drillHeatRef = useRef(0); // 0-100, manual heat tracking
  const drillHeatOverheatRef = useRef(false);
  const drillHeatCooldownRef = useRef(0);
  const tempOreMultiplierRef = useRef(1.0);
  const tempOreMultiplierTimerRef = useRef(0);
  const nextOreMultRef = useRef(1);
  const drillSpeedBoostRef = useRef(1.0);
  const drillSpeedBoostTimerRef = useRef(0);
  const blackMarketUsedRef = useRef(false);
  // ── Dynamic ore market multipliers (±30% per run) ──
  const oreMarketMultipliersRef = useRef<Record<string, number>>({});
  // ── Cave-in cracking tiles: tileIdx → crackStartTime ──
  const unstableTilesRef = useRef<Set<number>>(new Set());
  const crackingTilesRef = useRef<Map<number, number>>(new Map());
  // ── Jerry quest repair discount ──
  const jerryRepairDiscountRef = useRef(false);
  const cargoNearlyFullWarnedRef = useRef(false);
  const deepDiveBannerShownRef = useRef(false);
  const fuelLeakRef = useRef(false);
  const engineSurgeRef = useRef(false);
  const engineSurgeTimerRef = useRef(0);
  const runSellBoostRef = useRef(0);
  const fuelEfficiencyBoostRef = useRef(0);
  const hostileUndergroundRef = useRef(false);
  const vetKeyBonusTilesRef = useRef(0);
  const oreValueMultiplierRef = useRef(1.0);
  const oreRallyEndTimeRef = useRef(0);
  const diegoTurboDrillRef = useRef<number>(0);

  // Surface escape events
  const escapeEventRef = useRef<{
    type: "nns_vote" | "dfinity_audit";
    timer: number;
    active: boolean;
  } | null>(null);
  const [escapeEventActive, setEscapeEventActive] = useState<{
    type: string;
    timer: number;
  } | null>(null);
  const [deepDiveBannerVisible, setDeepDiveBannerVisible] = useState(false);
  const [questPulseActive, setQuestPulseActive] = useState(false);
  const escapeEventTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const nnsVoteUsedRef = useRef(false);
  const dfnAuditUsedRef = useRef(false);

  // Ore discovery card
  const [oreDiscoveryCard, setOreDiscoveryCard] = useState<{
    name: string;
    era: string;
    color: string;
    tileId: number;
  } | null>(null);
  const oreDiscoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const gasWarningFrameRef = useRef<number | null>(null); // frame when player entered gas
  const caveInWarningRef = useRef(false);
  const caveInWarningFramesRef = useRef(0);
  const lavaSurgeRef = useRef(false);
  const lavaSurgeTimerRef = useRef(0);
  const lavaSurgeYRef = useRef(0);
  // New hazard/event refs
  const drillSurgeTimerRef = useRef(0);
  // Surface call and depth tracking refs
  const surfaceCallingRef = useRef(false);
  const deepestDrilledYRef = useRef(0);
  const doubleSellNextRef = useRef(false);
  // Shop special offer refs
  const shopSpecialOfferRef = useRef<ShopDeal | null>(null);
  const shopOfferPurchasedRef = useRef(false);
  // Run-scoped deal flags
  const runDrillBoostDealRef = useRef(false);
  const runFuelEfficiencyDealRef = useRef(false);
  // Refinement kit
  const refinementKitActiveRef = useRef(false);
  // Run seed
  const runSeedRef = useRef("");
  const cargoFullTipTimerRef = useRef(0);

  const magneticStormRef = useRef(0);
  const ghostSignalRef = useRef<{ x: number; y: number; timer: number } | null>(
    null,
  );
  const lastNNSGovernanceRef = useRef(0);
  const marketWhaleSurgeRef = useRef(false);
  const marketWhaleSurgeTimerRef = useRef(0);
  const maxDepthReachedRef = useRef(0);
  const whaleUndergroundUsedRef = useRef(false);
  const [whaleDialog, setWhaleDialog] = useState<{
    value: number;
    deepDive?: boolean;
  } | null>(null);
  const [activeSynergies, setActiveSynergies] = useState<string[]>([]);
  const [loreMsg, setLoreMsg] = useState("");

  const [storyTransmission, setStoryTransmission] = useState<{
    title: string;
    msg: string;
  } | null>(null);
  const storyBeatsFiredRef = useRef<Set<number>>(new Set());
  const runNpcPoolRef = useRef<string[]>([]);
  const undergroundNpcsRef = useRef<
    Array<{
      id: string;
      name: string;
      quote: string;
      reward: string;
      color: string;
      x: number;
      y: number;
      encountered: boolean;
      rewardClaimed?: boolean;
    }>
  >([]);
  const canvasSizeRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  const [vehicleSkin, setVehicleSkin] = useState<string>(
    () => localStorage.getItem("bob_skin") ?? "default",
  );
  const vehicleSkinRef = useRef<string>(
    localStorage.getItem("bob_skin") ?? "default",
  );
  const [showSkinPanel, setShowSkinPanel] = useState(false);
  const metaProgressRef = useRef<MetaProgress>(loadMetaProgress());
  const [veteranBonusMsg, setVeteranBonusMsg] = useState("");
  const veteranBonusMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const _pendingVeteranBonusRef = useRef<string>("");
  const activeHazardBannerRef = useRef(false);
  const [activeHazardBanner, setActiveHazardBanner] = useState<{
    title: string;
    instruction: string;
    icon: string;
    countdown: number;
    type: string;
  } | null>(null);
  const hazardBannerTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const [npcQuestActive, setNpcQuestActive] = useState<{
    npcId: string;
    description: string;
    reward: string;
    progress: number;
    goal: number;
    completed: boolean;
    step: number;
    totalSteps: number;
  } | null>(null);
  const npcQuestRef = useRef<{
    npcId: string;
    description: string;
    reward: string;
    progress: number;
    goal: number;
    type: string;
    completed: boolean;
    step: number;
    totalSteps: number;
  } | null>(null);

  const antagonistsDefeatedThisRunRef = useRef(0);
  const newMilestoneRef = useRef<string | undefined>(undefined);
  const btcMaxiDefeatedThisRunRef = useRef(0);
  const earthquakeSurvivedRef = useRef(0);
  const earthquakeActiveRef = useRef(false);
  const earthquakeDamageRef = useRef(false);
  const lastSellTripValueRef = useRef(0);
  const runOreTypesCollectedRef = useRef<Set<number>>(new Set());
  const runQuestsRef = useRef<RunQuest[]>([]);
  const [runQuests, setRunQuests] = useState<RunQuest[]>([]);
  const questPanelCollapsedRef = useRef(true);
  const [questPanelCollapsed, setQuestPanelCollapsed] = useState(true);
  const [missionsVisible, setMissionsVisible] = useState(false);
  const loreRoomsFoundRef = useRef(0);
  const mutatedTileRef = useRef<{ col: number; row: number } | null>(null);
  // HUD tooltip state
  const [lowFuelTooltip, setLowFuelTooltip] = useState(false);
  const [lowHullTooltip, setLowHullTooltip] = useState(false);
  const lowFuelShownRef = useRef(false);
  const lowHullShownRef = useRef(false);
  // Controls reminder state
  const [controlsHintAlpha, setControlsHintAlpha] = useState(1);
  const gameStartTimeRef = useRef<number>(0);
  const controlsHintDoneRef = useRef(false);
  // Comms log for cockpit panel
  const [_commMessages, setCommMessages] = useState<
    Array<{
      id: number;
      text: string;
      type: "hazard" | "reward" | "transmission" | "system";
    }>
  >([]);
  const commIdRef = useRef(0);
  // Bottom ticker state
  const [_tickerMessages, setTickerMessages] = useState<string[]>([]);
  const [currentTickerMsg, setCurrentTickerMsg] = useState<string>("");
  const tickerQueueRef = useRef<string[]>([]);
  const tickerDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Character portrait state
  const [activePortrait, setActivePortrait] = useState<{
    npcId: string;
    text: string;
    color: string;
    timer: number;
  } | null>(null);
  const portraitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addCommMessageRef = useRef<
    (
      text: string,
      type: "hazard" | "reward" | "transmission" | "system",
    ) => void
  >(() => {});
  const showPortraitRef = useRef<
    (npcId: string, text: string, color: string) => void
  >(() => {});
  // New player tutorial panel
  const [showTutorialPanel, setShowTutorialPanel] = useState(false);
  const [_tutorialPanelStep, setTutorialPanelStep] = useState(0);
  // Run modifier selection
  const [showModifierSelect, setShowModifierSelect] = useState(false);
  const [modifierChoices, setModifierChoices] = useState<RunModifier[]>([]);
  const activeModifierRef = useRef<RunModifier | null>(null);
  const pendingDeepDiveRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_npcChoiceDialog, setNpcChoiceDialog] = useState<null>(null);

  const loreMsgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingTextsRef = useRef<
    Array<{
      x: number;
      y: number;
      text: string;
      alpha: number;
      dy: number;
      color?: string;
    }>
  >([]);
  const discoveredOresRef = useRef<Set<number>>(
    new Set(
      (localStorage.getItem("bob_discovered_ores") ?? "")
        .split(",")
        .filter(Boolean)
        .map(Number),
    ),
  );

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const syncScreen = (s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  };

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable audio refs
  const playTone = useCallback(
    (
      type: OscillatorType,
      freq: number,
      dur: number,
      gain = 0.3,
      freqEnd?: number,
    ) => {
      if (mutedRef.current) return;
      try {
        const ctx2 = ensureAudio();
        const osc = ctx2.createOscillator();
        const g = ctx2.createGain();
        osc.connect(g);
        g.connect(ctx2.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx2.currentTime);
        if (freqEnd !== undefined)
          osc.frequency.linearRampToValueAtTime(
            freqEnd,
            ctx2.currentTime + dur,
          );
        g.gain.setValueAtTime(gain, ctx2.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + dur);
        osc.start(ctx2.currentTime);
        osc.stop(ctx2.currentTime + dur);
      } catch (_e) {}
    },
    [],
  );

  const playDrillSound = useCallback(() => {
    playTone("sawtooth", 150, 0.08, 0.15);
  }, [playTone]);
  const playOreCollect = useCallback(
    (
      tier: "common" | "uncommon" | "rare" | "epic" | "legendary" = "common",
    ) => {
      const freqMap = {
        common: 600,
        uncommon: 700,
        rare: 800,
        epic: 950,
        legendary: 1100,
      };
      const gainMap = {
        common: 0.2,
        uncommon: 0.22,
        rare: 0.25,
        epic: 0.28,
        legendary: 0.32,
      };
      const endMap = {
        common: 1000,
        uncommon: 1200,
        rare: 1400,
        epic: 1700,
        legendary: 2000,
      };
      playTone("sine", freqMap[tier], 0.15, gainMap[tier], endMap[tier]);
    },
    [playTone],
  );
  const playShopEnter = useCallback(() => {
    playTone("sine", 880, 0.3, 0.2);
  }, [playTone]);
  const playThrustSound = useCallback(() => {
    playTone("sawtooth", 80, 0.06, 0.08);
  }, [playTone]);
  const playGameOver = useCallback(() => {
    playTone("sawtooth", 400, 0.8, 0.3, 80);
  }, [playTone]);
  // biome-ignore lint/correctness/noUnusedVariables: reserved for win sequence
  const playWinFanfare = useCallback(() => {
    if (mutedRef.current) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone("sine", f, 0.15, 0.3), i * 150);
    });
  }, [playTone]);
  // biome-ignore lint/correctness/noUnusedVariables: reserved for cave-in events
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable audio refs
  const playCaveIn = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const ctx2 = ensureAudio();
      const buf = ctx2.createBuffer(1, ctx2.sampleRate * 0.2, ctx2.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx2.createBufferSource();
      src.buffer = buf;
      const g = ctx2.createGain();
      g.gain.setValueAtTime(0.4, ctx2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.2);
      src.connect(g);
      g.connect(ctx2.destination);
      src.start();
      playTone("sine", 60, 0.2, 0.3);
    } catch (_e) {}
  }, [playTone]);
  const playLowFuelWarning = useCallback(() => {
    const now = Date.now();
    if (now - lastFuelWarnRef.current < 3000) return;
    lastFuelWarnRef.current = now;
    playTone("square", 440, 0.1, 0.2);
  }, [playTone]);
  const playHit = useCallback(() => {
    playTone("square", 200, 0.1, 0.4, 80);
  }, [playTone]);

  const playShopPurchase = useCallback(() => {
    if (mutedRef.current) return;
    // 2-note ascending "cha-ching"
    playTone("sine", 220, 0.15, 0.25);
    setTimeout(() => playTone("sine", 440, 0.15, 0.3), 160);
  }, [playTone]);
  const playAntagonistDefeat = useCallback(() => {
    if (mutedRef.current) return;
    // Descending coin burst
    playTone("sine", 600, 0.1, 0.3, 200);
    setTimeout(() => playTone("sine", 800, 0.08, 0.2, 300), 50);
  }, [playTone]);

  const showLoreMessage = useCallback((msg: string) => {
    setLoreMsg(msg);
    if (loreMsgTimeoutRef.current) clearTimeout(loreMsgTimeoutRef.current);
    loreMsgTimeoutRef.current = setTimeout(() => setLoreMsg(""), 3500);
  }, []);

  const advanceTutorial = useCallback((toStep: number) => {
    if (tutorialStepRef.current < toStep) {
      tutorialStepRef.current = toStep;
      setTutorialStep(toStep);
    }
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      if (e.key === "q" || e.key === "Q") triggerSonar();
      if (e.key === "e" || e.key === "E") triggerCharge();
      if (e.key === "r" || e.key === "R") triggerSurfaceCall();
      if (e.key === "x" || e.key === "X") activateRefinementKit();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const runCountRef = useRef(0);

  const skipModifierRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable refs including syncScreen
  const startGame = useCallback((resume = false, deepDive = false) => {
    // On a new run, show modifier select overlay before starting
    if (!resume && !skipModifierRef.current) {
      pendingDeepDiveRef.current = deepDive;
      setModifierChoices(pickModifiers(3));
      syncScreen("game");
      setShowModifierSelect(true);
      return;
    }
    skipModifierRef.current = false;
    deepDiveModeRef.current = deepDive;
    setIsDeepDive(deepDive);
    if (!resume) {
      localStorage.removeItem(BOB_SAVE_KEY);
      // Show tutorial for first-time players who haven't seen it as in-game overlay
      if (!localStorage.getItem("bob_ingame_tutorial_done")) {
        setShowTutorialPanel(true);
        setTutorialPanelStep(0);
        setTimeout(() => {
          setShowTutorialPanel(false);
          localStorage.setItem("bob_ingame_tutorial_done", "1");
        }, 10000);
      }
    }
    mapRef.current = generateMap(
      deepDive,
      activeModifierRef.current?.effect === "rich_seam",
    );
    // Init ore market multipliers (±30% per run)
    {
      const newMults: Record<string, number> = {};
      for (const tileId of Object.keys(RESOURCES)) {
        newMults[tileId] = 0.7 + Math.random() * 0.6;
      }
      oreMarketMultipliersRef.current = newMults;
      // Mark ~2.5% of solid tiles at depth 60m+ as unstable
      const newUnstable = new Set<number>();
      for (let uty = 65; uty < MAP_H; uty++) {
        for (let utx = 0; utx < MAP_W; utx++) {
          const ut = mapRef.current[uty * MAP_W + utx];
          if (
            (ut === T.DIRT || ut === T.STONE || ut === T.HARD_ROCK) &&
            Math.random() < 0.025
          ) {
            newUnstable.add(uty * MAP_W + utx);
          }
        }
      }
      unstableTilesRef.current = newUnstable;
      crackingTilesRef.current = new Map();
    }
    playerRef.current = initPlayer();
    // Deep Dive: spawn player deeper
    if (deepDive) {
      const deepStartRow = 42; // ~63m depth
      playerRef.current.y = deepStartRow * TILE - (TILE - 2);
      playerRef.current.fallFrom = deepStartRow * TILE - (TILE - 2);
    }
    if (resume) {
      const save = loadGame();
      if (save) {
        const s = playerRef.current.stats;
        s.bob = save.bob;
        s.hull = save.hull;
        s.maxHull = save.maxHull;
        s.fuel = save.fuel;
        s.maxFuel = save.maxFuel;
        s.maxCargo = save.maxCargo;
        s.drillLevel = save.drillLevel;
        s.engineLevel = save.engineLevel;
        s.hullLevel = save.hullLevel;
        s.fuelLevel = save.fuelLevel;
        s.cargoLevel = save.cargoLevel;
        s.shieldLevel = save.shieldLevel;
        s.radarLevel = save.radarLevel;
        s.thrusterLevel = save.thrusterLevel;
        s.coolantLevel = save.coolantLevel;
        maxDepthReachedRef.current = save.bestDepth;
        runCountRef.current = save.runCount;
        discoveredOresRef.current = new Set(save.discoveredOres);
      }
    }
    frameRef.current = 0;
    exploredRef.current = new Uint8Array(MAP_W * MAP_H);
    shakeRef.current = { x: 0, y: 0, frames: 0 };
    // Initialize particle pool (150 on mobile, 300 on desktop)
    const isMob = window.innerWidth <= 1024;
    const poolSize = isMob ? 100 : 300;
    if (particlesRef.current.length < poolSize) {
      particlesRef.current = Array.from({ length: poolSize }, () => ({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        color: "#fff",
        alive: false,
      }));
    } else {
      for (const pt of particlesRef.current) {
        pt.alive = false;
        pt.life = 0;
      }
    }
    minimapDirtyRef.current = true;
    zoneLabelRef.current = { label: "", alpha: 0, frames: 0, currentZone: "" };
    prevHullRef.current = 100;
    tutorialStepRef.current = 0;
    eventTriggeredRef.current = false;
    // Start timers at current time so first event can only fire after the interval
    const now60 = performance.now();
    lastEventTimeRef.current = now60 + 70000; // 90s startup grace (check fires after 20s, so +70s = 90s total)
    maxDepthReachedRef.current = 0;
    deepestDrilledYRef.current = 0;
    surfaceCallingRef.current = false;
    doubleSellNextRef.current = false;
    shopSpecialOfferRef.current = null;
    shopOfferPurchasedRef.current = false;
    runDrillBoostDealRef.current = false;
    runFuelEfficiencyDealRef.current = false;
    refinementKitActiveRef.current = false;
    gasWarningFrameRef.current = null;
    caveInWarningRef.current = false;
    caveInWarningFramesRef.current = 0;
    lavaSurgeRef.current = false;
    lavaSurgeTimerRef.current = 0;
    lavaSurgeYRef.current = 0;
    lastNNSGovernanceRef.current = 0;
    marketWhaleSurgeRef.current = false;
    marketWhaleSurgeTimerRef.current = 0;
    whaleUndergroundUsedRef.current = false;
    npcEncounteredRef.current = new Set();
    nnsSlowRef.current = 0;
    undergroundNpcsRef.current = [];
    npcRewardsRef.current = {};
    antagonistsRef.current = [];
    lastAntagonistSpawnRef.current = 0;
    marketCrashRef.current = false;
    marketCrashTimerRef.current = 0;
    marketCrashLiteRef.current = false;
    marketCrashLiteTimerRef.current = 0;
    mutatedTileRef.current = null;
    playerFrozenRef.current = 0;
    drillSlowRef.current = false;
    headFudderSpawnedRef.current = false;
    headFudderWarningFiredRef.current = false;
    lastSurfaceTimeRef.current = performance.now();
    bossAnnouncementRef.current = null;
    lastBiomeDepthRef.current = 0;
    depthMilestonesReachedRef.current = new Set<number>();
    drillOverheatRef.current = false;
    drillOverheatTimerRef.current = 0;
    drillHeatRef.current = 0;
    drillHeatOverheatRef.current = false;
    drillHeatCooldownRef.current = 0;
    tempOreMultiplierRef.current = 1.0;
    tempOreMultiplierTimerRef.current = 0;
    nextOreMultRef.current = 1;
    drillSpeedBoostRef.current = 1.0;
    drillSpeedBoostTimerRef.current = 0;
    blackMarketUsedRef.current = false;
    cargoNearlyFullWarnedRef.current = false;
    deepDiveBannerShownRef.current = false;
    fuelLeakRef.current = false;
    engineSurgeRef.current = false;
    engineSurgeTimerRef.current = 0;
    runSellBoostRef.current = 0;
    fuelEfficiencyBoostRef.current = 0;
    hostileUndergroundRef.current = false;
    vetKeyBonusTilesRef.current = 0;
    oreValueMultiplierRef.current = 1.0;
    oreRallyEndTimeRef.current = 0;
    drillSurgeTimerRef.current = 0;
    magneticStormRef.current = 0;
    ghostSignalRef.current = null;
    escapeEventRef.current = null;
    nnsVoteUsedRef.current = false;
    dfnAuditUsedRef.current = false;
    lastHazardEventTimeRef.current = now60 + 100000; // 120s startup grace
    lastLuckyEventTimeRef.current = 0;
    setAirdropCrate(null);
    surfaceNpcShownRef.current = false;
    if (escapeEventTimerRef.current) clearInterval(escapeEventTimerRef.current);
    setEscapeEventActive(null);
    setSurfaceNpc(null);
    setActiveNpc(null);
    setOreDiscoveryCard(null);
    setTutorialStep(0);
    setSubmitted(false);
    setCargoDropPending(null);
    setEventMsg("");
    storyBeatsFiredRef.current = new Set();
    antagonistsDefeatedThisRunRef.current = 0;
    btcMaxiDefeatedThisRunRef.current = 0;
    earthquakeSurvivedRef.current = 0;
    earthquakeActiveRef.current = false;
    earthquakeDamageRef.current = false;
    lastSellTripValueRef.current = 0;
    runOreTypesCollectedRef.current = new Set();
    loreRoomsFoundRef.current = 0;
    jerryRepairDiscountRef.current = false;
    crackingTilesRef.current = new Map();
    lowFuelShownRef.current = false;
    lowHullShownRef.current = false;
    controlsHintDoneRef.current = false;
    gameStartTimeRef.current = performance.now();
    const _rSeedTs = Date.now();
    runSeedRef.current = (_rSeedTs % 1000000)
      .toString(36)
      .toUpperCase()
      .padStart(6, "0")
      .slice(-6);
    setControlsHintAlpha(1);
    // Deep Dive start banner
    if (isDeepDive) {
      setTimeout(() => {
        if (!deepDiveBannerShownRef.current) {
          deepDiveBannerShownRef.current = true;
          setDeepDiveBannerVisible(true);
          setTimeout(() => setDeepDiveBannerVisible(false), 3000);
        }
      }, 1000);
    }
    setLowFuelTooltip(false);
    setLowHullTooltip(false);
    npcQuestRef.current = null;
    setNpcQuestActive(null);
    // Initialize 2 random Jerry quests + 1 NPC quest for this run
    const questShuffled = [...JERRY_QUEST_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);
    const npcQuestPick =
      NPC_QUEST_POOL[Math.floor(Math.random() * NPC_QUEST_POOL.length)];
    const initQuests: RunQuest[] = [
      ...questShuffled.map((q, qi) => ({
        ...q,
        id: `jerry_q_${qi}`,
        progress: 0,
        completed: false,
      })),
      { ...npcQuestPick, id: "npc_q_0", progress: 0, completed: false },
    ];
    runQuestsRef.current = initQuests;
    setRunQuests(initQuests);
    setNpcChoiceDialog(null);
    setStoryTransmission(null);
    activeHazardBannerRef.current = false;
    setActiveHazardBanner(null);
    if (hazardBannerTimerRef.current)
      clearInterval(hazardBannerTimerRef.current);

    // Select random NPC pool for this run (7 of 11 underground NPCs, always include jerry)
    const allUndergroundNpcs = [
      "dom",
      "jan",
      "lomesh",
      "dfinity_ghost",
      "bob_dog",
      "diego",
      "whale_underground",
      "ghost_miner",
      "jerry_underground",
      "black_market_trader",
      "arthur_falls",
      "wenzel",
    ];
    const shuffled = allUndergroundNpcs.sort(() => Math.random() - 0.5);
    runNpcPoolRef.current = shuffled.slice(0, 7);

    // Place underground NPC chambers on the map
    {
      const npcDefs: Array<{
        id: string;
        name: string;
        quote: string;
        reward: string;
        color: string;
        minRow: number;
      }> = [
        {
          id: "dom",
          name: "Dominic Williams",
          quote: [
            "Miner... the deep systems reveal themselves only to those who persist through the noise.",
            "Infinite scalability isn't just a slogan. It's physics. It's what waits at the bottom of these tunnels.",
            "The NNS governs all — even these tunnels. Every block you mine is a governance proposal passed in stone.",
            "Chain Fusion will connect every blockchain to the ICP. Starting with this mine, right now, in this moment.",
            "The future of the internet lives underground. The Surface Web was always just the beginning.",
            "ICP runs at web speed. Your drill should too. Latency is the enemy of consensus.",
            "Neurons stake for 8 years to earn maturity. Your hull doesn't have that luxury. Manage it carefully.",
            "The canister model means your smart contracts run forever. Unlike fuel tanks. Replenish before you regret.",
            "Every token ever launched on ICP is backed by real computation. Unlike the coins above. Keep drilling.",
            "I designed the Internet Computer to outlast governments. It will outlast this mine too. But will you?",
            "vetKeys are almost here. Threshold encryption means no single entity controls your secrets. Not even me.",
            "SNS governance launched with BIG on board. Decentralization is not a buzzword. It is architecture.",
            "The genesis ceremony — May 10, 2021 — was the moment the Internet Computer became unstoppable. Remember that.",
            "Subnet replication means your canister is copied across 13 nodes simultaneously. Redundancy is immortality.",
            "HTTPS outcalls from canisters. The IC is consuming the internet from within. One API call at a time.",
            "You've helped secure a fragment of the Internet Computer's future. That loyalty is noted, miner.",
            "Trust is a scarce resource in this mine. You've spent it wisely.",
            "The protocol remembers those who chose the chain over personal gain. Today, that was you.",
          ][Math.floor(Math.random() * 18)],
          reward: "dom_help_fragment",
          color: "#a78bfa",
          minRow: 25,
        },
        {
          id: "bob_dog",
          name: "BOB the Dog",
          quote: [
            "Woof! 🐾 (wags tail enthusiastically and knocks over a stack of ICP candles)",
            "BORK! Found something shiny for you! Follow me! 🐾🐾",
            "Woof woof!! bob.fun is PAWSOME! Go check it out! 🐾",
            "BOB BOB BOB! (spins in circles, tail a blur)",
            "Arf! Arf! I smell BOB tokens nearby! This way! 🐾",
            "WOOOOF! Best miner ever! Much dig! Very ore! So depth! 🐾",
            "*sniffs ground* ...there's a cache nearby. I can FEEL it. Trust the nose. 🐾",
            "*drops something at your feet* ...that's a rare ore. Good boy brings gifts. 🐾",
            "Bark bark bark! The fudders cannot stop us! BORK! 🐾🐾🐾",
            "Woof! Every BOB token has a dog's soul. I know this because I am BOB. 🐾",
            "BORK BORK! The SEC Agent was down here sniffing around. I bit his ankle. 🐾",
            "*digs furiously* Found it! A whole pocket of BOB Shards! Who's a good boy?! 🐾",
            "Arf! Dom said I shouldn't tell you this but: the Genesis Block smells AMAZING. 🐾",
            "Woof woof! I once had a 8-year neuron staked. Ate it. Tasted like maturity. 🐾",
            "BORK! The BTC Maxi threw a rock at me. He just made himself an enemy. 🐾",
          ][Math.floor(Math.random() * 15)],
          reward: "npc_quest_bob_dog",
          color: "#fbbf24",
          minRow: 6,
        },
        {
          id: "jan",
          name: "Jan Camenisch",
          quote: [
            "The cryptographic structures here are genuinely fascinating. Help me analyze the hash patterns?",
            "vetKeys will unlock threshold encryption for this entire subnet. The math down here is impeccable.",
            "Threshold ECDSA signatures — down here, everything is literally signed in stone. I love it.",
            "The zero-knowledge proof of this ore's existence is mathematically elegant. Exquisite formations.",
            "I've run the ZK proofs. You've been this deep before. Your on-chain identity confirms it. Impressive.",
            "Identity Layer plus mining? The cryptographic math checks out perfectly. Security all the way down.",
            "Every block you drill produces a verifiable random function output. The network proves your work.",
            "Chain-key cryptography means your identity is valid at depth 155 just as it is at the surface. Trust the math.",
            "The Byzantine fault tolerance down here is exceptional. Even the rocks follow consensus rules.",
            "I derived the encryption scheme for vetKeys in a tunnel much like this one. The darkness helps you think.",
            "Schnorr signatures in chain-key form. The elegance is breathtaking. I may cry. Don't tell Dom.",
            "This ore cluster has a Merkle root I haven't seen before. Extraordinary. May I sample it for research?",
            "Non-interactive zero-knowledge proofs on ICP. I published the paper. The rocks here cite it correctly.",
            "Your drill's hash rate is surprisingly competitive. You have an eye for applied cryptography, miner.",
            "The subnet topology mirrors a lattice I designed in 2009. The irony is not lost on me.",
          ][Math.floor(Math.random() * 15)],
          reward: "choice",
          color: "#34d399",
          minRow: 20,
        },
        {
          id: "lomesh",
          name: "Lomesh Dutta",
          quote: [
            "Growth hack unlocked! I can double the value of your next cargo haul. Click fast.",
            "We're going parabolic on ore extraction metrics, miner! Community is absolutely loving this.",
            "Ecosystem adoption starts underground. You're the vanguard of the ICP miner economy.",
            "I've analyzed the ore distribution patterns. We are definitively at an inflection point.",
            "Network effects multiply exponentially down here. The data doesn't lie. Trust the data.",
            "Viral growth loop: mine, sell, upgrade, repeat. The compound interest is staggering.",
            "Three ore types mined already? That's ecosystem diversification. Your portfolio is healthy.",
            "The retention metrics for miners who go past 80m are incredible. You're in the top cohort.",
            "I'm building a growth dashboard for the BOB mine. Your excavation rate is impressive.",
            "Adoption is bottom-up, not top-down. You're proving that one block at a time. Impressive KPIs.",
            "Your user acquisition cost underground is effectively zero. Growth teams dream of this funnel.",
            "Day 1 retention for new miners who hit depth 60m is 94%. You're a power user by definition.",
            "The BOB mine has a higher NPS than most Web2 platforms I've growth-hacked. The community is unreal.",
            "I A/B tested two cargo strategies. Carrying rare ores had 3.2x better monetisation. Data-driven mining.",
            "Community-led growth is the only growth that compounds. Every ore you mine is a referral.",
          ][Math.floor(Math.random() * 15)],
          reward: "choice",
          color: "#fb923c",
          minRow: 22,
        },
        {
          id: "dfinity_ghost",
          name: "Dfinity Ghost",
          quote: [
            "...I walked these tunnels before the mainnet launch. They haven't changed. Take this.",
            "I was there when the genesis block was minted. May 10, 2021. These tunnels remember everything.",
            "The early builders left traces down here. Echoes of the original vision. Not all of it was published.",
            "...the 2018 whitepaper described these exact geological formations. Uncanny. Or not, if you read it.",
            "I've seen what lies beneath depth 155. You're not ready yet. But each meter makes you readier.",
            "Some call me anonymous. I call myself... foundational infrastructure.",
            "We built the Internet Computer in secret for years. We built it down here, in the dark, like you.",
            "...the boundary nodes know you're here. The replica logs show your position. But no one is checking.",
            "I held an 8-year neuron before neurons existed. The maturity is... indescribable. Keep digging.",
            "The genesis ceremony happened above ground. The real genesis happens right here, at depth. Always has.",
            "...there are draft papers from 2017 that describe ores identical to what you're mining. Interesting.",
            "I wrote the first canister compiler underground. No WiFi. No distractions. Pure protocol.",
            "You are the boundary node between the surface and the deep. Act accordingly.",
            "...the SEC Agent has been tracking you since depth 40m. He doesn't know about this chamber. You're safe.",
            "Before subnets there was one chain. Before one chain there was an idea. Before the idea... there was this mine.",
          ][Math.floor(Math.random() * 15)],
          reward: "cloak",
          color: "#c4b5fd",
          minRow: 37,
        },
        {
          id: "diego",
          name: "Diego",
          quote: [
            "Whoa! You look beat up, miner. Good thing I found you. Let me patch you up.",
            "The ICP community looks after its own. Sit down, I'll fix that hull right now.",
            "I've patched up miners in worse shape than this. Much worse. You'll be fine.",
            "Good thing I found you when I did. Another hundred meters and... well. Take this kit.",
            "Emergency repair toolkit, on the house. That's ICP community solidarity in action.",
            "You miners always push past the safe limit. Let me help before you wreck yourself permanently.",
            "Hull integrity critical. You know what? Let's not even talk about how bad it was. Fixed.",
            "Seen a lot of miners come through here. The ones who survive are the ones who accept help. Smart move.",
            "My toolkit has more use underground than it ever did on the surface. Keeps miners in the game.",
            "Fuel leak sealed, hull plate welded, and I found a crack in your drill casing. All sorted now.",
            "The BOB community Discord has a whole channel for miners who got this deep. You'd fit right in.",
            "I swapped out your exhaust manifold too while I was in there. No charge. That's community.",
            "A BTC Maxi threw a boulder that dented your rear plating pretty badly. Don't worry, I've seen worse.",
            "The deeper you go the more maintenance these machines need. Good thing I keep spare parts down here.",
            "Sit still. This weld might sting. There — you're structurally sound again. Go find that Genesis Block.",
          ][Math.floor(Math.random() * 15)],
          reward: "choice",
          color: "#60a5fa",
          minRow: 8,
        },
        {
          id: "protocol_shill",
          name: "Protocol Shill",
          quote: [
            "Psst. I've got a guaranteed 10x on the next depth layer. Total alpha. DM me.",
            "No whitepaper needed. Trust the vibes. 100% APY minimum. Probably.",
            "This is definitely not a rugpull. I checked the contract myself. (I didn't.)",
            "Buy the dip! It's definitely a dip! Could also be the floor falling out but bullish!",
            "I found a deposit that will pump your BOB 10x. Small processing fee required.",
          ][Math.floor(Math.random() * 5)],
          reward: "protocol_shill_gamble",
          color: "#f0abfc",
          minRow: 15,
        },
        {
          id: "ghost_miner",
          name: "Ghost Miner",
          quote: [
            "...you found me. Not many do. The tunnels change for those who know the protocol.",
            "I came down here before the genesis ceremony. I never went back up. That was the plan.",
            "The Genesis Block — it's not at the bottom. It's at the boundary between chain and void.",
            "I mined the first BOB Seam. May 10, 2021. Nobody believed me then. Do you believe me now?",
            "These tunnels have memory. Every block mined is permanently recorded in the geology.",
            "I traded my cargo for something more valuable. Information. Want to make the same trade?",
            "The Whale doesn't know I'm here. Keep it that way. Our arrangement doesn't include him.",
            "There's a cache below depth 130 that even Dom doesn't know about. I can show you... for a price.",
            "I've been mapping these tunnels for years. The Genesis Block moves. But it always returns to 155.",
            "You smell like a fresh miner. The deep ones don't smell anymore. We become part of the geology.",
            "The ICP genesis ceremony left traces down here. Cryptographic echoes. I collect them.",
            "I watched the Rug Puller set up shop. I watched him leave. I found what he left behind.",
            "Sonic DEX, ICPSwap, NFID — they all have roots down here. I planted the seeds before launch.",
            "You want the Genesis Block? I know exactly where it is. The price is 500 BOB and your silence.",
            "The Head Fudder guards what's mine. Defeat him, and the Genesis Block reveals itself to you.",
          ][Math.floor(Math.random() * 15)],
          reward: "ghost_sonar_trade",
          color: "#94a3b8",
          minRow: 30,
        },
        {
          id: "whale_underground",
          name: "The Whale",
          quote: [
            "I'll buy your entire cargo right now for 2.5x. No questions. Or help me with something more interesting...",
            "Market conditions are optimal for a transaction. What do you say, miner?",
            "I've cornered more markets than you've drilled meters. Time to capitalize.",
            "The deep market never sleeps. I never sleep either. Coincidence? No.",
            "500,000 ICP staked. 8-year neuron. I can afford to wait. Can you?",
            "You want liquidity? I want influence. We can both get what we want right now.",
            "I've been following your mining patterns. Your efficiency is... acceptable.",
            "The Whale always pays on time. The Whale always gets what he wants. Always.",
            "I have a proposition that benefits us both. One requires a small governance favor...",
            "The NNS votes go how I want them to. This one could use some help. Interested?",
            "Your cargo is impressive for this depth. Let me make it worth your while.",
            "I heard about the Genesis Block. 21,000 BOB? I'll give you 50,000 for it. Directly.",
            "Chain Fusion means cross-chain assets. I need cross-chain assets moved. You're underground. Helpful.",
            "The community thinks I'm bullish on ICP. They're right. But I'm also bullish on leverage.",
            "Every miner at this depth has a price. What's yours?",
            "You've crossed me before, miner. I have a long memory and longer positions.",
            "Your reputation underground precedes you. Whether that's good depends on the day.",
            "We have history, you and I. Let's make it profitable this time.",
          ][Math.floor(Math.random() * 18)],
          reward: "whale_instant_2_5x",
          color: "#8b5cf6",
          minRow: 90,
        },
        {
          id: "jerry_underground",
          name: "Jerry Banfield",
          quote: [
            "Guys! I found you underground! Check this out — I've been streaming from down here for three hours!",
            "Hey! I have a deal for you! Trade me some cargo and I'll boost your hull right now!",
            "My YouTube channel follows me everywhere, even 80 meters underground. Want a shoutout? For a price?",
            "I can repair your hull right now OR I can boost your drill speed. Your choice. Camera's rolling.",
            "This is crazy content right here! Help me with something and I'll help you back!",
            "I have spare fuel canisters from my last sponsor. Interested? Costs you some cargo though.",
            "The algorithm loves deep mining content. You're practically paying my bills right now.",
            "I'll trade you a Hull repair for some of that NNS Token. Community barter! Love it!",
            "Someone asked in the comments what's at 80m. You're the answer. Help me and I'll help you.",
            "Hey! Quick trade — I boost your cargo capacity, you help me carry some promo materials.",
            "Hey, you're that miner who helped me out before! Discount coming your way!",
            "My algorithm says you're reliable. That's rare underground. Makes me generous.",
          ][Math.floor(Math.random() * 12)],
          reward: "jerry_trade_fuel",
          color: "#f97316",
          minRow: 15,
        },
        {
          id: "black_market_trader",
          name: "Black Market Trader",
          quote: [
            "The chain doesn't ask questions, miner. Neither do I.",
            "...off-chain. Off-record. Off-grid. Just the way I like it.",
            "Anonymous transactions are a feature, not a bug. You understand.",
            "No KYC. No AML. No questions. Just BOB. Interested?",
            "I've been underground longer than the genesis block. Trust the shadows.",
            "The SEC Agent passed me three times. Didn't see me once. Buy something.",
            "Premium prices for discretion. Worth every BOB.",
          ][Math.floor(Math.random() * 7)],
          reward: "black_market_trade",
          color: "#1f2937",
          minRow: 50,
        },
        {
          id: "arthur_falls",
          name: "Arthur Falls",
          quote:
            "Miner! I've been covering the ICP underground scene for months. Give me an exclusive?",
          reward: "arthur_interview",
          color: "#f97316",
          minRow: 35,
        },
        {
          id: "wenzel",
          name: "Wenzel Huschenbeck",
          quote:
            "Greetings miner. I've been running ICP node machines at 40 below zero. I can share the efficiency secrets.",
          reward: "wenzel_upgrade",
          color: "#22d3ee",
          minRow: 65,
        },
      ];
      const pool = runNpcPoolRef.current;
      const placed: Array<{
        id: string;
        name: string;
        quote: string;
        reward: string;
        color: string;
        x: number;
        y: number;
        encountered: boolean;
        rewardClaimed?: boolean;
      }> = [];
      const theMap = mapRef.current;
      for (const def of npcDefs) {
        if (!pool.includes(def.id)) continue;
        let attempts = 0;
        while (attempts < 200) {
          attempts++;
          const cx = 5 + Math.floor(Math.random() * (MAP_W - 10));
          const cy =
            def.minRow + Math.floor(Math.random() * (MAP_H - def.minRow - 5));
          const tooClose = placed.some(
            (p) =>
              Math.abs(p.x / TILE - cx) < 8 && Math.abs(p.y / TILE - cy) < 8,
          );
          if (tooClose) continue;
          // Carve a small 3x2 chamber
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx2 = cx + dx;
              const ny2 = cy + dy;
              if (nx2 > 0 && nx2 < MAP_W - 1 && ny2 > 5 && ny2 < MAP_H - 1) {
                theMap[ny2 * MAP_W + nx2] = T.EMPTY;
              }
            }
          }
          placed.push({
            id: def.id,
            name: def.name,
            quote: def.quote,
            reward: def.reward,
            color: def.color,
            x: cx * TILE,
            y: cy * TILE,
            encountered: false,
          });
          break;
        }
      }
      undergroundNpcsRef.current = placed;
    }

    // Apply meta-progression bonuses on new run
    const meta2 = loadMetaProgress();
    metaProgressRef.current = meta2;
    vehicleSkinRef.current = localStorage.getItem("bob_skin") ?? "default";
    const bonuses: string[] = [];
    if (!resume) {
      if (meta2.totalRunsCompleted >= 3) {
        playerRef.current.stats.maxFuel = Math.floor(
          playerRef.current.stats.maxFuel * 1.1,
        );
        bonuses.push("+10% max fuel (Veteran bonus)");
      }
      if (meta2.bestDepth > 80) {
        playerRef.current.stats.hullLevel = Math.max(
          playerRef.current.stats.hullLevel,
          1,
        );
        playerRef.current.stats.maxHull =
          100 + playerRef.current.stats.hullLevel * 60;
        bonuses.push("+1 Hull level (Deep Diver bonus)");
      }
      if (meta2.totalAntagonistsDefeated >= 10) {
        playerRef.current.stats.bob += 50;
        bonuses.push("+50 BOB (Antagonist Slayer bonus)");
      }
      if ((meta2.runsReaching100m ?? 0) >= 5) {
        // Deep Diver milestone: +5% drill speed (apply as extra drill level fraction)
        playerRef.current.stats.drillLevel = Math.min(
          5,
          playerRef.current.stats.drillLevel + 1,
        );
        bonuses.push("+1 Drill level (Deep Diver milestone)");
      }
      if (meta2.totalAntagonistsDefeated >= 20) {
        // Fudder Slayer milestone: +10% hull max HP
        playerRef.current.stats.maxHull = Math.floor(
          playerRef.current.stats.maxHull * 1.1,
        );
        playerRef.current.stats.hull = Math.min(
          playerRef.current.stats.hull,
          playerRef.current.stats.maxHull,
        );
        bonuses.push("+10% max hull (Fudder Slayer milestone)");
      }
      // Permanent carry-over bonuses from wins (stacking, capped at 5)
      const permBonusCount = Math.min(5, meta2.permanentBonuses ?? 0);
      if (permBonusCount >= 1) {
        playerRef.current.stats.maxCargo += 5;
        bonuses.push("+5 cargo (Win bonus)");
      }
      if (permBonusCount >= 2) {
        // 5% fuel efficiency (effectively 5% less drain — set a flag, applied in game loop)
        playerRef.current.stats.fuelEfficiencyBonus = 0.05;
        bonuses.push("+5% fuel efficiency (Win bonus)");
      }
      if (permBonusCount >= 3) {
        playerRef.current.stats.sellPriceBonus = 0.03;
        bonuses.push("+3% sell prices (Win bonus)");
      }
      if (permBonusCount >= 4) {
        playerRef.current.stats.maxHull += 5;
        bonuses.push("+5 max hull (Win bonus)");
      }
      if (permBonusCount >= 5) {
        playerRef.current.stats.bob += 25;
        bonuses.push("+25 BOB start (Win bonus)");
      }
      if (bonuses.length > 0) {
        const msg = `🎖 VETERAN BONUSES: ${bonuses.join(" | ")}`;
        // Delay veteran bonus 10s after game start — never shows at startup
        setTimeout(() => {
          setVeteranBonusMsg(msg);
          if (veteranBonusMsgTimerRef.current)
            clearTimeout(veteranBonusMsgTimerRef.current);
          veteranBonusMsgTimerRef.current = setTimeout(
            () => setVeteranBonusMsg(""),
            5000,
          );
        }, 10000);
      }
    }

    setMissionsVisible(false);

    // Apply active run modifier effects
    {
      const mod = activeModifierRef.current;
      const p2 = playerRef.current;
      const s2 = p2.stats;
      if (mod) {
        if (mod.effect === "heavy_load") {
          s2.maxCargo = Math.floor(s2.maxCargo * 1.5);
        } else if (mod.effect === "veteran_kit") {
          s2.bob += 50;
          s2.fuel = Math.min(s2.maxFuel, s2.fuel * 1.1);
        } else if (mod.effect === "explorer_map") {
          // Mark all tiles as explored
          exploredRef.current.fill(1);
        } else if (mod.effect === "generous_protocol") {
          s2.bob += 200;
          s2.cargoLevel = Math.min(5, (s2.cargoLevel ?? 1) + 1);
          s2.maxCargo = 50 + s2.cargoLevel * 20;
        } else if (mod.effect === "hostile_underground") {
          hostileUndergroundRef.current = true;
        }
        // Show modifier active message in ticker after 2s
        setTimeout(() => {
          const addFn = addCommMessageRef.current;
          if (addFn)
            addFn(`⚡ MODIFIER: ${mod.label} — ${mod.description}`, "system");
        }, 2000);
      }
    }

    syncScreen("game");

    // Opening Dom message goes to ticker only — no blocking dialog
    if (!resume) {
      setTimeout(() => {
        const addFn = addCommMessageRef.current;
        if (addFn)
          addFn(
            "📡 DOM: Miner. The Genesis Block is real. Dig to 155m. I'll guide you down.",
            "transmission",
          );
      }, 5000);
      if (deepDive) {
        setTimeout(() => {
          const addFn = addCommMessageRef.current;
          if (addFn)
            addFn(
              "🔥 DEEP DIVE MODE — You're starting at 60m. Ore is richer. Enemies hit harder. Good luck.",
              "system",
            );
        }, 2000);
      }
    }
  }, []);

  // Called when modifier is selected (or skipped)
  const confirmModifier = useCallback(
    (mod: RunModifier | null) => {
      activeModifierRef.current = mod;
      setShowModifierSelect(false);
      const deepDive = pendingDeepDiveRef.current;
      // Use flag to skip modifier screen on the re-entry
      skipModifierRef.current = true;
      startGame(false, deepDive);
    },
    [startGame],
  );

  const touchPress = useCallback((key: string) => {
    keysRef.current.add(key);
  }, []);
  const touchRelease = useCallback((key: string) => {
    keysRef.current.delete(key);
  }, []);

  useEffect(() => {
    if (screen !== "game") {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const HUD_HEIGHT = 50;
    const resize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight - HUD_HEIGHT;
      const isMobile = W <= 1024;
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        isMobile ? dprCapRef.current : 2,
      );
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvasSizeRef.current = { w: W, h: H };
      const ctx2 = canvas.getContext("2d");
      if (ctx2) ctx2.scale(dpr, dpr);
      // Resize cockpit minimap canvas
      const cmm = cockpitMinimapRef.current;
      if (cmm) {
        const mmRect = cmm.getBoundingClientRect();
        cmm.width = Math.max(mmRect.width || cmm.offsetWidth || 114, 1);
        cmm.height = Math.max(mmRect.height || cmm.offsetHeight || 178, 1);
      }
    };
    resize();
    let rafId: number | null = null;
    const debouncedResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        resize();
        rafId = null;
      });
    };
    window.addEventListener("resize", debouncedResize);
    const ro = new ResizeObserver(debouncedResize);
    ro.observe(canvas);
    // Ensure canvas is sized correctly on the very first frame
    requestAnimationFrame(() => {
      resize();
    });
    const loop = () => {
      if (screenRef.current !== "game") return;
      const now = performance.now();
      const dt = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;
      if (dt > 0) {
        const fps = 1000 / dt;
        const hist = fpsHistoryRef.current;
        hist.push(fps);
        if (hist.length > 60) hist.shift();
        if (hist.length >= 30) {
          const avg = hist.reduce((a, b) => a + b, 0) / hist.length;
          (window as any).__bobFPS = Math.round(avg);
          const isMob = window.innerWidth <= 1024;
          lowFpsModeRef.current = isMob && avg < 30;
          // Adaptive DPR: drop to 1.0 on sustained low FPS, restore when recovered
          if (isMob) {
            if (avg < 20 && dprCapRef.current > 0.8 && !dprDroppedRef.current) {
              dprCapRef.current = 0.8;
              dprDroppedRef.current = true;
              resize();
            } else if (
              avg < 25 &&
              dprCapRef.current > 1.0 &&
              !dprDroppedRef.current
            ) {
              dprCapRef.current = 1.0;
              resize();
            } else if (
              avg > 45 &&
              dprCapRef.current < 1.0 &&
              !dprDroppedRef.current
            ) {
              dprCapRef.current = 1.0;
              resize();
            }
          }
        }
      }
      frameRef.current++;
      update();
      render(ctx, canvasSizeRef.current.w, canvasSizeRef.current.h);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", debouncedResize);
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [screen]); // eslint-disable-line

  function getTile(x: number, y: number): number {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return T.HARD_ROCK;
    return mapRef.current[y * MAP_W + x];
  }
  function setTile(x: number, y: number, val: number) {
    if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return;
    mapRef.current[y * MAP_W + x] = val;
    minimapDirtyRef.current = true;
  }

  function spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    maxLife: number,
    color: string,
  ) {
    const pool = particlesRef.current;
    const lowFps = lowFpsModeRef.current;
    // In low FPS mode, skip half of particle spawns
    if (lowFps && Math.random() < 0.5) return;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].alive) {
        pool[i].x = x;
        pool[i].y = y;
        pool[i].vx = vx;
        pool[i].vy = vy;
        pool[i].life = life;
        pool[i].maxLife = maxLife;
        pool[i].color = color;
        pool[i].alive = true;
        return;
      }
    }
  }

  function emitParticles(worldX: number, worldY: number, color: string) {
    const lowFps = lowFpsModeRef.current;
    const count = lowFps ? 3 : 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      spawnParticle(
        worldX + Math.random() * TILE,
        worldY + Math.random() * TILE,
        (Math.random() - 0.5) * 4,
        -Math.random() * 4,
        20 + Math.floor(Math.random() * 20),
        40,
        color,
      );
    }
  }

  const DEPTH_MILESTONES: Array<[number, string]> = [
    [40, "⛏️ MILESTONE: STONE LAYER REACHED — 40m"],
    [80, "⛏️ MILESTONE: CRYSTAL CAVERNS — 80m DEEP"],
    [120, "⛏️ MILESTONE: LAVA FIELDS — 120m DEEP"],
    [155, "🏆 MILESTONE: THE DEEP — 155m — LEGENDARY DEPTH"],
  ];

  function update() {
    const p = playerRef.current;
    const s = p.stats;
    const keys = keysRef.current;
    const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
    const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
    const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S");
    const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W");
    const hullSpeedPenalty = Math.max(0, s.hullLevel - 1) * 0.05;
    const synergyKeys = getActiveSynergies(s);
    const runnerSynergy = synergyKeys.includes("RUNNER") ? 1.15 : 1.0;
    if (nnsSlowRef.current > 0) nnsSlowRef.current--;
    const nnsSlowMult = nnsSlowRef.current > 0 ? 0.6 : 1.0;
    const speed =
      PLAYER_SPEED *
      (1 + s.engineLevel * 0.25) *
      (1 - hullSpeedPenalty) *
      (engineSurgeRef.current ? 2.0 : 1.0) *
      runnerSynergy *
      nnsSlowMult;
    // Check current tile for water/gas effects
    const curTileX = Math.floor((p.x + (TILE - 4) / 2) / TILE);
    const curTileY = Math.floor((p.y + (TILE - 2) / 2) / TILE);
    const inWater = getTile(curTileX, curTileY) === 32;
    const waterSlowMult = inWater ? 0.5 : 1.0;
    const pw = TILE - 4;
    const ph = TILE - 2;

    // If frozen by SEC agent, skip movement input
    if (playerFrozenRef.current > 0) {
      // Still check timers and hazards below
    }

    if (
      (left || right || down) &&
      tutorialStepRef.current === 0 &&
      playerFrozenRef.current <= 0
    )
      advanceTutorial(1);

    // Zone detection
    const currentDepth = Math.max(0, Math.floor(p.y / TILE - 5));
    // Biome transition ticker messages
    {
      const prevBiome = lastBiomeDepthRef.current;
      if (currentDepth >= 40 && prevBiome < 40) {
        addCommMessageRef.current?.(
          "⬇ Entering STONE LAYER — drill power required",
          "system",
        );
      } else if (currentDepth >= 80 && prevBiome < 80) {
        addCommMessageRef.current?.(
          "💎 Entering CRYSTAL CAVERNS — rare ores ahead",
          "system",
        );
      } else if (currentDepth >= 120 && prevBiome < 120) {
        addCommMessageRef.current?.(
          "🌋 Entering LAVA FIELDS — hull damage risk",
          "system",
        );
      }
      // Depth milestone celebrations
      // DEPTH_MILESTONES is defined at module scope
      for (const [mDepth, mMsg] of DEPTH_MILESTONES) {
        if (
          currentDepth >= mDepth &&
          !depthMilestonesReachedRef.current.has(mDepth)
        ) {
          depthMilestonesReachedRef.current.add(mDepth);
          addCommMessageRef.current?.(mMsg, "system");
        }
      }
      lastBiomeDepthRef.current = currentDepth;
    }
    // Pre-compute nowAtSurface for use throughout update
    const tileXEarly = Math.floor(p.x / TILE);
    const tileYEarly = Math.floor(p.y / TILE);
    const inShopXEarly = tileXEarly >= SHOP_X && tileXEarly <= SHOP_X + SHOP_W;
    const nowAtSurface = tileYEarly <= 5 && inShopXEarly;
    const newZone = getDepthZone(currentDepth);
    if (newZone !== zoneLabelRef.current.currentZone) {
      zoneLabelRef.current = {
        label: newZone,
        alpha: 1,
        frames: 120,
        currentZone: newZone,
      };
    }

    if (p.drilling) {
      const d = p.drilling;
      // Drill heat build-up
      if (currentDepth > 5) {
        const overclockHeat =
          activeModifierRef.current?.effect === "drill_speed_2x_heat_2x"
            ? 2.0
            : 1.0;
        drillHeatRef.current = Math.min(
          100,
          drillHeatRef.current + (5 / 60) * overclockHeat,
        );
        if (drillHeatRef.current >= 100 && !drillHeatOverheatRef.current) {
          drillHeatOverheatRef.current = true;
          drillHeatCooldownRef.current = 5 * 60; // 5 seconds
          addCommMessageRef.current?.(
            "🔥 DRILL OVERHEAT! Cooling down...",
            "hazard",
          );
        }
      }
      // coolantLevel adds 15% drill speed per level
      const diverSynergy = synergyKeys.includes("DIVER") ? 1.1 : 1.0;
      const drillMult =
        (drillOverheatRef.current ? 0.5 : 1.0) *
        (drillHeatOverheatRef.current ? 0.5 : 1.0) *
        (drillSlowRef.current ? 0.7 : 1.0) *
        diverSynergy *
        drillSpeedBoostRef.current;
      const cursedDrillMult =
        activeModifierRef.current?.effect === "cursed_drill" ? 2.0 : 1.0;
      const turboDrillMult =
        activeModifierRef.current?.effect === "turbo_drill" ? 1.5 : 1.0;
      const oreRushDrillMult =
        activeModifierRef.current?.effect === "ore_rush" ? 1.5 : 1.0;
      const dealDrillMult = runDrillBoostDealRef.current ? 1.4 : 1.0;
      d.progress +=
        (1 + s.drillLevel * 0.35 + s.coolantLevel * 0.15) *
        drillMult *
        cursedDrillMult *
        turboDrillMult *
        oreRushDrillMult *
        dealDrillMult;
      // cursed_drill: mining damages hull
      if (
        activeModifierRef.current?.effect === "cursed_drill" &&
        frameRef.current % 20 === 0
      ) {
        s.hull = Math.max(0, s.hull - 0.4);
      }
      // turbo_drill: hull takes 2x damage from rock impacts
      if (
        activeModifierRef.current?.effect === "turbo_drill" &&
        frameRef.current % 30 === 0
      ) {
        s.hull = Math.max(0, s.hull - 0.3);
      }
      if (frameRef.current % 8 === 0) playDrillSound();
      // Advance drill rotation angle
      const drillSpeedFactor = 0.08 + playerRef.current.stats.drillLevel * 0.04;
      drillAngleRef.current += drillSpeedFactor;
      // Emit drill sparks during active drilling
      if (d.progress > 0 && frameRef.current % 2 === 0) {
        const sparkColors = ["#ffaa00", "#ff6600", "#ffdd00"];
        const sparkColor = sparkColors[frameRef.current % 3];
        let tipX: number;
        let tipY: number;
        if (d.dy !== 0) {
          tipX = p.x + TILE / 2;
          tipY = p.y + TILE;
        } else {
          tipX = p.x + (p.facingRight ? TILE : 0);
          tipY = p.y + TILE / 2;
        }
        for (let _si = 0; _si < 3; _si++) {
          spawnParticle(
            tipX + (Math.random() - 0.5) * 4,
            tipY + (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 3,
            -Math.random() * 2,
            15 + Math.floor(Math.random() * 5),
            20,
            sparkColor,
          );
        }
      }
      const needed =
        DRILL_BASE_TIME * getTileHardness(getTile(d.tile.tx, d.tile.ty));
      if (d.progress >= needed) {
        const t = getTile(d.tile.tx, d.tile.ty);
        const tileColor = RESOURCES[t]?.color ?? getTileColor(t, d.tile.ty - 5);
        emitParticles(d.tile.tx * TILE, d.tile.ty * TILE, tileColor);
        if (t === T.LORE_ROOM) {
          // Lore room discovered! - show flavor text in ticker
          const loreRoomFlavorMsgs = [
            "Ancient ICP inscriptions line the walls...",
            "You sense the presence of early neuron holders...",
            "The walls hum with trapped governance proposals...",
            "Fossilized SNS tokens embedded in the rock...",
            "DOM's voice echoes: 'You are getting closer...'",
            "Carved into the stone: 'The network is the computer'",
            "Strange glyphs... Possibly an early SNS dao charter.",
            "The air smells of cryptographic proofs and ambition.",
          ];
          const flavorMsg =
            loreRoomFlavorMsgs[
              Math.floor(Math.random() * loreRoomFlavorMsgs.length)
            ];
          addCommMessage(flavorMsg, "system");
          // Lore room discovered!
          const loreRoomMsgs = [
            "🏛 ICP VAULT DISCOVERED!\nAncient BOB tokens sealed here since genesis.",
            "📜 ANCIENT NODE ROOM\nA forgotten validator from the first subnet.",
            "🔮 DFINITY PROTOTYPE LAB\nPre-mainnet hardware still humming in the dark.",
            "👾 BOB DOG'S HIDEOUT\nPaw prints and BOB everywhere. Must be recent.",
            "📡 SATOSHI'S RELAY\nAn anonymous node nobody knows about. Classic.",
            "⚗️ NNS GOVERNANCE BUNKER\nPre-genesis proposal chamber. 10,000 BOB cached.",
            "🦴 NAKAMOTO CACHE\nSealed in the first subnet. Untouched since mainnet launch.",
            "🌐 GENESIS NODE REMNANT\nOne of the original 101 genesis nodes. Still warm.",
            "💡 DFINITY R&D LAB\nPrototype subnet routing hardware from 2019.",
            "🧬 BOB ORIGIN CHAMBER\nWhere the first BOB token was mined. Legendary.",
            "🔱 WHALE VAULT\nAnonymous whale left a stash. No questions asked.",
            "📦 AIRDROP STASH\nA pile of BOB that never got claimed. All yours.",
          ];
          const loreMsg2 =
            loreRoomMsgs[Math.floor(Math.random() * loreRoomMsgs.length)];
          showLoreMessage(loreMsg2);
          loreRoomsFoundRef.current++;
          const bonus3 = 500 + Math.floor(Math.random() * 1000);
          s.bob += bonus3;
          floatingTextsRef.current.push({
            x: d.tile.tx * TILE,
            y: d.tile.ty * TILE,
            text: `LORE ROOM +${bonus3}`,
            alpha: 1,
            dy: 0,
          });
          playOreCollect();
        }
        if (t === T.TREASURE_CHEST) {
          // Treasure chest! Award bonus BOB cash
          const amount = Math.floor(Math.random() * 2001) + 1000;
          s.bob += amount;
          playOreCollect();
          showLoreMessage(
            `TREASURE CHEST! +${amount} BOB\nA forgotten stash from an early ICP validator`,
          );
          setTile(d.tile.tx, d.tile.ty, T.EMPTY);
          p.drilling = null;
          floatingTextsRef.current.push({
            x: d.tile.tx * TILE + TILE / 2,
            y: d.tile.ty * TILE,
            text: `+${amount} BOB!`,
            alpha: 1,
            dy: 0,
          });
        } else if (RESOURCES[t]) {
          const res = RESOURCES[t];
          const isMutated =
            mutatedTileRef.current &&
            mutatedTileRef.current.col === d.tile.tx &&
            mutatedTileRef.current.row === d.tile.ty;
          const nextMult = nextOreMultRef.current;
          if (nextMult > 1) {
            nextOreMultRef.current = 1;
            floatingTextsRef.current.push({
              x: d.tile.tx * TILE + TILE / 2,
              y: d.tile.ty * TILE - 20,
              text: `🎰 ${nextMult}x BOB GLITCH!`,
              alpha: 1,
              dy: 0,
            });
          }
          const oreValueMult =
            (isMutated ? 3 : 1) * nextMult * tempOreMultiplierRef.current;
          if (isMutated) {
            mutatedTileRef.current = null;
            s.bob += res.value * 2; // 3x total: 1x from cargo + 2x bonus
            floatingTextsRef.current.push({
              x: d.tile.tx * TILE + TILE / 2,
              y: d.tile.ty * TILE - 12,
              text: `☢ MUTATED! +${res.value * 3} BOB`,
              alpha: 1,
              dy: 0,
            });
          }
          if (s.cargoWeight + res.weight <= s.maxCargo) {
            const existing = p.cargo.find((c) => c.tile === t);
            if (existing) existing.count++;
            else p.cargo.push({ tile: t as TileType, count: 1 });
            s.cargoWeight += res.weight;
            // VetKey bonus tiles — extra ore on each mined tile
            if (vetKeyBonusTilesRef.current > 0) {
              vetKeyBonusTilesRef.current--;
              const vkExisting = p.cargo.find((c) => c.tile === t);
              if (vkExisting) vkExisting.count++;
              else p.cargo.push({ tile: t as TileType, count: 1 });
              s.cargoWeight = Math.min(s.cargoWeight + res.weight, s.maxCargo);
            }
            if (tutorialStepRef.current === 1) advanceTutorial(2);
            // Determine tier from ore value
            const oreTier =
              res.value >= 5000
                ? "legendary"
                : res.value >= 1500
                  ? "epic"
                  : res.value >= 500
                    ? "rare"
                    : res.value >= 150
                      ? "uncommon"
                      : "common";
            playOreCollect(oreTier);
            // Floating pickup text — ore name
            floatingTextsRef.current.push({
              x: d.tile.tx * TILE + TILE / 2,
              y: d.tile.ty * TILE - 16,
              text: `+${res.name}`,
              alpha: 1,
              dy: 0,
              color: res.color ?? "#fde047",
            });
            floatingTextsRef.current.push({
              x: d.tile.tx * TILE + TILE / 2,
              y: d.tile.ty * TILE,
              text: `+${res.value * oreValueMult} BOB`,
              alpha: 1,
              dy: 0,
            });
            // Sparkle particles on ore pickup
            {
              const sparkX = d.tile.tx * TILE + TILE / 2;
              const sparkY = d.tile.ty * TILE + TILE / 2;
              const sparkColor = res.color ?? "#fde047";
              for (let sp = 0; sp < 8; sp++) {
                const angle = (sp / 8) * Math.PI * 2;
                spawnParticle(
                  sparkX,
                  sparkY,
                  Math.cos(angle) * (2 + Math.random() * 3),
                  Math.sin(angle) * (2 + Math.random() * 3),
                  15 + Math.floor(Math.random() * 15),
                  30,
                  sparkColor,
                );
              }
            }
            // Track ore types for run quests
            if (RESOURCES[t] !== undefined)
              runOreTypesCollectedRef.current.add(t);
            // First-discovery lore card
            if (!discoveredOresRef.current.has(t) && t !== T.BOB_GENESIS) {
              discoveredOresRef.current.add(t);
              localStorage.setItem(
                "bob_discovered_ores",
                Array.from(discoveredOresRef.current).join(","),
              );
              if (performance.now() - gameStartTimeRef.current > 30000) {
                setOreDiscoveryCard({
                  name: res.name,
                  era: res.era ?? "",
                  color: res.color,
                  tileId: t,
                });
                if (oreDiscoveryTimerRef.current)
                  clearTimeout(oreDiscoveryTimerRef.current);
                oreDiscoveryTimerRef.current = setTimeout(
                  () => setOreDiscoveryCard(null),
                  3000,
                );
              }
            }
            // NPC quest: Jan crystal quest progress
            if (
              npcQuestRef.current &&
              npcQuestRef.current.type === "mine_crystals" &&
              t === T.BOB_CRYSTAL
            ) {
              npcQuestRef.current.progress++;
              if (npcQuestRef.current.progress >= npcQuestRef.current.goal) {
                npcQuestRef.current.completed = true;
                applyNpcQuestReward(
                  npcQuestRef.current.reward,
                  npcQuestRef.current.npcId,
                );
              } else {
                setNpcQuestActive((prev) =>
                  prev
                    ? { ...prev, progress: npcQuestRef.current!.progress }
                    : null,
                );
              }
            }
            // NPC quest: Lomesh - mine different ore types
            if (
              npcQuestRef.current &&
              npcQuestRef.current.type === "mine_different_ores" &&
              ((t >= T.BOB_DUST && t <= T.BOB_SEAM) ||
                t === T.NNS_TOKEN ||
                t === T.CHAIN_FUSION ||
                t === T.DRAGGINZ_SCALE)
            ) {
              // Count unique ore types mined this quest
              const uniqueCount = discoveredOresRef.current.size;
              npcQuestRef.current.progress = Math.min(
                npcQuestRef.current.goal,
                uniqueCount,
              );
              if (npcQuestRef.current.progress >= npcQuestRef.current.goal) {
                npcQuestRef.current.completed = true;
                applyNpcQuestReward(
                  npcQuestRef.current.reward,
                  npcQuestRef.current.npcId,
                );
              } else {
                setNpcQuestActive((prev) =>
                  prev
                    ? { ...prev, progress: npcQuestRef.current!.progress }
                    : null,
                );
              }
            }
            // NPC quest: Whale fill cargo quest progress
            if (
              npcQuestRef.current &&
              npcQuestRef.current.type === "fill_cargo"
            ) {
              const totalItems = p.cargo.reduce((a, c) => a + c.count, 0);
              npcQuestRef.current.progress = totalItems;
              if (totalItems >= npcQuestRef.current.goal) {
                npcQuestRef.current.completed = true;
                applyNpcQuestReward(
                  npcQuestRef.current.reward,
                  npcQuestRef.current.npcId,
                );
              } else {
                setNpcQuestActive((prev) =>
                  prev ? { ...prev, progress: totalItems } : null,
                );
              }
            }
          } else if (t !== T.BOB_GENESIS) {
            // Cargo full — prompt drop dialog
            const lowestOreInCargo = p.cargo.reduce((min, c) => {
              const v = RESOURCES[c.tile]?.value ?? 0;
              return v < (RESOURCES[min.tile]?.value ?? 0) ? c : min;
            }, p.cargo[0]);
            if (
              lowestOreInCargo &&
              (RESOURCES[t]?.value ?? 0) >
                (RESOURCES[lowestOreInCargo.tile]?.value ?? 0)
            ) {
              // New ore is more valuable — prompt drop
              setCargoDropPending({
                tile: t,
                value: RESOURCES[t]?.value ?? 0,
                name: RESOURCES[t]?.name ?? "Unknown Ore",
              });
            }
            // Don't mine the block — stop drilling
            p.drilling = null;
            return;
          }
          if (t === T.BOB_GENESIS) {
            setTile(d.tile.tx, d.tile.ty, T.EMPTY);
            p.drilling = null;
            playWinFanfare();
            const totalBob = s.bob + cargoTotalValue(p.cargo);
            const depth = Math.floor(p.y / TILE - 5);
            pendingWinRef.current = {
              bob: totalBob,
              depth: Math.max(0, depth),
              oresFound: discoveredOresRef.current.size,
              questsCompleted: runQuestsRef.current.filter((q) => q.completed)
                .length,
              upgradesPurchased:
                s.drillLevel +
                s.engineLevel +
                s.hullLevel +
                s.fuelLevel +
                s.cargoLevel +
                s.shieldLevel +
                s.radarLevel +
                (s.boosterLevel ?? 0) +
                (s.coolantLevel ?? 0),
              antagonistsDefeated: antagonistsDefeatedThisRunRef.current,
            };
            autoAscentRef.current = true;
            setAutoAscending(true);
            return;
          }
        }
        setTile(d.tile.tx, d.tile.ty, T.EMPTY);
        p.drilling = null;
        s.fuel = Math.max(0, s.fuel - 0.5);
      }
      s.fuel = Math.max(0, s.fuel - 0.01);
      if (s.fuel <= 0) {
        p.drilling = null;
        triggerGameOver("out of fuel", p);
        return;
      }
      return;
    }

    // Surface call override: when active, thrust strongly upward and disable other inputs
    if (surfaceCallingRef.current) {
      const surfaceTargetY = 4 * TILE;
      if (p.y <= surfaceTargetY + TILE) {
        surfaceCallingRef.current = false;
      } else {
        const thrustSpeed = 10.0;
        p.vy = Math.max(p.vy - thrustSpeed, -thrustSpeed);
        // Steer toward center column
        const centerX = TILE * 4;
        if (p.x < centerX - 10) p.vx = 3;
        else if (p.x > centerX + 10) p.vx = -3;
        else p.vx = 0;
        p.onGround = false;
        return;
      }
    }

    // Auto-ascent override: when BOB Genesis found, auto-thrust upward
    const effectiveUp = autoAscentRef.current ? true : up;
    const effectiveLeft = autoAscentRef.current ? false : left;
    const effectiveRight = autoAscentRef.current ? false : right;
    const effectiveDown = autoAscentRef.current ? false : down;

    const depthFuelMult =
      currentDepth >= 130
        ? 3.5
        : currentDepth >= 100
          ? 2.5
          : currentDepth >= 80
            ? 1.8
            : currentDepth >= 60
              ? 1.3
              : 1.0;
    const inLavaTube = getTile(curTileX, curTileY) === T.LAVA_TUBE;
    const lavaTubeBoost = inLavaTube ? 2.0 : 1.0;
    if (inLavaTube && frameRef.current % 2 === 0) {
      // Emit amber trail particles
      spawnParticle(
        p.x + TILE / 2,
        p.y + TILE / 2,
        (Math.random() - 0.5) * 2,
        -Math.random() * 1.5,
        20,
        25,
        "#ff8800",
      );
    }
    if (effectiveLeft || effectiveRight) {
      p.vx = (effectiveRight ? 1 : -1) * speed * waterSlowMult * lavaTubeBoost;
      p.facingRight = !!effectiveRight;
      const fuelLeakMult = fuelLeakRef.current ? 3.0 : 1.0;
      const smoothRide = activeModifierRef.current?.effect === "smooth_ride";
      const fuelTaxMult =
        activeModifierRef.current?.effect === "fuel_tax" ? 1.5 : 1.0;
      const fuelEffBonus =
        1.0 - (s.fuelEfficiencyBonus ?? 0) - fuelEfficiencyBoostRef.current;
      const bargainHuntFuelMult =
        activeModifierRef.current?.effect === "bargain_hunt" ? 1.2 : 1.0;
      const dealFuelEffMult = runFuelEfficiencyDealRef.current ? 0.7 : 1.0;
      const horizFuelCost = smoothRide
        ? 0
        : 0.015 *
          depthFuelMult *
          fuelLeakMult *
          fuelTaxMult *
          fuelEffBonus *
          bargainHuntFuelMult *
          dealFuelEffMult;
      s.fuel = Math.max(0, s.fuel - horizFuelCost);
    } else {
      p.vx = 0;
    }

    if (effectiveLeft || effectiveRight) {
      const dir = effectiveRight ? 1 : -1;
      // Use feet row for drilling target so wall at ground level is correctly targeted
      const footY = Math.floor((p.y + ph - 1) / TILE);
      const midY = Math.floor((p.y + ph / 2) / TILE);
      const nextX = Math.floor(
        (p.x + (effectiveRight ? pw : 0) + dir * 2) / TILE,
      );
      // Use mid-body row as primary drill target; only fall back to foot row
      // if mid row is empty (prevents drilling the ground when at surface)
      const midT = getTile(nextX, midY);
      const footT = getTile(nextX, footY);
      let drillRow = -1;
      if (midT !== T.EMPTY && midT !== T.HARD_ROCK && canDrill(midT, s)) {
        drillRow = midY;
      } else if (
        footY !== midY &&
        footT !== T.EMPTY &&
        footT !== T.HARD_ROCK &&
        canDrill(footT, s)
      ) {
        drillRow = footY;
      }
      if (drillRow >= 0) {
        p.drilling = {
          dx: dir,
          dy: 0,
          progress: 0,
          tile: { tx: nextX, ty: drillRow },
        };
        p.vx = 0;
        return;
      }
    }

    p.vy += GRAVITY;

    // Upward thrust — thrusterLevel adds 15% speed per level
    if (effectiveUp) {
      const fuelWeightPenaltyAscent = Math.max(0, s.fuelLevel - 1) * 0.03;
      const thrustSpeed =
        7.0 * (1 + s.thrusterLevel * 0.18) * (1 - fuelWeightPenaltyAscent);
      p.vy = Math.max(p.vy - thrustSpeed, -thrustSpeed);
      const thrustFuelTaxMult =
        activeModifierRef.current?.effect === "fuel_tax" ? 1.5 : 1.0;
      s.fuel = Math.max(0, s.fuel - 0.025 * depthFuelMult * thrustFuelTaxMult);
      p.onGround = false;
      if (frameRef.current % 6 === 0) playThrustSound();
      // Jetpack boost particles — blue/white sparks when thrusting underground
      if (currentDepth > 2 && frameRef.current % 3 === 0) {
        const jx = p.x + pw / 2;
        const jy = p.y + ph;
        spawnParticle(
          jx + (Math.random() - 0.5) * 8,
          jy,
          (Math.random() - 0.5) * 2,
          1 + Math.random() * 3,
          8 + Math.floor(Math.random() * 8),
          16,
          Math.random() < 0.5 ? "#60a5fa" : "#e0f2fe",
        );
        spawnParticle(
          jx + (Math.random() - 0.5) * 6,
          jy - 2,
          (Math.random() - 0.5) * 1.5,
          2 + Math.random() * 2,
          6 + Math.floor(Math.random() * 6),
          12,
          "#ffffff",
        );
      }
    }

    if (effectiveDown && p.onGround && !inWater) {
      const belowY = Math.floor((p.y + ph + 2) / TILE);
      const midX = Math.floor((p.x + pw / 2) / TILE);
      const t = getTile(midX, belowY);
      if (t !== T.EMPTY && canDrill(t, s)) {
        p.drilling = {
          dx: 0,
          dy: 1,
          progress: 0,
          tile: { tx: midX, ty: belowY },
        };
        return;
      }
    }

    p.x += p.vx;
    p.x = Math.max(0, Math.min(p.x, (MAP_W - 1) * TILE));
    const pLeft = Math.floor((p.x + 2) / TILE);
    const pRight = Math.floor((p.x + pw - 2) / TILE);
    const pMidY = Math.floor((p.y + ph / 2) / TILE);
    const pTopYw = Math.floor((p.y + 2) / TILE);
    if (
      p.vx > 0 &&
      ((getTile(pRight, pMidY) !== T.EMPTY &&
        getTile(pRight, pMidY) !== T.LAVA_TUBE) ||
        (getTile(pRight, pTopYw) !== T.EMPTY &&
          getTile(pRight, pTopYw) !== T.LAVA_TUBE))
    ) {
      p.x = pRight * TILE - pw;
      p.vx = 0;
    }
    if (
      p.vx < 0 &&
      ((getTile(pLeft, pMidY) !== T.EMPTY &&
        getTile(pLeft, pMidY) !== T.LAVA_TUBE) ||
        (getTile(pLeft, pTopYw) !== T.EMPTY &&
          getTile(pLeft, pTopYw) !== T.LAVA_TUBE))
    ) {
      p.x = (pLeft + 1) * TILE;
      p.vx = 0;
    }

    const prevY = p.y;
    p.y += p.vy;
    p.y = Math.max(-TILE * 3, p.y);
    const pL2 = Math.floor((p.x + 2) / TILE);
    const pR2 = Math.floor((p.x + pw - 2) / TILE);
    const pBot2 = Math.floor((p.y + ph) / TILE);
    const pTop2 = Math.floor((p.y + 2) / TILE);
    p.onGround = false;
    if (p.vy > 0) {
      if (
        (getTile(pL2, pBot2) !== T.EMPTY &&
          getTile(pL2, pBot2) !== T.LAVA_TUBE) ||
        (getTile(pR2, pBot2) !== T.EMPTY && getTile(pR2, pBot2) !== T.LAVA_TUBE)
      ) {
        const fallDist = (p.y - p.fallFrom) / TILE;
        if (fallDist > 8) {
          // shieldLevel reduces fall damage by 20% per level
          const shieldMult = Math.max(0, 1 - s.shieldLevel * 0.2);
          s.hull = Math.max(
            0,
            s.hull - Math.floor((fallDist - 8) * 5 * shieldMult),
          );
        }
        p.y = pBot2 * TILE - ph;
        p.vy = 0;
        p.onGround = true;
        p.fallFrom = p.y;
      }
    } else if (p.vy < 0) {
      if (
        (getTile(pL2, pTop2) !== T.EMPTY &&
          getTile(pL2, pTop2) !== T.LAVA_TUBE) ||
        (getTile(pR2, pTop2) !== T.EMPTY && getTile(pR2, pTop2) !== T.LAVA_TUBE)
      ) {
        if (autoAscentRef.current) {
          // Auto-ascent: clear blocking tiles so player can rise freely
          if (getTile(pL2, pTop2) !== T.EMPTY) setTile(pL2, pTop2, T.EMPTY);
          if (getTile(pR2, pTop2) !== T.EMPTY) setTile(pR2, pTop2, T.EMPTY);
        } else {
          p.y = (pTop2 + 1) * TILE;
          p.vy = 0;
        }
      }
    }
    if (p.vy > 0) p.fallFrom = prevY;
    if (!p.onGround && !effectiveUp) {
      const idleFuelTax =
        activeModifierRef.current?.effect === "fuel_tax" ? 1.5 : 1.0;
      s.fuel = Math.max(0, s.fuel - 0.005 * depthFuelMult * idleFuelTax);
    }

    if (s.hull < prevHullRef.current) {
      shakeRef.current = {
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        frames: 8,
      };
    }
    prevHullRef.current = s.hull;

    if (s.hull <= 0) {
      triggerGameOver("hull destroyed", p);
      return;
    }
    if (s.fuel <= 0) {
      triggerGameOver("out of fuel", p);
      return;
    }

    // Track max depth
    if (currentDepth > maxDepthReachedRef.current)
      maxDepthReachedRef.current = currentDepth;
    if (p.y > deepestDrilledYRef.current) deepestDrilledYRef.current = p.y;
    // Cargo full tip — suggest Surface Call when cargo > 70% and underground > 60m
    if (
      !nowAtSurface &&
      currentDepth > 60 &&
      s.cargoWeight > s.maxCargo * 0.7 &&
      s.surfaceCallCount > 0
    ) {
      const now2 = performance.now();
      if (now2 - cargoFullTipTimerRef.current > 60000) {
        cargoFullTipTimerRef.current = now2;
        tickerQueueRef.current.push(
          "Tip: Use a Surface Call to cash out safely 🚀 [R]",
        );
      }
    }

    // Story beats — fire once per run at depth milestones
    {
      // Deep Dive exclusive transmissions
      if (deepDiveModeRef.current) {
        const deepDiveBeats: Array<{
          depth: number;
          title: string;
          msg: string;
        }> = [
          {
            depth: 65,
            title: "⚡ DOM — DEEP DIVE CHANNEL",
            msg: "You chose Deep Dive. Sixty meters already beneath you and rising fast. The ore density here is off the charts — but so are the threats. The ecosystem doesn't reward the timid.",
          },
          {
            depth: 80,
            title: "⚡ DOM — DEEP DIVE CHANNEL",
            msg: "Eighty meters in Deep Dive territory. The Head Fudder is already circling. I've picked up his signal on the chain. He knows you're here. Keep your hull patched.",
          },
          {
            depth: 100,
            title: "⚡ DOM — DEEP DIVE CHANNEL",
            msg: "One hundred meters. You've entered the genesis strata. In normal mode, miners never reach this depth. You're not normal. The BOB concentration down here is exponential.",
          },
          {
            depth: 120,
            title: "⚡ DOM — DEEP DIVE CHANNEL",
            msg: "One-twenty. The ICP genesis ceremony happened in May 2021. This layer was formed the same day. Mining here is mining history. Every ore is a piece of the launch event.",
          },
          {
            depth: 140,
            title: "⚡ DOM — DEEP DIVE CHANNEL",
            msg: "Forty-five meters remaining. The vetKey threshold resonance is at maximum. Only the most committed miners reach this depth. You're rewriting what's possible on ICP.",
          },
          {
            depth: 152,
            title: "⚡ DOM — FINAL DEEP DIVE TRANSMISSION",
            msg: "FINAL DEEP DIVE TRANSMISSION: You descended faster and harder than anyone before. The Genesis Block awaits. What you've done today will be recorded in the NNS forever. — Dom",
          },
        ];
        for (const beat of deepDiveBeats) {
          if (
            currentDepth >= beat.depth &&
            !storyBeatsFiredRef.current.has(beat.depth + 1000)
          ) {
            storyBeatsFiredRef.current.add(beat.depth + 1000);
            setStoryTransmission({ title: beat.title, msg: beat.msg });
            break;
          }
        }
      }

      const beats: Array<{ depth: number; title: string; msg: string }> = [
        {
          depth: 10,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Signal established. Miner, this is Dominic Williams. The Internet Computer runs at web speed — and so does opportunity. The first layers are soft. The real BOB is buried deeper. Start digging.",
        },
        {
          depth: 20,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Twenty meters. You've left the surface economy behind. Down here, neurons don't vote — they mine. Every block you drill is a proposal passed in the NNS of the earth. Keep going.",
        },
        {
          depth: 30,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Thirty meters. You're past the tourist layer now. This is where cycles start burning. The ICP network processes thousands of transactions per second above ground — your drill should match that energy.",
        },
        {
          depth: 40,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "At forty meters, the geology changes. These are the SNS strata — each ore cluster is a DAO waiting to be unlocked. The smart contracts here run forever, unlike your fuel tank. Manage your resources.",
        },
        {
          depth: 55,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Fifty-five meters. I can feel the chain fusion resonance from here. Every blockchain connects to what lies deeper. BTC, ETH, all of them echo in these walls. But only ICP reaches the bottom.",
        },
        {
          depth: 70,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Seventy meters. The NNS has flagged this zone as high-value. Neurons are staking on your success, miner. Governance proposals have been filed. The whole ecosystem is watching your depth counter.",
        },
        {
          depth: 85,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Eighty-five meters. We're in vetKey territory. These encrypted strata hold secrets that only the right principal can unlock. Your drill bit is essentially running threshold ECDSA on every block.",
        },
        {
          depth: 100,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "One hundred meters. You've reached the canister layer — where smart contracts run forever at zero marginal cost. The Head Fudder lurks nearby. Silence it. The Genesis Block doesn't yield to doubt.",
        },
        {
          depth: 115,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "One-fifteen. The reverse gas model means you pay for computation, not users. Your drill is the canister. Each meter is a cycle burned. The deeper the cycle, the higher the reward. Inefficiency is the enemy.",
        },
        {
          depth: 125,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "One hundred and twenty-five meters. The original 101 genesis nodes created the ICP mainnet in May 2021. You're drilling through that history right now. The genesis energy is radiating upward from depth 155.",
        },
        {
          depth: 138,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Thirty meters from the bottom and I can feel the tokenomics shifting. The BOB Genesis Block was mined before any of us. Eight-year neuron stake locked in stone. The maturity is astronomical.",
        },
        {
          depth: 148,
          title: "⚡ TRANSMISSION FROM DOM",
          msg: "Almost there. Five meters. The ICP community has been waiting for this moment. DFINITY has been waiting. The NNS has been waiting. Every neuron, every cycle, every canister — all pointing here. Don't stop.",
        },
        {
          depth: 153,
          title: "⚡ FINAL TRANSMISSION FROM DOM",
          msg: "FINAL TRANSMISSION: The BOB Genesis Block is not just an ore. It is proof of work. Proof of belief. Proof that decentralization is worth mining for. What you carry back to the surface... changes everything. — Dom",
        },
      ];
      for (const beat of beats) {
        if (
          currentDepth >= beat.depth &&
          !storyBeatsFiredRef.current.has(beat.depth)
        ) {
          storyBeatsFiredRef.current.add(beat.depth);
          setStoryTransmission({ title: beat.title, msg: beat.msg });
          break; // Only fire one at a time
        }
      }
    }

    // Underground NPC proximity detection
    if (!nowAtSurface && !activeNpc) {
      const px = playerRef.current.x;
      const py = playerRef.current.y;
      const threshold = TILE * 2.5;
      for (const npc of undergroundNpcsRef.current) {
        if (npc.encountered && npc.rewardClaimed) continue;
        const dx = px - npc.x;
        const dy = py - npc.y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          const baseQuote = npc.rewardClaimed
            ? getReencounterQuote(npc.id)
            : npc.quote;
          const finalQuote =
            npc.id === "dom" ||
            npc.id === "whale_underground" ||
            npc.id === "jerry"
              ? getRelationshipAwareQuote(npc.id, baseQuote)
              : baseQuote;
          // Whale betrayal: show hostile encounter and deal damage
          if (
            npc.id === "whale_underground" &&
            metaProgressRef.current?.whaleBetrayed &&
            !npc.rewardClaimed
          ) {
            const betrayP = playerRef.current;
            betrayP.stats.hull = Math.max(0, betrayP.stats.hull - 20);
            shakeRef.current = { x: 0, y: 0, frames: 15 };
            hitFlashRef.current = 12;
            flashColorRGBRef.current = [138, 43, 226];
            showPortraitRef.current(
              "whale_underground",
              "You sold to that rat underground! Get out of my waters!",
              "#8b5cf6",
            );
            floatingTextsRef.current.push({
              x: betrayP.x,
              y: betrayP.y - 30,
              text: "WHALE BETRAYED! -20 Hull 🐳",
              alpha: 1,
              dy: 0,
            });
            npc.encountered = true;
            npc.rewardClaimed = true;
            break;
          }
          setActiveNpc({
            id: npc.id,
            name: npc.name,
            quote: finalQuote,
            reward: npc.rewardClaimed ? "__reencounter__" : npc.reward,
            color: npc.color,
          });
          if (!npc.rewardClaimed) {
            showPortraitRef.current(npc.id, finalQuote, npc.color);
          }
          break;
        }
      }
    }

    // NPC Quest progress tracking
    if (npcQuestRef.current && !npcQuestRef.current.completed) {
      const quest = npcQuestRef.current;
      if (quest.type === "mine_crystals") {
        // tracked when ore is mined (see ore mine handler)
      } else if (quest.type === "reach_depth") {
        quest.progress = Math.min(quest.goal, currentDepth);
        if (currentDepth >= quest.goal) {
          quest.progress = quest.goal;
          quest.completed = true;
          applyNpcQuestReward(quest.reward, quest.npcId);
        }
      } else if (quest.type === "defeat_antagonists") {
        quest.progress = antagonistsDefeatedThisRunRef.current;
        if (quest.progress >= quest.goal) {
          quest.completed = true;
          applyNpcQuestReward(quest.reward, quest.npcId);
        }
      } else if (quest.type === "reach_surface") {
        if (nowAtSurface) {
          quest.progress = 1;
          quest.completed = true;
          applyNpcQuestReward(quest.reward, quest.npcId);
        }
      }
      if (npcQuestRef.current) {
        setNpcQuestActive({
          npcId: quest.npcId,
          description: quest.description,
          reward: quest.reward,
          progress: quest.progress,
          goal: quest.goal,
          completed: quest.completed,
          step: quest.step,
          totalSteps: quest.totalSteps,
        });
      }
    }

    // RunQuest (Jerry multi-quest) progress tracking
    if (runQuestsRef.current.length > 0) {
      let questsUpdated = false;
      const cargoVal2 = cargoTotalValue(p.cargo);
      // Count mined ore by type
      const oreCountMap: Record<number, number> = {};
      for (const ci of p.cargo) {
        oreCountMap[ci.tile] = (oreCountMap[ci.tile] || 0) + ci.count;
      }
      for (const rq of runQuestsRef.current) {
        if (rq.completed) continue;
        let newProgress = rq.progress;
        if (rq.type === "mine_ore" && rq.targetOre !== undefined) {
          newProgress = oreCountMap[rq.targetOre] || 0;
        } else if (rq.type === "reach_depth") {
          newProgress = Math.min(rq.goal, currentDepth);
        } else if (rq.type === "defeat_antagonists") {
          newProgress = antagonistsDefeatedThisRunRef.current;
        } else if (rq.type === "cargo_value") {
          newProgress = Math.min(rq.goal, cargoVal2);
        } else if (rq.type === "find_lore_rooms") {
          newProgress = loreRoomsFoundRef.current;
        } else if (rq.type === "collect_ore_types") {
          newProgress = Math.min(rq.goal, runOreTypesCollectedRef.current.size);
        } else if (rq.type === "survive_earthquake") {
          newProgress = earthquakeSurvivedRef.current;
        } else if (rq.type === "defeat_btc_maxi") {
          newProgress = btcMaxiDefeatedThisRunRef.current;
        } else if (rq.type === "sell_trip_value") {
          newProgress = lastSellTripValueRef.current >= rq.goal ? 1 : 0;
        }
        if (newProgress !== rq.progress) {
          rq.progress = newProgress;
          questsUpdated = true;
        }
        if (!rq.completed && rq.progress >= rq.goal) {
          rq.completed = true;
          questsUpdated = true;
          // Apply reward
          const rewardStr = rq.reward;
          if (rewardStr.includes("BOB")) {
            const amt =
              Number.parseInt(rewardStr.replace(/[^0-9]/g, "")) || 100;
            s.bob += amt;
          } else if (rewardStr.includes("fuel")) {
            s.fuel = Math.min(s.maxFuel, s.fuel + s.maxFuel * 0.4);
          } else if (rewardStr.includes("hull")) {
            s.hull = Math.min(s.maxHull, s.hull + s.maxHull * 0.3);
          } else if (rewardStr.includes("drill")) {
            s.drillLevel = Math.min(5, s.drillLevel + 1);
          }
          floatingTextsRef.current.push({
            x: p.x,
            y: p.y - 30,
            text: `✓ QUEST DONE! ${rq.reward}`,
            alpha: 1,
            dy: 0,
          });
          setQuestFanfare({ text: `QUEST COMPLETE! +${rq.reward}` });
          setTimeout(() => setQuestFanfare(null), 2000);
          // Pulse quest button for 2 seconds
          setQuestPulseActive(true);
          setTimeout(() => setQuestPulseActive(false), 2000);
          const addFnQ = addCommMessageRef.current;
          if (addFnQ)
            addFnQ(
              `⭐ QUEST COMPLETE: ${rq.description}! +${rq.reward}`,
              "system",
            );
          // Adjust NPC relationship on quest completion
          if (
            rq.npcId === "dom" ||
            rq.npcId === "jerry" ||
            rq.npcId === "whale_underground"
          ) {
            adjustNpcRelationship(rq.npcId, 20);
          }
          // Jerry quest: grant repair discount for rest of run
          if (rq.npcId === "jerry" && !jerryRepairDiscountRef.current) {
            jerryRepairDiscountRef.current = true;
            tickerQueueRef.current.push(
              "Jerry lowered his repair prices for you! 🔧",
            );
          }
        }
      }
      if (questsUpdated) {
        setRunQuests([...runQuestsRef.current]);
      }
    }

    // Hazard: gas pocket with 1.5s pre-warning before damage
    const onGas = getTile(curTileX, curTileY) === 31;
    if (onGas) {
      if (gasWarningFrameRef.current === null) {
        gasWarningFrameRef.current = frameRef.current; // start timer
      }
      if (!gasWarnRef.current) {
        gasWarnRef.current = true;
        setGasWarning(true);
      }
      // Only deal damage after 90 frames (~1.5s at 60fps)
      const framesInGas =
        frameRef.current - (gasWarningFrameRef.current ?? frameRef.current);
      if (framesInGas > 90) {
        const depthHazardMult = 1 + currentDepth * 0.005;
        const shieldMult = Math.max(0, 1 - s.shieldLevel * 0.2);
        s.hull = Math.max(0, s.hull - 0.5 * depthHazardMult * shieldMult);
      }
    } else {
      gasWarningFrameRef.current = null;
      if (gasWarnRef.current) {
        gasWarnRef.current = false;
        setGasWarning(false);
      }
    }

    // Cave-in warning: detect CAVE_IN blocks about to fall from above
    {
      let caveAbove = false;
      const ptx = Math.floor(p.x / TILE);
      const pty = Math.floor(p.y / TILE);
      for (let dy3 = 1; dy3 <= 3 && !caveAbove; dy3++) {
        if (
          getTile(ptx, pty - dy3) === T.CAVE_IN ||
          getTile(ptx + 1, pty - dy3) === T.CAVE_IN
        )
          caveAbove = true;
      }
      if (caveAbove) {
        caveInWarningRef.current = true;
        caveInWarningFramesRef.current = 180; // 3s at 60fps
        shakeRef.current = {
          x: 0,
          y: 0,
          frames: Math.max(shakeRef.current.frames, 180),
        };
      } else if (caveInWarningFramesRef.current > 0) {
        caveInWarningFramesRef.current--;
        if (caveInWarningFramesRef.current <= 0)
          caveInWarningRef.current = false;
      }
    }

    // Unstable tile cracking + collapse (cave-in warning system)
    {
      const ptxC = Math.floor(p.x / TILE);
      const ptyC = Math.floor(p.y / TILE);
      const nowC = performance.now();
      // Check proximity: start cracking unstable tiles within 2 tiles of player
      for (let dxC = -2; dxC <= 2; dxC++) {
        for (let dyC = -2; dyC <= 2; dyC++) {
          const idxC = (ptyC + dyC) * MAP_W + (ptxC + dxC);
          if (
            unstableTilesRef.current.has(idxC) &&
            !crackingTilesRef.current.has(idxC)
          ) {
            crackingTilesRef.current.set(idxC, nowC);
            tickerQueueRef.current.push("⚠️ UNSTABLE GROUND!");
          }
        }
      }
      // Process cracking tiles: collapse after 3.5s
      for (const [idxC, crackStart] of crackingTilesRef.current.entries()) {
        if (nowC - crackStart >= 3500) {
          const cxT = idxC % MAP_W;
          const cyT = Math.floor(idxC / MAP_W);
          if (getTile(cxT, cyT) !== T.EMPTY) {
            setTile(cxT, cyT, T.EMPTY);
          }
          unstableTilesRef.current.delete(idxC);
          crackingTilesRef.current.delete(idxC);
          // Deal hull damage if player is nearby
          if (
            Math.abs(cxT * TILE - p.x) < TILE * 2 &&
            Math.abs(cyT * TILE - p.y) < TILE * 2
          ) {
            s.hull = Math.max(0, s.hull - 15);
            shakeRef.current = { x: 0, y: 0, frames: 15 };
            playHit();
            tickerQueueRef.current.push(
              "💥 Unstable tile collapsed! -15 Hull!",
            );
          }
        }
      }
    }

    // Lava surge: rising lava hazard
    if (lavaSurgeRef.current) {
      lavaSurgeTimerRef.current--;
      if (lavaSurgeTimerRef.current <= 0) {
        lavaSurgeRef.current = false;
      } else {
        // Rise lava level slowly
        const lavaMoveInterval = 40;
        if (frameRef.current % lavaMoveInterval === 0) {
          lavaSurgeYRef.current = Math.max(
            Math.floor(p.y / TILE) + 3,
            lavaSurgeYRef.current - 1,
          );
        }
        // Damage player if below lava surge line
        if (Math.floor(p.y / TILE) >= lavaSurgeYRef.current) {
          const depthMult2 = 1 + currentDepth * 0.005;
          s.hull = Math.max(0, s.hull - 2 * depthMult2);
          shakeRef.current = { x: 0, y: 0, frames: 3 };
        }
      }
    }

    // Expanded random events system (timer-based scheduler)
    {
      const now = Date.now();
      // Lucky events every ~60 seconds
      const luckyInterval = 55000 + Math.random() * 15000;
      if (
        !nowAtSurface &&
        currentDepth > 10 &&
        now - lastLuckyEventTimeRef.current > luckyInterval
      ) {
        lastLuckyEventTimeRef.current = now;
        const px2l = Math.floor(p.x / TILE);
        const py2l = Math.floor(p.y / TILE);
        const luckRoll = Math.random();
        const showEvtL = (msg: string, dur = 4000) => {
          setEventMsg(msg);
          if (eventMsgTimeoutRef.current)
            clearTimeout(eventMsgTimeoutRef.current);
          eventMsgTimeoutRef.current = setTimeout(() => setEventMsg(""), dur);
        };
        if (luckRoll < 0.35) {
          // BOB AIRDROP — airdrop crate on surface
          const airdropX = (SHOP_X + 1 + Math.floor(Math.random() * 6)) * TILE; // near shop
          airdropCrateRef.current = {
            x: airdropX,
            timer: 30,
            collected: false,
          };
          setAirdropCrate({ x: airdropX, timer: 30, collected: false });
          showEvtL(
            "📦 BOB AIRDROP! A crate fell on the surface — go collect it!",
            5000,
          );
        } else if (luckRoll < 0.65) {
          // LUCKY STRIKE
          const hiBob2 = [
            T.BOB_CRYSTAL,
            T.BOB_CORE,
            T.BOB_INGOT,
            T.BOB_VEIN,
            T.BOB_SEAM,
          ];
          const luckyTile2 =
            hiBob2[Math.min(hiBob2.length - 1, Math.floor(currentDepth / 30))];
          for (let dy2 = 1; dy2 <= 5; dy2++)
            for (let dx2 = -2; dx2 <= 2; dx2++)
              if (
                Math.random() < 0.5 &&
                getTile(px2l + dx2, py2l + dy2) !== T.EMPTY
              )
                setTile(px2l + dx2, py2l + dy2, luckyTile2);
          showEvtL(
            "✨ LUCKY STRIKE! Rich ore vein discovered below you!",
            4000,
          );
        } else if (luckRoll < 0.78 && currentDepth > 60) {
          // DEEP CACHE — 2x2 cluster of best ore for current depth
          const depthOres = [
            T.BOB_CRYSTAL,
            T.BOB_CORE,
            T.BOB_INGOT,
            T.BOB_VEIN,
            T.BOB_SEAM,
          ];
          const deepTier =
            depthOres[
              Math.min(depthOres.length - 1, Math.floor(currentDepth / 30))
            ];
          for (let dy2 = 1; dy2 <= 2; dy2++)
            for (let dx2 = 0; dx2 <= 1; dx2++)
              if (getTile(px2l + dx2, py2l + dy2) !== T.EMPTY)
                setTile(px2l + dx2, py2l + dy2, deepTier);
          showEvtL(
            "💎 DEEP CACHE DISCOVERED! Ancient BOB hoard unearthed!",
            5000,
          );
        } else if (luckRoll < 0.88) {
          // DRILL SURGE — double drill power for 8s
          const origDrill = s.drillPower;
          s.drillPower = Math.min(s.drillPower * 2, 10);
          drillSurgeTimerRef.current = 8;
          // Will be reset after 8s by game loop countdown
          showEvtL(
            "⚡ DRILL SURGE! Your drill hit resonance frequency — double power for 8s!",
            5000,
          );
          // Store original drill power to restore later
          (
            drillSurgeTimerRef as React.MutableRefObject<
              number & { _origPower?: number }
            >
          ).current = 8;
          const _capture = origDrill;
          const restoreInterval = setInterval(() => {
            drillSurgeTimerRef.current -= 1;
            if (drillSurgeTimerRef.current <= 0) {
              clearInterval(restoreInterval);
              playerRef.current.stats.drillPower = Math.max(1, _capture);
              drillSurgeTimerRef.current = 0;
            }
          }, 1000);
        } else if (luckRoll < 0.92) {
          // PROTOCOL UPGRADE — drill speed boost for 10s
          drillSpeedBoostRef.current = 1.5;
          setTimeout(() => {
            drillSpeedBoostRef.current = 1.0;
          }, 10000);
          showEvtL(
            "⚡ PROTOCOL UPGRADE! Drill efficiency boosted for 10 seconds!",
            5000,
          );
        } else if (luckRoll < 0.95) {
          // VALIDATOR REWARD — bonus BOB
          s.bob += 200;
          setHud((h) => ({ ...h, bob: s.bob }));
          showEvtL(
            "🏛 VALIDATOR REWARD! Your node earned staking rewards! +200 BOB",
            4000,
          );
        } else if (luckRoll < 0.97) {
          // CANISTER OVERFLOW — refill fuel
          s.fuel = s.maxFuel;
          setHud((h) => ({ ...h, fuel: s.fuel }));
          showEvtL(
            "⚙️ CANISTER OVERFLOW! Excess cycles converted to fuel. Tank refilled!",
            4000,
          );
        } else {
          // BOB RAIN — visual burst + bonus BOB
          const rainBob = 500 + Math.floor(currentDepth * 5);
          s.bob += rainBob;
          setHud((h) => ({ ...h, bob: s.bob }));
          for (let i = 0; i < 8; i++) {
            floatingTextsRef.current.push({
              x: p.x + (Math.random() - 0.5) * 80,
              y: p.y - Math.random() * 40,
              text: "+BOB 🌧",
              alpha: 1,
              dy: -0.5 - Math.random() * 0.5,
            });
          }
          showEvtL(
            `🌧 BOB RAIN! Tokens fall from the great chain in the sky! +${rainBob} BOB!`,
            5000,
          );
        }
      }
      // Hazard events every 20-40 seconds underground
      const hazardInterval = 25000 + Math.random() * 20000;
      if (
        !nowAtSurface &&
        currentDepth > 20 &&
        now - lastHazardEventTimeRef.current > hazardInterval
      ) {
        lastHazardEventTimeRef.current = now;
        lastEventTimeRef.current = now; // keep compat
      }
      if (
        !nowAtSurface &&
        currentDepth > 20 &&
        now - lastEventTimeRef.current > 20000 &&
        !activeHazardBannerRef.current
      ) {
        {
          activeHazardBannerRef.current = true;
          lastEventTimeRef.current = now;
          const roll = Math.random();
          const px2 = Math.floor(p.x / TILE);
          const py2 = Math.floor(p.y / TILE);
          const showEvt = (msg: string, dur = 4000) => {
            setEventMsg(msg);
            if (eventMsgTimeoutRef.current)
              clearTimeout(eventMsgTimeoutRef.current);
            eventMsgTimeoutRef.current = setTimeout(() => setEventMsg(""), dur);
          };
          if (roll < 0.08) {
            // EARTHQUAKE
            shakeRef.current = { x: 0, y: 0, frames: 60 };
            for (let dy2 = -1; dy2 <= 1; dy2++)
              for (let dx2 = -1; dx2 <= 1; dx2++) {
                if (
                  getTile(px2 + dx2, py2 + dy2 - 2) !== T.EMPTY &&
                  Math.random() < 0.5
                )
                  setTile(px2 + dx2, py2 + dy2 - 2, T.CAVE_IN);
              }
            earthquakeActiveRef.current = true;
            earthquakeDamageRef.current = false;
            showEvt("🌍 EARTHQUAKE!\nThe ground shakes violently!", 3000);
            setActiveHazardBanner({
              title: "🌍 EARTHQUAKE!",
              instruction: "HOLD STILL — Do NOT move!",
              icon: "⛔",
              countdown: 5,
              type: "earthquake",
            });
            if (hazardBannerTimerRef.current)
              clearInterval(hazardBannerTimerRef.current);
            {
              let countdownVal = 5;
              hazardBannerTimerRef.current = setInterval(() => {
                countdownVal--;
                if (countdownVal <= 0) {
                  if (hazardBannerTimerRef.current)
                    clearInterval(hazardBannerTimerRef.current);
                  activeHazardBannerRef.current = false;
                  setActiveHazardBanner(null);
                  if (
                    earthquakeActiveRef.current &&
                    !earthquakeDamageRef.current
                  ) {
                    earthquakeSurvivedRef.current++;
                  }
                  earthquakeActiveRef.current = false;
                } else {
                  setActiveHazardBanner((prev) =>
                    prev && prev.type === "earthquake"
                      ? { ...prev, countdown: countdownVal }
                      : prev,
                  );
                }
              }, 1000);
            }
          } else if (roll < 0.16) {
            // ROCKSLIDE — drop 5 rocks from above
            for (let i = 0; i < 5; i++) {
              const rx3 = px2 + Math.floor(Math.random() * 5) - 2;
              fallingRocksRef.current.push({
                x: rx3 * TILE + TILE / 2,
                y: (py2 - 5) * TILE,
                vy: 0,
                active: true,
              });
            }
            showEvt("⚠ ROCKSLIDE!\nBoulders falling from above!", 3000);
          } else if (roll < 0.24) {
            // LUCKY STRIKE — ore cluster below
            const hiBob = [
              T.BOB_CRYSTAL,
              T.BOB_CORE,
              T.BOB_INGOT,
              T.BOB_VEIN,
              T.BOB_SEAM,
            ];
            const luckyTile =
              hiBob[Math.min(hiBob.length - 1, Math.floor(currentDepth / 30))];
            for (let dy2 = 1; dy2 <= 5; dy2++)
              for (let dx2 = -2; dx2 <= 2; dx2++) {
                if (
                  Math.random() < 0.4 &&
                  getTile(px2 + dx2, py2 + dy2) !== T.EMPTY
                )
                  setTile(px2 + dx2, py2 + dy2, luckyTile);
              }
            showEvt(
              "✨ LUCKY STRIKE!\nRich ore vein discovered below you!",
              4000,
            );
          } else if (roll < 0.32) {
            // BOB AIRDROP — treasure chest below
            for (let dy2 = 5; dy2 <= 10; dy2++) {
              if (getTile(px2, py2 + dy2) !== T.EMPTY) {
                setTile(px2, py2 + dy2, T.TREASURE_CHEST);
                break;
              }
            }
            showEvt(
              "📦 BOB AIRDROP!\nA mysterious cache fell from above!",
              4000,
            );
          } else if (roll < 0.4) {
            // ANCIENT CHAMBER — 3x3 empty space with treasure
            for (let dy2 = 1; dy2 <= 3; dy2++)
              for (let dx2 = -1; dx2 <= 1; dx2++)
                setTile(px2 + dx2, py2 + dy2, T.EMPTY);
            setTile(px2, py2 + 2, T.TREASURE_CHEST);
            showEvt(
              "🏛 ANCIENT CHAMBER!\nYou broke into a sealed ICP vault!",
              4000,
            );
          } else if (roll < 0.48) {
            // DRILL OVERHEAT
            drillOverheatRef.current = true;
            drillOverheatTimerRef.current = 600;
            showEvt(
              "🔥 DRILL OVERHEAT!\nDrill speed halved for 10 seconds!",
              4000,
            );
          } else if (roll < 0.56) {
            // FUEL LEAK
            fuelLeakRef.current = true;
            showEvt(
              "💧 FUEL LEAK!\nFuel draining 3x faster — surface ASAP!",
              4000,
            );
          } else if (roll < 0.64) {
            // ENGINE SURGE
            engineSurgeRef.current = true;
            engineSurgeTimerRef.current = 480;
            showEvt("⚡ ENGINE SURGE!\nSpeed doubled for 8 seconds!", 4000);
          } else if (roll < 0.72) {
            // SATOSHI SIGHTING — add BOB
            s.bob += 1000;
            floatingTextsRef.current.push({
              x: p.x + TILE / 2,
              y: p.y,
              text: "+1000 BOB SATOSHI!",
              alpha: 1,
              dy: 0,
            });
            showEvt(
              "👤 SATOSHI SIGHTING!\nA mysterious figure dropped 1000 BOB and vanished!",
              4000,
            );
          } else if (roll < 0.8) {
            // BOB VEIN SURGE
            const veinTiles2 = [T.BOB_VEIN, T.BOB_SEAM];
            const veinTile2 =
              veinTiles2[Math.floor(Math.random() * veinTiles2.length)];
            for (let dy2 = 1; dy2 <= 4; dy2++)
              for (let dx2 = -2; dx2 <= 2; dx2++) {
                if (
                  Math.random() < 0.35 &&
                  getTile(px2 + dx2, py2 + dy2) !== T.EMPTY
                )
                  setTile(px2 + dx2, py2 + dy2, veinTile2);
              }
            showEvt(
              "A BOB Vein Surge radiates from the depths!\n✦ Rich ore cluster detected nearby!",
              4000,
            );
          } else if (roll < 0.83) {
            // ORE MUTATION — a nearby ore becomes 3x value
            let mutFound = false;
            for (let dy2 = -3; dy2 <= 3 && !mutFound; dy2++) {
              for (let dx2 = -3; dx2 <= 3 && !mutFound; dx2++) {
                const tc = px2 + dx2;
                const tr = py2 + dy2;
                const tt = getTile(tc, tr);
                if (
                  tt !== T.EMPTY &&
                  tt !== T.DIRT &&
                  tt !== T.STONE &&
                  tt !== T.LORE_ROOM &&
                  tt !== T.CAVE_IN &&
                  tt !== T.GAS_POCKET
                ) {
                  mutatedTileRef.current = { col: tc, row: tr };
                  mutFound = true;
                }
              }
            }
            showEvt(
              "☢ ORE MUTATION! A nearby ore has mutated — worth 3x value!",
              4000,
            );
          } else if (roll < 0.88) {
            // CYCLE SURGE — refuel
            s.fuel = Math.min(s.maxFuel, s.fuel + s.maxFuel * 0.2);
            showEvt(
              "⚡ CYCLE SURGE!\nFuel refilled by 20% from ambient cycle energy!",
              4000,
            );
          } else if (roll < 0.93) {
            // ANCIENT ICP ARTIFACT
            for (let dy2 = 1; dy2 <= 6; dy2++)
              for (let dx2 = -3; dx2 <= 3; dx2++) {
                const t2 = getTile(px2 + dx2, py2 + dy2);
                if (t2 !== T.EMPTY && t2 !== T.BOB_GENESIS) {
                  setTile(px2 + dx2, py2 + dy2, T.TREASURE_CHEST);
                  break;
                }
              }
            showEvt(
              "You disturb an ancient ICP node...\n✦ Ancient Artifact detected!",
              4000,
            );
          } else if (roll < 0.96) {
            // LAVA SURGE — rising lava forces ascent
            if (!lavaSurgeRef.current) {
              lavaSurgeRef.current = true;
              lavaSurgeTimerRef.current = 20 * 60; // 20 seconds
              lavaSurgeYRef.current = Math.floor(p.y / TILE) + 8; // starts 8 rows below
              showEvt(
                "🌋 LAVA SURGE!\nLava is rising — ASCEND or take rapid hull damage!",
                5000,
              );
              setActiveHazardBanner({
                title: "🌋 LAVA SURGE!",
                instruction: "MOVE UP NOW — Lava is rising!",
                icon: "⬆️",
                countdown: 20,
                type: "lava_surge",
              });
              if (hazardBannerTimerRef.current)
                clearInterval(hazardBannerTimerRef.current);
              {
                let countdownLava = 20;
                hazardBannerTimerRef.current = setInterval(() => {
                  countdownLava--;
                  if (countdownLava <= 0) {
                    if (hazardBannerTimerRef.current)
                      clearInterval(hazardBannerTimerRef.current);
                    setActiveHazardBanner(null);
                  } else {
                    setActiveHazardBanner((prev) =>
                      prev && prev.type === "lava_surge"
                        ? { ...prev, countdown: countdownLava }
                        : prev,
                    );
                  }
                }, 1000);
              }
            }
          } else if (roll < 0.97) {
            // NNS GOVERNANCE ALERT — flash upgrade discount
            const nnsBonus = 30000;
            lastNNSGovernanceRef.current = Date.now() + nnsBonus;
            showEvt(
              "🗳 NNS GOVERNANCE ALERT!\nAll upgrades 50% off for 30 seconds!",
              5000,
            );
          } else if (roll < 0.974) {
            // TOKENOMICS UPDATE
            showEvt(
              "📋 NNS TOKENOMICS UPDATE!\nSell prices +30% for next haul.",
              5000,
            );
            npcRewardsRef.current.sellBoost =
              (npcRewardsRef.current.sellBoost ?? 1.0) * 1.3;
            tickerQueueRef.current.push(
              "📋 Tokenomics update passed on the NNS! Sell prices boosted!",
            );
          } else if (roll < 0.978) {
            // CYCLE BURN FESTIVAL — drill speed boost 30s
            showEvt(
              "🔥 CYCLE BURN FESTIVAL!\nDrill speed +50% for 30 seconds!",
              5000,
            );
            tickerQueueRef.current.push(
              "🔥 Cycle Burn Festival! Drill power surging!",
            );
            drillSpeedBoostRef.current = Math.max(
              drillSpeedBoostRef.current,
              1.5,
            );
            drillSpeedBoostTimerRef.current = 30 * 60;
          } else if (roll < 0.982) {
            // INTERNET IDENTITY GLITCH
            showEvt(
              "🆔 IDENTITY GLITCH!\nInternet Identity hiccup — ore scanner offline for 10s!",
              5000,
            );
            tickerQueueRef.current.push(
              "🆔 Identity Layer glitch — ore pickup paused briefly!",
            );
          } else if (roll < 0.986) {
            // ICRC3 DISCOVERY
            const icrcBonus = 200 + Math.floor(Math.random() * 300);
            s.bob += icrcBonus;
            setHud((h) => ({ ...h, bob: s.bob }));
            showEvt(
              `📜 ICRC3 DISCOVERY!\nAncient ledger standard found. +${icrcBonus} BOB!`,
              5000,
            );
            tickerQueueRef.current.push(
              `📜 ICRC3 Discovery! Hidden ledger reward: +${icrcBonus} BOB!`,
            );
          } else if (roll < 0.99) {
            // VETKEYS ACTIVATION
            s.hull = Math.min(s.maxHull, s.hull + 40);
            showEvt(
              "🔑 VETKEYS ACTIVATED!\nThreshold encryption sealed a hull breach. +40 HP!",
              5000,
            );
            tickerQueueRef.current.push(
              "🔑 VetKeys Activation event — hull breach sealed! +40 HP!",
            );
            setHud((h) => ({ ...h, hull: s.hull }));
          } else if (roll < 0.994) {
            // WHALE ALERT — ore price surge
            marketWhaleSurgeRef.current = true;
            marketWhaleSurgeTimerRef.current = 20 * 60; // 20s at 60fps
            showEvt(
              "🐋 WHALE ALERT!\nOre prices surge 2× for 20 seconds — sell quickly!",
              5000,
            );
          } else if (roll < 0.9975) {
            // MAGNETIC STORM — minimap goes dark for 10 seconds
            magneticStormRef.current = 10 * 60; // 10 seconds at 60fps
            showEvt("🧲 MAGNETIC STORM! Minimap offline for 10 seconds!", 4000);
            setActiveHazardBanner({
              title: "🧲 MAGNETIC STORM!",
              instruction: "NAVIGATE BY MEMORY",
              icon: "🧭",
              countdown: 10,
              type: "earthquake",
            });
            if (hazardBannerTimerRef.current)
              clearInterval(hazardBannerTimerRef.current);
            {
              let msCountdown = 10;
              hazardBannerTimerRef.current = setInterval(() => {
                msCountdown--;
                if (msCountdown <= 0) {
                  if (hazardBannerTimerRef.current)
                    clearInterval(hazardBannerTimerRef.current);
                  activeHazardBannerRef.current = false;
                  setActiveHazardBanner(null);
                } else {
                  setActiveHazardBanner((prev) =>
                    prev ? { ...prev, countdown: msCountdown } : prev,
                  );
                }
              }, 1000);
            }
          } else if (roll < 0.999) {
            // PRESSURE SURGE — instant hull damage
            s.hull = Math.max(0, s.hull - 15);
            setHud((h) => ({ ...h, hull: s.hull }));
            shakeRef.current = { x: 0, y: 0, frames: 30 };
            showEvt(
              "💥 PRESSURE SURGE! Structural integrity compromised!",
              4000,
            );
          } else if (roll < 0.9995) {
            // NNS GOVERNANCE SURGE — ore values boosted 30% for 45s
            tempOreMultiplierRef.current = 1.3;
            tempOreMultiplierTimerRef.current = 45 * 60;
            showEvt(
              "🏛 NNS GOVERNANCE SURGE! Ore values +30% for 45 seconds!",
              4000,
            );
          } else if (roll < 0.99975) {
            // CHAIN FUSION BRIDGE — teleport to surface
            const surfaceTargetY = 4 * TILE;
            p.y = surfaceTargetY;
            p.vy = 0;
            floatingTextsRef.current.push({
              x: p.x,
              y: p.y,
              text: "⛓ CHAIN FUSION! Teleported!",
              alpha: 1,
              dy: 0,
            });
            showEvt("⛓ CHAIN FUSION BRIDGE! Teleported to surface!", 4000);
          } else if (roll < 0.999875) {
            // NAKAMOTO COEFFICIENT — drill speed boost 30s
            drillSpeedBoostRef.current = 2.0;
            drillSpeedBoostTimerRef.current = 30 * 60;
            showEvt(
              "₿ NAKAMOTO COEFFICIENT! Drill speed doubled for 30 seconds!",
              4000,
            );
          } else if (roll < 0.9999375) {
            // ORE TRANSMUTATION — upgrade highest-tier ore in cargo
            let topTileIdx = -1;
            let topValue = 0;
            for (let ci = 0; ci < p.cargo.length; ci++) {
              const cr = RESOURCES[p.cargo[ci].tile];
              if (cr && cr.value > topValue) {
                topValue = cr.value;
                topTileIdx = ci;
              }
            }
            if (topTileIdx >= 0) {
              const tileId = p.cargo[topTileIdx].tile as number;
              const nextTileId = tileId < T.BOB_SEAM ? tileId + 1 : tileId;
              p.cargo[topTileIdx] = {
                ...p.cargo[topTileIdx],
                tile: nextTileId as TileType,
              };
              showEvt(
                "⚗️ ORE TRANSMUTATION! Highest ore mutated to next tier!",
                4000,
              );
            } else {
              showEvt("⚗️ ORE TRANSMUTATION — but your cargo is empty!", 3000);
            }
          } else if (roll < 0.99996875) {
            // BOB MULTIPLIER GLITCH — next ore gives 5x value
            nextOreMultRef.current = 5;
            showEvt(
              "🎰 BOB MULTIPLIER GLITCH! Next ore mined gives 5x value!",
              4000,
            );
          } else if (roll < 0.99999) {
            // VETKEY RESONANCE — next 5 tiles yield +1 bonus ore
            vetKeyBonusTilesRef.current = 5;
            showEvt(
              "🔑 VETKEY RESONANCE! Next 5 tiles drilled yield +1 bonus ore!",
              4000,
            );
          } else if (roll < 0.999995) {
            // ICP RALLY — ores sell for 1.5x for 30 seconds
            oreValueMultiplierRef.current = 1.5;
            oreRallyEndTimeRef.current = performance.now() + 30000;
            showEvt(
              "📈 ICP RALLY DETECTED! All ores sell for 1.5x for 30 seconds!",
              5000,
            );
          } else if (roll < 0.9999975) {
            // SNS EMERGENCY VOTE — drain 15% fuel
            s.fuel = Math.max(0, s.fuel - s.maxFuel * 0.15);
            setHud((h) => ({ ...h, fuel: s.fuel }));
            showEvt(
              "⚠️ SNS EMERGENCY VOTE! The DAO drained your fuel by 15%!",
              4000,
            );
          } else if (roll < 0.9999985) {
            // TOKEN MIGRATION — ore values +30% for 20s
            oreValueMultiplierRef.current = Math.max(
              oreValueMultiplierRef.current,
              1.3,
            );
            oreRallyEndTimeRef.current = performance.now() + 20000;
            showEvt(
              "🌉 TOKEN MIGRATION! ICP cross-chain bridge detected! Ore values +30% for 20s!",
              5000,
            );
          } else if (roll < 0.99999925) {
            // VALIDATOR NODE — fuel restored +15%
            s.fuel = Math.min(s.maxFuel, s.fuel + s.maxFuel * 0.15);
            setHud((h) => ({ ...h, fuel: s.fuel }));
            showEvt(
              "🖥️ VALIDATOR NODE! A node machine hums nearby... Fuel restored +15%!",
              4000,
            );
          } else if (roll < 0.999999625) {
            // DAO PROPOSAL PASSED — hull repaired +10%
            s.hull = Math.min(s.maxHull, s.hull + s.maxHull * 0.1);
            setHud((h) => ({ ...h, hull: s.hull }));
            showEvt(
              "🗳️ DAO PROPOSAL PASSED! The NNS has spoken! Hull repaired +10%!",
              4000,
            );
          } else if (roll < 0.99999975) {
            // THRESHOLD KEY DISCOVERED — reveal nearby ore
            const revealRadius = 15;
            const px3 = Math.floor(p.x / TILE);
            const py3 = Math.floor(p.y / TILE);
            for (let ry = py3 - revealRadius; ry <= py3 + revealRadius; ry++) {
              for (
                let rx2 = px3 - revealRadius;
                rx2 <= px3 + revealRadius;
                rx2++
              ) {
                const ri = ry * MAP_W + rx2;
                if (ri >= 0 && ri < exploredRef.current.length) {
                  exploredRef.current[ri] = 1;
                }
              }
            }
            minimapDirtyRef.current = true;
            showEvt(
              "🔑 THRESHOLD KEY DISCOVERED!\nvetKey shard pulses! All nearby ore revealed on minimap!",
              5000,
            );
            tickerQueueRef.current.push(
              "🔑 VetKey Threshold Key found — area revealed!",
            );
          } else if (roll < 0.9999999) {
            // SENATE HEARING — choice event
            const senateChoice = Math.random() < 0.5;
            if (senateChoice) {
              // Cooperate: restore shield
              s.hull = Math.min(s.maxHull, s.hull + 20);
              setHud((h) => ({ ...h, hull: s.hull }));
              showEvt(
                "🏛️ ICP SENATE HEARING!\nYou cooperated. Hull restored +20 HP!",
                5000,
              );
              tickerQueueRef.current.push(
                "🏛️ Senate Hearing: Cooperated — hull patched up",
              );
            } else {
              // Resist: double sell next
              doubleSellNextRef.current = true;
              showEvt(
                "🏛️ ICP SENATE HEARING!\nYou resisted. Next cargo sell = DOUBLE BOB!",
                5000,
              );
              tickerQueueRef.current.push(
                "🏛️ Senate Hearing: Resisted — next sell gives 2x BOB!",
              );
            }
          } else if (roll < 0.99999995) {
            // BOB WHITEPAPER DROP — bump random upgrade
            const upgradeKeys = [
              "drillLevel",
              "engineLevel",
              "hullLevel",
              "fuelLevel",
              "cargoLevel",
              "shieldLevel",
              "thrusterLevel",
              "coolantLevel",
            ];
            const unmaxed = upgradeKeys.filter((k) => (s[k] ?? 0) < 5);
            if (unmaxed.length > 0) {
              const pick = unmaxed[Math.floor(Math.random() * unmaxed.length)];
              const newLvl = (s[pick] ?? 0) + 1;
              s[pick] = newLvl;
              if (pick === "hullLevel") s.maxHull = 100 + newLvl * 60;
              if (pick === "fuelLevel") s.maxFuel = 100 + newLvl * 50;
              if (pick === "cargoLevel") s.maxCargo = 50 + newLvl * 35;
              showEvt(
                `📄 BOB WHITEPAPER DROP!\nAnon dev uploaded BOB whitepaper — FREE ${pick.replace("Level", "").toUpperCase()} UPGRADE!`,
                5000,
              );
              tickerQueueRef.current.push(
                `📄 BOB Whitepaper Drop — free ${pick.replace("Level", "")} upgrade!`,
              );
            } else {
              s.bob += 500;
              showEvt(
                "📄 BOB WHITEPAPER DROP!\nAll upgrades maxed! +500 BOB instead!",
                5000,
              );
            }
          } else if (Math.random() < 0.5) {
            // BOB MARKET DUMP — lose 20% of current BOB holdings
            const dumpAmount = Math.floor(s.bob * 0.2);
            s.bob = Math.max(0, s.bob - dumpAmount);
            setHud((h) => ({ ...h, bob: s.bob }));
            showEvt(
              `📉 BOB MARKET DUMP! A whale sold. You lost ${dumpAmount} BOB!`,
              5000,
            );
          } else if (Math.random() < 0.5) {
            // CHAIN REORG — random teleport
            const reorgDir = Math.random() < 0.5 ? 1 : -1;
            const reorgDist = (5 + Math.floor(Math.random() * 10)) * TILE;
            const newX = Math.max(
              TILE * 2,
              Math.min((MAP_W - 3) * TILE, p.x + reorgDir * reorgDist),
            );
            // Check if new position is empty
            const newCol = Math.floor(newX / TILE);
            const curRow = Math.floor(p.y / TILE);
            if (getTile(newCol, curRow) === T.EMPTY) {
              playerRef.current.x = newX;
            } else {
              // Find nearest empty tile
              for (let dx2 = 1; dx2 <= 5; dx2++) {
                if (getTile(newCol + dx2, curRow) === T.EMPTY) {
                  playerRef.current.x = (newCol + dx2) * TILE;
                  break;
                }
                if (getTile(newCol - dx2, curRow) === T.EMPTY) {
                  playerRef.current.x = (newCol - dx2) * TILE;
                  break;
                }
              }
            }
            showEvt(
              "🔀 CHAIN REORG! Reality shifts. You've been teleported!",
              5000,
            );
          } else {
            // CHAIN KEY CEREMONY — fuel refill
            s.fuel = Math.min(s.maxFuel, s.fuel + s.maxFuel * 0.25);
            showEvt(
              "🔑 CHAIN KEY CEREMONY!\nFuel refilled 25% from network energy!",
              4000,
            );
          }
        }
      }
    }

    // Drill heat cooling when not actively drilling
    if (!p.drilling && currentDepth > 5) {
      drillHeatRef.current = Math.max(0, drillHeatRef.current - 8 / 60);
    }
    if (drillHeatOverheatRef.current) {
      if (drillHeatCooldownRef.current > 0) {
        drillHeatCooldownRef.current--;
      } else {
        drillHeatOverheatRef.current = false;
        drillHeatRef.current = 0;
      }
    }

    // Apply status effects
    if (drillOverheatRef.current) {
      if (drillOverheatTimerRef.current > 0) drillOverheatTimerRef.current--;
      else drillOverheatRef.current = false;
    }
    if (magneticStormRef.current > 0) magneticStormRef.current--;
    if (ghostSignalRef.current) {
      ghostSignalRef.current.timer--;
      if (ghostSignalRef.current.timer <= 0) ghostSignalRef.current = null;
    }
    if (engineSurgeRef.current) {
      if (engineSurgeTimerRef.current > 0) engineSurgeTimerRef.current--;
      else engineSurgeRef.current = false;
    }
    if (marketCrashRef.current) {
      if (marketCrashTimerRef.current > 0) marketCrashTimerRef.current--;
      else marketCrashRef.current = false;
    }
    if (tempOreMultiplierTimerRef.current > 0) {
      tempOreMultiplierTimerRef.current--;
      if (tempOreMultiplierTimerRef.current <= 0)
        tempOreMultiplierRef.current = 1.0;
    }
    if (drillSpeedBoostTimerRef.current > 0) {
      drillSpeedBoostTimerRef.current--;
      if (drillSpeedBoostTimerRef.current <= 0)
        drillSpeedBoostRef.current = 1.0;
    }
    if (
      oreRallyEndTimeRef.current > 0 &&
      performance.now() > oreRallyEndTimeRef.current
    ) {
      oreValueMultiplierRef.current = 1.0;
      oreRallyEndTimeRef.current = 0;
    }
    if (marketCrashLiteRef.current) {
      if (marketCrashLiteTimerRef.current > 0)
        marketCrashLiteTimerRef.current--;
      else marketCrashLiteRef.current = false;
    }
    if (playerFrozenRef.current > 0) playerFrozenRef.current--;
    if (marketWhaleSurgeRef.current) {
      if (marketWhaleSurgeTimerRef.current > 0)
        marketWhaleSurgeTimerRef.current--;
      else marketWhaleSurgeRef.current = false;
    }

    // Surface escape events
    if (escapeEventRef.current?.active) {
      const ev = escapeEventRef.current;
      if (nowAtSurface) {
        const bonus = ev.type === "nns_vote" ? 2000 : 0;
        s.bob += bonus;
        const msg =
          ev.type === "nns_vote"
            ? "✅ VETOED! +2000 BOB bonus!"
            : "✅ AUDIT CLEARED!";
        setEventMsg(msg);
        if (eventMsgTimeoutRef.current)
          clearTimeout(eventMsgTimeoutRef.current);
        eventMsgTimeoutRef.current = setTimeout(() => setEventMsg(""), 3000);
        escapeEventRef.current = null;
        setEscapeEventActive(null);
        if (escapeEventTimerRef.current)
          clearInterval(escapeEventTimerRef.current);
      } else {
        ev.timer--;
        if (ev.timer <= 0) {
          // Times up — confiscate cargo
          p.cargo = [];
          s.cargoWeight = 0;
          const msg =
            ev.type === "nns_vote"
              ? "💀 MINER DELETED! All cargo confiscated!"
              : "🔍 AUDIT FAILED! Cargo seized!";
          setEventMsg(msg);
          if (eventMsgTimeoutRef.current)
            clearTimeout(eventMsgTimeoutRef.current);
          eventMsgTimeoutRef.current = setTimeout(() => setEventMsg(""), 3000);
          escapeEventRef.current = null;
          setEscapeEventActive(null);
          if (escapeEventTimerRef.current)
            clearInterval(escapeEventTimerRef.current);
        } else if (frameRef.current % 60 === 0) {
          setEscapeEventActive({ type: ev.type, timer: ev.timer });
        }
      }
    }

    // Trigger surface escape events at depth thresholds
    if (!nowAtSurface && !escapeEventRef.current) {
      if (
        currentDepth >= 60 &&
        !nnsVoteUsedRef.current &&
        Math.random() < 0.0008
      ) {
        nnsVoteUsedRef.current = true;
        escapeEventRef.current = {
          type: "nns_vote",
          timer: 45 * 60,
          active: true,
        };
        setEscapeEventActive({ type: "nns_vote", timer: 45 });
      } else if (
        currentDepth >= 80 &&
        !dfnAuditUsedRef.current &&
        Math.random() < 0.0006
      ) {
        dfnAuditUsedRef.current = true;
        escapeEventRef.current = {
          type: "dfinity_audit",
          timer: 30 * 60,
          active: true,
        };
        setEscapeEventActive({ type: "dfinity_audit", timer: 30 });
      }
    }

    // Auto-save on surface arrival
    if (nowAtSurface && !surfaceNpcShownRef.current) {
      runCountRef.current += 1;
      if (deepDiveModeRef.current) {
        deepDiveBestDepthRef.current = Math.max(
          deepDiveBestDepthRef.current,
          maxDepthReachedRef.current,
        );
      }
      saveGame(
        playerRef.current,
        discoveredOresRef.current,
        maxDepthReachedRef.current,
        runCountRef.current,
        deepDiveBestDepthRef.current,
      );
      // Update meta-progress
      {
        const meta3 = loadMetaProgress();
        meta3.totalRunsCompleted += 1;
        meta3.bestDepth = Math.max(meta3.bestDepth, maxDepthReachedRef.current);
        const prevBestBob = meta3.bestBobInOneRun ?? 0;
        const currentRunBob = playerRef.current.stats.bob;
        meta3.bestBobInOneRun = Math.max(prevBestBob, currentRunBob);
        meta3.totalBOBEarned += currentRunBob;
        meta3.totalAntagonistsDefeated += antagonistsDefeatedThisRunRef.current;
        if (maxDepthReachedRef.current >= 100) {
          meta3.runsReaching100m = (meta3.runsReaching100m ?? 0) + 1;
        }
        // Check for skin unlocks
        if (!meta3.unlockedSkins.includes("gold") && meta3.bestDepth >= 130) {
          meta3.unlockedSkins.push("gold");
        }
        if (!meta3.unlockedSkins.includes("veteran")) {
          // Checked after win condition
        }
        if (
          !meta3.unlockedSkins.includes("speed_demon") &&
          meta3.totalAntagonistsDefeated >= 10
        ) {
          meta3.unlockedSkins.push("speed_demon");
        }

        // Track quests completed
        meta3.totalQuestsCompleted =
          (meta3.totalQuestsCompleted ?? 0) +
          (runQuestsRef.current
            ? runQuestsRef.current.filter((q) => q.completed).length
            : 0);

        // Track ore types ever collected
        const existingOreTypes = meta3.totalOreTypesEverCollected ?? 0;
        meta3.totalOreTypesEverCollected = Math.max(
          existingOreTypes,
          runOreTypesCollectedRef.current.size,
        );

        // Track Deep Dive wins
        if (deepDiveModeRef.current && maxDepthReachedRef.current >= 155) {
          meta3.deepDiveWins = (meta3.deepDiveWins ?? 0) + 1;
        }

        // Check new milestone unlocks
        let newMilestone: string | undefined;

        if (
          (meta3.deepDiveWins ?? 0) >= 1 &&
          !meta3.unlockedSkins.includes("deep_diver")
        ) {
          meta3.unlockedSkins.push("deep_diver");
          newMilestone = "DEEP DIVER — completed Deep Dive mode";
        }

        if (
          runOreTypesCollectedRef.current.size >= 10 &&
          !meta3.unlockedSkins.includes("prospector_elite")
        ) {
          meta3.unlockedSkins.push("prospector_elite");
          newMilestone = "ORE COLLECTOR — found every ore type in one run";
        }

        if (
          (meta3.totalQuestsCompleted ?? 0) >= 10 &&
          !meta3.unlockedSkins.includes("quest_legend")
        ) {
          meta3.unlockedSkins.push("quest_legend");
          newMilestone = "QUEST LEGEND — completed 10 quests total";
        }

        meta3.newMilestoneUnlocked = newMilestone;
        newMilestoneRef.current = newMilestone;

        // Track run history (last 5 runs)
        if (!meta3.runHistory) meta3.runHistory = [];
        meta3.runHistory.push({
          bob: Math.floor(playerRef.current.stats.bob),
          depth: maxDepthReachedRef.current,
          date: new Date().toLocaleDateString(),
          won: true,
          modifier: activeModifierRef.current?.label ?? null,
        });
        if (meta3.runHistory.length > 5)
          meta3.runHistory = meta3.runHistory.slice(-5);

        saveMetaProgress(meta3);
        metaProgressRef.current = meta3;
      }
    }

    // Surface NPC encounters
    if (nowAtSurface && !surfaceNpcShownRef.current) {
      surfaceNpcShownRef.current = true;
      // Clear fuel leak on surface
      fuelLeakRef.current = false;
      const npcRoll = Math.random();
      let npcToShow: {
        id: string;
        name: string;
        quote: string;
        reward: string;
        color: string;
      } | null = null;
      if (
        firstSurfaceEverRef.current &&
        !npcEncounteredRef.current.has("jerry")
      ) {
        npcToShow = {
          id: "jerry",
          name: "Jerry Banfield",
          quote:
            "Hey guys! Welcome to the mine! Here's a little something to get you started.",
          reward: "fuel_hull",
          color: "#f97316",
        };
        firstSurfaceEverRef.current = false;
        localStorage.setItem("bob_jerry_met", "1");
      } else if (npcRoll < 0.25 && !npcEncounteredRef.current.has("kyle")) {
        npcToShow = {
          id: "kyle",
          name: "Kyle Langham",
          quote:
            "The community is PUMPED right now! Sell prices are up 25% for your next haul!",
          reward: "sell_boost",
          color: "#22c55e",
        };
      } else if (
        npcRoll < 0.45 &&
        cargoTotalValue(p.cargo) > 5000 &&
        !npcEncounteredRef.current.has("arthur")
      ) {
        npcToShow = {
          id: "arthur",
          name: "Arthur Falls",
          quote:
            "This haul is making headlines. I'll give you a 15% bonus on everything.",
          reward: "fame_buff",
          color: "#3b82f6",
        };
      } else if (
        npcRoll < 0.5 &&
        s.cargoWeight >= s.maxCargo * 0.8 &&
        !npcEncounteredRef.current.has("whale")
      ) {
        npcToShow = {
          id: "whale",
          name: "The Whale",
          quote:
            "I'll take everything you've got. Double price. One time offer.",
          reward: "whale_buy",
          color: "#8b5cf6",
        };
      } else if (npcRoll < 0.65 && !npcEncounteredRef.current.has("wenzel")) {
        npcToShow = {
          id: "wenzel",
          name: "Wenzel",
          quote:
            "The ecosystem is everywhere, even underground. I'll upgrade your radar.",
          reward: "npc_radar",
          color: "#06b6d4",
        };
      }
      if (npcToShow) {
        setSurfaceNpc(npcToShow);
      }
    }
    if (!nowAtSurface && surfaceNpcShownRef.current)
      surfaceNpcShownRef.current = false;

    // Antagonist spawning
    if (!nowAtSurface && currentDepth >= 20) {
      const now2 = Date.now();
      const timeSinceStart =
        gameStartTimeRef.current > 0
          ? performance.now() - gameStartTimeRef.current
          : 0;
      const eliteEscortMult =
        activeModifierRef.current?.effect === "elite_escort" ? 0.5 : 1.0;
      const antagonistSpawnInterval =
        (deepDiveModeRef.current
          ? 16000
          : currentDepth < 30
            ? 40000 // ~30% less frequent in shallow dirt layer
            : 28000) * eliteEscortMult;
      const maxAntagonists = deepDiveModeRef.current ? 5 : 3;
      if (
        timeSinceStart > 60000 &&
        now2 - lastAntagonistSpawnRef.current > antagonistSpawnInterval &&
        antagonistsRef.current.length < maxAntagonists
      ) {
        lastAntagonistSpawnRef.current = now2;
        const _roll2 = Math.random();
        let atype = "fudder";
        const headFudderDepth = deepDiveModeRef.current ? 100 : 145;
        if (
          currentDepth >= headFudderDepth - 5 &&
          !headFudderWarningFiredRef.current &&
          !headFudderSpawnedRef.current
        ) {
          headFudderWarningFiredRef.current = true;
          addCommMessageRef.current?.(
            "⚠ Transmission intercepted... something is waiting deeper...",
            "system",
          );
        }
        if (currentDepth > headFudderDepth && !headFudderSpawnedRef.current) {
          atype = "head_fudder";
          headFudderSpawnedRef.current = true;
          bossAnnouncementRef.current = { alpha: 1, frames: 0 };
        } else {
          // Depth-weighted antagonist selection
          const r3 = Math.random();
          if (currentDepth >= 100) {
            // Deep zone: Exchange Hacker 15%, BTC Maxi 10%, Rug Puller 20%, Whale Dumper 20%, NNS Voter 10%, Yield Farmer 15%, Fudder 10%
            if (r3 < 0.15) atype = "exchange_hacker";
            else if (r3 < 0.25) atype = "btc_maxi";
            else if (r3 < 0.45) atype = "rug_puller";
            else if (r3 < 0.65) atype = "whale_dumper";
            else if (r3 < 0.75) atype = "nns_voter";
            else if (r3 < 0.9) atype = "yield_farmer";
            else atype = "fudder";
          } else if (currentDepth >= 80) {
            // Mid-deep zone: Yield Farmer 20%, BTC Maxi 20%, Rug Puller 25%, NNS Voter 20%, Fudder 15%
            if (r3 < 0.2) atype = "yield_farmer";
            else if (r3 < 0.4) atype = "btc_maxi";
            else if (r3 < 0.65) atype = "rug_puller";
            else if (r3 < 0.85) atype = "nns_voter";
            else atype = "fudder";
          } else if (currentDepth >= 70) {
            // Mid zone: Fudder 15%, SEC Agent 20%, BTC Maxi 30%, Rug Puller 20%, NNS Voter 15%
            if (r3 < 0.15) atype = "fudder";
            else if (r3 < 0.35) atype = "sec_agent";
            else if (r3 < 0.65) atype = "btc_maxi";
            else if (r3 < 0.85) atype = "rug_puller";
            else atype = "nns_voter";
          } else if (currentDepth >= 60) {
            // Mid zone: Fudder 20%, SEC Agent 20%, BTC Maxi 25%, Rug Puller 20%, Protocol Skeptic 15%
            if (r3 < 0.2) atype = "fudder";
            else if (r3 < 0.4) atype = "sec_agent";
            else if (r3 < 0.65) atype = "btc_maxi";
            else if (r3 < 0.85) atype = "rug_puller";
            else atype = "protocol_skeptic";
          } else if (currentDepth >= 50) {
            // Shallow-mid zone: Fudder 30%, SEC Agent 20%, BTC Maxi 10%, Protocol Skeptic 25%, Governance Troll 15%
            if (r3 < 0.3) atype = "fudder";
            else if (r3 < 0.5) atype = "sec_agent";
            else if (r3 < 0.6) atype = "btc_maxi";
            else if (r3 < 0.85) atype = "protocol_skeptic";
            else atype = "governance_troll";
          } else {
            // Shallow zone: Fudder 50%, SEC Agent 25%, BTC Maxi 10%, Governance Troll 15%
            if (r3 < 0.5) atype = "fudder";
            else if (r3 < 0.75) atype = "sec_agent";
            else if (r3 < 0.85) atype = "btc_maxi";
            else atype = "governance_troll";
          }
        }
        const msgs: Record<string, string[]> = {
          fudder: ["ICP is dead 💀", "wen pump", "this is a scam"],
          sec_agent: ["UNREGISTERED SECURITIES", "YOU ARE IN VIOLATION"],
          btc_maxi: ["JUST BUY BITCOIN", "number go up"],
          rug_puller: ["nothing personal", "see ya 👋"],
          whale_dumper: ["DUMPING NOW", "market correction lol"],
          nns_voter: [
            "YOUR PROPOSAL HAS BEEN REJECTED",
            "Governance slowdown activated!",
          ],
          whale_dumper_jr: [
            "dump it!",
            "bear market forever",
            "ngmi fr fr",
            "sell everything!",
          ],
          head_fudder: ["THE BOB IS MINE", "YOU SHALL NOT PASS"],
          governance_troll: [
            "Your proposal is SPAM!",
            "I'll vote NO forever!",
            "REJECTED!",
          ],
          protocol_skeptic: [
            "The protocol is unproven.",
            "Show me the whitepaper.",
            "This chain will never scale.",
            "I'll believe it when I see it.",
          ],
          yield_farmer: [
            "APY to the moon!",
            "300% yield, zero risk.",
            "Just stake and wait, bro.",
            "The farm never sleeps.",
          ],
          exchange_hacker: [
            "Your keys, my coins.",
            "Hot wallets are free wallets.",
            "Not your keys...",
            "Exploiting the exploit.",
          ],
        };
        const msgList = msgs[atype] ?? ["..."];
        const spawnX = Math.random() < 0.5 ? p.x - 300 : p.x + 300;
        const spawnHp =
          atype === "head_fudder"
            ? 10
            : atype === "whale_dumper"
              ? 2
              : atype === "whale_dumper_jr"
                ? 2
                : atype === "exchange_hacker"
                  ? 4
                  : atype === "yield_farmer"
                    ? 3
                    : atype === "protocol_skeptic"
                      ? 2
                      : 1;
        antagonistsRef.current.push({
          id: antagonistIdCounter.current++,
          type: atype,
          x: Math.max(TILE, Math.min((MAP_W - 2) * TILE, spawnX)),
          y: p.y,
          vx:
            atype === "rug_puller"
              ? 3.0
              : atype === "head_fudder"
                ? 0.5
                : atype === "exchange_hacker"
                  ? 2.5
                  : atype === "yield_farmer"
                    ? 2.0
                    : 0.8 + Math.random() * 0.4,
          hp: spawnHp,
          maxHp: spawnHp,
          phase: atype === "head_fudder" ? 1 : undefined,
          message: msgList[Math.floor(Math.random() * msgList.length)],
          messageTimer: 180,
          effectApplied: false,
        });
      }

      // Update antagonists — distinct behavior per type
      let anyDefeated = false;
      for (const a of antagonistsRef.current) {
        const aRow = Math.floor((a.y + 8) / TILE);
        const aCol = Math.floor(a.x / TILE);
        const distToPlayer = Math.abs(a.x - p.x);

        // ── Behavior modes ────────────────────────────────────────────────
        let moveVx = 0;
        if (a.type === "sec_agent") {
          // Patrol left-right in fixed zone, toggle direction every ~3s
          a.patrolTimer = (a.patrolTimer ?? 0) + 1;
          if (a.patrolDir === undefined) a.patrolDir = 1;
          if (a.patrolTimer >= 180) {
            a.patrolDir *= -1;
            a.patrolTimer = 0;
          }
          moveVx = a.vx * a.patrolDir;
        } else if (a.type === "btc_maxi") {
          // Chase player when within 5 tiles
          const dir2 = Math.sign(p.x - a.x);
          moveVx =
            distToPlayer < TILE * 5 ? a.vx * 1.4 * dir2 : a.vx * dir2 * 0.3;
        } else if (a.type === "rug_puller") {
          // Dash toward player then hide for 2s
          a.rugHideTimer = a.rugHideTimer ?? 0;
          if (a.rugHideTimer > 0) {
            a.rugHideTimer--;
            moveVx = 0; // hiding
          } else {
            a.rugDashing = distToPlayer > TILE;
            if (a.rugDashing) {
              const dir3 = Math.sign(p.x - a.x);
              moveVx = a.vx * 2.2 * dir3;
              if (distToPlayer < TILE * 1.5) {
                a.rugHideTimer = 120;
                a.rugDashing = false;
              }
            } else {
              a.rugHideTimer = 120;
            }
          }
        } else if (a.type === "nns_voter") {
          // NNS Voter: patrol horizontally
          a.patrolTimer = (a.patrolTimer ?? 0) + 1;
          if (a.patrolDir === undefined) a.patrolDir = 1;
          if (a.patrolTimer >= 240) {
            a.patrolDir *= -1;
            a.patrolTimer = 0;
          }
          moveVx = a.vx * a.patrolDir;
        } else if (a.type === "protocol_skeptic") {
          // Erratic movement — changes direction every 1-2s (60-120 frames)
          a.patrolTimer = (a.patrolTimer ?? 0) + 1;
          if (a.patrolDir === undefined)
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
          const skepticInterval = 60 + Math.floor(Math.random() * 60);
          if (a.patrolTimer >= skepticInterval) {
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
            a.patrolTimer = 0;
          }
          moveVx = a.vx * a.patrolDir;
        } else if (a.type === "yield_farmer") {
          // Stationary until player within 6 tiles, then charges at 2x speed
          if (distToPlayer < TILE * 6) {
            const dir6 = Math.sign(p.x - a.x);
            moveVx = a.vx * 2.0 * dir6;
          } else {
            moveVx = 0;
          }
        } else if (a.type === "exchange_hacker") {
          // Invisible until within 5 tiles, then reveals and dashes
          if (distToPlayer < TILE * 5) {
            a.revealed = true;
          }
          if (a.revealed) {
            const dir7 = Math.sign(p.x - a.x);
            moveVx = a.vx * dir7;
          } else {
            moveVx = 0;
          }
        } else if (a.type === "governance_troll") {
          // Erratic random movement — changes direction every 1-2 seconds
          a.patrolTimer = (a.patrolTimer ?? 0) + 1;
          if (a.patrolDir === undefined)
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
          const changeInterval = 60 + Math.floor(Math.random() * 60);
          if (a.patrolTimer >= changeInterval) {
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
            a.patrolTimer = 0;
          }
          moveVx = a.vx * 1.2 * a.patrolDir;
        } else if (a.type === "protocol_skeptic") {
          // Erratic movement — changes direction every 1-2s (60-120 frames)
          a.patrolTimer = (a.patrolTimer ?? 0) + 1;
          if (a.patrolDir === undefined)
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
          const skepticInterval = 60 + Math.floor(Math.random() * 60);
          if (a.patrolTimer >= skepticInterval) {
            a.patrolDir = Math.random() < 0.5 ? 1 : -1;
            a.patrolTimer = 0;
          }
          moveVx = a.vx * a.patrolDir;
        } else if (a.type === "yield_farmer") {
          // Stationary until player within 6 tiles, then charges at 2x speed
          if (distToPlayer < TILE * 6) {
            const dir6 = Math.sign(p.x - a.x);
            moveVx = a.vx * 2.0 * dir6;
          } else {
            moveVx = 0;
          }
        } else if (a.type === "exchange_hacker") {
          // Invisible until within 5 tiles, then reveals and dashes
          if (distToPlayer < TILE * 5) {
            a.revealed = true;
          }
          if (a.revealed) {
            const dir7 = Math.sign(p.x - a.x);
            moveVx = a.vx * dir7;
          } else {
            moveVx = 0;
          }
        } else if (a.type === "whale_dumper" || a.type === "whale_dumper_jr") {
          // Slow drift downward — slight horizontal drift toward player
          const dir4 = Math.sign(p.x - a.x);
          moveVx = dir4 * 0.3;
          const nextRow3 = aRow + 1;
          const belowTile = nextRow3 < MAP_H ? getTile(aCol, nextRow3) : T.DIRT;
          if (
            belowTile === T.EMPTY ||
            belowTile === T.LORE_ROOM ||
            belowTile === T.LAVA_TUBE
          )
            a.y += 0.5;
        } else {
          // fudder / head_fudder: original random wander toward player
          const dir5 = Math.sign(p.x - a.x);
          moveVx = a.vx * dir5;
        }

        // Apply horizontal movement through open tunnels
        if (moveVx !== 0) {
          const nextX = a.x + moveVx;
          const nextCol = Math.floor(nextX / TILE);
          const targetTile =
            aRow >= 0 && aRow < MAP_H && nextCol >= 0 && nextCol < MAP_W
              ? getTile(nextCol, aRow)
              : T.DIRT;
          const canMoveX =
            targetTile === T.EMPTY ||
            targetTile === T.LORE_ROOM ||
            targetTile === T.LAVA_TUBE;
          if (canMoveX) {
            a.x = nextX;
          } else {
            // Blocked — try vertical toward player
            const yDir = Math.sign(p.y - a.y);
            const nextRow = aRow + yDir;
            const vertTile =
              nextRow >= 0 && nextRow < MAP_H && aCol >= 0 && aCol < MAP_W
                ? getTile(aCol, nextRow)
                : T.DIRT;
            if (
              vertTile === T.EMPTY ||
              vertTile === T.LORE_ROOM ||
              vertTile === T.LAVA_TUBE
            ) {
              a.y += Math.abs(moveVx) * yDir;
            }
          }
          // Vertical pursuit when horizontally close
          if (Math.abs(a.x - p.x) < TILE * 3) {
            const yDir2 = Math.sign(p.y - a.y);
            if (Math.abs(a.y - p.y) > TILE) {
              const nextRow2 = Math.floor(
                (a.y + 8 + Math.abs(moveVx) * yDir2) / TILE,
              );
              const vTile =
                nextRow2 >= 0 && nextRow2 < MAP_H && aCol >= 0 && aCol < MAP_W
                  ? getTile(aCol, nextRow2)
                  : T.DIRT;
              if (
                vTile === T.EMPTY ||
                vTile === T.LORE_ROOM ||
                vTile === T.LAVA_TUBE
              ) {
                a.y += Math.abs(moveVx) * yDir2;
              }
            }
          }
        }

        a.x = Math.max(TILE, Math.min((MAP_W - 2) * TILE, a.x));
        if (a.messageTimer > 0) a.messageTimer--;
        if (a.contactCooldown && a.contactCooldown > 0) a.contactCooldown--;

        const dist = Math.abs(a.x - p.x);
        const vertDist = Math.abs(a.y - p.y);
        const inContact = dist < TILE * 2 && vertDist < TILE * 2;

        // Charge window: mark antagonist as charging when within 3 tiles
        if (a.type !== "head_fudder") {
          if (dist < TILE * 3 && vertDist < TILE * 3 && !a.isCharging) {
            a.isCharging = true;
            a.chargeStartTime = performance.now();
          }
          if (
            a.isCharging &&
            performance.now() - (a.chargeStartTime ?? 0) > 600
          ) {
            a.isCharging = false;
          }
        }

        // Dodge check: within 0.5s window, player pressing away avoids damage
        let dodgedCharge = false;
        if (inContact && a.isCharging && a.type !== "head_fudder") {
          const chargeAge = performance.now() - (a.chargeStartTime ?? 0);
          if (chargeAge < 500) {
            const antagonistOnRight = a.x > p.x;
            const movingAway =
              (antagonistOnRight && left) || (!antagonistOnRight && right);
            if (movingAway) {
              dodgedCharge = true;
              a.isCharging = false;
              a.effectApplied = true;
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 30,
                text: "DODGED! ✨",
                alpha: 1,
                dy: 0,
              });
            }
          }
        }

        if (
          !dodgedCharge &&
          inContact &&
          activeModifierRef.current?.effect !== "ghost_protocol"
        ) {
          // Head fudder: continuous damage, phase transitions
          if (a.type === "head_fudder") {
            const maxHp2 = a.maxHp ?? 10;
            const hpPct = a.hp / maxHp2;
            // Phase 1 → 2 transition at 50% HP
            if (a.phase === 1 && hpPct <= 0.5) {
              a.phase = 2;
              a.vx = 1.2; // faster in phase 2
              a.message = "NGMI NGMI NGMI 💀";
              a.messageTimer = 240;
              // Spawn 2 mini-Fudders
              for (let mf = 0; mf < 2; mf++) {
                antagonistsRef.current.push({
                  id: antagonistIdCounter.current++,
                  type: "fudder",
                  x: a.x + (mf === 0 ? -TILE * 2 : TILE * 2),
                  y: a.y,
                  vx: 1.0 + Math.random() * 0.3,
                  hp: 1,
                  message: "NGMI",
                  messageTimer: 120,
                  effectApplied: false,
                });
              }
              floatingTextsRef.current.push({
                x: a.x,
                y: a.y - 30,
                text: "⚠ PHASE 2!",
                alpha: 1,
                dy: 0,
              });
              shakeRef.current = { x: 0, y: 0, frames: 15 };
              hitFlashRef.current = 20;
            }
            // Phase 1: slow drill
            if (a.phase === 1) {
              drillSlowRef.current = true;
            }
            if (!a.contactCooldown || a.contactCooldown <= 0) {
              const phaseMult = a.phase === 2 ? 1.5 : 1.0;
              const hostileMult = hostileUndergroundRef.current ? 2.0 : 1.0;
              const diplomaticMult =
                activeModifierRef.current?.effect === "diplomatic_immunity"
                  ? 0.5
                  : 1.0;
              const dmg = Math.max(
                0,
                2 * phaseMult * hostileMult * diplomaticMult -
                  s.shieldLevel * 0.3,
              );
              s.hull = Math.max(0, s.hull - dmg);
              a.contactCooldown = 60;
              shakeRef.current = { x: 0, y: 0, frames: 8 };
              playHit();
            }
          }
          // One-shot effects (reset when player moves away)
          if (!a.effectApplied) {
            a.effectApplied = true;
            if (a.type === "fudder") {
              drillSlowRef.current = true;
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [180, 0, 255];
              showPortraitRef.current(
                "fudder",
                "FUD! Drill Slowed! You'll never make it...",
                "#6b21a8",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "FUD! 😱 Drill Slowed!",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "sec_agent") {
              playerFrozenRef.current = 180;
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [0, 100, 255];
              showPortraitRef.current(
                "sec_agent",
                "CEASE AND DESIST! ICP is under investigation!",
                "#1e40af",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "CEASE AND DESIST!",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "btc_maxi") {
              const dmg = Math.max(0, 10 - s.shieldLevel * 2);
              s.hull = Math.max(0, s.hull - dmg);
              shakeRef.current = { x: 0, y: 0, frames: 15 };
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [255, 140, 0];
              showPortraitRef.current(
                "btc_maxi",
                "HAVE FUN STAYING POOR! Bitcoin fixes this!",
                "#f97316",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "HAVE FUN STAYING POOR",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "rug_puller" && p.cargo.length > 0) {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [255, 0, 0];
              const randIdx = Math.floor(Math.random() * p.cargo.length);
              const stolen = p.cargo[randIdx];
              if (stolen) {
                const sr = RESOURCES[stolen.tile];
                if (sr) s.cargoWeight -= sr.weight * stolen.count;
                p.cargo.splice(randIdx, 1);
              }
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "STOLEN! 💀",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "whale_dumper") {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [0, 200, 150];
              marketCrashRef.current = true;
              marketCrashTimerRef.current = 600;
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "DUMP IT 📉",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "whale_dumper_jr") {
              hitFlashRef.current = 8;
              marketCrashLiteRef.current = true;
              marketCrashLiteTimerRef.current = 900; // 15 seconds at 60fps
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "mini dump 📉 -30%",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "nns_voter") {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [50, 50, 255];
              // Slow movement for 3 seconds (180 frames at 60fps)
              nnsSlowRef.current = 180;
              showPortraitRef.current(
                "fudder",
                "YOUR PROPOSAL HAS BEEN REJECTED! Movement governance slowdown!",
                "#3730a3",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "MOTION REJECTED! 🗳 Speed -40%",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "governance_troll") {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [0, 200, 0];
              const stolen = Math.min(50, s.bob);
              s.bob = Math.max(0, s.bob - stolen);
              setHud((h) => ({ ...h, bob: s.bob }));
              addCommMessageRef.current?.(
                `💸 Governance Troll stole ${stolen} BOB!`,
                "hazard",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: `-${stolen} BOB! 👹`,
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "protocol_skeptic") {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [150, 150, 150];
              a.contactCooldown = 180; // 3000ms at 60fps
              // Steal one random cargo item
              if (p.cargo.length > 0) {
                const skepticIdx = Math.floor(Math.random() * p.cargo.length);
                const skepticStolen = p.cargo[skepticIdx];
                if (skepticStolen) {
                  const sr2 = RESOURCES[skepticStolen.tile];
                  if (sr2) s.cargoWeight -= sr2.weight * skepticStolen.count;
                  p.cargo.splice(skepticIdx, 1);
                  floatingTextsRef.current.push({
                    x: p.x,
                    y: p.y - 20,
                    text: "CARGO SEIZED! 🤨",
                    alpha: 1,
                    dy: 0,
                  });
                  addCommMessageRef.current?.(
                    "🤨 Protocol Skeptic seized your cargo! Unproven!",
                    "hazard",
                  );
                }
              } else {
                floatingTextsRef.current.push({
                  x: p.x,
                  y: p.y - 20,
                  text: "SKEPTIC FAILS! 😤",
                  alpha: 1,
                  dy: 0,
                });
              }
            } else if (a.type === "yield_farmer") {
              hitFlashRef.current = 12;
              flashColorRGBRef.current = [80, 200, 80];
              const farmDmg = Math.max(0, 8 - s.shieldLevel * 1.5);
              s.hull = Math.max(0, s.hull - farmDmg);
              shakeRef.current = { x: 0, y: 0, frames: 10 };
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "YIELD FARMED! 🌾",
                alpha: 1,
                dy: 0,
              });
            } else if (a.type === "exchange_hacker") {
              hitFlashRef.current = 15;
              flashColorRGBRef.current = [120, 0, 200];
              a.contactCooldown = 240; // 4000ms at 60fps
              const hackDmg = Math.max(0, s.maxHull * 0.25 - s.shieldLevel * 2);
              s.hull = Math.max(0, s.hull - hackDmg);
              shakeRef.current = { x: 0, y: 0, frames: 20 };
              addCommMessageRef.current?.(
                "💜 Exchange Hacker breached your hull! -25% HP!",
                "hazard",
              );
              floatingTextsRef.current.push({
                x: p.x,
                y: p.y - 20,
                text: "HACKED! 💜 -25% HULL",
                alpha: 1,
                dy: 0,
              });
            }
          }
        } else {
          // Reset effects when player moves away (allows re-trigger on next contact)
          if (a.effectApplied && dist > TILE * 4) {
            a.effectApplied = false;
          }
          // Reset charge state when player moves away
          if (a.isCharging && dist > TILE * 4) {
            a.isCharging = false;
          }
          if (a.type === "fudder") drillSlowRef.current = false;
        }

        if (a.hp <= 0) {
          anyDefeated = true;
          // Defeated — poof particles + BOB reward
          const rewards: Record<string, number> = {
            fudder: 10,
            sec_agent: 25,
            btc_maxi: 15,
            rug_puller: 20,
            whale_dumper: 30,
            nns_voter: 20,
            head_fudder: 200,
            governance_troll: 75,
            protocol_skeptic: 30,
            yield_farmer: 50,
            exchange_hacker: 80,
          };
          let r3 = rewards[a.type] ?? 0;
          const modEffect = activeModifierRef.current?.effect;
          if (modEffect === "bounty_hunters") r3 += 150;
          if (modEffect === "fudder_swarm") r3 *= 2;
          if (modEffect === "elite_escort") r3 += 40;
          if (hostileUndergroundRef.current) r3 *= 3;
          if (r3 > 0) {
            s.bob += r3;
            floatingTextsRef.current.push({
              x: a.x,
              y: a.y,
              text: `+${r3} BOB! SILENCED! 💥`,
              alpha: 1,
              dy: 0,
            });
          }
          if (a.type === "head_fudder") {
            // Boss defeat: 500 BOB + drill upgrade + screen flash + big burst
            s.bob += 500;
            s.drillLevel = Math.min(5, s.drillLevel + 1);
            hitFlashRef.current = 30;
            shakeRef.current = { x: 0, y: 0, frames: 20 };
            floatingTextsRef.current.push({
              x: a.x,
              y: a.y - 30,
              text: "+500 BOB! DRILL UPGRADED! 🏆",
              alpha: 1,
              dy: 0,
            });
            setHud((h) => ({ ...h, bob: s.bob }));
            // Show lore popup
            setOreDiscoveryCard({
              tileId: 0,
              name: "HEAD FUDDER DEFEATED",
              era: "The Genesis Block is unguarded...",
              color: "#ffd700",
            });
          }
          emitParticles(a.x, a.y, "#ff69b4");
          emitParticles(a.x, a.y, "#ffd700");
          // Expanded gold ring burst
          const burstCount = a.type === "head_fudder" ? 24 : 8;
          for (let gi = 0; gi < burstCount; gi++) {
            const angle = (gi / burstCount) * Math.PI * 2;
            spawnParticle(
              a.x,
              a.y,
              Math.cos(angle) * (a.type === "head_fudder" ? 5 : 3),
              Math.sin(angle) * (a.type === "head_fudder" ? 5 : 3) - 1,
              60,
              60,
              "#ffd700",
            );
          }
          antagonistsDefeatedThisRunRef.current++;
          playAntagonistDefeat();
          if (a.type === "btc_maxi") btcMaxiDefeatedThisRunRef.current++;
        }
      }
      if (anyDefeated) {
        antagonistsRef.current = antagonistsRef.current.filter((a) => a.hp > 0);
      }
    }

    // Whale underground NPC (depth >= 100, 5% chance per event tick, once per run)
    if (
      !nowAtSurface &&
      !whaleUndergroundUsedRef.current &&
      currentDepth >= (deepDiveModeRef.current ? 90 : 100) &&
      !activeNpc
    ) {
      const whaleTick = Date.now();
      if (
        whaleTick - lastEventTimeRef.current > 8000 &&
        Math.random() < 0.005
      ) {
        const cargoVal = cargoTotalValue(p.cargo);
        if (cargoVal > 0) {
          whaleUndergroundUsedRef.current = true;
          setWhaleDialog({
            value: cargoVal,
            deepDive: deepDiveModeRef.current,
          });
        }
      }
    }

    // Update synergy badges
    const synKeys = synergyKeys.join(",");
    if (synKeys !== activeSynergies.join(",")) {
      setActiveSynergies(synergyKeys);
    }

    // Hazard: water tile - slow movement + disable downward drill
    const onWater = getTile(curTileX, curTileY) === 32;
    if (onWater !== waterWarnRef.current) {
      waterWarnRef.current = onWater;
      setWaterWarning(onWater);
    }

    // Hazard: lava tile - continuous hull damage
    const onLava = getTile(curTileX, curTileY) === T.LAVA_TILE;
    if (onLava) {
      const depthHazardMult = 1 + currentDepth * 0.005;
      const shieldMult = Math.max(0, 1 - s.shieldLevel * 0.2);
      s.hull = Math.max(0, s.hull - 1.5 * depthHazardMult * shieldMult);
      if (!lavaWarnActiveRef.current) {
        lavaWarnActiveRef.current = true;
        setLavaWarning(true);
      }
    } else if (lavaWarnActiveRef.current) {
      lavaWarnActiveRef.current = false;
      setLavaWarning(false);
    }

    // Airdrop crate collection and timer
    if (airdropCrateRef.current && !airdropCrateRef.current.collected) {
      const crate = airdropCrateRef.current;
      if (tileYEarly <= 5 && Math.abs(p.x - crate.x) < TILE * 4) {
        const airdropBob = 500 + Math.floor(currentDepth * 3);
        s.bob += airdropBob;
        setHud((h) => ({ ...h, bob: s.bob }));
        airdropCrateRef.current = { ...crate, collected: true };
        setAirdropCrate(null);
        floatingTextsRef.current.push({
          x: p.x,
          y: p.y - 20,
          text: `+${airdropBob} BOB AIRDROP! 📦`,
          alpha: 1,
          dy: 0,
        });
      } else if (frameRef.current % 60 === 0 && crate.timer > 0) {
        // Tick down timer every second (60 frames)
        const newTimer = crate.timer - 1;
        airdropCrateRef.current = { ...crate, timer: newTimer };
        if (newTimer <= 0) {
          airdropCrateRef.current = null;
          setAirdropCrate(null);
        } else {
          setAirdropCrate({ ...crate, timer: newTimer });
        }
      }
    }

    // Cargo nearly full warning
    const cargoFraction = s.cargoWeight / s.maxCargo;
    if (cargoFraction >= 0.9 && !cargoNearlyFullWarnedRef.current) {
      cargoNearlyFullWarnedRef.current = true;
      addCommMessageRef.current?.("⚠️ CARGO NEARLY FULL", "hazard");
    } else if (cargoFraction < 0.85) {
      cargoNearlyFullWarnedRef.current = false;
    }

    // Low fuel warning
    if (s.fuel / s.maxFuel < 0.2) playLowFuelWarning();
    // HUD tooltips for first-time warnings
    if (s.fuel / s.maxFuel < 0.3 && !lowFuelShownRef.current) {
      lowFuelShownRef.current = true;
      setLowFuelTooltip(true);
      setTimeout(() => setLowFuelTooltip(false), 4000);
    }
    if (s.hull / s.maxHull < 0.3 && !lowHullShownRef.current) {
      lowHullShownRef.current = true;
      setLowHullTooltip(true);
      setTimeout(() => setLowHullTooltip(false), 4000);
    }
    // Controls hint fade after 60 seconds
    if (!controlsHintDoneRef.current && gameStartTimeRef.current > 0) {
      const elapsed = (performance.now() - gameStartTimeRef.current) / 1000;
      if (elapsed > 55 && elapsed < 65) {
        const newAlpha = Math.max(0, 1 - (elapsed - 55) / 10);
        if (Math.abs(newAlpha - prevControlsHintAlphaRef.current) > 0.01) {
          prevControlsHintAlphaRef.current = newAlpha;
          setControlsHintAlpha(newAlpha);
        }
      } else if (elapsed >= 65) {
        controlsHintDoneRef.current = true;
        if (prevControlsHintAlphaRef.current !== 0) {
          prevControlsHintAlphaRef.current = 0;
          setControlsHintAlpha(0);
        }
      }
    }

    // Falling rocks system
    if (currentDepth > 20) {
      const rocks = fallingRocksRef.current;
      let activeCount = 0;
      for (const r of rocks) if (r.active) activeCount++;
      if (activeCount < 5 && Math.random() < 0.01) {
        // Spawn rock at a random cleared tile 3-8 tiles above player
        const spawnTileX =
          Math.floor(p.x / TILE) + Math.floor(Math.random() * 7) - 3;
        const spawnTileY =
          Math.floor(p.y / TILE) - 3 - Math.floor(Math.random() * 5);
        if (
          spawnTileX >= 0 &&
          spawnTileX < MAP_W &&
          spawnTileY >= 0 &&
          getTile(spawnTileX, spawnTileY) === T.EMPTY
        ) {
          rocks.push({
            x: spawnTileX * TILE + TILE / 2,
            y: spawnTileY * TILE,
            vy: 0,
            active: true,
          });
        }
      }
      for (const rock of rocks) {
        if (!rock.active) continue;
        rock.vy = Math.min(rock.vy + 0.15, 8);
        rock.y += rock.vy;
        const rockTileX = Math.floor(rock.x / TILE);
        const rockTileY = Math.floor(rock.y / TILE);
        // Deactivate if hits a solid tile
        if (
          rockTileY >= MAP_H ||
          (getTile(rockTileX, rockTileY) !== T.EMPTY &&
            getTile(rockTileX, rockTileY) !== T.GAS_POCKET &&
            getTile(rockTileX, rockTileY) !== T.WATER_TILE &&
            getTile(rockTileX, rockTileY) !== T.LAVA_TILE)
        ) {
          rock.active = false;
          continue;
        }
        // Deactivate if hits player
        const playerCenterX = p.x + pw / 2;
        const playerCenterY = p.y + ph / 2;
        const dx3 = rock.x - playerCenterX;
        const dy3 = rock.y - playerCenterY;
        if (Math.abs(dx3) < TILE * 0.5 && Math.abs(dy3) < TILE * 0.5) {
          const shieldMult = Math.max(0, 1 - s.shieldLevel * 0.2);
          s.hull = Math.max(0, s.hull - 8 * shieldMult);
          shakeRef.current = { x: 0, y: 0, frames: 10 };
          rock.active = false;
        }
      }
      // Remove old inactive rocks (keep array small)
      if (rocks.length > 20)
        fallingRocksRef.current = rocks.filter((r) => r.active);
    }

    // atSurface: player is in shop area (y <= row 5, x within shop bounds)
    void tileXEarly;
    void tileYEarly;
    void inShopXEarly; // pre-computed as nowAtSurface above
    if (autoAscentRef.current && tileYEarly <= 5) {
      autoAscentRef.current = false;
      setAutoAscending(false);
      const winData = pendingWinRef.current;
      if (winData) {
        setWon(winData);
        pendingWinRef.current = null;
        // Unlock veteran skin + increment permanent bonuses
        const meta4 = loadMetaProgress();
        if (!meta4.unlockedSkins.includes("veteran")) {
          meta4.unlockedSkins.push("veteran");
        }
        meta4.permanentBonuses = Math.min(
          10,
          (meta4.permanentBonuses ?? 0) + 1,
        );
        saveMetaProgress(meta4);
        metaProgressRef.current = meta4;
      }
      syncScreen("cutscene");
      return;
    }
    setAtSurface((prev) => {
      if (nowAtSurface && !prev) {
        playShopEnter();
        eventTriggeredRef.current = false; // reset so events can fire on next dive
        // Generate new shop special offer for this surface visit
        const SHOP_DEAL_POOL: ShopDeal[] = [
          {
            id: "deal_full_repair",
            label: "⚕ Emergency Repair",
            desc: "Full hull repair — 250 BOB",
            cost: 250,
          },
          {
            id: "deal_full_refuel",
            label: "⛽ Fuel Surplus",
            desc: "Full refuel — 150 BOB",
            cost: 150,
          },
          {
            id: "deal_cargo_boost",
            label: "📦 Cargo Expansion",
            desc: "+50 cargo this run — 400 BOB",
            cost: 400,
          },
          {
            id: "deal_drill_overclock",
            label: "⚡ Drill Overclock",
            desc: "+40% drill speed this run — 350 BOB",
            cost: 350,
          },
          {
            id: "deal_sell_boost",
            label: "📈 Market Tip",
            desc: "Next haul sells for 2x — 500 BOB",
            cost: 500,
          },
          {
            id: "deal_hull_boost",
            label: "🛡 Armor Plate",
            desc: "+30 max hull this run — 300 BOB",
            cost: 300,
          },
          {
            id: "deal_sonar_pack",
            label: "📡 Sonar Bundle",
            desc: "+3 Sonar charges — 300 BOB",
            cost: 300,
          },
          {
            id: "deal_fuel_efficiency",
            label: "🔋 Fuel Cell",
            desc: "Fuel drain -30% this run — 350 BOB",
            cost: 350,
          },
        ];
        shopSpecialOfferRef.current =
          SHOP_DEAL_POOL[Math.floor(Math.random() * SHOP_DEAL_POOL.length)];
        shopOfferPurchasedRef.current = false;
        // Show welcome back if been underground > 30s
        const timeUnderground = performance.now() - lastSurfaceTimeRef.current;
        if (timeUnderground > 30000 && lastSurfaceTimeRef.current > 0) {
          const depth2 = Math.floor(tileYEarly - 5);
          tickerQueueRef.current.push(
            `🏪 WELCOME BACK, MINER! Depth reached: ${depth2}m`,
          );
          const domLoyaltyVal =
            metaProgressRef.current?.npcRelationships?.dom ?? 5;
          if (domLoyaltyVal >= 8) {
            tickerQueueRef.current.push(
              "💛 Dom's favorite miner is back. Jerry gave you a 5% discount this visit.",
            );
          }
          if (!tickerDisplayTimerRef.current) {
            const showNext2 = () => {
              const next2 = tickerQueueRef.current.shift();
              if (next2) {
                setCurrentTickerMsg(next2);
                tickerDisplayTimerRef.current = setTimeout(showNext2, 4000);
              } else {
                setCurrentTickerMsg("");
                tickerDisplayTimerRef.current = null;
              }
            };
            showNext2();
          }
        }
        lastSurfaceTimeRef.current = performance.now();
      }
      if (!nowAtSurface && prev) {
        lastSurfaceTimeRef.current = performance.now();
      }
      return nowAtSurface;
    });

    const depth = Math.max(0, Math.floor(tileYEarly - 5));
    let drillTarget = "";
    if (down && p.onGround) {
      const belowY2 = Math.floor((p.y + ph + 2) / TILE);
      const midX2 = Math.floor((p.x + pw / 2) / TILE);
      const tt = getTile(midX2, belowY2);
      drillTarget = RESOURCES[tt]?.name ?? (tt !== T.EMPTY ? "Rock" : "");
    }
    const newHud = {
      hull: s.hull,
      maxHull: s.maxHull,
      fuel: s.fuel,
      maxFuel: s.maxFuel,
      cargoW: s.cargoWeight,
      maxCargo: s.maxCargo,
      bob: s.bob,
      depth,
      drillTarget,
      sonarCount: s.sonarCount,
      chargesCount: s.chargesCount,
      surfaceCallCount: s.surfaceCallCount,
      drillHeat: drillHeatRef.current,
      drillOverheated: drillHeatOverheatRef.current,
    };
    const ph2 = prevHudRef.current;
    if (
      newHud.hull !== ph2.hull ||
      newHud.maxHull !== ph2.maxHull ||
      newHud.fuel !== ph2.fuel ||
      newHud.maxFuel !== ph2.maxFuel ||
      newHud.cargoW !== ph2.cargoW ||
      newHud.maxCargo !== ph2.maxCargo ||
      newHud.bob !== ph2.bob ||
      newHud.depth !== ph2.depth ||
      newHud.drillTarget !== ph2.drillTarget ||
      newHud.sonarCount !== ph2.sonarCount ||
      newHud.chargesCount !== ph2.chargesCount ||
      newHud.surfaceCallCount !== ph2.surfaceCallCount ||
      newHud.drillHeat !== ph2.drillHeat ||
      newHud.drillOverheated !== ph2.drillOverheated
    ) {
      prevHudRef.current = newHud;
      setHud(newHud);
    }
  }

  function canDrill(t: number, s: PlayerStats): boolean {
    if (t === T.HARD_ROCK && s.drillLevel < 2) return false;
    if (t === 31 || t === 32) return false; // gas/water passthrough
    if (t === T.LAVA_TILE) return false; // lava undrillable
    if (t === T.LAVA_TUBE) return false; // lava tube is passable empty space
    return t !== T.EMPTY;
  }

  function triggerGameOver(reason: string, p: PlayerState) {
    playGameOver();
    const goBob = Math.floor(p.stats.bob + cargoTotalValue(p.cargo));
    const goDepth = Math.max(0, Math.floor(p.y / TILE - 5));
    const goSecs =
      gameStartTimeRef.current > 0
        ? Math.floor((performance.now() - gameStartTimeRef.current) / 1000)
        : 0;
    const goTimeStr =
      goSecs > 0 ? `${Math.floor(goSecs / 60)}m ${goSecs % 60}s` : "—";
    {
      const metaGO = loadMetaProgress();
      const isPBGO =
        goBob > (metaGO.bestBobInOneRun ?? 0) || goDepth > metaGO.bestDepth;
      setSummaryData({
        isWin: false,
        bob: goBob,
        depth: goDepth,
        oresFound: runOreTypesCollectedRef.current.size,
        questsCompleted: runQuestsRef.current
          ? runQuestsRef.current.filter((q) => q.completed).length
          : 0,
        timePlayed: goTimeStr,
        antagonistsDefeated: antagonistsDefeatedThisRunRef.current,
        newMilestone: newMilestoneRef.current,
        isPersonalBest: isPBGO,
        discoveredOreCount: discoveredOresRef.current.size,
        totalOreCount: Object.keys(RESOURCES).filter(
          (k) => Number(k) !== T.BOB_GENESIS && Number(k) !== T.LAVA_TUBE,
        ).length,
      });
    }
    setGameOver({ reason, bob: goBob, depth: goDepth });
    syncScreen("summary");
  }

  function render(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const p = playerRef.current;
    ctx.clearRect(0, 0, cw, ch);

    const shake = shakeRef.current;
    if (shake.frames > 0) {
      shake.frames--;
      shake.x = (Math.random() - 0.5) * 8;
      shake.y = (Math.random() - 0.5) * 8;
    } else {
      shake.x = 0;
      shake.y = 0;
    }

    const camX = Math.floor(p.x + TILE / 2 - cw / 2) + shake.x;
    const camY = Math.floor(p.y + TILE / 2 - ch / 2) + shake.y;

    if (
      !skyGradCacheRef.current.grad ||
      Math.abs(camY - skyGradCacheRef.current.camY) > 4
    ) {
      const g = ctx.createLinearGradient(0, -camY, 0, 5 * TILE - camY);
      g.addColorStop(0, "#1a0a00");
      g.addColorStop(1, "#3d1c00");
      skyGradCacheRef.current = { grad: g, camY };
    }
    ctx.fillStyle = skyGradCacheRef.current.grad!;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#1a0d00";
    ctx.fillRect(0, Math.max(0, 5 * TILE - camY), cw, ch);

    // ── Surface atmosphere: clouds & birds (only visible near surface) ────
    if (camY < 5 * TILE) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(0.7, 1 - camY / (3 * TILE)));
      // Clouds
      for (const cloud of cloudsRef.current) {
        cloud.x = (cloud.x + cloud.speed) % 1.1;
        if (cloud.x > 1.05) cloud.x = -0.1;
        const cx2 = cloud.x * cw;
        const cy2 = cloud.y * ch + -camY * 0.15;
        const cw2 = cloud.w;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.ellipse(cx2, cy2, cw2 * 0.5, cw2 * 0.18, 0, 0, Math.PI * 2);
        ctx.ellipse(
          cx2 - cw2 * 0.2,
          cy2 + 4,
          cw2 * 0.3,
          cw2 * 0.14,
          0,
          0,
          Math.PI * 2,
        );
        ctx.ellipse(
          cx2 + cw2 * 0.2,
          cy2 + 6,
          cw2 * 0.35,
          cw2 * 0.12,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Birds (V shapes)
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      for (const bird of birdsRef.current) {
        bird.timer++;
        if (bird.timer % 3 === 0) bird.x += bird.speed;
        if (bird.x > 1.1) bird.x = -0.05;
        if (bird.x < -0.1) bird.x = 1.05;
        const bx = bird.x * cw;
        const by = bird.y * ch + -camY * 0.1;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by - 2);
        ctx.lineTo(bx, by + 2);
        ctx.lineTo(bx + 6, by - 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    const startTX = Math.max(0, Math.floor(camX / TILE));
    const endTX = Math.min(MAP_W, Math.ceil((camX + cw) / TILE) + 1);
    const startTY = Math.max(0, Math.floor(camY / TILE));
    const endTY = Math.min(MAP_H, Math.ceil((camY + ch) / TILE) + 1);

    // Mark explored tiles (and mark minimap dirty if new tiles explored)
    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        if (!exploredRef.current[ty * MAP_W + tx]) {
          exploredRef.current[ty * MAP_W + tx] = 1;
          minimapDirtyRef.current = true;
        }
      }
    }

    const frame = frameRef.current;

    for (let ty = startTY; ty < endTY; ty++) {
      for (let tx = startTX; tx < endTX; tx++) {
        const t = getTile(tx, ty);
        if (t === T.EMPTY) continue;
        const sx = tx * TILE - camX;
        const sy = ty * TILE - camY;
        const depth = ty - 5;

        // Ore glow pulse with per-ore correct colors
        if (GLOWING_TILES.has(t)) {
          const pulse =
            0.5 + 0.5 * Math.sin(frame * 0.08 + tx * 0.3 + ty * 0.2);
          const glowColor =
            ORE_GLOW_COLORS[t] ??
            (t === T.LAVA_TILE
              ? "#ff4500"
              : t === T.CRYSTAL_WALL
                ? "#67e8f9"
                : "#fde047");
          const glowIntensity =
            t === T.BOB_GENESIS
              ? 25
              : t === T.BOB_SEAM || t === T.BOB_VEIN
                ? 18
                : t === T.BOB_CRYSTAL || t === T.BOB_CORE || t === T.BOB_INGOT
                  ? 14
                  : 8; // lower tiers get subtler glow
          ctx.shadowBlur = glowIntensity * pulse;
          ctx.shadowColor = glowColor;
        }

        drawDetailedTile(ctx, sx, sy, t, depth, frame);

        // Crack overlay for cracking unstable tiles
        {
          const tileIdxCrack = ty * MAP_W + tx;
          if (crackingTilesRef.current.has(tileIdxCrack)) {
            const crackStartDraw = crackingTilesRef.current.get(tileIdxCrack)!;
            const crackProg = Math.min(
              1,
              (performance.now() - crackStartDraw) / 3500,
            );
            ctx.save();
            ctx.globalAlpha = 0.35 + crackProg * 0.55;
            ctx.strokeStyle = "rgba(255, 160, 50, 1)";
            ctx.lineWidth = 1 + crackProg * 2.5;
            ctx.beginPath();
            ctx.moveTo(sx + 6, sy + 2);
            ctx.lineTo(sx + 12, sy + 15);
            ctx.moveTo(sx + 20, sy + 4);
            ctx.lineTo(sx + 11, sy + 29);
            ctx.moveTo(sx + 3, sy + 17);
            ctx.lineTo(sx + 25, sy + 22);
            ctx.moveTo(sx + 14, sy + 8);
            ctx.lineTo(sx + 8, sy + 24);
            ctx.stroke();
            if (crackProg > 0.5) {
              const warnAlpha =
                0.25 + 0.2 * Math.sin(performance.now() * 0.012);
              ctx.globalAlpha = warnAlpha;
              ctx.fillStyle = "rgba(255, 80, 0, 0.7)";
              ctx.fillRect(sx, sy, TILE, TILE);
            }
            ctx.restore();
          }
        }

        // Mutated tile rainbow glow
        if (
          mutatedTileRef.current &&
          mutatedTileRef.current.col === tx &&
          mutatedTileRef.current.row === ty
        ) {
          const rainbowHue = (frame * 6) % 360;
          ctx.shadowBlur = 20;
          ctx.shadowColor = `hsl(${rainbowHue}, 100%, 60%)`;
          ctx.strokeStyle = `hsl(${rainbowHue}, 100%, 70%)`;
          ctx.lineWidth = 2;
          ctx.strokeRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
          ctx.shadowBlur = 0;
        }

        if (GLOWING_TILES.has(t)) ctx.shadowBlur = 0;

        // Chisel marks on tunnel walls (solid block adjacent to carved empty space)
        if (t === T.DIRT || t === T.STONE || t === T.HARD_ROCK) {
          const hasEmptyNeighbor =
            getTile(tx, ty + 1) === T.EMPTY ||
            getTile(tx, ty - 1) === T.EMPTY ||
            getTile(tx - 1, ty) === T.EMPTY ||
            getTile(tx + 1, ty) === T.EMPTY;
          if (hasEmptyNeighbor) {
            ctx.fillStyle = "rgba(0,0,0,0.14)";
            const ly1 = ((tx * 7 + ty * 11) % (TILE - 8)) + 4;
            const ly2 = ((tx * 13 + ty * 5) % (TILE - 8)) + 4;
            ctx.fillRect(sx + 3, sy + ly1, TILE - 6, 1);
            ctx.fillRect(sx + 5, sy + ly2, TILE - 10, 1);
            const vx = ((tx * 9 + ty * 3) % (TILE - 6)) + 3;
            ctx.fillRect(sx + vx, sy + 3, 1, TILE - 6);
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            ctx.fillRect(sx + 3, sy + ly1 + 1, TILE - 6, 1);
          }
        }

        // Tunnel ambient — subtle darkness in carved empty space
        if (t === T.EMPTY && exploredRef.current[ty]?.[tx]) {
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.fillRect(sx, sy, TILE, TILE);

          // Crystal Caverns (80m+): deterministic teal crystal shards on walls
          const tileSeed = (tx * 7 + ty * 13) % 100;
          if (ty >= 80 && ty <= 130 && tileSeed < 3) {
            ctx.fillStyle = "rgba(0,200,200,0.5)";
            const cx2 = sx + ((tx * 17 + ty * 3) % (TILE - 6)) + 3;
            const cy2 = sy + ((tx * 5 + ty * 11) % (TILE - 8)) + 4;
            const h2 = 3 + ((tx * 3 + ty * 7) % 4);
            ctx.fillRect(cx2, cy2, 2, h2);
            ctx.fillRect(cx2 - 1, cy2 + 1, 4, 1);
          }
          // Lava Fields (120m+): deterministic orange drips on bottom of tile
          const lavaSeed = (tx * 11 + ty * 17) % 100;
          if (ty >= 120 && lavaSeed < 4) {
            ctx.fillStyle = "rgba(255,80,0,0.4)";
            const dx = sx + ((tx * 13 + ty * 9) % (TILE - 4)) + 2;
            const dh = 2 + ((tx * 5 + ty * 3) % 3);
            ctx.fillRect(dx, sy + TILE - dh, 2, dh);
          }
        }
      }
    }

    // ── Depth darkness overlay ──
    {
      const playerDepthPx = Math.max(0, p.y / TILE - 5);
      const darknessAlpha = Math.min(0.3, (playerDepthPx / 155) * 0.3);
      if (darknessAlpha > 0.005) {
        ctx.fillStyle = `rgba(0,0,0,${darknessAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, cw, ch);
      }
      // ── Depth fog at 100m+ (blue-gray mist) ──
      if (playerDepthPx > 100) {
        const fogAlpha = Math.min(0.16, ((playerDepthPx - 100) / 55) * 0.16);
        ctx.fillStyle = `rgba(50,70,110,${fogAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, cw, ch);
      }
      // ── Bioluminescent cyan glow in crystal zone (60m-100m) ──
      if (playerDepthPx >= 60 && playerDepthPx <= 108) {
        const t2 = Math.min(1, (playerDepthPx - 60) / 40);
        const bioAlpha = t2 * 0.06 * (0.8 + 0.2 * Math.sin(frame * 0.025));
        ctx.fillStyle = `rgba(0,200,230,${bioAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, cw, ch);
      }
      // ── Heat shimmer tint at lava zone (130m+) ──
      if (playerDepthPx >= 130) {
        const heatT = Math.min(1, (playerDepthPx - 130) / 25);
        const heatAlpha = heatT * 0.1 * (0.7 + 0.3 * Math.sin(frame * 0.12));
        ctx.fillStyle = `rgba(255,60,0,${heatAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, cw, ch);
      }
    }

    // ── Terrain animations: lava bubbles, gas drift, crystal shimmer ──
    if (!lowFpsModeRef.current || frame % 2 === 0) {
      for (let ty2 = startTY; ty2 < endTY; ty2++) {
        for (let tx2 = startTX; tx2 < endTX; tx2++) {
          const t2 = getTile(tx2, ty2);
          const sx2 = tx2 * TILE - camX;
          const sy2 = ty2 * TILE - camY;
          // Lava bubble particles: lava adjacent to empty tunnels
          if (t2 === T.LAVA_TILE) {
            const aboveTile = getTile(tx2, ty2 - 1);
            if (aboveTile === T.EMPTY && Math.random() < 0.01) {
              spawnParticle(
                tx2 * TILE + Math.random() * TILE,
                ty2 * TILE,
                (Math.random() - 0.5) * 1.5,
                -Math.random() * 2 - 0.5,
                15 + Math.floor(Math.random() * 10),
                25,
                Math.random() < 0.5 ? "#ff4500" : "#ff8c00",
              );
            }
          }
          // Gas pocket drift: pulsing cloud overlay
          if (t2 === T.GAS_POCKET) {
            const gasAlpha = 0.12 + 0.06 * Math.sin(frame * 0.05 + tx2 * 0.4);
            const gasR = TILE * 0.6 + 3 * Math.sin(frame * 0.04 + ty2 * 0.3);
            ctx.beginPath();
            ctx.arc(sx2 + TILE / 2, sy2 + TILE / 2, gasR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(100,255,100,${gasAlpha.toFixed(3)})`;
            ctx.fill();
          }
          // Crystal shimmer: sparkle on crystal tiles
          if (
            (t2 === T.CRYSTAL_WALL || t2 === T.BOB_CRYSTAL) &&
            Math.random() < 0.015
          ) {
            const sparkX = sx2 + Math.random() * TILE;
            const sparkY = sy2 + Math.random() * TILE;
            ctx.save();
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.fillRect(sparkX - 1, sparkY - 3, 2, 6);
            ctx.fillRect(sparkX - 3, sparkY - 1, 6, 2);
            ctx.restore();
          }
        }
      }
    }

    // Shop building on surface
    const shopWorldX = SHOP_X * TILE - camX;
    const shopWorldY = SHOP_Y * TILE - camY;
    drawShopBuilding(ctx, shopWorldX, shopWorldY, frame);

    // Airdrop crate on surface
    if (airdropCrateRef.current && !airdropCrateRef.current.collected) {
      const crate = airdropCrateRef.current;
      const cx2 = crate.x - camX;
      const cy2 = 4 * TILE - camY - TILE; // sits on surface ground row
      // Draw crate only if on screen
      if (
        cx2 > -TILE * 2 &&
        cx2 < cw + TILE * 2 &&
        cy2 > -TILE * 2 &&
        cy2 < ch + TILE * 2
      ) {
        const pulse = 0.6 + 0.4 * Math.sin(frame * 0.12);
        // Crate body
        ctx.fillStyle = "#d97706";
        ctx.fillRect(cx2, cy2, TILE, TILE);
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.strokeRect(cx2, cy2, TILE, TILE);
        // Cross straps
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx2 + TILE / 2, cy2);
        ctx.lineTo(cx2 + TILE / 2, cy2 + TILE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx2, cy2 + TILE / 2);
        ctx.lineTo(cx2 + TILE, cy2 + TILE / 2);
        ctx.stroke();
        // BOB label
        ctx.fillStyle = "#000";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("BOB", cx2 + TILE / 2, cy2 + TILE / 2 + 3);
        ctx.textAlign = "left";
        // Parachute lines
        ctx.strokeStyle = `rgba(255,220,0,${pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx2 + 6, cy2);
        ctx.lineTo(cx2 + TILE / 2 - 8, cy2 - 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx2 + TILE - 6, cy2);
        ctx.lineTo(cx2 + TILE / 2 + 8, cy2 - 16);
        ctx.stroke();
        // Parachute canopy
        ctx.beginPath();
        ctx.arc(cx2 + TILE / 2, cy2 - 20, 14, Math.PI, 0);
        ctx.fillStyle = `rgba(255,220,50,${pulse * 0.7})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,220,0,${pulse})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Timer label above
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#fbbf24";
        ctx.fillText(`${crate.timer}s`, cx2 + TILE / 2, cy2 - 38);
        ctx.shadowBlur = 0;
        ctx.textAlign = "left";
      }
    }

    // Drill progress overlay
    if (p.drilling) {
      const d = p.drilling;
      const sx = d.tile.tx * TILE - camX;
      const sy2 = d.tile.ty * TILE - camY;
      const pct =
        d.progress /
        (DRILL_BASE_TIME * getTileHardness(getTile(d.tile.tx, d.tile.ty)));
      ctx.fillStyle = `rgba(255,200,50,${0.3 + pct * 0.5})`;
      ctx.fillRect(sx, sy2, TILE * pct, TILE);
    }

    // Particles — use pool (alive flag); skip every other in low FPS mode
    {
      const parts = particlesRef.current;
      const lowFps = lowFpsModeRef.current;
      for (let pi = 0; pi < parts.length; pi++) {
        const pt = parts[pi];
        if (!pt.alive) continue;
        if (lowFps && pi % 2 === 1) continue; // skip half in low fps
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.3;
        pt.life--;
        if (pt.life <= 0) {
          pt.alive = false;
        } else {
          const alpha = pt.life / pt.maxLife;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = pt.color;
          ctx.fillRect(pt.x - camX, pt.y - camY, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    }

    // Floating pickup texts — in-place swap
    ctx.save();
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    {
      const fts = floatingTextsRef.current;
      let ftAlive = 0;
      for (let fi = 0; fi < fts.length; fi++) {
        const ft = fts[fi];
        ft.dy -= 0.5;
        ft.alpha -= 0.015;
        if (ft.alpha > 0) {
          fts[ftAlive++] = ft;
          const sx2 = ft.x - camX;
          const sy2 = ft.y - camY + ft.dy;
          ctx.globalAlpha = ft.alpha;
          ctx.strokeStyle = "rgba(0,0,0,0.9)";
          ctx.lineWidth = 3;
          ctx.strokeText(ft.text, sx2, sy2);
          ctx.fillStyle = ft.color ?? "#fde047";
          ctx.lineWidth = 1;
          ctx.fillText(ft.text, sx2, sy2);
        }
      }
      ctx.globalAlpha = 1;
      fts.length = ftAlive;
    }
    ctx.restore();

    // Boss announcement overlay (Head Fudder)
    if (bossAnnouncementRef.current) {
      const ba = bossAnnouncementRef.current;
      ba.frames++;
      // Fade in 0-15 frames, hold 15-90 frames, fade out 90-105 frames
      if (ba.frames < 15) ba.alpha = ba.frames / 15;
      else if (ba.frames < 90) ba.alpha = 1;
      else if (ba.frames < 105) ba.alpha = 1 - (ba.frames - 90) / 15;
      else {
        bossAnnouncementRef.current = null;
        ba.alpha = 0;
      }
      if (ba.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = ba.alpha * 0.55;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = ba.alpha;
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 20;
        ctx.fillText("⚠ HEAD FUDDER DETECTED", cw / 2, ch / 2);
        ctx.shadowBlur = 0;
        ctx.font = "14px monospace";
        ctx.fillStyle = "#ff8888";
        ctx.fillText("BOSS ENCOUNTER IMMINENT", cw / 2, ch / 2 + 36);
        ctx.restore();
      }
    }

    // Hit flash overlay
    if (hitFlashRef.current > 0) {
      hitFlashRef.current--;
      const flashAlphaVal = hitFlashRef.current * 0.02;
      const [fr, fg, fb] = flashColorRGBRef.current;
      ctx.fillStyle = `rgba(${fr},${fg},${fb},${flashAlphaVal.toFixed(2)})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Low hull persistent pulsing red vignette (<20% hull)
    {
      const p2 = playerRef.current;
      const hullPct = p2.stats.hull / p2.stats.maxHull;
      if (hullPct < 0.2 && p2.stats.hull > 0) {
        const pulse = 0.06 + 0.06 * Math.sin(frameRef.current * 0.15);
        if (
          !vignetteGradRef.current.grad ||
          vignetteGradRef.current.cw !== cw ||
          vignetteGradRef.current.ch !== ch
        ) {
          const g = ctx.createRadialGradient(
            cw / 2,
            ch / 2,
            ch * 0.3,
            cw / 2,
            ch / 2,
            ch * 0.8,
          );
          g.addColorStop(0, "rgba(200,0,0,0)");
          g.addColorStop(1, "rgba(200,0,0,1)");
          vignetteGradRef.current = { grad: g, cw, ch };
        }
        ctx.globalAlpha = pulse;
        ctx.fillStyle = vignetteGradRef.current.grad!;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalAlpha = 1;
      }
    }

    // Detailed vehicle
    const pw = TILE - 4;
    const ph = TILE - 2;
    const px = p.x - camX;
    const py = p.y - camY;
    const isDrilling = !!p.drilling;
    const drillDx = p.drilling?.dx ?? 0;
    const drillDy = p.drilling?.dy ?? 0;
    drawDetailedVehicle(
      ctx,
      px,
      py,
      p.facingRight,
      isDrilling,
      drillDx,
      drillDy,
      frame,
      {
        drillLevel: p.stats.drillLevel,
        hullLevel: p.stats.hullLevel,
        engineLevel: p.stats.engineLevel,
        fuelLevel: p.stats.fuelLevel,
        shieldLevel: p.stats.shieldLevel,
      },
      drillSurgeTimerRef.current > 0,
    );
    // Vehicle skin tint overlay
    {
      const skin = vehicleSkinRef.current;
      if (skin === "gold") {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(255,215,0,0.35)";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.restore();
      } else if (skin === "veteran") {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(180,0,0,0.30)";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.restore();
        // Extra red exhaust glow
        ctx.save();
        ctx.shadowColor = "#ff2200";
        ctx.shadowBlur = 8;
        ctx.fillStyle = "rgba(255,34,0,0.15)";
        ctx.fillRect(px, py + TILE - 12, TILE, 8);
        ctx.restore();
      } else if (skin === "speed_demon") {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(0,230,255,0.12)";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.restore();
        // Cyan speed lines
        ctx.save();
        ctx.strokeStyle = "rgba(0,230,255,0.5)";
        ctx.lineWidth = 1;
        for (let li = 0; li < 3; li++) {
          ctx.beginPath();
          ctx.moveTo(px - 8, py + 8 + li * 10);
          ctx.lineTo(px + 2, py + 8 + li * 10);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    // Silence unused warning
    void pw;
    void ph;

    // Lore Room proximity prompt
    if (!autoAscentRef.current) {
      const tpx = Math.floor(p.x / TILE);
      const tpy = Math.floor(p.y / TILE);
      let nearLoreRoom = false;
      outer: for (let dy2 = -2; dy2 <= 2; dy2++) {
        for (let dx2 = -2; dx2 <= 2; dx2++) {
          const tx3 = tpx + dx2;
          const ty3 = tpy + dy2;
          if (tx3 >= 0 && tx3 < MAP_W && ty3 >= 0 && ty3 < MAP_H) {
            if (mapRef.current[ty3 * MAP_W + tx3] === T.LORE_ROOM) {
              nearLoreRoom = true;
              break outer;
            }
          }
        }
      }
      if (nearLoreRoom) {
        const lorePromptX = px + TILE / 2;
        const lorePromptY = py - 12;
        ctx.save();
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        const loreText = "↓ Lore Chamber";
        const tw2 = ctx.measureText(loreText).width;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(lorePromptX - tw2 / 2 - 4, lorePromptY - 13, tw2 + 8, 16);
        ctx.fillStyle = "#ffcc44";
        ctx.fillText(loreText, lorePromptX, lorePromptY);
        ctx.restore();
      }
    }

    // Falling rocks rendering
    for (const rock of fallingRocksRef.current) {
      if (!rock.active) continue;
      const rx = rock.x - camX;
      const ry = rock.y - camY;
      ctx.fillStyle = "#6b7280";
      ctx.fillRect(rx - 6, ry - 6, 12, 12);
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(rx - 5, ry - 5, 5, 5);
      ctx.fillRect(rx + 2, ry + 2, 4, 4);
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(rx - 4, ry - 4, 3, 2);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(rx - 5, ry + 5, 12, 3);
    }

    // Antagonist rendering — unique pixel art sprites
    for (const a of antagonistsRef.current) {
      const ax = a.x - camX;
      const hopY = Math.sin(frame * 0.35 + a.x * 0.1) * Math.abs(a.vx) * 2.5;
      const ay = a.y - camY - hopY;
      const blink = frame % 20 < 10;

      if (a.type === "fudder") {
        // Hunched troll — dark purple, grey cloak, red eyes, FUD sign
        ctx.fillStyle = "#2d1b4e";
        ctx.fillRect(ax - 5, ay - 6, 10, 10);
        ctx.fillStyle = "#7c6a8a"; // grey cloak
        ctx.fillRect(ax - 6, ay - 10, 12, 6);
        ctx.fillStyle = "#4a3568"; // hood
        ctx.fillRect(ax - 4, ay - 14, 8, 6);
        ctx.fillStyle = "#1a0a2e";
        ctx.fillRect(ax - 3, ay - 13, 6, 4);
        ctx.fillStyle = blink ? "#ff1111" : "#cc0000"; // glowing eyes
        ctx.fillRect(ax - 2, ay - 12, 1, 1);
        ctx.fillRect(ax + 1, ay - 12, 1, 1);
        ctx.fillStyle = "#c8b400"; // FUD sign
        ctx.fillRect(ax + 3, ay - 8, 5, 4);
        ctx.fillStyle = "#2d1b4e";
        ctx.fillRect(ax + 4, ay - 7, 1, 1);
        ctx.fillRect(ax + 5, ay - 7, 1, 1);
        ctx.fillRect(ax + 6, ay - 7, 1, 1);
        ctx.fillStyle = "#2d1b4e"; // legs
        ctx.fillRect(ax - 4, ay + 4, 3, 3);
        ctx.fillRect(ax + 1, ay + 4, 3, 3);
      } else if (a.type === "sec_agent") {
        // Suited figure — dark grey suit, gold badge, sunglasses
        ctx.fillStyle = "#2d2d3d"; // suit body
        ctx.fillRect(ax - 5, ay - 8, 10, 12);
        ctx.fillStyle = "#f0f0f0"; // white shirt
        ctx.fillRect(ax - 1, ay - 7, 2, 6);
        ctx.fillStyle = "#ffd700"; // gold badge
        ctx.fillRect(ax - 4, ay - 5, 3, 2);
        ctx.fillStyle = "#1a1a2e"; // tie
        ctx.fillRect(ax - 1, ay - 4, 2, 8);
        ctx.fillStyle = "#f4c084"; // face
        ctx.fillRect(ax - 4, ay - 15, 8, 7);
        ctx.fillStyle = "#2d2d3d"; // hair
        ctx.fillRect(ax - 4, ay - 16, 8, 2);
        ctx.fillStyle = "#111"; // eyes
        ctx.fillRect(ax - 2, ay - 12, 2, 2);
        ctx.fillRect(ax + 1, ay - 12, 2, 2);
        if (!blink) {
          // sunglasses
          ctx.fillStyle = "#111111";
          ctx.fillRect(ax - 3, ay - 12, 3, 2);
          ctx.fillRect(ax + 1, ay - 12, 3, 2);
          ctx.fillRect(ax - 1, ay - 12, 2, 1);
        }
        ctx.fillStyle = "#2d2d3d"; // brows
        ctx.fillRect(ax - 3, ay - 14, 2, 1);
        ctx.fillRect(ax + 1, ay - 14, 2, 1);
        ctx.fillStyle = "#2d2d3d"; // legs
        ctx.fillRect(ax - 4, ay + 4, 4, 4);
        ctx.fillRect(ax + 1, ay + 4, 4, 4);
      } else if (a.type === "btc_maxi") {
        // Stocky orange figure, ₿ on chest, angry brows
        ctx.fillStyle = "#c05000";
        ctx.fillRect(ax - 6, ay - 8, 12, 12);
        ctx.fillStyle = "#ff8c00";
        ctx.fillRect(ax - 5, ay - 7, 10, 9);
        ctx.fillStyle = "#cc6600"; // ₿ circle
        ctx.fillRect(ax - 2, ay - 5, 5, 5);
        ctx.fillStyle = "#ffaa00";
        ctx.fillRect(ax - 1, ay - 4, 3, 1);
        ctx.fillRect(ax - 1, ay - 2, 3, 1);
        ctx.fillRect(ax - 1, ay - 4, 1, 3);
        ctx.fillStyle = "#fcd9a8"; // face
        ctx.fillRect(ax - 4, ay - 16, 8, 8);
        ctx.fillStyle = "#5a3010"; // hair
        ctx.fillRect(ax - 4, ay - 16, 8, 2);
        ctx.fillStyle = "#330000"; // eyes
        ctx.fillRect(ax - 2, ay - 12, 2, 2);
        ctx.fillRect(ax + 1, ay - 12, 2, 2);
        ctx.fillStyle = "#ff4400"; // angry brows
        ctx.fillRect(ax - 3, ay - 14, 2, 1);
        ctx.fillRect(ax + 2, ay - 14, 2, 1);
        if (blink) {
          // throwing arm
          ctx.fillStyle = "#ff8c00";
          ctx.fillRect(ax + 6, ay - 10, 3, 2);
          ctx.fillRect(ax + 8, ay - 12, 2, 3);
        }
        ctx.fillStyle = "#c05000"; // legs
        ctx.fillRect(ax - 5, ay + 4, 5, 4);
        ctx.fillRect(ax + 1, ay + 4, 5, 4);
      } else if (a.type === "rug_puller") {
        // Sneaky hooded figure, one visible eye, sack of stolen ores
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(ax - 5, ay - 8, 10, 12);
        ctx.fillStyle = "#252525"; // cloak
        ctx.fillRect(ax - 6, ay - 12, 12, 10);
        ctx.fillStyle = "#111111"; // deep hood
        ctx.fillRect(ax - 4, ay - 15, 8, 8);
        ctx.fillStyle = "#0a0a0a"; // shadow face
        ctx.fillRect(ax - 3, ay - 14, 6, 6);
        ctx.fillStyle = blink ? "#ffdd00" : "#cc9900"; // one eye
        ctx.fillRect(ax, ay - 11, 2, 2);
        ctx.fillStyle = "#8b6914"; // ore sack
        ctx.fillRect(ax + 3, ay - 4, 6, 6);
        ctx.fillStyle = "#6b5010";
        ctx.fillRect(ax + 4, ay - 5, 4, 2);
        ctx.fillStyle = "#fbbf24"; // ore dots
        ctx.fillRect(ax + 4, ay - 2, 1, 1);
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(ax + 6, ay - 2, 1, 1);
        ctx.fillStyle = "#c084fc";
        ctx.fillRect(ax + 5, ay - 1, 1, 1);
        ctx.fillStyle = "#1a1a1a"; // legs
        ctx.fillRect(ax - 4, ay + 4, 3, 3);
        ctx.fillRect(ax + 1, ay + 4, 3, 3);
      } else if (a.type === "whale_dumper") {
        // Large blue whale, coins falling
        ctx.fillStyle = "#1a4a8a";
        ctx.fillRect(ax - 8, ay - 10, 16, 14);
        ctx.fillStyle = "#2060aa"; // lighter belly
        ctx.fillRect(ax - 6, ay - 5, 12, 8);
        ctx.fillStyle = "#1a4a8a"; // tail fins
        ctx.fillRect(ax - 10, ay, 4, 6);
        ctx.fillRect(ax + 6, ay, 4, 6);
        ctx.fillRect(ax - 8, ay + 5, 16, 3);
        ctx.fillStyle = "#ffffff"; // eye white
        ctx.fillRect(ax - 5, ay - 7, 4, 3);
        ctx.fillStyle = "#1a1a66"; // pupil
        ctx.fillRect(ax - 4, ay - 6, 2, 2);
        ctx.fillStyle = "#ffffff"; // shine
        ctx.fillRect(ax - 3, ay - 6, 1, 1);
        // Falling coins animation
        const coinY = blink ? 6 : 8;
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(ax - 2, ay + coinY, 2, 2);
        ctx.fillRect(ax + 3, ay + coinY + 2, 2, 2);
        ctx.fillRect(ax - 5, ay + coinY - 2, 2, 2);
        // HP bar
        ctx.fillStyle = "#333";
        ctx.fillRect(ax - 10, ay - 16, 20, 3);
        ctx.fillStyle = "#4488ff";
        ctx.fillRect(ax - 10, ay - 16, 20 * (a.hp / 2), 3);
      } else if (a.type === "whale_dumper_jr") {
        // Small blue whale jr
        ctx.fillStyle = "#2266aa";
        ctx.fillRect(ax - 5, ay - 6, 10, 9);
        ctx.fillStyle = "#3377bb"; // belly
        ctx.fillRect(ax - 3, ay - 3, 6, 5);
        ctx.fillStyle = "#2266aa"; // tail
        ctx.fillRect(ax - 7, ay + 2, 3, 4);
        ctx.fillRect(ax + 4, ay + 2, 3, 4);
        ctx.fillStyle = "#ffffff"; // eye
        ctx.fillRect(ax - 3, ay - 4, 2, 2);
        ctx.fillStyle = "#000"; // pupil
        ctx.fillRect(ax - 3, ay - 4, 1, 1);
        // Small falling coin
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(ax, ay + (blink ? 8 : 10), 2, 2);
        // HP bar
        ctx.fillStyle = "#333";
        ctx.fillRect(ax - 7, ay - 12, 14, 2);
        ctx.fillStyle = "#4488ff";
        ctx.fillRect(ax - 7, ay - 12, 14 * (a.hp / 2), 2);
      } else if (a.type === "nns_voter") {
        // NNS Voter — floating ballot box with arms, royal blue
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(ax - 8, ay - 12, 16, 14); // ballot box body
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(ax - 6, ay - 10, 12, 10); // lighter front face
        ctx.fillStyle = "#1d4ed8";
        ctx.fillRect(ax - 8, ay - 14, 16, 4); // lid
        // Ballot slot
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(ax - 4, ay - 13, 8, 2);
        // Ballot paper sticking out
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(ax - 2, ay - 15, 4, 4);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(ax - 1, ay - 14, 3, 1);
        ctx.fillRect(ax - 1, ay - 12, 3, 1);
        // Arms
        ctx.fillStyle = "#2563eb";
        ctx.fillRect(ax - 12, ay - 8, 6, 3); // left arm
        ctx.fillRect(ax + 6, ay - 8, 6, 3); // right arm
        // Tiny fists
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(ax - 13, ay - 9, 3, 4);
        ctx.fillRect(ax + 11, ay - 9, 3, 4);
        // X symbol on box face
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(ax - 3, ay - 8, 2, 2);
        ctx.fillRect(ax + 1, ay - 8, 2, 2);
        ctx.fillRect(ax - 3, ay - 5, 2, 2);
        ctx.fillRect(ax + 1, ay - 5, 2, 2);
        // Checkmark (denied)
        ctx.fillStyle = blink ? "#fbbf24" : "#f59e0b";
        ctx.fillRect(ax - 1, ay - 7, 2, 6);
        // Glow
        ctx.shadowBlur = blink ? 8 : 4;
        ctx.shadowColor = "#3b82f6";
        ctx.fillStyle = "rgba(59,130,246,0.2)";
        ctx.fillRect(ax - 10, ay - 16, 20, 20);
        ctx.shadowBlur = 0;
      } else if (a.type === "protocol_skeptic") {
        // Pixel art figure in grey suit, red tie, arms crossed, skeptical expression
        const skeptBob = blink ? 1 : 0;
        ctx.fillStyle = "#666677";
        ctx.fillRect(ax - 9, ay - 8 + skeptBob, 18, 14);
        ctx.fillStyle = "#888899";
        ctx.fillRect(ax - 5, ay - 8 + skeptBob, 3, 8);
        ctx.fillRect(ax + 2, ay - 8 + skeptBob, 3, 8);
        ctx.fillStyle = "#cc2222"; // red tie
        ctx.fillRect(ax - 1, ay - 8 + skeptBob, 2, 10);
        ctx.fillStyle = "#f0c080"; // head
        ctx.fillRect(ax - 6, ay - 18 + skeptBob, 12, 12);
        ctx.fillStyle = "#333"; // skeptical narrow eyes
        ctx.fillRect(ax - 4, ay - 14 + skeptBob, 4, 1);
        ctx.fillRect(ax + 1, ay - 14 + skeptBob, 4, 1);
        ctx.fillRect(ax - 3, ay - 8 + skeptBob, 6, 1); // frown
        ctx.fillStyle = "#666677"; // arms crossed
        ctx.fillRect(ax - 12, ay - 5 + skeptBob, 8, 3);
        ctx.fillRect(ax + 4, ay - 5 + skeptBob, 8, 3);
        ctx.fillRect(ax - 6, ay - 7 + skeptBob, 12, 3);
        ctx.fillStyle = "#555566"; // legs
        ctx.fillRect(ax - 5, ay + 6 + skeptBob, 4, 5);
        ctx.fillRect(ax + 1, ay + 6 + skeptBob, 4, 5);
        ctx.shadowBlur = blink ? 8 : 4;
        ctx.shadowColor = "#9999aa";
        ctx.shadowBlur = 0;
      } else if (a.type === "yield_farmer") {
        // Pixel art farmer in green/yellow overalls with pitchfork
        const farmBob = blink ? 1 : 0;
        ctx.fillStyle = "#2d7a2d"; // overalls
        ctx.fillRect(ax - 8, ay - 8 + farmBob, 16, 14);
        ctx.fillStyle = "#ffd700"; // straps
        ctx.fillRect(ax - 4, ay - 8 + farmBob, 2, 14);
        ctx.fillRect(ax + 2, ay - 8 + farmBob, 2, 14);
        ctx.fillStyle = "#f0c080"; // head
        ctx.fillRect(ax - 5, ay - 18 + farmBob, 10, 10);
        ctx.fillStyle = "#c8a020"; // straw hat brim
        ctx.fillRect(ax - 8, ay - 22 + farmBob, 16, 3);
        ctx.fillRect(ax - 5, ay - 25 + farmBob, 10, 4); // hat top
        ctx.fillStyle = "#333"; // eyes
        ctx.fillRect(ax - 3, ay - 14 + farmBob, 2, 2);
        ctx.fillRect(ax + 1, ay - 14 + farmBob, 2, 2);
        ctx.fillRect(ax - 2, ay - 10 + farmBob, 4, 1); // smile
        ctx.fillStyle = "#8B6914"; // pitchfork handle
        ctx.fillRect(ax + 8, ay - 20 + farmBob, 2, 28);
        ctx.fillStyle = "#aaaaaa"; // pitchfork tines
        ctx.fillRect(ax + 6, ay - 22 + farmBob, 2, 5);
        ctx.fillRect(ax + 10, ay - 22 + farmBob, 2, 5);
        ctx.fillRect(ax + 8, ay - 22 + farmBob, 6, 2);
        ctx.fillStyle = "#2d7a2d"; // arms
        ctx.fillRect(ax - 12, ay - 5 + farmBob, 4, 4);
        ctx.fillRect(ax + 8, ay - 5 + farmBob, 4, 4);
        ctx.shadowBlur = blink ? 10 : 5;
        ctx.shadowColor = "#4ade80";
        ctx.shadowBlur = 0;
      } else if (a.type === "exchange_hacker") {
        // Hacker in dark hoodie with glowing laptop — invisible until revealed
        const hackerAlpha = a.revealed ? 1.0 : 0.0;
        ctx.globalAlpha = hackerAlpha;
        const hackBob = blink ? 1 : 0;
        ctx.fillStyle = "#2a0a4a"; // hoodie body
        ctx.fillRect(ax - 9, ay - 8 + hackBob, 18, 14);
        ctx.fillStyle = "#3d0f6e";
        ctx.fillRect(ax - 6, ay - 8 + hackBob, 12, 12);
        ctx.fillStyle = "#2a0a4a"; // hood
        ctx.fillRect(ax - 8, ay - 20 + hackBob, 16, 14);
        ctx.fillStyle = "#1a0535";
        ctx.fillRect(ax - 5, ay - 18 + hackBob, 10, 10);
        ctx.fillStyle = blink ? "#00ff88" : "#00cc66"; // glowing eyes
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#00ff88";
        ctx.fillRect(ax - 3, ay - 14 + hackBob, 2, 2);
        ctx.fillRect(ax + 1, ay - 14 + hackBob, 2, 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#1a0535"; // laptop
        ctx.fillRect(ax - 10, ay - 2 + hackBob, 10, 7);
        ctx.fillStyle = "#00ff88";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00ff88";
        ctx.fillRect(ax - 9, ay - 1 + hackBob, 8, 5);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#2a0a4a"; // arms
        ctx.fillRect(ax - 14, ay - 5 + hackBob, 5, 4);
        ctx.fillRect(ax + 9, ay - 5 + hackBob, 5, 4);
        ctx.fillStyle = "#1a0535"; // legs
        ctx.fillRect(ax - 5, ay + 6 + hackBob, 4, 5);
        ctx.fillRect(ax + 1, ay + 6 + hackBob, 4, 5);
        ctx.shadowBlur = blink ? 14 : 7;
        ctx.shadowColor = "#7c3aed";
        ctx.fillStyle = "rgba(124,58,237,0.15)";
        ctx.fillRect(ax - 12, ay - 22, 24, 32);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      } else if (a.type === "governance_troll") {
        // Squat green troll with governance badge
        const trollBob = blink ? 1 : 0;
        // Body - dark green squat
        ctx.fillStyle = "#1a5e1a";
        ctx.fillRect(ax - 8, ay - 8 + trollBob, 16, 14);
        ctx.fillStyle = "#2e8b2e"; // lighter green belly
        ctx.fillRect(ax - 5, ay - 4 + trollBob, 10, 8);
        // Head - big green blob
        ctx.fillStyle = "#1a5e1a";
        ctx.fillRect(ax - 7, ay - 18 + trollBob, 14, 12);
        // Huge grin
        ctx.fillStyle = "#0a2e0a";
        ctx.fillRect(ax - 5, ay - 8 + trollBob, 10, 3);
        ctx.fillStyle = "#ffffff"; // teeth
        ctx.fillRect(ax - 4, ay - 8 + trollBob, 2, 2);
        ctx.fillRect(ax - 1, ay - 8 + trollBob, 2, 2);
        ctx.fillRect(ax + 2, ay - 8 + trollBob, 2, 2);
        // Eyes - beady yellow
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(ax - 5, ay - 15 + trollBob, 3, 3);
        ctx.fillRect(ax + 2, ay - 15 + trollBob, 3, 3);
        ctx.fillStyle = "#000";
        ctx.fillRect(ax - 4, ay - 14 + trollBob, 1, 1);
        ctx.fillRect(ax + 3, ay - 14 + trollBob, 1, 1);
        // Tiny governance badge (cyan/blue)
        ctx.fillStyle = "#0ea5e9";
        ctx.fillRect(ax - 3, ay - 5 + trollBob, 6, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ax - 2, ay - 4 + trollBob, 2, 1);
        ctx.fillRect(ax + 1, ay - 4 + trollBob, 2, 1);
        // Arms waving
        ctx.fillStyle = "#1a5e1a";
        ctx.fillRect(ax - 12, ay - 6 + trollBob, 5, 3);
        ctx.fillRect(ax + 7, ay - 6 + trollBob, 5, 3);
        // Stubby legs
        ctx.fillStyle = "#0a2e0a";
        ctx.fillRect(ax - 5, ay + 5 + trollBob, 4, 4);
        ctx.fillRect(ax + 1, ay + 5 + trollBob, 4, 4);
        // Green glow
        ctx.shadowBlur = blink ? 10 : 5;
        ctx.shadowColor = "#22c55e";
        ctx.fillStyle = "rgba(34,197,94,0.1)";
        ctx.fillRect(ax - 12, ay - 20, 24, 30);
        ctx.shadowBlur = 0;
      } else if (a.type === "head_fudder") {
        // Boss — red/black, crown spikes, glowing eyes, wide stance
        const maxHp = 5;
        ctx.fillStyle = "#8b0000"; // dark red body
        ctx.fillRect(ax - 8, ay - 8, 16, 16);
        ctx.fillStyle = "#cc0000";
        ctx.fillRect(ax - 6, ay - 6, 12, 12);
        ctx.fillStyle = "#000000"; // black stripes
        ctx.fillRect(ax - 6, ay - 4, 12, 2);
        ctx.fillRect(ax - 6, ay, 12, 2);
        ctx.fillStyle = "#ffd700"; // crown spikes
        ctx.fillRect(ax - 8, ay - 16, 3, 8);
        ctx.fillRect(ax - 2, ay - 20, 4, 12);
        ctx.fillRect(ax + 5, ay - 16, 3, 8);
        ctx.fillStyle = "#cc9900"; // crown base
        ctx.fillRect(ax - 7, ay - 10, 14, 2);
        ctx.fillStyle = "#2a0000"; // head
        ctx.fillRect(ax - 7, ay - 18, 14, 12);
        ctx.fillStyle = blink ? "#ffffff" : "#dddddd"; // big glowing eyes
        ctx.fillRect(ax - 5, ay - 15, 4, 4);
        ctx.fillRect(ax + 1, ay - 15, 4, 4);
        ctx.fillStyle = "#000"; // pupils
        ctx.fillRect(ax - 4, ay - 14, 2, 2);
        ctx.fillRect(ax + 2, ay - 14, 2, 2);
        ctx.shadowBlur = blink ? 10 : 5; // glow
        ctx.shadowColor = "#ff0000";
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(ax - 4, ay - 14, 1, 1);
        ctx.fillRect(ax + 3, ay - 14, 1, 1);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#660000"; // wide stance legs
        ctx.fillRect(ax - 8, ay + 8, 7, 6);
        ctx.fillRect(ax + 1, ay + 8, 7, 6);
        // Always-visible HP bar
        ctx.fillStyle = "#330000";
        ctx.fillRect(ax - 10, ay - 26, 20, 4);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(ax - 10, ay - 26, 20 * (a.hp / maxHp), 4);
      }

      // Red tint overlay when antagonist is charging
      if (a.isCharging && a.type !== "head_fudder") {
        const chargeAgeDraw = performance.now() - (a.chargeStartTime ?? 0);
        const chargePct = Math.min(1, chargeAgeDraw / 500);
        const pulseA = 0.25 + 0.2 * Math.sin(performance.now() * 0.025);
        ctx.save();
        ctx.globalAlpha = pulseA + chargePct * 0.2;
        ctx.fillStyle = "rgba(255, 30, 30, 0.6)";
        ctx.fillRect(ax - 14, ay - 22, 28, 30);
        ctx.restore();
      }

      // Speech bubble from message timer
      if (a.messageTimer > 0 && a.message) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, a.messageTimer / 30);
        ctx.fillStyle = "rgba(0,0,0,0.88)";
        const bw = Math.min(130, a.message.length * 5 + 12);
        ctx.fillRect(ax - bw / 2, ay - 44, bw, 14);
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(a.message.substring(0, 24), ax, ay - 33);
        ctx.restore();
      }

      // Ambient speech bubbles from pool
      {
        const speechMap = antagonistSpeechRef.current;
        if (frame % 180 === 0 || !speechMap.has(a.id)) {
          const pool = SPEECH_POOLS[a.type] || ["..."];
          const idx2 = Math.floor(frame / 180) % pool.length;
          speechMap.set(a.id, { text: pool[idx2], timer: 180 });
        }
        const bubble = speechMap.get(a.id);
        if (bubble) {
          const bw2 = bubble.text.length * 4 + 8;
          const bubbleY = Math.max(80, ay - 28); // keep below HUD (80px safe zone)
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.85)";
          ctx.fillRect(ax - bw2 / 2, bubbleY, bw2, 12);
          ctx.fillStyle = "#ffdd88";
          ctx.font = "6px monospace";
          ctx.textAlign = "center";
          ctx.fillText(bubble.text, ax, bubbleY + 9);
          ctx.textAlign = "left";
          ctx.restore();
        }
      }
    }

    // Underground NPC rendering
    {
      const frame7 = frameRef.current;
      for (const npc of undergroundNpcsRef.current) {
        if (npc.encountered) continue;
        const nx = npc.x - camX;
        const ny = npc.y - camY;
        if (nx < -40 || nx > cw + 40 || ny < -60 || ny > ch + 40) continue;
        const bobY = Math.round(Math.sin(frame7 * 0.05 + npc.x * 0.01) * 2);
        // Glow aura
        ctx.save();
        ctx.beginPath();
        ctx.arc(nx + 8, ny + 8 + bobY, 14, 0, Math.PI * 2);
        ctx.shadowBlur = 20;
        ctx.shadowColor = npc.color;
        ctx.fillStyle = `${npc.color}33`;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        // Humanoid body
        const bodyColor = npc.color;
        const skinColor = "#f4c084";
        // Head
        ctx.fillStyle = skinColor;
        ctx.fillRect(nx + 4, ny - 10 + bobY, 8, 8);
        // Eyes
        const blink7 = frame7 % 80 < 4;
        ctx.fillStyle = "#222";
        if (!blink7) {
          ctx.fillRect(nx + 5, ny - 8 + bobY, 2, 2);
          ctx.fillRect(nx + 9, ny - 8 + bobY, 2, 2);
        } else {
          ctx.fillRect(nx + 5, ny - 7 + bobY, 2, 1);
          ctx.fillRect(nx + 9, ny - 7 + bobY, 2, 1);
        }
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(nx + 2, ny - 2 + bobY, 12, 10);
        // Arms
        ctx.fillRect(nx - 2, ny - 1 + bobY, 4, 7);
        ctx.fillRect(nx + 14, ny - 1 + bobY, 4, 7);
        // Legs
        ctx.fillStyle = bodyColor;
        ctx.fillRect(nx + 3, ny + 8 + bobY, 4, 5);
        ctx.fillRect(nx + 9, ny + 8 + bobY, 4, 5);
        // Name tag
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        const nameWidth = npc.name.length * 4.5 + 8;
        ctx.fillRect(nx + 8 - nameWidth / 2, ny - 24 + bobY, nameWidth, 10);
        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, nx + 8, ny - 16 + bobY);
        // Exclamation bubble
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.arc(nx + 16, ny - 18 + bobY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1a1a";
        ctx.font = "bold 7px monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", nx + 16, ny - 14 + bobY);
      }
    }

    // Depth zone label
    const zl = zoneLabelRef.current;
    if (zl.frames > 0) {
      zl.frames--;
      const alpha = Math.min(1, zl.frames / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#f5a623";
      ctx.fillText(zl.label, cw / 2, ch / 2 - 40);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Lava surge visual — rising lava line
    if (lavaSurgeRef.current && lavaSurgeYRef.current > 0) {
      const surgeScreenY = lavaSurgeYRef.current * TILE - camY;
      const surgeAlpha = 0.4 + 0.2 * Math.sin(frameRef.current * 0.1);
      ctx.save();
      ctx.globalAlpha = surgeAlpha;
      const lavaGrad = ctx.createLinearGradient(
        0,
        surgeScreenY,
        0,
        surgeScreenY + 24,
      );
      lavaGrad.addColorStop(0, "#ff4500");
      lavaGrad.addColorStop(1, "rgba(255,69,0,0)");
      ctx.fillStyle = lavaGrad;
      ctx.fillRect(0, surgeScreenY, cw, 24);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Gas cloud visual — expanding green aura around player when in gas
    if (gasWarnRef.current) {
      const gasFrame2 = gasWarningFrameRef.current ?? frameRef.current;
      const gasAge = frameRef.current - gasFrame2;
      const gasRadius = 12 + Math.sin(gasAge * 0.15) * 6;
      const px3 = p.x - camX + TILE / 2;
      const py3 = p.y - camY + TILE / 2;
      ctx.save();
      const gasGrad = ctx.createRadialGradient(
        px3,
        py3,
        0,
        px3,
        py3,
        gasRadius + 20,
      );
      gasGrad.addColorStop(0, "rgba(0,200,0,0.35)");
      gasGrad.addColorStop(1, "rgba(0,200,0,0)");
      ctx.fillStyle = gasGrad;
      ctx.beginPath();
      ctx.arc(px3, py3, gasRadius + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cave-in warning overlay
    if (caveInWarningRef.current && caveInWarningFramesRef.current > 0) {
      const flashAlpha = frameRef.current % 20 < 10 ? 0.25 : 0;
      ctx.save();
      ctx.fillStyle = `rgba(220,0,0,${flashAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    // Minimap rendered in cockpit HUD canvas — nothing to draw here
    // Rebuild offscreen minimap tile data (still cached for cockpit render)
    const mmW2 = cockpitMinimapRef.current?.width || 200;
    const mmH2 = cockpitMinimapRef.current?.height || 64;
    const isDirty = minimapDirtyRef.current || frame % 120 === 0;
    if (
      isDirty ||
      !minimapOffRef.current ||
      minimapOffRef.current.width !== mmW2 ||
      minimapOffRef.current.height !== mmH2
    ) {
      let offMm = minimapOffRef.current;
      if (!offMm || offMm.width !== mmW2 || offMm.height !== mmH2) {
        offMm = document.createElement("canvas");
        offMm.width = mmW2;
        offMm.height = mmH2;
        minimapOffRef.current = offMm;
      }
      const mctx = offMm.getContext("2d")!;
      mctx.fillStyle = "rgba(0,0,0,0.85)";
      mctx.fillRect(0, 0, mmW2, mmH2);
      const explored = exploredRef.current;
      const radarLevel2 = playerRef.current.stats.radarLevel;
      const scaleX2 = mmW2 / MAP_W;
      const scaleY2 = mmH2 / MAP_H;
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const isExplored = explored[ty * MAP_W + tx];
          const t = getTile(tx, ty);
          const isOre = RESOURCES[t] !== undefined;
          if (!isExplored && !(radarLevel2 > 0 && isOre)) continue;
          const mx2 = tx * scaleX2;
          const my2 = ty * scaleY2;
          const mw2 = Math.max(1, scaleX2);
          const mh2 = Math.max(1, scaleY2);
          if (!isExplored && radarLevel2 > 0 && isOre) {
            mctx.fillStyle = RESOURCES[t]?.color ?? "#888";
            mctx.globalAlpha = 0.3;
            mctx.fillRect(mx2, my2, mw2, mh2);
            mctx.globalAlpha = 1;
          } else if (t === T.EMPTY) {
            mctx.fillStyle = "#1a1a1a";
            mctx.fillRect(mx2, my2, mw2, mh2);
          } else if (GLOWING_TILES.has(t)) {
            if (t === T.LAVA_TILE) {
              mctx.fillStyle = "#ff4500";
            } else if (t === T.CRYSTAL_WALL) {
              mctx.fillStyle = "#7c3aed";
            } else {
              mctx.fillStyle = RESOURCES[t]?.color ?? "#f5a623";
            }
            mctx.fillRect(mx2, my2, mw2, mh2);
          } else {
            mctx.fillStyle = getCachedTileColor(t, ty - 5);
            mctx.fillRect(mx2, my2, mw2, mh2);
          }
        }
      }
      minimapDirtyRef.current = false;
    }

    // Render cockpit minimap
    const cmm = cockpitMinimapRef.current;
    if (cmm) {
      const mctx2 = cmm.getContext("2d");
      if (mctx2) {
        const mmW3 = cmm.width;
        const mmH3 = cmm.height;
        const scaleX3 = mmW3 / MAP_W;
        const scaleY3 = mmH3 / MAP_H;
        mctx2.clearRect(0, 0, mmW3, mmH3);
        // Magnetic storm blackout
        if (magneticStormRef.current > 0) {
          mctx2.fillStyle = "#000";
          mctx2.fillRect(0, 0, mmW3, mmH3);
          mctx2.fillStyle = "#ef4444";
          mctx2.font = `bold ${Math.max(8, mmH3 / 4)}px monospace`;
          mctx2.textAlign = "center";
          mctx2.fillText("⚡ OFFLINE", mmW3 / 2, mmH3 / 2 + 2);
          mctx2.textAlign = "left";
        } else {
          if (minimapOffRef.current)
            mctx2.drawImage(minimapOffRef.current, 0, 0, mmW3, mmH3);
          // Player dot
          const pmx3 = (p.x / TILE) * scaleX3;
          const pmy3 = (p.y / TILE) * scaleY3;
          mctx2.fillStyle = "#ffffff";
          mctx2.fillRect(pmx3 - 1.5, pmy3 - 1.5, 3, 3);
          // Genesis flashing dot
          if (frame % 60 < 30) {
            const lbx3 = Math.floor(MAP_W / 2) * scaleX3;
            const lby3 = (MAP_H - 2) * scaleY3;
            mctx2.fillStyle = "#ffea00";
            mctx2.shadowBlur = 4;
            mctx2.shadowColor = "#ffea00";
            mctx2.fillRect(lbx3 - 1.5, lby3 - 1.5, 3, 3);
            mctx2.shadowBlur = 0;
          }
          // Depth ruler ticks
          mctx2.font = "6px monospace";
          mctx2.textAlign = "left";
          for (let dm = 40; dm <= 160; dm += 40) {
            const tickY3 = ((dm + 5) / MAP_H) * mmH3;
            mctx2.fillStyle = "rgba(255,255,255,0.4)";
            mctx2.fillRect(mmW3 - 4, tickY3, 3, 1);
          }
          // BOB quest paw beacon
          if (
            npcQuestRef.current?.npcId === "bob_dog" &&
            npcQuestRef.current?.step === 1
          ) {
            const pTileX = Math.floor(p.x / TILE);
            const pTileY = Math.floor(p.y / TILE);
            let bestDist = Number.POSITIVE_INFINITY;
            let bestLx = -1;
            let bestLy = -1;
            const mapData = mapRef.current;
            for (let ry = 0; ry < MAP_H; ry++) {
              for (let rx = 0; rx < MAP_W; rx++) {
                if (mapData[ry * MAP_W + rx] === T.LORE_ROOM) {
                  const d = Math.abs(rx - pTileX) + Math.abs(ry - pTileY);
                  if (d < bestDist) {
                    bestDist = d;
                    bestLx = rx;
                    bestLy = ry;
                  }
                }
              }
            }
            if (bestLx >= 0) {
              const pawX = bestLx * scaleX3;
              const pawY = bestLy * scaleY3;
              const pulse = 0.5 + 0.5 * Math.sin(frameRef.current * 0.08);
              mctx2.save();
              mctx2.globalAlpha = 0.6 + 0.4 * pulse;
              mctx2.beginPath();
              mctx2.arc(pawX, pawY, 3 + pulse, 0, Math.PI * 2);
              mctx2.fillStyle = "#ffaa00";
              mctx2.shadowBlur = 8;
              mctx2.shadowColor = "#ffaa00";
              mctx2.fill();
              mctx2.shadowBlur = 0;
              mctx2.font = "7px serif";
              mctx2.textAlign = "center";
              mctx2.fillStyle = "#fff";
              mctx2.fillText("🐾", pawX, pawY - 4);
              mctx2.restore();
            }
          }
          // Border
          mctx2.strokeStyle = "rgba(255,180,0,0.3)";
          mctx2.strokeRect(0, 0, mmW3, mmH3);
        } // end else (magnetic storm)
      }
    }
  }

  function getReencounterQuote(npcId: string): string {
    const pools: Record<string, string[]> = {
      dom: [
        "The protocol remembers you, miner. Keep going deeper.",
        "Sonic DEX launched on ICP. The surface economy is already here. Go deeper.",
        "ICPSwap runs at web speed. No gas fees. The ecosystem is alive. Keep mining.",
        "NFID — your portable identity across every ICP app. You carry it even here.",
        "Chain Fusion connects Bitcoin to ICP natively. The deep seams reflect this convergence.",
        "Funded by the community, built by the community. That's the ICP way. That's why you mine.",
      ],
      bob_dog: [
        "Woof! Still here! The cache is close — I can smell it! 🐾",
        "BORK! You came back! I knew you would! Very loyal! Much trust! 🐾",
        "*wags tail so fast becomes a blur* I found MORE shiny things! Follow! 🐾",
        "Arf! The Ghost Miner was down here earlier. I growled at him. He tasted weird. 🐾",
        "Woof woof! Did you know I am also on the leaderboard? Under 'GoodBoy'? 🐾",
      ],
      jan: [
        "The cryptography holds. Stay vigilant down here.",
        "Chain-key signatures verified. You are still you. That matters at depth.",
        "I've derived a new ZK proof that could locate the Genesis Block. Interested?",
        "The threshold ECDSA math checks out perfectly. Your identity is intact.",
        "vetKeys are here. Your secrets are yours alone now. Even down here.",
      ],
      lomesh: [
        "Growth never stops. You know where the value is.",
        "Your depth-to-ore ratio is outperforming the cohort. I'm genuinely impressed.",
        "ICP ecosystem is growing 40% quarter over quarter. You feel that down here too.",
        "The community loop is complete: mine, sell, upgrade, repeat. Perfect growth flywheel.",
        "I'd A/B test your route through the tunnels but... you're clearly already optimised.",
      ],
      diego: [
        "Still running, huh? Respect. Call me if you need a patch.",
        "That hull scratch wasn't there before. Let me look at that before you go.",
        "You keep coming back. I keep patching. It's a beautiful relationship.",
        "The BOB community respects persistence. And so do I. Stay safe.",
        "Next time bring your friend. I've got enough repair kits for two.",
      ],
      whale_underground: [
        "The deep market never sleeps. Come back with more cargo.",
        "I've been watching your excavation patterns. Impressive alpha.",
        "The last miner I met down here left with 10,000 BOB. You could beat that.",
        "Deep cargo fetches premium prices when the right buyer is watching. That's me.",
        "My offer stands. Come back with a full hold and I'll make you very wealthy.",
      ],
      dfinity_ghost: [
        "The Foundation watches over your progress, miner.",
        "The 2018 whitepaper described these exact formations. It's all connected.",
        "I've been down here since before launch. The tunnels know me. They're starting to know you.",
        "DFINITY's work never stops. Neither does yours. Keep going.",
        "The canister model means your progress is preserved forever. As am I.",
      ],
      ghost_miner: [
        "You again. The tunnels are warming to you. I can feel it.",
        "Still looking for the Genesis Block? It's closer than you think. Warmer.",
        "I traded everything to stay down here. You can still leave. While you can.",
        "The Head Fudder knows your name now. He told me.",
        "My offer still stands. The cache is there. Waiting for you.",
      ],
    };
    const pool = pools[npcId];
    if (pool) return pool[Math.floor(Math.random() * pool.length)];
    return "Good to see you again, miner. Stay safe out there.";
  }

  function addTickerForReward(reward: string) {
    const msgs: Record<string, string> = {
      npc_quest_dom: "📡 Dom's transmission received. Mission accepted.",
      npc_quest_bob_dog: "🐾 Follow BOB! Hidden cache detected on map.",
      npc_quest_jan: "🔐 Jan's quest accepted — mine crystal ores!",
      npc_quest_lomesh: "📈 Lomesh growth hack activated. Quest begins!",
      npc_quest_diego: "🔧 Diego quest accepted. Hull & fuel restored!",
      npc_quest_whale: "🐳 Whale quest accepted. Fill that cargo hold!",
      free_bob_small: "🐾 +50 BOB collected! Good boy!",
      free_bob_medium: "💎 +100 BOB from DFINITY Ghost!",
      free_bob: "💰 BOB the Dog dropped a big stash!",
      cargo_boost: "📦 Cargo capacity doubled for next sell!",
      shield_upgrade_300: "🛡 Shield reinforced by Jan.",
      dfinity_cloak: "👻 DFINITY cloak active — next hazard blocked!",
      cloak: "👻 Cloak active — next hazard blocked!",
      radar_reveal: "📡 Radar fully revealed!",
      radar_ping: "📡 Map revealed — hint accepted!",
      special_upgrade: "⚡ Dom gave you a free upgrade!",
      drill_speed_boost_300: "🔩 Diego turbocharged your drill!",
      emergency_repair: "🔧 Diego patched you up!",
      immediate_deal_1_5x: "🐳 Whale quick deal — cargo sold at 1.5x!",
      sell_boost: "💹 Sell prices +25% for next haul!",
      ghost_miner_trade:
        "👻 Ghost Miner trade complete — rare ore cache placed nearby!",
      ghost_miner_decline: "👻 The Ghost Miner fades into the rock...",
      whale_instant_2_5x: "🐳 Whale deal! Cargo sold at 2.5x price!",
      whale_nns_deal: "🐳 Jetpack upgraded via NNS deal! Dom won't be happy...",
      dom_help_fragment: "🏛 Helped Dom secure the Genesis Fragment! +500 BOB",
      dom_take_fragment:
        "💰 Took the fragment yourself! +800 BOB — Dom noticed.",
      ghost_sonar_trade: "👻 Sonar traded for a Void Shard cache nearby!",
      jerry_trade_hull: "🔧 Jerry deal! Hull+Fuel restored, -3 cargo items!",
      jerry_trade_drill:
        "🚀 Jerry boosted your drill! -200 BOB, +30% drill speed this run!",
      ghost_tunnel_shortcut: "👻 Shortcut revealed! Jumped 20m deeper!",
      black_market_trade: "🧥 Black Market Trader: Ready to deal...",
      black_market_sold: "💸 Sold to Black Market at 2.5x value!",
      black_market_decline: "🧥 The Trader disappears into the shadows...",
    };
    const msg = msgs[reward];
    if (msg) tickerQueueRef.current.push(msg);
  }

  function applyNpcReward(npc: { id: string; reward: string }) {
    const p = playerRef.current;
    const s = p.stats;
    npcEncounteredRef.current.add(npc.id);
    if (npc.reward === "__reencounter__") return;
    switch (npc.reward) {
      case "fuel_hull":
        s.fuel = Math.min(s.maxFuel, s.maxFuel * 0.8);
        s.hull = Math.min(s.maxHull, s.maxHull * 0.8);
        setShopMsg("Jerry healed you! +Fuel +Hull");
        break;
      case "sell_boost":
        npcRewardsRef.current.sellBoost = 1.25;
        setShopMsg("Sell prices +25% for next haul!");
        break;
      case "fame_buff":
        npcRewardsRef.current.fameBuff = true;
        setShopMsg("+15% sell prices all run!");
        break;
      case "whale_buy": {
        const val2 = cargoTotalValue(p.cargo);
        p.stats.bob += val2 * 2;
        p.cargo = [];
        s.cargoWeight = 0;
        setShopMsg(`The Whale bought all for ${val2 * 2} BOB!`);
        setHud((h) => ({ ...h, bob: p.stats.bob, cargoW: 0 }));
        break;
      }
      case "special_upgrade":
        if (s.drillLevel < UPGRADE_MAX_LEVEL) {
          s.drillLevel++;
          setShopMsg("Dom gave you a FREE Drill upgrade!");
        } else {
          s.maxFuel = Math.floor(s.maxFuel * 1.5);
          setShopMsg("Dom boosted your fuel cap +50%!");
        }
        break;
      case "radar_reveal":
        exploredRef.current.fill(1);
        setShopMsg("Radar fully revealed!");
        break;
      case "npc_quest_lomesh":
        // Lomesh quest: Step 1 - mine 3 different ore types
        npcQuestRef.current = {
          npcId: "lomesh",
          description: "Step 1/2: Mine 3 different ore types for Lomesh",
          reward: "npc_quest_lomesh_step2",
          progress: 0,
          goal: 3,
          type: "mine_different_ores",
          completed: false,
          step: 1,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "lomesh",
          description: "Step 1/2: Mine 3 different ore types for Lomesh",
          reward: "npc_quest_lomesh_step2",
          progress: 0,
          goal: 3,
          completed: false,
          step: 1,
          totalSteps: 2,
        });
        setShopMsg("LOMESH QUEST: Step 1/2 — Mine 3 different ore types!");
        break;
      case "free_bob_small":
        s.bob += 50;
        setShopMsg("BOB the Dog dropped 50 BOB! Good boy! 🐾");
        setHud((h) => ({ ...h, bob: s.bob }));
        break;
      case "cargo_boost":
        npcRewardsRef.current.cargoBoost = true;
        setShopMsg("Next cargo sell at 2x price!");
        break;
      case "cloak":
      case "dfinity_cloak":
        npcRewardsRef.current.cloakActive = true;
        setShopMsg("DFINITY cloak active! Next hazard blocked.");
        break;
      case "ghost_miner_trade": {
        // Ghost Miner: accept trade — spend 500 BOB for a rare ore cache
        const _gp = playerRef.current;
        if (_gp.stats.bob >= 500) {
          _gp.stats.bob -= 500;
          setHud((h) => ({ ...h, bob: _gp.stats.bob }));
          const gx = Math.floor(_gp.x / TILE);
          const gy = Math.floor(_gp.y / TILE);
          let ghostPlaced = 0;
          for (let dy2 = 2; dy2 <= 8 && ghostPlaced < 3; dy2++) {
            for (let dx2 = -2; dx2 <= 2 && ghostPlaced < 3; dx2++) {
              const nt = getTile(gx + dx2, gy + dy2);
              if (nt !== T.EMPTY && nt !== T.BOB_GENESIS) {
                setTile(
                  gx + dx2,
                  gy + dy2,
                  Math.random() < 0.5 ? T.BOB_SEAM : T.BOB_VEIN,
                );
                ghostPlaced++;
              }
            }
          }
          tickerQueueRef.current.push(
            "👻 Ghost Miner grinned and vanished into the stone...",
          );
          // Track ghost_miner_encounter quest
          const gq2 = runQuestsRef.current.find(
            (q) => q.type === "ghost_miner_encounter" && !q.completed,
          );
          if (gq2) {
            gq2.progress = 1;
            gq2.completed = true;
            _gp.stats.bob += 800;
            setHud((h) => ({ ...h, bob: _gp.stats.bob }));
            tickerQueueRef.current.push("👻 Ghost Hunt complete! +800 BOB!");
            setRunQuests((prev) =>
              prev.map((q) =>
                q.type === "ghost_miner_encounter"
                  ? { ...q, progress: 1, completed: true }
                  : q,
              ),
            );
          }
        } else {
          tickerQueueRef.current.push(
            "👻 The Ghost Miner shook his head. 'Come back with more BOB.'",
          );
        }
        break;
      }
      case "ghost_miner_decline": {
        // Ghost Miner: declined trade
        tickerQueueRef.current.push(
          "👻 The Ghost Miner nods knowingly and fades into the rock.",
        );
        // Still track quest encounter on decline
        const gq3 = runQuestsRef.current.find(
          (q) => q.type === "ghost_miner_encounter" && !q.completed,
        );
        if (gq3) {
          gq3.progress = 1;
          gq3.completed = true;
          const _dp = playerRef.current;
          _dp.stats.bob += 800;
          setHud((h) => ({ ...h, bob: _dp.stats.bob }));
          tickerQueueRef.current.push("👻 Ghost Hunt complete! +800 BOB!");
          setRunQuests((prev) =>
            prev.map((q) =>
              q.type === "ghost_miner_encounter"
                ? { ...q, progress: 1, completed: true }
                : q,
            ),
          );
        }
        break;
      }
      case "free_bob_medium":
        playerRef.current.stats.bob += 100;
        setShopMsg("DFINITY Ghost tipped you 100 BOB!");
        setHud((h) => ({ ...h, bob: playerRef.current.stats.bob }));
        break;
      case "free_bob": {
        const amount2 = 500 + Math.floor(Math.random() * 1500);
        s.bob += amount2;
        setShopMsg(`BOB the Dog dropped ${amount2} BOB!`);
        setHud((h) => ({ ...h, bob: p.stats.bob }));
        break;
      }
      case "emergency_repair":
        s.hull = Math.min(s.maxHull, s.maxHull * 0.6);
        s.fuel = Math.min(s.maxFuel, s.maxFuel * 0.5);
        setShopMsg("Diego patched you up!");
        break;
      case "npc_radar":
        s.radarLevel = Math.max(s.radarLevel, 1);
        setShopMsg("Wenzel upgraded your radar!");
        break;
      case "npc_quest_dom":
        // Dom assigns a quest: Step 1 - find NNS bunker lore room
        npcQuestRef.current = {
          npcId: "dom",
          description: "Step 1/3: Find the NNS Governance Bunker",
          reward: "npc_quest_dom_step2",
          progress: 0,
          goal: 1,
          type: "find_lore_room",
          completed: false,
          step: 1,
          totalSteps: 3,
        };
        setNpcQuestActive({
          npcId: "dom",
          description: "Step 1/3: Find the NNS Governance Bunker",
          reward: "npc_quest_dom_step2",
          progress: 0,
          goal: 1,
          completed: false,
          step: 1,
          totalSteps: 3,
        });
        setShopMsg("DOM QUEST: Step 1/3 — Find the NNS Governance Bunker!");
        break;
      case "npc_quest_bob_dog":
        // BOB Dog quest: Step 1 - follow BOB to find a hidden cache
        npcRewardsRef.current.radarPingActive = true;
        npcQuestRef.current = {
          npcId: "bob_dog",
          description: "Step 1/2: Follow BOB to a hidden lore cache 🐾",
          reward: "npc_quest_bob_step2",
          progress: 0,
          goal: 1,
          type: "find_lore_room",
          completed: false,
          step: 1,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "bob_dog",
          description: "Step 1/2: Follow BOB to a hidden lore cache 🐾",
          reward: "npc_quest_bob_step2",
          progress: 0,
          goal: 1,
          completed: false,
          step: 1,
          totalSteps: 2,
        });
        setShopMsg(
          "BOB QUEST: Step 1/2 — Follow BOB to a hidden cache! (radar active)",
        );
        break;
      case "npc_quest_jan":
        // Jan quest: Step 1 - mine 3 crystal ores, Step 2 - reach depth 60, Step 3 - reward
        npcQuestRef.current = {
          npcId: "jan",
          description: "Step 1/2: Mine 3 crystal ores for Jan",
          reward: "npc_quest_jan_step2",
          progress: 0,
          goal: 3,
          type: "mine_crystals",
          completed: false,
          step: 1,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "jan",
          description: "Step 1/2: Mine 3 crystal ores for Jan",
          reward: "npc_quest_jan_step2",
          progress: 0,
          goal: 3,
          completed: false,
          step: 1,
          totalSteps: 2,
        });
        setShopMsg("JAN QUEST: Step 1/2 — Mine 3 crystal ores!");
        break;
      case "npc_quest_diego":
        s.hull = Math.min(s.maxHull, s.maxHull * 0.7);
        s.fuel = Math.min(s.maxFuel, s.maxFuel * 0.6);
        setShopMsg("Diego patched you up! Hull & fuel restored.");
        break;
      case "immediate_deal_1_5x": {
        const cargoVal3 = cargoTotalValue(p.cargo);
        if (cargoVal3 > 0) {
          p.stats.bob += Math.floor(cargoVal3 * 1.5);
          p.cargo = [];
          s.cargoWeight = 0;
          setShopMsg(
            `The Whale bought your cargo at 1.5x! +${Math.floor(cargoVal3 * 1.5)} BOB`,
          );
          setHud((h) => ({ ...h, bob: p.stats.bob, cargoW: 0 }));
        } else {
          setShopMsg("No cargo to sell!");
        }
        break;
      }
      case "whale_instant_2_5x": {
        // The Whale: sell all cargo at 2.5x right now
        const wCargoVal = cargoTotalValue(p.cargo);
        if (wCargoVal > 0) {
          const wBonus = Math.floor(wCargoVal * 2.5);
          p.stats.bob += wBonus;
          p.cargo = [];
          s.cargoWeight = 0;
          setHud((h) => ({ ...h, bob: p.stats.bob, cargoW: 0 }));
          tickerQueueRef.current.push(
            `🐳 The Whale bought EVERYTHING at 2.5x! +${wBonus} BOB`,
          );
        } else {
          tickerQueueRef.current.push(
            "🐳 The Whale is disappointed. You have no cargo.",
          );
        }
        break;
      }
      case "jerry_trade_hull": {
        // Jerry: trade 3 ores for hull repair + fuel
        const jerryP = playerRef.current;
        if (jerryP.cargo.reduce((a, c) => a + c.count, 0) >= 3) {
          // Remove 3 cargo items
          let removed = 0;
          for (const ci of jerryP.cargo) {
            const canRemove = Math.min(ci.count, 3 - removed);
            ci.count -= canRemove;
            removed += canRemove;
            if (removed >= 3) break;
          }
          jerryP.cargo = jerryP.cargo.filter((c) => c.count > 0);
          const cw = jerryP.cargo.reduce(
            (a, c) => a + (RESOURCES[c.tile]?.weight ?? 1) * c.count,
            0,
          );
          jerryP.stats.cargoWeight = cw;
          jerryP.stats.hull = Math.min(
            jerryP.stats.maxHull,
            jerryP.stats.hull + jerryP.stats.maxHull * 0.5,
          );
          jerryP.stats.fuel = Math.min(
            jerryP.stats.maxFuel,
            jerryP.stats.fuel + jerryP.stats.maxFuel * 0.4,
          );
          setHud((h) => ({
            ...h,
            cargoW: cw,
            fuel: Math.round(jerryP.stats.fuel),
            hull: Math.round(jerryP.stats.hull),
          }));
          tickerQueueRef.current.push(
            "🔧 Jerry traded! -3 ore, +50% hull repaired, +40% fuel refilled!",
          );
        } else {
          tickerQueueRef.current.push(
            "🔧 Jerry: 'You don't have enough cargo to trade, buddy!'",
          );
        }
        break;
      }
      case "jerry_trade_drill": {
        // Jerry: pay 200 BOB for drill speed boost this run
        const jerryP2 = playerRef.current;
        if (jerryP2.stats.bob >= 200) {
          jerryP2.stats.bob -= 200;
          setHud((h) => ({ ...h, bob: jerryP2.stats.bob }));
          npcRewardsRef.current.drillBoost = true;
          tickerQueueRef.current.push(
            "🚀 Jerry boosted your drill! -200 BOB, +30% drill speed this run!",
          );
        } else {
          tickerQueueRef.current.push(
            "🚀 Jerry: 'Not enough BOB! Come back when you're richer!'",
          );
        }
        break;
      }
      case "whale_nns_deal": {
        // The Whale: help with NNS manipulation — get jetpack upgrade, costs Dom loyalty
        s.boosterLevel = Math.min(5, (s.boosterLevel ?? 0) + 1);
        tickerQueueRef.current.push(
          "🐳 Jetpack upgraded! The Whale pulls some NNS strings...",
        );
        // Penalize Dom relationship
        const wMeta = loadMetaProgress();
        if (!wMeta.npcRelationships) wMeta.npcRelationships = {};
        wMeta.npcRelationships.dom = (wMeta.npcRelationships.dom ?? 5) - 3;
        saveMetaProgress(wMeta);
        break;
      }
      case "dom_help_fragment": {
        // Help Dom secure the fragment — +500 BOB, +loyalty, shop discount this run
        p.stats.bob += 500;
        setHud((h) => ({ ...h, bob: p.stats.bob }));
        npcRewardsRef.current.fameBuff = true; // +15% sell bonus as gratitude
        tickerQueueRef.current.push(
          "🏛 Dom secures the fragment. +500 BOB! +Sell bonus 15%! Dom approves.",
        );
        const dMeta = loadMetaProgress();
        if (!dMeta.npcRelationships) dMeta.npcRelationships = {};
        dMeta.npcRelationships.dom = (dMeta.npcRelationships.dom ?? 5) + 2;
        saveMetaProgress(dMeta);
        break;
      }
      case "dom_take_fragment": {
        // Take the fragment yourself — +800 BOB, -loyalty with Dom
        p.stats.bob += 800;
        setHud((h) => ({ ...h, bob: p.stats.bob }));
        tickerQueueRef.current.push(
          "💰 You pocketed the fragment. +800 BOB! Dom looks disappointed.",
        );
        const dMeta2 = loadMetaProgress();
        if (!dMeta2.npcRelationships) dMeta2.npcRelationships = {};
        dMeta2.npcRelationships.dom = (dMeta2.npcRelationships.dom ?? 5) - 2;
        saveMetaProgress(dMeta2);
        break;
      }
      case "ghost_sonar_trade": {
        // Ghost Miner: trade sonar charges for rare ore
        const pSonar = playerRef.current;
        if ((pSonar.stats.sonarCharges ?? 0) > 0) {
          const chargesLost = Math.min(pSonar.stats.sonarCharges ?? 0, 2);
          pSonar.stats.sonarCharges =
            (pSonar.stats.sonarCharges ?? 0) - chargesLost;
          const gx2 = Math.floor(p.x / TILE);
          const gy2 = Math.floor(p.y / TILE);
          let placed2 = false;
          for (let dy3 = 1; dy3 <= 5 && !placed2; dy3++) {
            for (let dx3 = -2; dx3 <= 2 && !placed2; dx3++) {
              const nt2 = getTile(gx2 + dx3, gy2 + dy3);
              if (nt2 !== T.EMPTY && nt2 !== T.BOB_GENESIS) {
                setTile(gx2 + dx3, gy2 + dy3, T.VOID_SHARD);
                placed2 = true;
              }
            }
          }
          tickerQueueRef.current.push(
            `👻 Ghost traded! -${chargesLost} sonar charges, +Chain Fusion Shard nearby!`,
          );
        } else {
          tickerQueueRef.current.push(
            "👻 No sonar charges to trade! The Ghost shrugs.",
          );
        }
        break;
      }
      case "black_market_trade": {
        // Black Market Trader: offer to buy top ore from cargo at 2.5x
        if (blackMarketUsedRef.current) {
          // If already traded, offer second slot at double price
        }
        // Find top 3 ores by value in cargo
        const bmCargo = [...p.cargo]
          .sort((a, b) => {
            const aVal = (RESOURCES[a.tile]?.value ?? 0) * a.count;
            const bVal = (RESOURCES[b.tile]?.value ?? 0) * b.count;
            return bVal - aVal;
          })
          .slice(0, 3);
        if (bmCargo.length === 0) {
          tickerQueueRef.current.push(
            "🧥 Nothing to trade. Come back with ore.",
          );
        } else {
          // Show the black market dialog via setActiveNpc
          setActiveNpc({
            id: "black_market_trader",
            name: "Black Market Trader",
            quote:
              "The chain doesn't ask questions, miner. Neither do I. What do you want to move?",
            reward: "black_market_trade",
            color: "#1f2937",
          });
        }
        break;
      }
      case "black_market_sold": {
        // Sell selected ore from cargo at 2.5x
        const bmSort = [...p.cargo].sort((a, b) => {
          const aV = (RESOURCES[a.tile]?.value ?? 0) * a.count;
          const bV = (RESOURCES[b.tile]?.value ?? 0) * b.count;
          return bV - aV;
        });
        const bmBest = bmSort[0];
        if (bmBest) {
          const bmRes = RESOURCES[bmBest.tile];
          if (bmRes) {
            const sale = Math.floor(bmRes.value * bmBest.count * 2.5);
            p.stats.bob += sale;
            p.stats.cargoWeight -= bmRes.weight * bmBest.count;
            const idx2 = p.cargo.findIndex((c) => c.tile === bmBest.tile);
            if (idx2 >= 0) p.cargo.splice(idx2, 1);
            tickerQueueRef.current.push(
              `💸 Black Market: +${sale} BOB for ${bmBest.count}x ${bmRes.name}!`,
            );
            blackMarketUsedRef.current = true;
            // Update npcRelationships.blackMarket
            const bmMeta = loadMetaProgress();
            if (!bmMeta.npcRelationships) bmMeta.npcRelationships = {};
            bmMeta.npcRelationships.blackMarket =
              (bmMeta.npcRelationships.blackMarket ?? 0) + 1;
            saveMetaProgress(bmMeta);
          }
        }
        // Detect whale betrayal - if player had a whale quest and sold to black market instead
        {
          const hasWhaleQuest = runQuestsRef.current.some(
            (q) =>
              (q.npcId === "whale" || q.npcId === "whale_underground") &&
              !q.completed,
          );
          if (hasWhaleQuest) {
            const betMeta = loadMetaProgress();
            betMeta.whaleBetrayed = true;
            saveMetaProgress(betMeta);
            if (metaProgressRef.current)
              metaProgressRef.current.whaleBetrayed = true;
            tickerQueueRef.current.push("🐳 The Whale will not forget this...");
          }
        }
        setActiveNpc(null);
        break;
      }
      case "black_market_decline": {
        tickerQueueRef.current.push(
          "🧥 The Trader disappears into the shadows...",
        );
        setActiveNpc(null);
        break;
      }
      case "ghost_tunnel_shortcut": {
        // Ghost Miner: shortcut — teleport vehicle 20m down
        const newY = p.y + 20 * TILE;
        const maxY = (MAP_H - 10) * TILE;
        p.y = Math.min(newY, maxY);
        tickerQueueRef.current.push(
          "👻 The Ghost reveals a hidden tunnel! Jumped 20m deeper!",
        );
        const shortX = Math.floor(p.x / TILE);
        const shortY = Math.floor(p.y / TILE);
        for (let dy4 = 0; dy4 <= 3; dy4++) {
          setTile(shortX, shortY + dy4, T.EMPTY);
          if (shortX > 0) setTile(shortX - 1, shortY + dy4, T.EMPTY);
          if (shortX < MAP_W - 1) setTile(shortX + 1, shortY + dy4, T.EMPTY);
        }
        break;
      }
      case "npc_quest_whale":
        // Whale quest: Step 1 - fill cargo (10+ items), Step 2 - surface with it, reward: 3x sell
        npcQuestRef.current = {
          npcId: "whale",
          description: "Step 1/2: Fill cargo hold (10+ items) for The Whale",
          reward: "npc_quest_whale_step2",
          progress: p.cargo.reduce((a, c) => a + c.count, 0),
          goal: 10,
          type: "fill_cargo",
          completed: false,
          step: 1,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "whale",
          description: "Step 1/2: Fill cargo hold (10+ items) for The Whale",
          reward: "npc_quest_whale_step2",
          progress: 0,
          goal: 10,
          completed: false,
          step: 1,
          totalSteps: 2,
        });
        setShopMsg("WHALE QUEST: Step 1/2 — Fill cargo with 10+ items!");
        break;
      case "shield_upgrade_300":
        if (s.bob >= 300) {
          s.bob -= 300;
          s.shieldLevel = Math.min(5, s.shieldLevel + 1);
          setShopMsg("Jan upgraded your shield! (-300 BOB)");
          setHud((h) => ({ ...h, bob: s.bob }));
        } else {
          setShopMsg("Not enough BOB for shield upgrade! (need 300)");
        }
        break;
      case "drill_speed_boost_300":
        if (s.bob >= 300) {
          s.bob -= 300;
          npcRewardsRef.current.drillBoost = true;
          setShopMsg("Diego turbocharged your drill! +20% speed (-300 BOB)");
          setHud((h) => ({ ...h, bob: s.bob }));
        } else {
          setShopMsg("Not enough BOB! (need 300)");
        }
        break;
      case "radar_ping":
        exploredRef.current.fill(1);
        setShopMsg("Hint accepted! Map revealed.");
        break;
    }
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 3000);
  }

  function applyNpcQuestReward(reward: string, npcId: string) {
    const p = playerRef.current;
    const s = p.stats;
    npcQuestRef.current = null;
    let msg = "";
    switch (reward) {
      // ─── Multi-step: Dom ───
      case "npc_quest_dom_step2":
        // Step 2: Return to surface to report to Dom
        npcQuestRef.current = {
          npcId: "dom",
          description: "Step 2/3: Return to surface with the discovery",
          reward: "npc_quest_dom_step3",
          progress: 0,
          goal: 1,
          type: "reach_surface",
          completed: false,
          step: 2,
          totalSteps: 3,
        };
        setNpcQuestActive({
          npcId: "dom",
          description: "Step 2/3: Return to surface with the discovery",
          reward: "npc_quest_dom_step3",
          progress: 0,
          goal: 1,
          completed: false,
          step: 2,
          totalSteps: 3,
        });
        msg =
          "NNS Bunker found! 📡 Step 2/3: Return to surface with the discovery!";
        break;
      case "npc_quest_dom_step3":
        // Step 3: Final reward - drill upgrade + BOB bonus + lore
        if (s.drillLevel < 5) s.drillLevel++;
        s.bob += 300;
        msg =
          "✅ DOM QUEST COMPLETE! Free Drill upgrade + 300 BOB! Lore unlocked.";
        showLoreMessage(
          "🌐 DOM TRANSMISSION DECRYPTED\nThe NNS Bunker holds the subnet routing tables from genesis. Dom says: 'You've proven you can reach the deep systems. The Internet Computer rewards those who persist.'",
        );
        break;
      // ─── Multi-step: BOB the Dog ───
      case "npc_quest_bob_step2":
        // Step 2: Return to surface with BOB's blessing
        npcQuestRef.current = {
          npcId: "bob_dog",
          description: "Step 2/2: Return to surface — BOB leads the way! 🐾",
          reward: "npc_quest_bob_final",
          progress: 0,
          goal: 1,
          type: "reach_surface",
          completed: false,
          step: 2,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "bob_dog",
          description: "Step 2/2: Return to surface — BOB leads the way! 🐾",
          reward: "npc_quest_bob_final",
          progress: 0,
          goal: 1,
          completed: false,
          step: 2,
          totalSteps: 2,
        });
        msg = "Cache found! 🐾 Step 2/2: Follow BOB back to the surface!";
        break;
      case "npc_quest_bob_final":
        s.bob += 500;
        msg = "✅ BOB QUEST COMPLETE! 🐾 +500 BOB! Good boy vibes achieved.";
        break;
      // ─── Multi-step: Jan ───
      case "npc_quest_jan_step2":
        // Step 2: Reach depth 60m
        npcQuestRef.current = {
          npcId: "jan",
          description: "Step 2/2: Reach depth 60m to decrypt the vault",
          reward: "npc_quest_jan_final",
          progress: 0,
          goal: 60,
          type: "reach_depth",
          completed: false,
          step: 2,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "jan",
          description: "Step 2/2: Reach depth 60m to decrypt the vault",
          reward: "npc_quest_jan_final",
          progress: 0,
          goal: 60,
          completed: false,
          step: 2,
          totalSteps: 2,
        });
        msg =
          "Crystals analyzed! ✅ Step 2/2: Reach 60m depth to decrypt the vault!";
        break;
      case "npc_quest_jan_final":
        if (s.shieldLevel < 5) s.shieldLevel++;
        s.bob += 200;
        msg =
          "✅ JAN QUEST COMPLETE! Permanent shield upgrade + 200 BOB! ZK proof verified.";
        showLoreMessage(
          "🔒 JAN DECRYPTS THE VAULT\n'The cryptographic vault held vetKey prototypes from the pre-mainnet era. Your shield now incorporates threshold encryption. Nobody can breach it without your private key.' — Jan Camenisch",
        );
        break;
      // ─── Multi-step: Whale ───
      case "npc_quest_whale_step2":
        // Step 2: Return to surface without selling
        npcQuestRef.current = {
          npcId: "whale",
          description: "Step 2/2: Return to surface — DON'T SELL yet!",
          reward: "npc_quest_whale_final",
          progress: 0,
          goal: 1,
          type: "reach_surface",
          completed: false,
          step: 2,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "whale",
          description: "Step 2/2: Return to surface — DON'T SELL yet!",
          reward: "npc_quest_whale_final",
          progress: 0,
          goal: 1,
          completed: false,
          step: 2,
          totalSteps: 2,
        });
        msg =
          "Cargo full! 🐋 Step 2/2: Return to surface WITHOUT selling! The Whale will buy at 3x!";
        break;
      case "npc_quest_whale_final":
        npcRewardsRef.current.sellBoost = 3.0;
        msg =
          "✅ WHALE QUEST COMPLETE! 🐋 The Whale will buy your ENTIRE next haul at 3x price!";
        break;
      // ─── Original rewards ───
      case "drill_upgrade":
        if (s.drillLevel < 5) {
          s.drillLevel++;
          msg = "Quest complete! Free Drill upgrade from Dom!";
        } else {
          s.bob += 500;
          msg = "Quest complete! Dom gave you 500 BOB!";
        }
        break;
      case "shield_upgrade":
        if (s.shieldLevel < 5) {
          s.shieldLevel++;
          msg = "Quest complete! Jan upgraded your shield!";
        } else {
          s.bob += 500;
          msg = "Quest complete! Jan gave you 500 BOB!";
        }
        break;
      case "whale_2x_sell":
        npcRewardsRef.current.sellBoost = 2.0;
        msg = "Quest complete! The Whale will buy your next haul at 2x price!";
        break;
      // ─── Multi-step: Lomesh ───
      case "npc_quest_lomesh_step2":
        // Step 2: Surface and sell
        npcQuestRef.current = {
          npcId: "lomesh",
          description: "Step 2/2: Return to surface and sell your cargo!",
          reward: "npc_quest_lomesh_final",
          progress: 0,
          goal: 1,
          type: "reach_surface",
          completed: false,
          step: 2,
          totalSteps: 2,
        };
        setNpcQuestActive({
          npcId: "lomesh",
          description: "Step 2/2: Return to surface and sell your cargo!",
          reward: "npc_quest_lomesh_final",
          progress: 0,
          goal: 1,
          completed: false,
          step: 2,
          totalSteps: 2,
        });
        msg =
          "3 ore types mined! ✅ Step 2/2: Return to surface and sell for the growth hack!";
        break;
      case "npc_quest_lomesh_final":
        npcRewardsRef.current.sellBoost =
          (npcRewardsRef.current.sellBoost ?? 1.0) * 1.25;
        msg =
          "✅ LOMESH QUEST COMPLETE! +25% sell value boost for the rest of the run! 📈";
        break;
      case "arthur_interview":
        runSellBoostRef.current = (runSellBoostRef.current ?? 0) + 0.15;
        tickerQueueRef.current.push(
          "📺 Arthur is filming. Sell prices +15% next trip!",
        );
        break;
      case "arthur_deny":
        s.bob += 200;
        setHud((h) => ({ ...h, bob: s.bob }));
        break;
      case "wenzel_upgrade":
        fuelEfficiencyBoostRef.current =
          (fuelEfficiencyBoostRef.current ?? 0) + 0.15;
        tickerQueueRef.current.push(
          "❄️ Wenzel protocol active. Fuel efficiency +15%!",
        );
        break;
      case "wenzel_sabotage":
        s.bob += 300;
        s.hull = Math.max(1, s.hull - 2);
        setHud((h) => ({ ...h, bob: s.bob, hull: s.hull }));
        tickerQueueRef.current.push(
          "💣 Sabotage successful. +300 BOB, -2 hull.",
        );
        break;
      case "protocol_shill_gamble": {
        const roll = Math.random();
        const pShill = playerRef.current;
        if (roll < 0.6) {
          pShill.stats.bob += 600;
          tickerQueueRef.current.push(
            "🚀 Protocol Shill's tip paid off! +600 BOB! WAGMI!",
          );
          setHud((h) => ({ ...h, bob: pShill.stats.bob }));
        } else {
          const loss = Math.min(pShill.stats.bob, 150);
          pShill.stats.bob -= loss;
          tickerQueueRef.current.push(
            "💀 Protocol Shill RUGGED you! -150 BOB. NGMI.",
          );
          setHud((h) => ({ ...h, bob: pShill.stats.bob }));
        }
        break;
      }
      case "jan_vetkeys_blessing": {
        const healed = Math.floor(s.maxHull * 0.3);
        s.hull = Math.min(s.maxHull, s.hull + healed);
        setHud((h) => ({ ...h, hull: s.hull }));
        tickerQueueRef.current.push(
          "🔐 Jan's vetKeys sealed your hull against damage!",
        );
        msg = `Jan's vetKeys blessed your hull! +${healed} HP!`;
        break;
      }
      case "jan_price_prediction": {
        if (Math.random() < 0.5) {
          s.bob += 400;
          setHud((h) => ({ ...h, bob: s.bob }));
          tickerQueueRef.current.push(
            "📊 Jan's prediction was correct! +400 BOB!",
          );
          msg = "Jan's price prediction was right! +400 BOB!";
        } else {
          const loss2 = Math.min(s.bob, 100);
          s.bob -= loss2;
          setHud((h) => ({ ...h, bob: s.bob }));
          tickerQueueRef.current.push(
            "📊 Jan's prediction was wrong. -100 BOB. Even cryptographers miss sometimes.",
          );
          msg = "Jan's price prediction missed... -100 BOB.";
        }
        break;
      }
      case "diego_turbo_drill": {
        diegoTurboDrillRef.current = performance.now() + 60000;
        drillSpeedBoostRef.current = 2.0;
        drillSpeedBoostTimerRef.current = 60 * 60;
        tickerQueueRef.current.push(
          "⚡ Diego's turbo mod active — 2x drill speed for 60s!",
        );
        msg = "⚡ Diego turbo drill active for 60 seconds!";
        break;
      }
      default:
        s.bob += 300;
        msg = `Quest complete! +300 BOB from ${npcId}!`;
    }
    setShopMsg(msg);
    // Only clear quest display if we're not mid-chain (npcQuestRef re-assigned by step cases)
    if (!npcQuestRef.current) {
      setNpcQuestActive(null);
    }
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 5000);
    // Update meta: antagonist tracking is done separately
    const meta2 = metaProgressRef.current;
    metaProgressRef.current = meta2;
    saveMetaProgress(meta2);
  }

  function buySpecialOffer() {
    const offer = shopSpecialOfferRef.current;
    if (!offer || shopOfferPurchasedRef.current) return;
    const p = playerRef.current;
    const s = p.stats;
    if (s.bob < offer.cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    s.bob -= offer.cost;
    shopOfferPurchasedRef.current = true;
    switch (offer.id) {
      case "deal_full_repair":
        s.hull = s.maxHull;
        setShopMsg("⚕ Hull fully repaired!");
        break;
      case "deal_full_refuel":
        s.fuel = s.maxFuel;
        setShopMsg("⛽ Fully refueled!");
        break;
      case "deal_cargo_boost":
        s.maxCargo += 50;
        setShopMsg("📦 Cargo hold expanded +50!");
        break;
      case "deal_drill_overclock":
        runDrillBoostDealRef.current = true;
        setShopMsg("⚡ Drill overclocked +40% for this run!");
        break;
      case "deal_sell_boost":
        doubleSellNextRef.current = true;
        setShopMsg("📈 Next haul will sell for 2x!");
        break;
      case "deal_hull_boost":
        s.maxHull += 30;
        setShopMsg("🛡 Hull capacity +30!");
        break;
      case "deal_sonar_pack":
        s.sonarCount = Math.min(s.sonarCount + 3, 6);
        setShopMsg("📡 +3 Sonar charges added!");
        break;
      case "deal_fuel_efficiency":
        runFuelEfficiencyDealRef.current = true;
        setShopMsg("🔋 Fuel drain reduced -30% for this run!");
        break;
    }
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2500);
    setHud((h) => ({
      ...h,
      bob: s.bob,
      maxCargo: s.maxCargo,
      sonarCount: s.sonarCount,
    }));
  }

  function sellAll() {
    const p = playerRef.current;
    // Apply per-ore market multipliers (±30% per run)
    let val = 0;
    for (const c of p.cargo) {
      const res = RESOURCES[c.tile];
      if (!res) continue;
      const mMult = oreMarketMultipliersRef.current[String(c.tile)] ?? 1.0;
      val += Math.floor(res.value * mMult) * c.count;
    }
    if (val === 0) {
      setShopMsg("Nothing to sell!");
      return;
    }
    // Apply sell boost / fame buff / market crash
    let mult = 1.0;
    // Run modifier: fuel_tax boosts ore values
    if (activeModifierRef.current?.effect === "fuel_tax") mult *= 1.8;
    // ore_rush: sell values -20%
    if (activeModifierRef.current?.effect === "ore_rush") mult *= 0.8;
    // Whale surge event
    if (marketWhaleSurgeRef.current) mult *= 2.0;
    // Permanent sell price bonus
    if ((p.stats.sellPriceBonus ?? 0) > 0)
      mult *= 1 + (p.stats.sellPriceBonus ?? 0);
    // Depth bonus multiplier based on best depth reached this run
    const bestDepth = maxDepthReachedRef.current;
    const depthMult =
      bestDepth >= 130
        ? 3.0
        : bestDepth >= 100
          ? 2.0
          : bestDepth >= 60
            ? 1.5
            : 1.0;
    mult *= depthMult;
    if (npcRewardsRef.current.sellBoost) {
      mult *= npcRewardsRef.current.sellBoost;
      npcRewardsRef.current.sellBoost = undefined;
    }
    if (npcRewardsRef.current.fameBuff) mult *= 1.15;
    if (getActiveSynergies(playerRef.current.stats).includes("PRO"))
      mult *= 1.1;
    if (npcRewardsRef.current.cargoBoost) {
      mult *= 2.0;
      npcRewardsRef.current.cargoBoost = undefined;
    }
    if (runSellBoostRef.current > 0) {
      mult *= 1 + runSellBoostRef.current;
      runSellBoostRef.current = 0;
    }
    if (marketCrashRef.current) mult *= 0.5;
    if (marketCrashLiteRef.current) mult *= 0.7;
    if (activeModifierRef.current?.effect === "ghost_protocol") mult *= 0.8;
    if (oreValueMultiplierRef.current > 1.0)
      mult *= oreValueMultiplierRef.current;
    if (doubleSellNextRef.current) {
      mult *= 2.0;
      doubleSellNextRef.current = false;
      shopSpecialOfferRef.current = null;
      shopOfferPurchasedRef.current = false;
      runDrillBoostDealRef.current = false;
      runFuelEfficiencyDealRef.current = false;
      refinementKitActiveRef.current = false;
      tickerQueueRef.current.push(
        "🏛️ Senate Hearing buff activated — sell value DOUBLED!",
      );
    }
    // Veteran sell bonus (persistent cross-run bonus)
    const _vetBonus = metaProgressRef.current?.veteranSellBonus ?? 0;
    if (_vetBonus > 0) mult *= 1 + _vetBonus * 0.05;
    // Refinement kit: next haul double value
    if (refinementKitActiveRef.current) {
      mult *= 2.0;
      refinementKitActiveRef.current = false;
      tickerQueueRef.current.push(
        "🔬 REFINERY BONUS — cargo sold at double value!",
      );
    }
    const finalVal = Math.floor(val * mult);
    p.stats.bob += finalVal;
    p.cargo = [];
    p.stats.cargoWeight = 0;
    const bonus = finalVal - val;
    const bonusStr =
      bonus > 0 ? ` (+${bonus} bonus)` : bonus < 0 ? " (market crash)" : "";
    const depthBonusStr = depthMult > 1 ? ` [DEPTH ${depthMult}x]` : "";
    lastSellTripValueRef.current = finalVal;
    setShopMsg(`Sold for ${finalVal} BOB!${bonusStr}${depthBonusStr}`);
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2000);
    setHud((h) => ({ ...h, bob: p.stats.bob, cargoW: 0 }));
    advanceTutorial(3);
  }

  function buyUpgrade(key: string, level: number) {
    const p = playerRef.current;
    const ug = UPGRADES.find((u) => u.key === key);
    if (!ug) return;
    let costNum: number = ug.costs[level];
    if (activeModifierRef.current?.effect === "black_market")
      costNum = Math.floor(costNum * 0.75);
    if (activeModifierRef.current?.effect === "diplomatic_immunity")
      costNum = Math.floor(costNum * 0.8);
    if (activeModifierRef.current?.effect === "bargain_hunt")
      costNum = Math.floor(costNum * 0.75);
    if (lastNNSGovernanceRef.current > Date.now())
      costNum = Math.floor(costNum * 0.5);
    // Dom loyalty discount/penalty
    {
      const domLoyalty = metaProgressRef.current?.npcRelationships?.dom ?? 5;
      if (domLoyalty >= 8) costNum = Math.floor(costNum * 0.9);
      else if (domLoyalty <= 2) costNum = Math.floor(costNum * 1.15);
    }
    const cost = costNum;
    if (p.stats.bob < cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= cost;
    p.stats[key] = level + 1;
    if (key === "hullLevel") p.stats.maxHull = 100 + (level + 1) * 60;
    if (key === "fuelLevel") p.stats.maxFuel = 100 + (level + 1) * 50;
    if (key === "cargoLevel") p.stats.maxCargo = 50 + (level + 1) * 35;
    setShopMsg(`${ug.label} Lv${level + 1}!`);
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2000);
    setHud((h) => ({ ...h, bob: p.stats.bob }));
  }

  function getDepthCostMultiplier() {
    const depth = maxDepthReachedRef.current;
    if (depth >= 120) return 3;
    if (depth >= 60) return 2;
    return 1;
  }

  function getRepairCost() {
    const p = playerRef.current;
    const base = Math.ceil((p.stats.maxHull - p.stats.hull) * 1.5);
    let cost = Math.ceil(base * getDepthCostMultiplier());
    // Jerry quest discount
    if (jerryRepairDiscountRef.current) cost = Math.floor(cost * 0.85);
    // Dom loyalty discount/penalty (consistent with upgrade cost logic)
    const domLoyRepair = metaProgressRef.current?.npcRelationships?.dom ?? 5;
    if (domLoyRepair >= 8) cost = Math.floor(cost * 0.9);
    else if (domLoyRepair <= 2) cost = Math.floor(cost * 1.15);
    if (activeModifierRef.current?.effect === "bargain_hunt")
      cost = Math.floor(cost * 0.75);
    return cost;
  }

  function getRefuelCost() {
    const p = playerRef.current;
    const base = Math.ceil((p.stats.maxFuel - p.stats.fuel) * 1.2);
    let cost = Math.ceil(base * getDepthCostMultiplier());
    // Dom loyalty discount/penalty
    const domLoyFuel = metaProgressRef.current?.npcRelationships?.dom ?? 5;
    if (domLoyFuel >= 8) cost = Math.floor(cost * 0.9);
    else if (domLoyFuel <= 2) cost = Math.floor(cost * 1.15);
    if (activeModifierRef.current?.effect === "bargain_hunt")
      cost = Math.floor(cost * 0.75);
    return cost;
  }

  function buyRepair() {
    const p = playerRef.current;
    const cost = getRepairCost();
    if (cost === 0) {
      setShopMsg("Hull is full!");
      return;
    }
    if (p.stats.bob < cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= cost;
    p.stats.hull = p.stats.maxHull;
    setShopMsg("Hull repaired!");
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2000);
    setHud((h) => ({ ...h, hull: p.stats.maxHull, bob: p.stats.bob }));
  }

  function buyRefuel() {
    const p = playerRef.current;
    const cost = getRefuelCost();
    if (cost === 0) {
      setShopMsg("Tank is full!");
      return;
    }
    if (p.stats.bob < cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= cost;
    p.stats.fuel = p.stats.maxFuel;
    setShopMsg("Refueled!");
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2000);
    setHud((h) => ({ ...h, fuel: p.stats.maxFuel, bob: p.stats.bob }));
  }

  function triggerSonar() {
    const p = playerRef.current;
    if (p.stats.sonarCount <= 0) return;
    if (p.stats.fuel < 5) return;
    p.stats.sonarCount--;
    p.stats.fuel -= 5;
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor(p.y / TILE);
    for (let dy = -10; dy <= 10; dy++) {
      for (let dx = -10; dx <= 10; dx++) {
        if (dx * dx + dy * dy <= 100) {
          const nx = ptx + dx;
          const ny = pty + dy;
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
            exploredRef.current[ny * MAP_W + nx] = 1;
          }
        }
      }
    }
    minimapDirtyRef.current = true;
    const cx = p.x + TILE / 2;
    const cy = p.y + TILE / 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      spawnParticle(
        cx,
        cy,
        Math.cos(a) * 3,
        Math.sin(a) * 3,
        25,
        25,
        "#22d3ee",
      );
    }
    addCommMessageRef.current?.("📡 SONAR PING! Area revealed.", "reward");
    setHud((h) => ({ ...h, sonarCount: p.stats.sonarCount }));
  }

  function triggerCharge() {
    const p = playerRef.current;
    if (p.stats.chargesCount <= 0) return;
    p.stats.chargesCount--;
    const ptx = Math.floor(p.x / TILE);
    const pty = Math.floor(p.y / TILE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = ptx + dx;
        const ny = pty + dy;
        if (ny < 3) continue;
        const t = getTile(nx, ny);
        if (t === T.EMPTY || t === T.HARD_ROCK || t === T.LAVA_TILE) continue;
        if (RESOURCES[t]) {
          if (p.stats.cargoWeight < p.stats.maxCargo) {
            const existing = p.cargo.find((c) => c.tile === t);
            if (existing) {
              existing.count++;
            } else {
              p.cargo.push({ tile: t as TileType, count: 1 });
            }
            p.stats.cargoWeight++;
          }
        }
        setTile(nx, ny, T.EMPTY);
        emitParticles(nx * TILE, ny * TILE, "#ff6600");
      }
    }
    shakeRef.current = { x: 0, y: 0, frames: 10 };
    addCommMessageRef.current?.("💥 CHARGE DETONATED!", "hazard");
    setHud((h) => ({ ...h, chargesCount: p.stats.chargesCount }));
  }

  function buyRefinementKit() {
    const p = playerRef.current;
    if (p.stats.refinementKitCount >= 1) {
      setShopMsg("Already have a Refinement Kit!");
      return;
    }
    let cost = 500;
    if (activeModifierRef.current?.effect === "black_market")
      cost = Math.floor(cost * 0.75);
    if (activeModifierRef.current?.effect === "bargain_hunt")
      cost = Math.floor(cost * 0.75);
    if (p.stats.bob < cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= cost;
    p.stats.refinementKitCount = 1;
    setShopMsg(
      "🔬 Refinement Kit ready! Press [X] to activate and double your next haul.",
    );
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2500);
    setHud((h) => ({ ...h, bob: p.stats.bob }));
  }

  function activateRefinementKit() {
    const p = playerRef.current;
    if (p.stats.refinementKitCount <= 0) return;
    if (refinementKitActiveRef.current) {
      tickerQueueRef.current.push("🔬 Refinery already active!");
      return;
    }
    p.stats.refinementKitCount = 0;
    refinementKitActiveRef.current = true;
    tickerQueueRef.current.push("🔬 REFINERY ACTIVE — next haul sells for 2x!");
  }

  function buyConsumable(type: "sonar" | "charge") {
    const p = playerRef.current;
    let cost = type === "sonar" ? 150 : 250;
    if (activeModifierRef.current?.effect === "black_market")
      cost = Math.floor(cost * 0.75);
    if (activeModifierRef.current?.effect === "bargain_hunt")
      cost = Math.floor(cost * 0.75);
    const key = type === "sonar" ? "sonarCount" : "chargesCount";
    if ((p.stats[key] as number) >= 3) {
      setShopMsg("Already at max (3)!");
      return;
    }
    if (p.stats.bob < cost) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= cost;
    (p.stats[key] as number)++;
    playShopPurchase();
    setShopMsg(
      `${type === "sonar" ? "📡 Sonar Ping" : "💥 Explosive Charge"} acquired!`,
    );
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2000);
    setHud((h) => ({ ...h, bob: p.stats.bob, [key]: p.stats[key] }));
  }

  function triggerSurfaceCall() {
    const p = playerRef.current;
    const currentDepth = Math.max(0, Math.floor(p.y / TILE) - 5);
    if (currentDepth <= 2) return; // already at surface
    if (p.stats.surfaceCallCount <= 0) return;
    p.stats.surfaceCallCount--;
    surfaceCallingRef.current = true;
    tickerQueueRef.current.push(
      "🚀 SURFACE CALL ACTIVATED — returning to surface!",
    );
    setHud((h) => ({ ...h, surfaceCallCount: p.stats.surfaceCallCount }));
  }

  function buyVeteranCache() {
    const meta = metaProgressRef.current;
    if (!meta) return;
    const p = playerRef.current;
    const vetBonus = meta.veteranSellBonus ?? 0;
    if (vetBonus >= 3) {
      setShopMsg("Veteran bonus already maxed!");
      return;
    }
    if (p.stats.bob < 1500) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= 1500;
    meta.veteranSellBonus = vetBonus + 1;
    saveMetaProgress(meta);
    const pct = (vetBonus + 1) * 5;
    tickerQueueRef.current.push(
      `⭐ Veteran bonus unlocked! All future sell prices +${pct}%!`,
    );
    setShopMsg(`⭐ Veteran Sell Bonus: +${pct}% (permanent)`);
    playShopPurchase();
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 3000);
    setHud((h) => ({ ...h, bob: p.stats.bob }));
  }

  function buySurfaceCall() {
    const p = playerRef.current;
    if (p.stats.surfaceCallCount >= 1) {
      setShopMsg("Already have a Surface Call!");
      return;
    }
    if (p.stats.bob < 300) {
      setShopMsg("Not enough BOB!");
      return;
    }
    p.stats.bob -= 300;
    p.stats.surfaceCallCount++;
    playShopPurchase();
    setShopMsg("🚀 Surface Call ready! Press [R] to activate.");
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShopMsg(""), 2500);
    setHud((h) => ({
      ...h,
      bob: p.stats.bob,
      surfaceCallCount: p.stats.surfaceCallCount,
    }));
  }

  // Auto-load cloud save when II login succeeds
  const prevIsLoggedIn = useRef(false);
  useEffect(() => {
    if (isIILoggedIn && !prevIsLoggedIn.current) {
      prevIsLoggedIn.current = true;
      void handleCloudSavePrompt();
    } else if (!isIILoggedIn) {
      prevIsLoggedIn.current = false;
    }
  }, [isIILoggedIn]);

  // ─── Internet Identity handlers ──────────────────────────────────────────
  function iiLogin() {
    iiLoginFn();
  }
  function iiLogout() {
    iiClearFn();
  }
  async function handleCloudSavePrompt() {
    if (!actor || !isIILoggedIn) return;
    try {
      const data = await actor.loadProgress();
      if (data) {
        setCloudSaveDialog(data);
      }
    } catch (e) {
      console.error("loadProgress error", e);
    }
  }
  async function syncSaveToChain() {
    if (!actor || !isIILoggedIn) return;
    const save = loadGame();
    if (!save) return;
    try {
      await actor.saveProgress(JSON.stringify(save));
    } catch (e) {
      console.error("saveProgress error", e);
    }
  }

  async function submitScore(bob: number, depth: number) {
    if (!playerName.trim() || !actor) return;
    setSubmitting(true);
    try {
      const scoreName = deepDiveModeRef.current
        ? `${playerName.trim()} [DEEP DIVE]`
        : playerName.trim();
      await actor.submitScore(
        scoreName,
        BigInt(Math.floor(bob)),
        BigInt(depth),
      );
      setSubmitted(true);
      // Auto-sync save to chain if logged in
      if (isIILoggedIn) void syncSaveToChain();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  }

  async function loadLeaderboard() {
    if (!actor) return;
    try {
      setLeaderboard(await actor.getLeaderboard());
    } catch (e) {
      console.error(e);
    }
  }

  const openLeaderboard = () => {
    syncScreen("leaderboard");
    loadLeaderboard();
  };

  const shopStats = playerRef.current.stats;

  // Cockpit comms helper
  const addCommMessage = (
    text: string,
    type: "hazard" | "reward" | "transmission" | "system",
  ) => {
    const id = ++commIdRef.current;
    setCommMessages((prev) => [...prev, { id, text, type }].slice(-8));
    // Also push to the bottom ticker
    // Queue message - show one at a time for 4s each
    tickerQueueRef.current.push(text);
    setTickerMessages((prev) => [...prev, text].slice(-20));
    if (!tickerDisplayTimerRef.current) {
      const showNext = () => {
        const next = tickerQueueRef.current.shift();
        if (next) {
          setCurrentTickerMsg(next);
          tickerDisplayTimerRef.current = setTimeout(showNext, 4000);
        } else {
          tickerDisplayTimerRef.current = null;
          setCurrentTickerMsg("");
        }
      };
      showNext();
    }
  };
  addCommMessageRef.current = addCommMessage;

  // Show character portrait helper
  const showPortrait = (npcId: string, text: string, color: string) => {
    if (portraitTimerRef.current) clearTimeout(portraitTimerRef.current);
    setActivePortrait({ npcId, text, color, timer: Date.now() });
    portraitTimerRef.current = setTimeout(() => {
      setActivePortrait(null);
    }, 5000);
  };
  showPortraitRef.current = showPortrait;

  // Feed story transmissions into the comms log
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  React.useEffect(() => {
    if (storyTransmission) {
      const addFn = addCommMessageRef.current;
      addFn(`📡 ${storyTransmission.title}`, "transmission");
      // Show Dom portrait with the transmission message
      showPortraitRef.current("dom", storyTransmission.msg, "#7c3aed");
    }
  }, [storyTransmission?.title]);

  // ─── Codex Screen ─────────────────────────────────────────────────────────────
  if (screen === "codex") {
    const oreList = [
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
      T.BOB_GENESIS,
    ];
    return (
      <div
        data-ocid="codex.panel"
        className="min-h-screen font-mono"
        style={{
          background: "linear-gradient(180deg,#0a0500 0%,#150800 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div
                className="text-2xl font-black tracking-widest"
                style={{ color: "#f5c542" }}
              >
                FIELD CODEX
              </div>
              <div className="text-xs text-gray-500">
                BOB Mining Co. Reference Guide
              </div>
            </div>
            <button
              type="button"
              data-ocid="codex.back_button"
              onClick={() => syncScreen("title")}
              className="px-4 py-2 text-xs font-bold border border-yellow-800 text-yellow-500 hover:bg-yellow-950 transition-colors"
            >
              ← BACK
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-yellow-900">
            <button
              type="button"
              data-ocid="codex.ore_tab"
              onClick={() => setCodexTab("ores")}
              className={`px-4 py-2 text-xs font-bold tracking-widest transition-colors ${
                codexTab === "ores"
                  ? "text-yellow-400 border-b-2 border-yellow-400 -mb-px"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              ORE TYPES
            </button>
            <button
              type="button"
              data-ocid="codex.upgrades_tab"
              onClick={() => setCodexTab("upgrades")}
              className={`px-4 py-2 text-xs font-bold tracking-widest transition-colors $
                codexTab === "upgrades"
                  ? "text-yellow-400 border-b-2 border-yellow-400 -mb-px"
                  : "text-gray-500 hover:text-gray-300"`}
            >
              UPGRADES
            </button>
            <button
              type="button"
              data-ocid="codex.controls_tab"
              onClick={() => setCodexTab("controls")}
              className={`px-4 py-2 text-xs font-bold tracking-widest transition-colors $
                codexTab === "controls"
                  ? "text-yellow-400 border-b-2 border-yellow-400 -mb-px"
                  : "text-gray-500 hover:text-gray-300"`}
            >
              CONTROLS
            </button>
          </div>

          {/* Ore Types Tab */}
          {codexTab === "ores" &&
            (() => {
              const discoveredIds = new Set(
                (localStorage.getItem("bob_discovered_ores") ?? "")
                  .split(",")
                  .filter(Boolean)
                  .map(Number),
              );
              const discoveredCount = oreList.filter(
                (id) => discoveredIds.has(id) || id === T.BOB_GENESIS,
              ).length;
              return (
                <div className="space-y-2">
                  <div className="text-xs text-gray-600 mb-3 text-right">
                    {discoveredCount}/{oreList.length} ores discovered
                  </div>
                  {oreList.map((tileId) => {
                    const res = RESOURCES[tileId];
                    if (!res) return null;
                    const isGenesis = tileId === T.BOB_GENESIS;
                    const isDiscovered = discoveredIds.has(tileId) || isGenesis;
                    return (
                      <div
                        key={tileId}
                        className="flex items-start gap-3 border px-3 py-2"
                        style={{
                          borderColor: isGenesis
                            ? "#ca8a04"
                            : isDiscovered
                              ? "#2a1a00"
                              : "#1a1a1a",
                          background: isGenesis
                            ? "rgba(202,138,4,0.1)"
                            : isDiscovered
                              ? "rgba(255,100,0,0.04)"
                              : "rgba(0,0,0,0.4)",
                          opacity: isDiscovered ? 1 : 0.7,
                        }}
                      >
                        {/* Ore sprite (blurred if undiscovered) */}
                        <div
                          className="flex-shrink-0 mt-0.5"
                          style={{
                            filter: isDiscovered
                              ? "none"
                              : "grayscale(1) brightness(0.3)",
                          }}
                        >
                          <OrePreviewTile tileId={tileId} label="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isDiscovered ? (
                            <>
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span
                                  className="font-bold text-sm"
                                  style={{ color: res.color }}
                                >
                                  {res.name}
                                </span>
                                {isGenesis && (
                                  <span className="text-xs px-1 border border-yellow-600 text-yellow-400">
                                    LEGENDARY
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-500 text-xs italic mt-0.5">
                                {res.era}
                              </div>
                              <div className="flex gap-4 mt-1 text-xs">
                                <span className="text-yellow-600">
                                  💰 {res.value} BOB
                                </span>
                                <span className="text-gray-600">
                                  📍 ~{res.depth}m deep
                                </span>
                                <span className="text-gray-700">
                                  ⚖ Weight {res.weight}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-bold text-sm text-gray-700">
                                ???
                              </div>
                              <div className="text-gray-700 text-xs italic mt-0.5">
                                Mine to discover
                              </div>
                              <div className="text-xs text-gray-700 mt-1">
                                📍 ~{res.depth}m deep
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

          {/* Upgrades Tab */}
          {codexTab === "upgrades" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {UPGRADES.map((ug) => (
                <div
                  key={ug.key}
                  className="border border-orange-900/50 bg-orange-950/20 px-3 py-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{ug.icon}</span>
                    <span className="font-bold text-orange-300 text-sm">
                      {ug.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{ug.desc}</div>
                  <div className="flex gap-1">
                    {ug.costs.map((cost, i) => (
                      <span
                        key={cost}
                        className="text-xs px-1.5 py-0.5 bg-black/40 border border-orange-900/50 text-orange-600"
                      >
                        Lv{i + 1}: {cost}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Controls Tab */}
          {codexTab === "controls" && (
            <div className="space-y-3">
              <div className="text-xs text-gray-600 mb-4">
                Master the drill. Get rich. Find the Genesis Block.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "← / A", action: "Move left" },
                  { key: "→ / D", action: "Move right" },
                  {
                    key: "↑ / W",
                    action: "Thrust upward (fly back to surface!)",
                  },
                  { key: "↓ / S", action: "Drill downward" },
                  { key: "← / →", action: "Drill sideways into walls" },
                  {
                    key: "Surface",
                    action: "Activates the shop (sell, repair, upgrade)",
                  },
                  { key: "Touch ▲", action: "Upward thrust (mobile)" },
                  { key: "Touch ◀▼▶", action: "Move & drill (mobile)" },
                ].map(({ key, action }) => (
                  <div
                    key={key}
                    className="flex items-start gap-3 border border-gray-800 px-3 py-2"
                  >
                    <span className="text-yellow-500 font-bold text-xs w-20 flex-shrink-0">
                      {key}
                    </span>
                    <span className="text-gray-400 text-xs">{action}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 border border-yellow-900 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-200">
                <div className="font-bold mb-1">🎯 OBJECTIVE</div>
                <div className="text-gray-400">
                  Dig to depth ~155m at the center of the map. Mine the BOB
                  Genesis Block to win. Return to the surface shop to sell ore
                  and upgrade your drill between runs.
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="text-center py-4 text-xs text-gray-700">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="text-gray-600 hover:text-gray-400 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </footer>
      </div>
    );
  }

  // ─── Title ────────────────────────────────────────────────────────────────────
  if (screen === "title")
    return (
      <TitleScreen
        startGame={startGame}
        openLeaderboard={openLeaderboard}
        syncScreen={syncScreen}
        onLogin={iiLogin}
        onLogout={iiLogout}
        isLoggedIn={isIILoggedIn}
        isLoggingIn={isIILoggingIn}
        principalShort={iiPrincipalShort}
      />
    );

  // ─── Leaderboard ──────────────────────────────────────────────────────────────
  if (screen === "leaderboard") {
    const rankColors = ["#ffd700", "#c0c0c0", "#cd7f32"];
    const rankIcons = ["🥇", "🥈", "🥉"];
    const currentName = playerName.trim();
    const filteredScores =
      leaderboardTab === "deepdive"
        ? leaderboard.filter(
            (s) => s.name.includes("[DEEP DIVE]") || s.name.includes("[DD]"),
          )
        : leaderboard.filter(
            (s) => !s.name.includes("[DEEP DIVE]") && !s.name.includes("[DD]"),
          );
    const resetCountdown = (() => {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setUTCHours(0, 0, 0, 0);
      const dayOfWeek = nextMonday.getUTCDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7;
      nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
      const diff = nextMonday.getTime() - now.getTime();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      return `${days}d ${hours}h`;
    })();
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mono"
        style={{ background: "#0a0500" }}
        data-ocid="leaderboard.panel"
      >
        <div
          className="w-full max-w-lg px-4 py-6"
          style={{
            border: "1px solid #a07020",
            borderRadius: "4px",
            boxShadow:
              "0 0 24px rgba(200,140,0,0.12), inset 0 0 40px rgba(0,0,0,0.4)",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <h2
            className="text-3xl font-black text-center mb-1 tracking-widest"
            style={{ color: "#f5c542", textShadow: "0 0 12px #f5c54240" }}
          >
            ⛏ LEADERBOARD
          </h2>
          <p className="text-center text-xs mb-3" style={{ color: "#5a3808" }}>
            TOP MINERS OF THE BOB GENESIS BLOCK
          </p>
          <div className="flex justify-center gap-2 mb-4">
            <button
              type="button"
              data-ocid="leaderboard.tab"
              onClick={() => setLeaderboardTab("normal")}
              className="px-4 py-1 text-xs font-bold tracking-widest"
              style={{
                background:
                  leaderboardTab === "normal" ? "#a07020" : "rgba(0,0,0,0.4)",
                color: leaderboardTab === "normal" ? "#000" : "#a07020",
                border: "1px solid #a07020",
              }}
            >
              NORMAL
            </button>
            <button
              type="button"
              data-ocid="leaderboard.tab"
              onClick={() => setLeaderboardTab("deepdive")}
              className="px-4 py-1 text-xs font-bold tracking-widest"
              style={{
                background:
                  leaderboardTab === "deepdive" ? "#ff6b00" : "rgba(0,0,0,0.4)",
                color: leaderboardTab === "deepdive" ? "#000" : "#ff6b00",
                border: "1px solid #ff6b00",
              }}
            >
              🔥 DEEP DIVE
            </button>
          </div>
          {/* Column headers */}
          {filteredScores.length > 0 && (
            <div
              className="flex items-center px-3 pb-1 mb-2"
              style={{ borderBottom: "1px solid #3d1c0060" }}
            >
              <span className="w-10 text-xs" style={{ color: "#6a4818" }}>
                RANK
              </span>
              <span
                className="flex-1 text-xs mx-3"
                style={{ color: "#6a4818" }}
              >
                MINER
              </span>
              <span
                className="w-32 text-right text-xs"
                style={{ color: "#6a4818" }}
              >
                BOB MINED
              </span>
              <span
                className="w-14 text-right text-xs"
                style={{ color: "#6a4818" }}
              >
                DEPTH
              </span>
            </div>
          )}
          {filteredScores.length === 0 ? (
            <p
              className="text-gray-500 text-center py-8"
              data-ocid="leaderboard.empty_state"
            >
              No scores yet. Be the first to mine!
            </p>
          ) : (
            <div className="space-y-1.5">
              {filteredScores.slice(0, 10).map((s, i) => {
                const isCurrentPlayer =
                  currentName &&
                  s.name.toLowerCase() === currentName.toLowerCase();
                const isTop3 = i < 3;
                return (
                  <div
                    key={s.name}
                    data-ocid={`leaderboard.item.${i + 1}`}
                    className="flex items-center px-3 py-2"
                    style={{
                      background: isCurrentPlayer
                        ? "rgba(245,197,66,0.1)"
                        : i % 2 === 0
                          ? "rgba(255,255,255,0.025)"
                          : "rgba(0,0,0,0.15)",
                      borderLeft: isCurrentPlayer
                        ? "2px solid #f5c54270"
                        : "2px solid transparent",
                    }}
                  >
                    <span
                      className="w-10 font-black"
                      style={{
                        color: isTop3 ? rankColors[i] : "#5a3808",
                        fontSize: isTop3 ? "1.2rem" : "0.85rem",
                        textShadow: isTop3
                          ? `0 0 6px ${rankColors[i]}60`
                          : "none",
                      }}
                    >
                      {isTop3 ? rankIcons[i] : `#${i + 1}`}
                    </span>
                    <span
                      className="flex-1 mx-3 font-bold truncate"
                      style={{
                        color: isCurrentPlayer
                          ? "#f5c542"
                          : isTop3
                            ? rankColors[i]
                            : "#d4a84b",
                      }}
                    >
                      {s.name}
                      {isCurrentPlayer && (
                        <span
                          className="ml-1 text-xs"
                          style={{ color: "#86efac" }}
                        >
                          ← YOU
                        </span>
                      )}
                    </span>
                    <span
                      className="w-32 text-right font-bold"
                      style={{
                        color: isTop3 ? rankColors[i] : "#f5c542",
                        fontSize: "0.8rem",
                      }}
                    >
                      {Number(s.bob).toLocaleString()} BOB
                    </span>
                    <span
                      className="w-14 text-right text-xs"
                      style={{ color: "#6b7280" }}
                    >
                      {s.depth.toString()}m
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center mt-4 text-xs" style={{ color: "#3d2200" }}>
            🔄 Resets in: {resetCountdown}
          </p>
          <button
            type="button"
            data-ocid="leaderboard.close_button"
            onClick={() => syncScreen("title")}
            className="mt-5 block mx-auto px-6 py-2 text-sm font-bold tracking-widest"
            style={{
              color: "#d4a84b",
              border: "1px solid #5a3808",
              background: "rgba(0,0,0,0.5)",
            }}
          >
            ← BACK
          </button>
        </div>
      </div>
    );
  }

  // ─── Cutscene ─────────────────────────────────────────────────────────────────
  if (screen === "cutscene") {
    return (
      <>
        <BobRocketCutscene
          onComplete={() => {
            // Show Dom epilogue before proceeding to summary/win
            setShowDomEpilogue(true);
            if (domEpilogueTimerRef.current)
              clearTimeout(domEpilogueTimerRef.current);
            domEpilogueTimerRef.current = setTimeout(() => {
              setShowDomEpilogue(false);
              if (won) {
                const secs =
                  gameStartTimeRef.current > 0
                    ? Math.floor(
                        (performance.now() - gameStartTimeRef.current) / 1000,
                      )
                    : 0;
                const timeStr =
                  secs > 0 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : "—";
                {
                  const metaWin2 = loadMetaProgress();
                  const isPBWin2 =
                    Math.floor(won.bob) > (metaWin2.bestBobInOneRun ?? 0) ||
                    won.depth > metaWin2.bestDepth;
                  setSummaryData({
                    isWin: true,
                    bob: Math.floor(won.bob),
                    depth: won.depth,
                    oresFound: won.oresFound ?? 0,
                    questsCompleted: won.questsCompleted ?? 0,
                    timePlayed: timeStr,
                    antagonistsDefeated: won.antagonistsDefeated ?? 0,
                    newMilestone: newMilestoneRef.current,
                    isPersonalBest: isPBWin2,
                    discoveredOreCount: discoveredOresRef.current.size,
                    totalOreCount: Object.keys(RESOURCES).filter(
                      (k) =>
                        Number(k) !== T.BOB_GENESIS &&
                        Number(k) !== T.LAVA_TUBE,
                    ).length,
                  });
                }
                syncScreen("summary");
              } else {
                syncScreen("win");
              }
            }, 8500);
          }}
        />
        {showDomEpilogue && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "rgba(10,8,4,0.96)",
                border: "2px solid #4fc3f7",
                borderRadius: "12px",
                padding: "24px",
                maxWidth: "460px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                boxShadow: "0 0 40px #4fc3f740, 0 0 80px #4fc3f720",
              }}
            >
              <NpcPortrait npcId="dom" size={72} />
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    color: "#4fc3f7",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
                  }}
                >
                  DOMINIC WILLIAMS — TRANSMISSION
                </div>
                <p
                  style={{
                    color: "#e0e0e0",
                    fontFamily: "monospace",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {isDeepDive
                    ? "You went deeper than anyone dared. The Genesis Block was just the beginning. What lies beneath... I'm not sure even I know. Well done, miner."
                    : "You found it. The BOB Genesis Block. This changes everything for the Internet Computer. The chain is now complete. Take this back to the surface — the world needs to know."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDomEpilogue(false);
                  if (domEpilogueTimerRef.current)
                    clearTimeout(domEpilogueTimerRef.current);
                  if (won) {
                    const secs =
                      gameStartTimeRef.current > 0
                        ? Math.floor(
                            (performance.now() - gameStartTimeRef.current) /
                              1000,
                          )
                        : 0;
                    const timeStr =
                      secs > 0
                        ? `${Math.floor(secs / 60)}m ${secs % 60}s`
                        : "—";
                    {
                      const metaWin = loadMetaProgress();
                      const isPBWin =
                        Math.floor(won.bob) > (metaWin.bestBobInOneRun ?? 0) ||
                        won.depth > metaWin.bestDepth;
                      setSummaryData({
                        isWin: true,
                        bob: Math.floor(won.bob),
                        depth: won.depth,
                        oresFound: won.oresFound ?? 0,
                        questsCompleted: won.questsCompleted ?? 0,
                        timePlayed: timeStr,
                        antagonistsDefeated: won.antagonistsDefeated ?? 0,
                        newMilestone: newMilestoneRef.current,
                        isPersonalBest: isPBWin,
                        discoveredOreCount: discoveredOresRef.current.size,
                        totalOreCount: Object.keys(RESOURCES).filter(
                          (k) =>
                            Number(k) !== T.BOB_GENESIS &&
                            Number(k) !== T.LAVA_TUBE,
                        ).length,
                      });
                    }
                    syncScreen("summary");
                  } else {
                    syncScreen("win");
                  }
                }}
                style={{
                  background: "#4fc3f7",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 32px",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                  letterSpacing: "0.1em",
                }}
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  if ((screen as Screen) === "summary" && summaryData) {
    return (
      <SummaryScreen
        isWin={summaryData.isWin}
        bob={summaryData.bob}
        depth={summaryData.depth}
        oresFound={summaryData.oresFound}
        questsCompleted={summaryData.questsCompleted}
        timePlayed={summaryData.timePlayed}
        antagonistsDefeated={summaryData.antagonistsDefeated ?? 0}
        totalWins={loadMetaProgress().totalRunsCompleted}
        newMilestone={summaryData.newMilestone}
        isPersonalBest={summaryData.isPersonalBest}
        runSeed={runSeedRef.current || undefined}
        bestBob={loadMetaProgress().bestBobInOneRun ?? 0}
        bestDepth={loadMetaProgress().bestDepth ?? 0}
        newBonusUnlocked={
          summaryData.isWin
            ? (() => {
                const m = loadMetaProgress();
                const count = m.permanentBonuses ?? 0;
                if (count <= 1) return `+${count * 2}% cargo capacity`;
                if (count <= 2) return `+${count}% fuel efficiency`;
                if (count <= 3) return `+${count}% sell bonus`;
                if (count <= 4) return `+${Math.floor(count / 2)}% hull armor`;
                return `+${count}% BOB from antagonists`;
              })()
            : undefined
        }
        discoveredOreCount={summaryData.discoveredOreCount}
        totalOreCount={summaryData.totalOreCount}
        onLeaderboard={() => syncScreen("leaderboard")}
        onPlayAgain={() => startGame(false)}
      />
    );
  }

  // ─── Win ──────────────────────────────────────────────────────────────────────
  if (screen === "win") {
    const runTimeSecs =
      gameStartTimeRef.current > 0
        ? Math.floor((performance.now() - gameStartTimeRef.current) / 1000)
        : 0;
    const runTimeStr =
      runTimeSecs > 0
        ? `${Math.floor(runTimeSecs / 60)}m ${runTimeSecs % 60}s`
        : "—";
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mono overflow-y-auto py-6"
        style={{
          background:
            "radial-gradient(ellipse at center, #1a0a00 0%, #0a0500 100%)",
        }}
      >
        {/* Trophy Card */}
        <div
          className="relative mx-4 px-6 py-8 text-center"
          style={{
            border: "2px solid #d4a84b",
            boxShadow:
              "0 0 40px rgba(212,168,75,0.25), inset 0 0 60px rgba(0,0,0,0.6)",
            maxWidth: "420px",
            width: "100%",
            background: "linear-gradient(180deg, #1a0e00 0%, #0d0700 100%)",
          }}
        >
          {/* Corner ornaments */}
          <div
            className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2"
            style={{ borderColor: "#d4a84b" }}
          />
          <div
            className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2"
            style={{ borderColor: "#d4a84b" }}
          />
          <div
            className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2"
            style={{ borderColor: "#d4a84b" }}
          />
          <div
            className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2"
            style={{ borderColor: "#d4a84b" }}
          />

          <div className="text-4xl mb-1">🏆</div>
          <div
            className="text-4xl font-black mb-1"
            style={{ color: "#ffea00", textShadow: "0 0 30px #ffea0080" }}
          >
            YOU FOUND IT!
          </div>
          <div className="text-lg text-orange-400 font-bold mb-1">
            BOB Genesis Block
          </div>
          {isDeepDive && (
            <div
              className="inline-block px-3 py-0.5 text-xs font-black text-black mb-3"
              style={{
                background: "linear-gradient(135deg, #ff6b00, #ff0040)",
              }}
            >
              🔥 DEEP DIVE RUN
            </div>
          )}
          <div className="text-gray-500 text-xs mb-3">
            The origin of all BOB — crystallized at the dawn of ICP.
          </div>

          {/* Dom epilogue */}
          <div
            className="text-center mb-4 px-2"
            style={{
              fontSize: "13px",
              color: "#d4a84b",
              fontStyle: "italic",
              opacity: 0.9,
            }}
          >
            {isDeepDive
              ? '"You went deeper than anyone. The protocol salutes you." — Dom'
              : '"The Genesis Block has been recovered. The network... remembers." — Dom'}
          </div>

          {/* Stats grid */}
          {won && (
            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(212,168,75,0.08)",
                  border: "1px solid #3d2200",
                }}
              >
                <div className="text-yellow-400 font-black text-xl">
                  {Math.floor(won.bob).toLocaleString()}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">⛏ BOB EARNED</div>
              </div>
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(212,168,75,0.08)",
                  border: "1px solid #3d2200",
                }}
              >
                <div className="text-white font-black text-xl">
                  {won.depth}m
                </div>
                <div className="text-gray-500 text-xs mt-0.5">📏 MAX DEPTH</div>
              </div>
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(100,150,255,0.08)",
                  border: "1px solid #1a2060",
                }}
              >
                <div className="text-blue-400 font-black text-xl">
                  {won.oresFound ?? 0}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">
                  💎 ORES FOUND
                </div>
              </div>
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(100,255,100,0.08)",
                  border: "1px solid #1a4020",
                }}
              >
                <div className="text-green-400 font-black text-xl">
                  {won.questsCompleted ?? 0}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">
                  📋 QUESTS DONE
                </div>
              </div>
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(212,168,75,0.05)",
                  border: "1px solid #2a1800",
                }}
              >
                <div className="text-yellow-600 font-bold text-base">
                  {runTimeStr}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">⏱ RUN TIME</div>
              </div>
              <div
                className="p-3 text-center"
                style={{
                  background: "rgba(255,100,100,0.08)",
                  border: "1px solid #401010",
                }}
              >
                <div className="text-red-400 font-black text-xl">
                  {won.antagonistsDefeated ??
                    antagonistsDefeatedThisRunRef.current ??
                    0}
                </div>
                <div className="text-gray-500 text-xs mt-0.5">💀 DEFEATED</div>
              </div>
              {(() => {
                const tw = loadMetaProgress().totalRunsCompleted;
                return tw > 0 ? (
                  <div
                    className="col-span-3 p-3 text-center"
                    style={{
                      background: "rgba(212,168,75,0.10)",
                      border: "1px solid #5a3a00",
                    }}
                  >
                    <div className="text-yellow-300 font-black text-2xl">
                      {tw}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      🏁 TOTAL WINS (ALL TIME)
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Score submission */}
          {!submitted ? (
            <div className="space-y-2 mb-4">
              <input
                data-ocid="score.input"
                className="w-full px-3 py-2 bg-black border border-yellow-800 text-white font-mono text-center text-sm"
                placeholder="Enter your miner name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
              <button
                type="button"
                data-ocid="score.submit_button"
                onClick={() => won && submitScore(won.bob, won.depth)}
                disabled={submitting || !playerName.trim()}
                className="w-full py-2 font-bold text-black text-sm disabled:opacity-50"
                style={{
                  background: "linear-gradient(90deg, #d4a84b, #f5c542)",
                }}
              >
                {submitting ? "Saving..." : "⛏ SUBMIT TO LEADERBOARD"}
              </button>
            </div>
          ) : (
            <div className="text-green-400 font-bold text-sm mb-4">
              ✓ Score submitted to the chain!
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              type="button"
              data-ocid="win.deep_dive_button"
              onClick={() => startGame(false, true)}
              className="w-full py-3 font-black text-black text-sm"
              style={{
                background: "linear-gradient(135deg, #ff6b00, #ff0040)",
                boxShadow: "0 0 20px rgba(255,107,0,0.4)",
              }}
            >
              🔥 DEEP DIVE MODE
            </button>
            <div className="text-xs text-orange-500 opacity-70">
              Start at 60m · 1.5x ore · 1.5x enemies
            </div>
            <button
              type="button"
              data-ocid="win.new_game_button"
              onClick={() => startGame(false)}
              className="w-full py-2 text-sm font-bold"
              style={{
                color: "#d4a84b",
                border: "1px solid #3d2200",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              NEW GAME
            </button>
            <button
              type="button"
              data-ocid="win.main_menu_button"
              onClick={() => syncScreen("title")}
              className="block mx-auto text-xs text-gray-600 hover:text-gray-400 underline"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Over ────────────────────────────────────────────────────────────────
  if (screen === "gameover")
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center font-mono"
        style={{ background: "#0a0500" }}
      >
        <div className="text-center space-y-4 px-4">
          <div className="text-5xl font-black text-red-500">GAME OVER</div>
          {/* Jerry quip */}
          <div
            style={{
              fontSize: "13px",
              color: "#9ca3af",
              fontStyle: "italic",
              opacity: 0.9,
            }}
          >
            {
              [
                '"Happens to the best of us, mate. Fill up and go again." — Jerry',
                '"Hull integrity: zero. Dignity: also zero. Try again?" — Jerry',
                '"The mine takes what the mine takes. Come back stronger." — Jerry',
              ][Math.floor(Date.now() / 3600000) % 3]
            }
          </div>
          {gameOver && (
            <>
              <div className="text-gray-400 capitalize">{gameOver.reason}</div>
              <div className="grid grid-cols-2 gap-3 mt-2 text-sm max-w-xs mx-auto">
                <div className="bg-gray-900 border border-yellow-900 p-2 text-center rounded">
                  <div className="text-yellow-400 font-bold text-lg">
                    {Math.floor(gameOver.bob)}
                  </div>
                  <div className="text-gray-500 text-xs">BOB EARNED</div>
                </div>
                <div className="bg-gray-900 border border-red-900 p-2 text-center rounded">
                  <div className="text-white font-bold text-lg">
                    {gameOver.depth}m
                  </div>
                  <div className="text-gray-500 text-xs">MAX DEPTH</div>
                </div>
              </div>
            </>
          )}
          {!submitted ? (
            <div className="mt-2 space-y-3">
              <input
                data-ocid="score.input"
                className="w-48 px-3 py-2 bg-gray-900 border border-red-800 text-white font-mono text-center"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
              <button
                type="button"
                data-ocid="score.submit_button"
                onClick={() =>
                  gameOver && submitScore(gameOver.bob, gameOver.depth)
                }
                disabled={submitting || !playerName.trim()}
                className="block w-48 py-2 mx-auto font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "SUBMIT SCORE"}
              </button>
            </div>
          ) : (
            <div className="text-green-400 font-bold">Score submitted!</div>
          )}
          <button
            type="button"
            onClick={() => startGame(false)}
            className="mt-4 block mx-auto text-sm text-orange-400 hover:text-orange-300 underline"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => syncScreen("title")}
            className="block mx-auto text-xs text-gray-600 hover:text-gray-400 underline"
          >
            Main Menu
          </button>
        </div>
      </div>
    );

  // ─── Game ─────────────────────────────────────────────────────────────────────
  const fuelCritical = hud.fuel < hud.maxFuel * 0.15;
  const hullCritical = hud.hull < hud.maxHull * 0.2;

  return (
    <div
      className="w-screen h-screen overflow-hidden bg-black relative font-mono"
      style={{}}
    >
      <style>{`
        @keyframes bob-pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .bob-bar-critical {
          animation: bob-pulse-red 0.6s ease-in-out infinite;
        }
      `}</style>

      <canvas
        data-ocid="game.canvas_target"
        ref={canvasRef}
        className="absolute"
        style={{ top: 0, left: 0, display: "block" }}
        tabIndex={0}
      />

      {autoAscending && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 50 }}
        >
          <div
            className="text-center font-mono animate-pulse"
            style={{
              background: "rgba(0,0,0,0.75)",
              border: "2px solid #ffea00",
              borderRadius: 8,
              padding: "16px 32px",
              boxShadow: "0 0 40px #ffea0088",
            }}
          >
            <div
              style={{ fontSize: 36, filter: "drop-shadow(0 0 12px #ffea00)" }}
            >
              ⬡
            </div>
            <div
              style={{
                color: "#ffea00",
                fontSize: 18,
                fontWeight: "bold",
                marginTop: 4,
              }}
            >
              BOB GENESIS FOUND
            </div>
            <div style={{ color: "#ff9800", fontSize: 12, marginTop: 4 }}>
              Ascending to surface...
            </div>
          </div>
        </div>
      )}

      {/* Low fuel tooltip */}
      {lowFuelTooltip && (
        <div
          className="absolute z-30 font-mono text-xs px-3 py-2 rounded animate-pulse"
          style={{
            bottom: isTouchDevice ? 230 : 90,
            left: "8px",
            background: "rgba(0,0,0,0.9)",
            border: "1px solid #22d3ee",
            color: "#22d3ee",
            boxShadow: "0 0 12px #22d3ee40",
            pointerEvents: "none",
          }}
        >
          ⛽ Low fuel! Return to the BOB SHOP to refuel.
        </div>
      )}
      {/* Low hull tooltip */}
      {lowHullTooltip && (
        <div
          className="absolute z-30 font-mono text-xs px-3 py-2 rounded animate-pulse"
          style={{
            bottom: isTouchDevice ? 200 : 60,
            left: "8px",
            background: "rgba(0,0,0,0.9)",
            border: "1px solid #ef4444",
            color: "#ef4444",
            boxShadow: "0 0 12px #ef444440",
            pointerEvents: "none",
          }}
        >
          🛡 Hull damaged! Get repairs at the BOB SHOP.
        </div>
      )}

      {/* Modifier Select Overlay */}
      {showModifierSelect && (
        <ModifierSelectOverlay
          choices={modifierChoices}
          onSelect={confirmModifier}
        />
      )}

      {/* New player tutorial panel overlay */}
      {showTutorialPanel && (
        <div
          className="absolute z-40 font-mono pointer-events-auto"
          style={{
            bottom: isTouchDevice ? 230 : 42,
            left: 8,
            maxWidth: 220,
            background: "rgba(10,8,2,0.95)",
            border: "1px solid #8B6914",
            boxShadow: "0 0 16px rgba(139,105,20,0.3)",
            padding: "8px 10px",
          }}
        >
          <div className="text-xs font-bold mb-1" style={{ color: "#d4a84b" }}>
            ⛏ HOW TO MINE
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>
            ← → to move &amp; drill. ↓ to dig down.
            <br />
            Hold ↑ / W to fly back up through tunnels.
            <br />
            Sell your ore at the BOB SHOP on the surface.
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("bob_ingame_tutorial_done", "1");
              setShowTutorialPanel(false);
            }}
            className="mt-2 text-xs font-bold w-full py-0.5"
            style={{
              background: "#1a1208",
              border: "1px solid #4a3a10",
              color: "#6b7280",
              cursor: "pointer",
            }}
          >
            GOT IT ✕
          </button>
        </div>
      )}
      {/* ── Cockpit Top Status Strip ─────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 z-15 flex items-center justify-between px-3 py-1 select-none pointer-events-none font-mono"
        style={{
          top: "max(0px, env(safe-area-inset-top, 0px))",
          background:
            "linear-gradient(180deg, rgba(10,8,2,0.92) 0%, rgba(10,8,2,0.0) 100%)",
          borderBottom: "1px solid rgba(139,105,20,0.3)",
        }}
      >
        <div
          className="text-xs font-bold tracking-widest px-2 py-0.5"
          style={{
            color: (() => {
              const d = hud.depth;
              if (d < 15) return "#7ec850";
              if (d < 45) return "#c8a06a";
              if (d < 80) return "#aaa";
              if (d < 115) return "#7ad4ff";
              if (d < 140) return "#ff8c00";
              return "#ff3050";
            })(),
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(139,105,20,0.4)",
            letterSpacing: "0.15em",
          }}
        >
          {(() => {
            const d = hud.depth;
            if (d < 15) return "⬡ SURFACE";
            if (d < 45) return "⬡ DIRT LAYER";
            if (d < 80) return "⬡ STONE LAYER";
            if (d < 115) return "⬡ CRYSTAL CAVERNS";
            if (d < 140) return "⬡ LAVA FIELDS";
            return "⬡ THE DEEP";
          })()}
        </div>
        {hud.drillTarget && (
          <div
            className="text-xs"
            style={{
              color: "#f97316",
              background: "rgba(0,0,0,0.5)",
              padding: "1px 8px",
            }}
          >
            ⛏ {hud.drillTarget}
          </div>
        )}
      </div>

      {/* Controls hint moved - now rendered above instrument panel */}

      {/* Mute button */}
      <button
        type="button"
        data-ocid="game.toggle"
        onClick={() => setMuted((m) => !m)}
        className="absolute z-20 font-mono text-sm"
        style={{
          top: 8,
          right: 136,
          background: "rgba(0,0,0,0.6)",
          border: "1px solid #3a2a00",
          padding: "2px 6px",
          color: muted ? "#555" : "#f5c542",
          cursor: "pointer",
        }}
        title={muted ? "Unmute sounds" : "Mute sounds"}
      >
        {muted ? "🔇" : "🔊"}
      </button>

      {/* Cave-in warning */}
      {caveInWarningRef.current && caveInWarningFramesRef.current > 0 && (
        <div
          className="absolute z-20 font-mono text-sm font-bold pointer-events-none animate-pulse"
          style={{
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(180,0,0,0.9)",
            color: "#fff",
            border: "2px solid #ff0000",
            padding: "8px 20px",
            maxWidth: "90vw",
            letterSpacing: "0.15em",
          }}
          data-ocid="game.cave_in_warning"
        >
          ⚠ CAVE-IN WARNING! ⚠
        </div>
      )}

      {/* Gas pocket warning */}
      {gasWarning && (
        <div
          className="absolute z-20 font-mono text-xs font-bold animate-pulse pointer-events-none"
          style={{
            top: "38%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,50,0,0.85)",
            color: "#7fff00",
            border: "1px solid #3a6a00",
            padding: "5px 14px",
          }}
        >
          ☠ GAS LEAK! — Hull damage!
        </div>
      )}

      {/* Water jam warning */}
      {waterWarning && (
        <div
          className="absolute z-20 font-mono text-xs font-bold pointer-events-none"
          style={{
            top: gasWarning ? "46%" : "38%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,15,50,0.85)",
            color: "#60a0ff",
            border: "1px solid #003080",
            padding: "5px 14px",
          }}
        >
          💧 DRILL JAMMED — Can&apos;t drill in water!
        </div>
      )}

      {/* Lava surge countdown */}
      {lavaSurgeRef.current && (
        <div
          className="absolute z-20 font-mono text-sm font-bold pointer-events-none"
          style={{
            top: "30%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(120,20,0,0.95)",
            color: "#ff8c00",
            border: "2px solid #ff4500",
            padding: "8px 20px",
          }}
          data-ocid="game.lava_surge_warning"
        >
          🌋 LAVA SURGE — {Math.ceil(lavaSurgeTimerRef.current / 60)}s — ASCEND!
        </div>
      )}

      {/* Lava warning */}
      {lavaWarning && (
        <div
          className="absolute z-20 font-mono text-xs font-bold animate-pulse pointer-events-none"
          style={{
            top: gasWarning || waterWarning ? "46%" : "38%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(80,10,0,0.9)",
            color: "#ff6600",
            border: "1px solid #cc3300",
            padding: "5px 14px",
          }}
        >
          🌋 LAVA! HULL MELTING!
        </div>
      )}

      {/* Treasure / lore message */}
      {loreMsg && (
        <div
          className="absolute z-20 font-mono text-xs font-bold text-center pointer-events-none"
          style={{
            bottom: 130,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,10,0,0.92)",
            color: "#fde047",
            border: "1px solid #ca8a04",
            padding: "6px 16px",
            maxWidth: "80vw",
            boxShadow: "0 0 20px rgba(245,197,66,0.3)",
          }}
        >
          {loreMsg}
        </div>
      )}

      {/* Random depth event message */}
      {eventMsg && (
        <div
          className="absolute z-30 font-mono text-xs font-bold text-center pointer-events-none"
          style={{
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(5,0,20,0.95)",
            color: "#a78bfa",
            border: "2px solid #7c3aed",
            padding: "10px 20px",
            maxWidth: "85vw",
            boxShadow: "0 0 30px rgba(124,58,237,0.5)",
            whiteSpace: "pre-line",
          }}
        >
          {eventMsg}
        </div>
      )}

      {/* Active Synergy Badges on HUD */}
      {activeSynergies.length > 0 && screen === "game" && (
        <div
          className="absolute z-20 flex gap-2 pointer-events-none"
          style={{ top: 52, left: "50%", transform: "translateX(-50%)" }}
        >
          {activeSynergies.map((key) => {
            const path = BUILD_PATHS[key as keyof typeof BUILD_PATHS];
            return (
              <div
                key={key}
                className="text-xs font-bold px-2 py-0.5 font-mono"
                style={{
                  background: `${path.color}22`,
                  border: `1px solid ${path.color}`,
                  color: path.color,
                  boxShadow: `0 0 8px ${path.color}60`,
                  maxWidth: "min(200px, 45vw)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                ⚡ {path.label} — {path.bonusDesc}
              </div>
            );
          })}
        </div>
      )}

      {/* Active Modifier Badge */}
      {activeModifierRef.current && screen === "game" && (
        <div
          className="absolute z-20 pointer-events-none font-mono text-xs font-bold px-2 py-0.5"
          style={{
            top: 52,
            right: 124,
            background: "rgba(20,14,2,0.9)",
            border: "1px solid #ffd700",
            color: "#ffd700",
            boxShadow: "0 0 8px rgba(255,215,0,0.4)",
            maxWidth: 160,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          ⚡ {activeModifierRef.current.label.replace(/^[^\s]+ /, "")}
        </div>
      )}

      {/* Story Transmission Popup */}
      {storyTransmission && screen === "game" && !showTutorialPanel && (
        <div
          data-ocid="story.dialog"
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="font-mono p-4 max-w-sm w-full mx-4 text-center"
            style={{
              background: "#050015",
              border: "2px solid #7c3aed",
              boxShadow: "0 0 60px rgba(124,58,237,0.5)",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div
              className="text-xs tracking-widest mb-3"
              style={{ color: "#a78bfa" }}
            >
              {storyTransmission.title}
            </div>
            <div className="text-sm text-gray-200 mb-5 leading-relaxed">
              &quot;{storyTransmission.msg}&quot;
            </div>
            <button
              type="button"
              data-ocid="story.close_button"
              onClick={() => {
                setStoryTransmission(null);
                // Veteran bonus is now handled via delayed setTimeout in startGame
              }}
              className="px-6 py-2 text-xs font-bold"
              style={{ background: "#7c3aed", color: "#fff" }}
            >
              UNDERSTOOD ⚡
            </button>
          </div>
        </div>
      )}

      {/* Veteran Bonus Message */}
      {veteranBonusMsg && !showTutorialPanel && (
        <div
          className="absolute z-40 font-mono text-xs font-bold text-center pointer-events-none"
          style={{
            top: 58,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(20,10,50,0.96)",
            color: "#fbbf24",
            border: "2px solid #f59e0b",
            padding: "10px 20px",
            maxWidth: "90vw",
            boxShadow: "0 0 30px rgba(251,191,36,0.4)",
          }}
        >
          {veteranBonusMsg}
        </div>
      )}

      {/* Active Hazard Banner */}
      {airdropCrate &&
        !airdropCrate.collected &&
        screen === "game" &&
        !atSurface && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 text-center animate-pulse">
            <div
              className="px-4 py-2 font-mono text-sm font-bold text-black"
              style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                boxShadow: "0 0 20px #fbbf24",
              }}
            >
              📦 AIRDROP ↑ SURFACE — collect in {airdropCrate.timer}s!
            </div>
          </div>
        )}
      {questFanfare && screen === "game" && (
        <div
          data-ocid="quest.success_state"
          className="absolute z-50 pointer-events-none"
          style={{
            top: 58,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
            border: "2px solid #d4a84b",
            padding: "10px 24px",
            textAlign: "center",
            minWidth: "240px",
            maxWidth: "85vw",
            boxShadow: "0 0 30px rgba(212,168,75,0.5)",
          }}
        >
          <div className="text-yellow-300 font-black text-base tracking-widest">
            ✓ QUEST COMPLETE!
          </div>
          <div className="text-white text-xs mt-0.5 opacity-90">
            {questFanfare.text}
          </div>
        </div>
      )}
      {deepDiveBannerVisible && screen === "game" && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 50,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(20,10,0,0.92)",
            border: "2px solid #f97316",
            padding: "18px 40px",
            textAlign: "center",
            boxShadow: "0 0 60px rgba(249,115,22,0.7)",
            animation: "deepDiveFadeOut 3s ease-in-out forwards",
          }}
        >
          <div
            className="font-mono font-bold text-2xl"
            style={{ color: "#f97316", textShadow: "0 0 20px #f97316" }}
          >
            🔥 DEEP DIVE MODE ACTIVE
          </div>
          <div className="font-mono text-sm mt-1" style={{ color: "#d4a84b" }}>
            Danger increased · Ore richer · Head Fudder at 100m
          </div>
        </div>
      )}

      {activeHazardBanner && screen === "game" && (
        <div
          data-ocid="hazard.dialog"
          className="absolute z-35 pointer-events-none"
          style={{
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(180,20,0,0.95)",
            border: "3px solid #ff4400",
            padding: "16px 24px",
            textAlign: "center",
            minWidth: "min(280px, 90vw)",
            maxWidth: "90vw",
            boxShadow: "0 0 60px rgba(255,68,0,0.7)",
            animation: "pulse 0.5s ease-in-out infinite",
          }}
        >
          <div className="text-3xl mb-1">{activeHazardBanner.icon}</div>
          <div className="font-mono font-bold text-xl text-white mb-1">
            {activeHazardBanner.title}
          </div>
          <div className="font-mono font-bold text-sm text-yellow-300 mb-2">
            {activeHazardBanner.instruction}
          </div>
          <div className="font-mono text-3xl font-bold text-red-300">
            {activeHazardBanner.countdown}s
          </div>
        </div>
      )}

      {screen === "game" && (
        <button
          type="button"
          className="fixed font-mono text-xs font-bold pointer-events-auto"
          style={{
            top: 54,
            left: 8,
            zIndex: 25,
            background: missionsVisible
              ? "rgba(30,20,4,0.95)"
              : "rgba(10,8,2,0.85)",
            border: `1px solid ${missionsVisible ? "#d4a84b" : runQuests.some((rq) => !rq.completed) ? "#f97316" : "#4a3a10"}`,
            color: missionsVisible
              ? "#d4a84b"
              : runQuests.some((rq) => !rq.completed)
                ? "#f97316"
                : "#6b7280",
            padding: "3px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 2,
            animation: questPulseActive
              ? "questPulseComplete 0.4s ease-in-out 5"
              : !missionsVisible && runQuests.some((rq) => !rq.completed)
                ? "questPulse 2s ease-in-out infinite"
                : "none",
            fontSize: 12,
          }}
          onClick={() => {
            setMissionsVisible((v) => !v);
            setQuestPulseActive(false);
          }}
        >
          <span style={{ marginRight: 4 }}>⬡</span>
          MISSIONS
          {runQuests.filter((rq) => !rq.completed).length > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: "#f97316",
                color: "#fff",
                borderRadius: "50%",
                width: 16,
                height: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {runQuests.filter((rq) => !rq.completed).length}
            </span>
          )}
          <span style={{ marginLeft: 4 }}>{missionsVisible ? "▲" : "▼"}</span>
        </button>
      )}
      {/* Quest Panel (Jerry run quests + NPC active quest) */}
      {missionsVisible &&
        screen === "game" &&
        (runQuests.length > 0 ||
          (npcQuestActive && !npcQuestActive.completed)) && (
          <div
            className="absolute z-22 font-mono"
            style={{
              top: 58,
              left: 8,
              minWidth: 120,
              maxWidth: "min(180px, calc(100vw - 160px))",
              maxHeight: "calc(40vh - 60px)",
              overflowY: "auto" as const,
            }}
          >
            <div
              className="text-xs"
              style={{
                background: "linear-gradient(180deg, #0e0b04 0%, #0d0a04 100%)",
                border: "1px solid #8B6914",
                boxShadow:
                  "0 0 12px rgba(139,105,20,0.3), inset 0 1px 0 rgba(255,200,50,0.08)",
              }}
            >
              {/* Header with toggle */}
              <button
                type="button"
                className="flex items-center justify-between w-full px-2 py-1 cursor-pointer select-none bg-transparent border-0"
                style={{ borderBottom: "1px solid rgba(139,105,20,0.4)" }}
                onClick={() => {
                  questPanelCollapsedRef.current =
                    !questPanelCollapsedRef.current;
                  setQuestPanelCollapsed(questPanelCollapsedRef.current);
                }}
              >
                <span
                  className="font-bold text-xs tracking-widest"
                  style={{ color: "#d4a84b" }}
                >
                  ⬡ MISSIONS
                </span>
                <span className="text-xs" style={{ color: "#8B6914" }}>
                  {questPanelCollapsed ? "▼" : "▲"}
                </span>
              </button>
              {!questPanelCollapsed && (
                <div className="p-2 space-y-2">
                  {/* Jerry run quests */}
                  {runQuests.map((rq) => (
                    <div
                      key={rq.id}
                      className="space-y-0.5"
                      style={{
                        animation: rq.completed
                          ? "questFlash 0.6s ease-out"
                          : "none",
                        background: rq.completed
                          ? "rgba(212,168,75,0.12)"
                          : "transparent",
                        borderRadius: "3px",
                        padding: rq.completed ? "2px 4px" : "0",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {rq.completed ? (
                          <span className="text-yellow-400 text-xs">✓</span>
                        ) : (
                          <span className="text-purple-500 text-xs">›</span>
                        )}
                        <span
                          className="text-xs leading-tight truncate"
                          style={{
                            color: rq.completed ? "#ffd700" : "#d1d5db",
                            maxWidth: 160,
                          }}
                        >
                          {rq.description}
                        </span>
                        {rq.npcId !== "jerry" && (
                          <div
                            className="text-xs ml-4"
                            style={{ color: "#8B6914", fontStyle: "italic" }}
                          >
                            (from{" "}
                            {rq.npcId === "dom"
                              ? "Dom"
                              : rq.npcId === "bob"
                                ? "BOB the Dog"
                                : rq.npcId === "whale"
                                  ? "The Whale"
                                  : rq.npcId}
                            )
                          </div>
                        )}
                      </div>
                      {!rq.completed && (
                        <div className="flex items-center gap-1">
                          <div
                            className="flex-1 h-1 rounded"
                            style={{ background: "rgba(255,255,255,0.1)" }}
                          >
                            <div
                              className="h-1 rounded transition-all"
                              style={{
                                width: `${Math.min(100, (rq.progress / rq.goal) * 100)}%`,
                                background:
                                  rq.progress >= rq.goal
                                    ? "#ffd700"
                                    : "#7c3aed",
                              }}
                            />
                          </div>
                          <span className="text-gray-500 text-xs whitespace-nowrap">
                            {rq.progress}/{rq.goal}
                          </span>
                        </div>
                      )}
                      {!rq.completed && (
                        <div className="text-xs" style={{ color: "#6b7280" }}>
                          {rq.reward}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* NPC Active Quest (Dom/Jan/Whale) */}
                  {npcQuestActive && !npcQuestActive.completed && (
                    <div
                      className="space-y-0.5"
                      style={{ borderTop: "1px solid #3b0764", paddingTop: 6 }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-blue-400 text-xs">★</span>
                        <span
                          className="text-gray-300 text-xs leading-tight truncate"
                          style={{ maxWidth: 160 }}
                        >
                          {npcQuestActive.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="flex-1 h-1 rounded"
                          style={{ background: "rgba(255,255,255,0.1)" }}
                        >
                          <div
                            className="h-1 rounded"
                            style={{
                              width: `${Math.min(100, (npcQuestActive.progress / npcQuestActive.goal) * 100)}%`,
                              background: "#3b82f6",
                            }}
                          />
                        </div>
                        <span className="text-gray-500 text-xs">
                          {npcQuestActive.progress}/{npcQuestActive.goal}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "#6b7280" }}>
                        {npcQuestActive.reward.replace(/_/g, " ")}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Cloud Save Dialog */}
      {cloudSaveDialog && (
        <div
          data-ocid="cloud_save.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="font-mono text-center p-6 max-w-sm w-full mx-4"
            style={{
              background: "#0a0a12",
              border: "2px solid #3b82f6",
              boxShadow: "0 0 40px #3b82f640",
            }}
          >
            <div className="text-blue-400 font-black text-lg mb-2 tracking-widest">
              ☁ CLOUD SAVE FOUND
            </div>
            <div className="text-gray-400 text-sm mb-5">
              Load your cloud save? This will replace your current local save.
            </div>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                data-ocid="cloud_save.confirm_button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(cloudSaveDialog);
                    localStorage.setItem(
                      "bobMiningCoSave",
                      JSON.stringify(parsed),
                    );
                  } catch {}
                  setCloudSaveDialog(null);
                }}
                className="px-5 py-2 font-bold text-sm"
                style={{ background: "#3b82f6", color: "#000" }}
              >
                YES, LOAD
              </button>
              <button
                type="button"
                data-ocid="cloud_save.cancel_button"
                onClick={() => setCloudSaveDialog(null)}
                className="px-5 py-2 font-bold text-sm"
                style={{
                  background: "#1f1f2e",
                  color: "#9ca3af",
                  border: "1px solid #374151",
                }}
              >
                NO, KEEP LOCAL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skin Selector Panel */}
      {showSkinPanel && atSurface && (
        <div
          data-ocid="skin.panel"
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <div
            className="font-mono p-6 max-w-sm w-full mx-4"
            style={{
              background: "#0a0500",
              border: "2px solid #f5c542",
              boxShadow: "0 0 40px rgba(245,197,66,0.3)",
            }}
          >
            <div className="font-bold text-yellow-400 text-sm mb-4 tracking-widest">
              🎨 VEHICLE SKINS
            </div>
            {(
              [
                {
                  id: "default",
                  label: "Default Miner",
                  desc: "The classic BOB Mining rig",
                  alwaysUnlocked: true,
                },
                {
                  id: "gold",
                  label: "Gold Miner ✨",
                  desc: "Reach 130m depth",
                  alwaysUnlocked: false,
                },
                {
                  id: "veteran",
                  label: "Veteran 🏆",
                  desc: "Find the Genesis Block",
                  alwaysUnlocked: false,
                },
                {
                  id: "speed_demon",
                  label: "Speed Demon ⚡",
                  desc: "Defeat 10 antagonists total",
                  alwaysUnlocked: false,
                },
              ] as const
            ).map((skin) => {
              const unlocked =
                skin.alwaysUnlocked ||
                metaProgressRef.current.unlockedSkins.includes(skin.id);
              const active = vehicleSkin === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  data-ocid="skin.button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) {
                      setVehicleSkin(skin.id);
                      vehicleSkinRef.current = skin.id;
                      localStorage.setItem("bob_skin", skin.id);
                    }
                  }}
                  className="w-full text-left px-3 py-2 mb-2 text-xs"
                  style={{
                    background: active ? "#f5c54220" : "transparent",
                    border: `1px solid ${active ? "#f5c542" : unlocked ? "#555" : "#222"}`,
                    color: unlocked ? (active ? "#f5c542" : "#ccc") : "#444",
                    cursor: unlocked ? "pointer" : "not-allowed",
                  }}
                >
                  <div className="font-bold">
                    {skin.label} {active ? "✓" : ""}
                  </div>
                  <div style={{ color: unlocked ? "#888" : "#333" }}>
                    {unlocked ? skin.desc : `🔒 ${skin.desc}`}
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              data-ocid="skin.close_button"
              onClick={() => setShowSkinPanel(false)}
              className="w-full py-2 text-xs font-bold mt-1"
              style={{
                background: "transparent",
                color: "#888",
                border: "1px solid #333",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Escape event banner */}
      {escapeEventActive && (
        <div
          className="absolute z-50 left-0 right-0 py-2 px-4 text-center font-mono text-sm font-bold animate-pulse"
          style={{
            top: 52,
            background: "rgba(180,20,0,0.92)",
            color: "#ffffff",
            border: "2px solid #ff4400",
            boxShadow: "0 0 30px rgba(255,68,0,0.6)",
            letterSpacing: "0.05em",
          }}
        >
          {escapeEventActive.type === "nns_vote"
            ? `⚠ NNS EMERGENCY VOTE: DELETE YOUR MINER — SURFACE IN ${Math.floor(escapeEventActive.timer / 60)}s ⚠`
            : `🔍 DFINITY AUDIT IN PROGRESS — SURFACE IMMEDIATELY OR LOSE CARGO — ${Math.floor(escapeEventActive.timer / 60)}s`}
        </div>
      )}
      {escapeEventActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: "inset 0 0 60px rgba(220,30,0,0.35)",
            zIndex: 49,
          }}
        />
      )}

      {/* NPC Overlay (underground) */}
      {/* Whale Underground Dialog */}
      {whaleDialog && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div
            className="font-mono p-6 max-w-sm w-full mx-4 text-center"
            style={{
              background: "#0a0520",
              border: "2px solid #8b5cf6",
              boxShadow: "0 0 40px rgba(139,92,246,0.4)",
            }}
          >
            <div className="text-4xl mb-3">🐋</div>
            <div
              className="font-bold text-sm mb-1"
              style={{ color: "#8b5cf6" }}
            >
              THE WHALE
            </div>
            <div className="text-xs text-gray-400 italic mb-4">
              {whaleDialog.deepDive ? (
                <>
                  &quot;Even in the Deep, I follow the BOB... 3x your cargo?
                  You&apos;re deeper than most dare go. I respect it.&quot;
                </>
              ) : (
                <>
                  &quot;Psst. I&apos;ll buy your ENTIRE cargo right now. 2x
                  market price. One time offer.&quot;
                </>
              )}
            </div>
            <div className="text-yellow-400 font-bold text-sm mb-4">
              Your cargo: {whaleDialog.value} BOB →{" "}
              <span className="text-green-400">
                {whaleDialog.value * (whaleDialog.deepDive ? 3 : 2)} BOB
              </span>
              {whaleDialog.deepDive && (
                <span className="text-purple-400 text-xs ml-1">
                  [DEEP DIVE 3x!]
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="whale_dialog.confirm_button"
                onClick={() => {
                  const p2 = playerRef.current;
                  const val2 = cargoTotalValue(p2.cargo);
                  const whaleMult = whaleDialog.deepDive ? 3 : 2;
                  p2.stats.bob += val2 * whaleMult;
                  p2.cargo = [];
                  p2.stats.cargoWeight = 0;
                  setHud((h) => ({ ...h, bob: p2.stats.bob, cargoW: 0 }));
                  setWhaleDialog(null);
                  setEventMsg(
                    `🐋 DEAL! Sold ${val2 * whaleMult} BOB to The Whale!`,
                  );
                  if (eventMsgTimeoutRef.current)
                    clearTimeout(eventMsgTimeoutRef.current);
                  eventMsgTimeoutRef.current = setTimeout(
                    () => setEventMsg(""),
                    3500,
                  );
                }}
                className="flex-1 py-2 text-xs font-bold"
                style={{ background: "#8b5cf6", color: "#fff" }}
              >
                DEAL 🤝
              </button>
              <button
                type="button"
                data-ocid="whale_dialog.cancel_button"
                onClick={() => setWhaleDialog(null)}
                className="flex-1 py-2 text-xs font-bold"
                style={{
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                }}
              >
                NO THANKS
              </button>
            </div>
          </div>
        </div>
      )}

      {activeNpc &&
        (() => {
          // Branching NPC dialog choices
          const npcChoices: Record<
            string,
            { c1: string; r1: string; c2: string; r2: string }
          > = {
            dom: {
              c1: "🏛 Help secure fragment (+500 BOB, +Dom loyalty, next shop -15%)",
              r1: "dom_help_fragment",
              c2: "💰 Pocket fragment yourself (+800 BOB, -Dom loyalty, prices rise)",
              r2: "dom_take_fragment",
            },
            bob_dog: {
              c1: "Follow BOB! 🐾 (2 steps)",
              r1: "npc_quest_bob_dog",
              c2: "Pet BOB (+50 BOB)",
              r2: "free_bob_small",
            },
            jan: {
              c1: "🔐 Share vetKeys blessing (+hull)",
              r1: "jan_vetkeys_blessing",
              c2: "📊 ICP price prediction gamble",
              r2: "jan_price_prediction",
            },
            lomesh: {
              c1: "📈 Growth hack (+25% sell price)",
              r1: "sell_boost",
              c2: "📡 Ecosystem scan (reveal all ores)",
              r2: "radar_ping",
            },
            diego: {
              c1: "🔧 Emergency repair (hull + fuel)",
              r1: "npc_quest_diego",
              c2: "⚡ Turbo drill (2x drill speed 60s)",
              r2: "diego_turbo_drill",
            },
            whale_underground: {
              c1: "🐳 Sell all cargo NOW at 2.5x price (instant cash)",
              r1: "whale_instant_2_5x",
              c2: "🗳️ Help rig NNS vote (free jetpack, -Dom loyalty)",
              r2: "whale_nns_deal",
            },
            dfinity_ghost: {
              c1: "Activate cloak (hazard pass)",
              r1: "dfinity_cloak",
              c2: "Request ICP tip (+100 BOB)",
              r2: "free_bob_medium",
            },
            ghost_miner: {
              c1: "🔍 Trade sonar charges for Void Shard cache nearby",
              r1: "ghost_sonar_trade",
              c2: "👻 Learn shortcut (teleport 20m deeper, carve tunnel)",
              r2: "ghost_tunnel_shortcut",
            },
            jerry_underground: {
              c1: "🔧 Trade 3 ores for instant hull repair + fuel top-up",
              r1: "jerry_trade_hull",
              c2: "🚀 Pay 200 BOB for drill speed boost (rest of run)",
              r2: "jerry_trade_drill",
            },
            black_market_trader: {
              c1: "💸 Sell best ore at 2.5x market value",
              r1: "black_market_sold",
              c2: "❌ No thanks, move along",
              r2: "black_market_decline",
            },
            arthur_falls: {
              c1: "📺 Give exclusive interview (+15% sell prices next trip)",
              r1: "arthur_interview",
              c2: "🚫 Deny the cameras (+200 BOB, no buff)",
              r2: "arthur_deny",
            },
            wenzel: {
              c1: "🔧 Accept protocol upgrade (+15% fuel efficiency, rest of run)",
              r1: "wenzel_upgrade",
              c2: "💣 Sabotage competitor (+300 BOB, -2 hull)",
              r2: "wenzel_sabotage",
            },
          };
          const choices = npcChoices[activeNpc.id];
          return (
            <div
              data-ocid="npc.dialog"
              className="absolute inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.7)" }}
            >
              <div
                className="font-mono p-6 max-w-sm w-full mx-4"
                style={{
                  background: "#0a0500",
                  border: `2px solid ${activeNpc.color ?? "#f5c542"}`,
                  boxShadow: `0 0 40px ${activeNpc.color ?? "#f5c542"}30`,
                }}
              >
                <div
                  className="text-xs tracking-widest mb-2"
                  style={{ color: activeNpc.color ?? "#f5c542" }}
                >
                  ⚡ UNDERGROUND ENCOUNTER
                </div>
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                    style={{
                      border: "2px solid rgba(255,255,255,0.3)",
                      background: "#000",
                    }}
                  >
                    <NpcPortrait npcId={activeNpc.id} size={48} />
                  </div>
                  <div>
                    <div
                      className="font-bold text-sm"
                      style={{ color: activeNpc.color ?? "#f5c542" }}
                    >
                      {activeNpc.name}
                    </div>
                    <div className="text-xs text-gray-400 italic mt-1">
                      &quot;{activeNpc.quote}&quot;
                    </div>
                  </div>
                </div>
                {choices ? (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      data-ocid="npc.confirm_button"
                      onClick={() => {
                        const npc2 = { ...activeNpc, reward: choices.r1 };
                        applyNpcReward(npc2);
                        const foundNpc1 = undergroundNpcsRef.current.find(
                          (n) => n.id === activeNpc.id,
                        );
                        if (foundNpc1) {
                          foundNpc1.encountered = true;
                          foundNpc1.rewardClaimed = true;
                        }
                        addTickerForReward(choices.r1);
                        setActiveNpc(null);
                      }}
                      className="w-full py-2 text-xs font-bold"
                      style={{
                        background: activeNpc.color ?? "#f5c542",
                        color: "#0a0500",
                      }}
                    >
                      ① {choices.c1}
                    </button>
                    <button
                      type="button"
                      data-ocid="npc.secondary_button"
                      onClick={() => {
                        const npc2 = { ...activeNpc, reward: choices.r2 };
                        applyNpcReward(npc2);
                        const foundNpc2 = undergroundNpcsRef.current.find(
                          (n) => n.id === activeNpc.id,
                        );
                        if (foundNpc2) {
                          foundNpc2.encountered = true;
                          foundNpc2.rewardClaimed = true;
                        }
                        addTickerForReward(choices.r2);
                        setActiveNpc(null);
                      }}
                      className="w-full py-2 text-xs font-bold"
                      style={{
                        background: "transparent",
                        color: activeNpc.color ?? "#f5c542",
                        border: `1px solid ${activeNpc.color ?? "#f5c542"}`,
                      }}
                    >
                      ② {choices.c2}
                    </button>
                    <button
                      type="button"
                      data-ocid="npc.cancel_button"
                      onClick={() => {
                        npcEncounteredRef.current.add(activeNpc.id);
                        const foundNpcLeave = undergroundNpcsRef.current.find(
                          (n) => n.id === activeNpc.id,
                        );
                        if (foundNpcLeave) {
                          foundNpcLeave.encountered = true;
                        }
                        setActiveNpc(null);
                      }}
                      className="w-full py-1 text-xs"
                      style={{
                        background: "transparent",
                        color: "#666",
                        border: "1px solid #333",
                      }}
                    >
                      Leave
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      data-ocid="npc.confirm_button"
                      onClick={() => {
                        applyNpcReward(activeNpc);
                        const foundNpcAccept = undergroundNpcsRef.current.find(
                          (n) => n.id === activeNpc.id,
                        );
                        if (foundNpcAccept) {
                          foundNpcAccept.encountered = true;
                          foundNpcAccept.rewardClaimed = true;
                        }
                        addTickerForReward(activeNpc.reward);
                        setActiveNpc(null);
                      }}
                      className="flex-1 py-2 text-xs font-bold"
                      style={{
                        background: activeNpc.color ?? "#f5c542",
                        color: "#0a0500",
                      }}
                    >
                      ACCEPT
                    </button>
                    <button
                      type="button"
                      data-ocid="npc.cancel_button"
                      onClick={() => {
                        npcEncounteredRef.current.add(activeNpc.id);
                        const foundNpcDismiss = undergroundNpcsRef.current.find(
                          (n) => n.id === activeNpc.id,
                        );
                        if (foundNpcDismiss) {
                          foundNpcDismiss.encountered = true;
                        }
                        setActiveNpc(null);
                      }}
                      className="flex-1 py-2 text-xs font-bold"
                      style={{
                        background: "transparent",
                        color: "#888",
                        border: "1px solid #333",
                      }}
                    >
                      DISMISS
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* Surface NPC Overlay */}
      {surfaceNpc && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="font-mono p-6 max-w-sm w-full mx-4"
            style={{
              background: "#0a0500",
              border: "2px solid #f5c542",
              boxShadow: "0 0 40px rgba(245,197,66,0.3)",
            }}
          >
            <div className="text-xs text-orange-500 mb-2 tracking-widest">
              SURFACE ENCOUNTER
            </div>
            <div className="flex items-start gap-4 mb-4">
              <div
                className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                style={{
                  border: "2px solid rgba(255,255,255,0.3)",
                  background: "#000",
                }}
              >
                <NpcPortrait npcId={surfaceNpc.id} size={48} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "#f5c542" }}>
                  {surfaceNpc.name}
                </div>
                <div className="text-xs text-gray-400 italic mt-1">
                  "{surfaceNpc.quote}"
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="surface_npc.confirm_button"
                onClick={() => {
                  applyNpcReward(surfaceNpc);
                  setSurfaceNpc(null);
                }}
                className="flex-1 py-2 text-xs font-bold"
                style={{ background: "#f5c542", color: "#0a0500" }}
              >
                ACCEPT
              </button>
              <button
                type="button"
                data-ocid="surface_npc.cancel_button"
                onClick={() => {
                  npcEncounteredRef.current.add(surfaceNpc.id);
                  setSurfaceNpc(null);
                }}
                className="flex-1 py-2 text-xs font-bold"
                style={{
                  background: "transparent",
                  color: "#888",
                  border: "1px solid #333",
                }}
              >
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ore Discovery Card */}
      {oreDiscoveryCard && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.65)" }}
        >
          <div
            className="font-mono p-6 max-w-xs w-full mx-4 text-center"
            style={{
              background: "#0a0500",
              border: `2px solid ${oreDiscoveryCard.color}`,
              boxShadow: `0 0 40px ${oreDiscoveryCard.color}50`,
            }}
          >
            <div className="text-xs text-gray-500 tracking-widest mb-3">
              ✦ FIRST DISCOVERY ✦
            </div>
            <div className="flex justify-center mb-3">
              <OrePreviewTile tileId={oreDiscoveryCard.tileId} label="" />
            </div>
            <div
              className="font-bold text-base mb-2"
              style={{ color: oreDiscoveryCard.color }}
            >
              {oreDiscoveryCard.name}
            </div>
            <div className="text-gray-400 text-xs italic mb-4">
              "{oreDiscoveryCard.era}"
            </div>
            <button
              type="button"
              data-ocid="ore_discovery.close_button"
              onClick={() => {
                if (oreDiscoveryTimerRef.current)
                  clearTimeout(oreDiscoveryTimerRef.current);
                setOreDiscoveryCard(null);
              }}
              className="px-6 py-1.5 text-xs font-bold"
              style={{ background: oreDiscoveryCard.color, color: "#000" }}
            >
              NOTED
            </button>
          </div>
        </div>
      )}

      {/* Cargo drop dialog */}
      {cargoDropPending &&
        (() => {
          const p2c = playerRef.current;
          const lowestValC =
            p2c.cargo.length > 0
              ? Math.min(...p2c.cargo.map((c) => RESOURCES[c.tile]?.value ?? 0))
              : 0;
          const lowestItemC = p2c.cargo.reduce(
            (min, c) =>
              (RESOURCES[c.tile]?.value ?? 0) <
              (RESOURCES[min.tile]?.value ?? 0)
                ? c
                : min,
            p2c.cargo[0],
          );
          const deltaC = cargoDropPending.value - lowestValC;
          const newOreColor = RESOURCES[cargoDropPending.tile]?.color ?? "#fff";
          const dropColor = lowestItemC
            ? (RESOURCES[lowestItemC.tile]?.color ?? "#aaa")
            : "#aaa";
          return (
            <div
              data-ocid="cargo.dialog"
              className="absolute z-40 font-mono text-center"
              style={{
                top: "30%",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(10,5,0,0.97)",
                border: "2px solid #f59e0b",
                padding: "16px 24px",
                maxWidth: "90vw",
                minWidth: 260,
                boxShadow: "0 0 40px rgba(245,158,11,0.4)",
              }}
            >
              <div className="text-yellow-400 font-bold text-sm mb-3">
                ⚠ CARGO HOLD FULL!
              </div>
              <div className="flex items-center justify-between gap-4 mb-3 text-xs">
                <div
                  className="flex-1 p-2"
                  style={{
                    background: "#1a0a00",
                    border: "1px solid #f59e0b30",
                  }}
                >
                  <div className="text-gray-400 mb-1">DROPPING</div>
                  <div style={{ color: dropColor }} className="font-bold">
                    {lowestItemC
                      ? (RESOURCES[lowestItemC.tile]?.name ?? "ore")
                      : "none"}
                  </div>
                  <div className="text-red-400 font-bold">
                    -{lowestValC} BOB
                  </div>
                </div>
                <div className="text-xl">→</div>
                <div
                  className="flex-1 p-2"
                  style={{
                    background: "#001a0a",
                    border: "1px solid #22c55e30",
                  }}
                >
                  <div className="text-gray-400 mb-1">GAINING</div>
                  <div style={{ color: newOreColor }} className="font-bold">
                    {cargoDropPending.name}
                  </div>
                  <div className="text-green-400 font-bold">
                    +{cargoDropPending.value} BOB
                  </div>
                </div>
              </div>
              <div
                className="text-sm font-bold mb-4"
                style={{ color: deltaC >= 0 ? "#4ade80" : "#f87171" }}
              >
                NET: {deltaC >= 0 ? "+" : ""}
                {deltaC} BOB {deltaC >= 0 ? "✓ UPGRADE" : "✗ LOSS"}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  data-ocid="cargo.confirm_button"
                  onClick={() => {
                    const p = playerRef.current;
                    const s = p.stats;
                    if (p.cargo.length > 0) {
                      const lowestIdx = p.cargo.reduce(
                        (minI, c, i) =>
                          (RESOURCES[c.tile]?.value ?? 0) <
                          (RESOURCES[p.cargo[minI].tile]?.value ?? 0)
                            ? i
                            : minI,
                        0,
                      );
                      const dropped = p.cargo[lowestIdx];
                      const droppedRes = RESOURCES[dropped.tile];
                      if (droppedRes)
                        s.cargoWeight -= droppedRes.weight * dropped.count;
                      p.cargo.splice(lowestIdx, 1);
                      const newRes = RESOURCES[cargoDropPending.tile];
                      if (newRes) {
                        p.cargo.push({
                          tile: cargoDropPending.tile as TileType,
                          count: 1,
                        });
                        s.cargoWeight += newRes.weight;
                        floatingTextsRef.current.push({
                          x: p.x + TILE / 2,
                          y: p.y,
                          text: `+${newRes.value} BOB`,
                          alpha: 1,
                          dy: 0,
                        });
                      }
                    }
                    setCargoDropPending(null);
                  }}
                  className="px-4 py-2 text-xs font-bold"
                  style={{
                    background: deltaC >= 0 ? "#15803d" : "#7a3a00",
                    color: "#fff",
                    border: `1px solid ${deltaC >= 0 ? "#22c55e" : "#f59e0b"}`,
                  }}
                >
                  SWAP ({deltaC >= 0 ? "+" : ""}
                  {deltaC} BOB) ✓
                </button>
                <button
                  type="button"
                  data-ocid="cargo.cancel_button"
                  onClick={() => setCargoDropPending(null)}
                  className="px-4 py-2 text-xs font-bold bg-gray-800 text-gray-300 border border-gray-600"
                >
                  KEEP CURRENT ✗
                </button>
              </div>
            </div>
          );
        })()}

      {/* Tutorial */}
      {tutorialStep < 3 && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none"
          style={{ width: "min(90vw, 400px)", maxWidth: "90vw" }}
        >
          {tutorialStep === 0 && (
            <div className="bg-black/80 border border-yellow-700 text-yellow-200 text-xs text-center px-4 py-2 rounded font-mono leading-5">
              🕹 Use <strong>WASD</strong> / <strong>Arrow Keys</strong> to move.
              <br />
              Press <strong>↑ / W</strong> to thrust upward back to the shop!
            </div>
          )}
          {tutorialStep === 1 && (
            <div className="bg-black/80 border border-orange-700 text-orange-200 text-xs text-center px-4 py-2 rounded font-mono leading-5">
              ⛏ Dig up BOB ore! Each tier represents an ICP era.
              <br />
              Hold <strong>↑ / W</strong> to fly back up through your tunnels.
            </div>
          )}
          {tutorialStep === 2 && atSurface && (
            <div className="bg-black/80 border border-green-700 text-green-200 text-xs text-center px-4 py-2 rounded font-mono leading-5">
              💰 You&apos;re in the shop! Click <strong>SELL ALL</strong> to
              cash in your cargo.
            </div>
          )}
        </div>
      )}

      {/* Surface shop panel */}
      {atSurface && (
        <div
          data-ocid="shop.panel"
          className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 border-t border-yellow-900 px-4 py-3"
        >
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-400 font-bold text-sm tracking-widest flex items-center gap-2">
                ⛏ BOB SHOP
                {(() => {
                  const domLoyalty =
                    metaProgressRef.current?.npcRelationships?.dom ?? 5;
                  if (domLoyalty >= 8)
                    return (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: "#16a34a22",
                          color: "#4ade80",
                          border: "1px solid #4ade8040",
                        }}
                      >
                        👑 DOM DISCOUNT -10%
                      </span>
                    );
                  if (domLoyalty <= 2)
                    return (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: "#dc262622",
                          color: "#f87171",
                          border: "1px solid #f8717140",
                        }}
                      >
                        📉 DOM PENALTY +15%
                      </span>
                    );
                  return null;
                })()}
              </span>
              <span className="text-yellow-300 font-bold">
                {Math.floor(hud.bob)} BOB
              </span>
            </div>
            {shopMsg && (
              <div className="text-green-400 text-xs mb-2">{shopMsg}</div>
            )}
            {/* TODAY'S DEAL */}
            {shopSpecialOfferRef.current &&
              (() => {
                const deal = shopSpecialOfferRef.current!;
                const purchased = shopOfferPurchasedRef.current;
                return (
                  <div
                    className="mb-2 px-3 py-2 font-mono"
                    style={{
                      border: purchased
                        ? "1px solid #4a3000"
                        : "1px solid #d4a84b",
                      background: purchased
                        ? "rgba(0,0,0,0.4)"
                        : "rgba(212,168,75,0.08)",
                      boxShadow: purchased
                        ? "none"
                        : "0 0 8px rgba(212,168,75,0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span
                          className="text-xs font-black tracking-widest mr-2"
                          style={{ color: purchased ? "#6b7280" : "#fbbf24" }}
                        >
                          ⭐ TODAY'S DEAL
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: purchased ? "#4b5563" : "#f5c542" }}
                        >
                          {deal.label}
                        </span>
                      </div>
                      {!purchased && (
                        <button
                          type="button"
                          onClick={buySpecialOffer}
                          disabled={hud.bob < deal.cost}
                          className="px-2 py-0.5 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                          style={{
                            background:
                              "linear-gradient(90deg, #d4a84b, #f5c542)",
                            color: "#000",
                          }}
                        >
                          {deal.cost} BOB
                        </button>
                      )}
                      {purchased && (
                        <span className="text-xs" style={{ color: "#4b5563" }}>
                          ✓ PURCHASED
                        </span>
                      )}
                    </div>
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: purchased ? "#374151" : "#9ca3af" }}
                    >
                      {deal.desc}
                    </div>
                  </div>
                );
              })()}

            {/* Depth cost multiplier */}
            {(() => {
              const mult = getDepthCostMultiplier();
              const depth2 = maxDepthReachedRef.current;
              const multColor =
                mult >= 3 ? "#ef4444" : mult >= 2 ? "#eab308" : "#86efac";
              const zoneLabel =
                mult >= 3
                  ? "⚠ DEEP ZONE — 3x REPAIR COSTS"
                  : mult >= 2
                    ? "⚡ MID ZONE — 2x REPAIR COSTS"
                    : "✓ SURFACE RATE — Normal prices";
              return (
                <div
                  className="text-xs font-mono mb-1 px-2 py-0.5 rounded"
                  style={{
                    color: multColor,
                    background: `${multColor}18`,
                    border: `1px solid ${multColor}40`,
                  }}
                >
                  {zoneLabel}
                  {depth2 > 0 ? ` (max depth: ${depth2}m)` : ""}
                </div>
              );
            })()}
            {playerRef.current.cargo.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2">
                {playerRef.current.cargo.map((c) => {
                  const res = RESOURCES[c.tile];
                  const itemVal = (res?.value ?? 0) * c.count;
                  return res ? (
                    <div key={c.tile} className="text-xs leading-tight">
                      <span style={{ color: res.color }} className="font-bold">
                        {res.name}
                      </span>
                      <span className="text-gray-400 ml-1">×{c.count}</span>
                      <span className="text-yellow-600 ml-1">({itemVal}⊙)</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {/* Dynamic ore market price indicator */}
            {playerRef.current.cargo.length > 0 &&
              (() => {
                const sortedCargo = [...playerRef.current.cargo].sort(
                  (ca, cb) => {
                    const aV2 = (RESOURCES[ca.tile]?.value ?? 0) * ca.count;
                    const bV2 = (RESOURCES[cb.tile]?.value ?? 0) * cb.count;
                    return bV2 - aV2;
                  },
                );
                const topItem = sortedCargo[0];
                if (!topItem) return null;
                const topRes = RESOURCES[topItem.tile];
                const mktMult =
                  oreMarketMultipliersRef.current[String(topItem.tile)] ?? 1.0;
                const pctChange = Math.round((mktMult - 1) * 100);
                const mktColor =
                  pctChange > 0
                    ? "#4ade80"
                    : pctChange < 0
                      ? "#f87171"
                      : "#94a3b8";
                return (
                  <div
                    className="text-xs font-mono mb-1 px-1.5 py-0.5 rounded"
                    style={{
                      color: mktColor,
                      background: `${mktColor}18`,
                      border: `1px solid ${mktColor}40`,
                    }}
                  >
                    {pctChange >= 0 ? "📈" : "📉"} MARKET:{" "}
                    {topRes?.name ?? "ore"} {pctChange >= 0 ? "+" : ""}
                    {pctChange}%
                  </div>
                );
              })()}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-ocid="shop.sell_button"
                onClick={sellAll}
                className="px-3 py-1 text-xs font-bold bg-yellow-500 text-black hover:bg-yellow-400"
              >
                SELL ALL ({cargoTotalValue(playerRef.current.cargo)} BOB)
              </button>
              {maxDepthReachedRef.current >= 60 && (
                <div
                  className="text-xs font-bold text-yellow-400 text-center"
                  style={{ textShadow: "0 0 8px #fbbf24" }}
                >
                  DEPTH BONUS:{" "}
                  {maxDepthReachedRef.current >= 130
                    ? "3x"
                    : maxDepthReachedRef.current >= 100
                      ? "2x"
                      : "1.5x"}{" "}
                  💰
                </div>
              )}
              <button
                type="button"
                data-ocid="shop.repair_button"
                onClick={buyRepair}
                className="px-3 py-1 text-xs font-bold bg-red-900 text-red-200 hover:bg-red-800 border border-red-700"
                title={
                  maxDepthReachedRef.current > 0
                    ? `Cost scales with max depth (${maxDepthReachedRef.current}m)`
                    : undefined
                }
              >
                REPAIR ({getRepairCost()} BOB)
              </button>
              <button
                type="button"
                data-ocid="shop.refuel_button"
                onClick={buyRefuel}
                className="px-3 py-1 text-xs font-bold bg-cyan-900 text-cyan-200 hover:bg-cyan-800 border border-cyan-700"
                title={
                  maxDepthReachedRef.current > 0
                    ? `Cost scales with max depth (${maxDepthReachedRef.current}m)`
                    : undefined
                }
              >
                REFUEL ({getRefuelCost()} BOB)
              </button>
              {deepestDrilledYRef.current > TILE * 8 && (
                <button
                  type="button"
                  data-ocid="shop.descend_button"
                  onClick={() => {
                    const p = playerRef.current;
                    p.y = deepestDrilledYRef.current - TILE;
                    p.vy = 0;
                    tickerQueueRef.current.push(
                      "⬇ DESCENDING to previous depth...",
                    );
                    setAtSurface(false);
                  }}
                  className="px-3 py-1 text-xs font-bold bg-orange-950 text-orange-300 hover:bg-orange-900 border border-orange-800"
                >
                  ⬇ DESCEND
                </button>
              )}
              <button
                type="button"
                data-ocid="shop.open_modal_button"
                onClick={() => setShowSkinPanel(true)}
                className="px-3 py-1 text-xs font-bold bg-purple-900 text-purple-200 hover:bg-purple-800 border border-purple-700"
              >
                🎨 SKINS
              </button>
              {isIILoggedIn && (
                <button
                  type="button"
                  data-ocid="shop.save_button"
                  onClick={() => void syncSaveToChain()}
                  className="px-3 py-1 text-xs font-bold bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-800"
                >
                  ☁ SYNC SAVE
                </button>
              )}
            </div>
            {/* Build path synergy info */}
            {(() => {
              const syns2 = getActiveSynergies(shopStats as PlayerStats);
              return (
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                  {(
                    Object.entries(BUILD_PATHS) as [
                      keyof typeof BUILD_PATHS,
                      (typeof BUILD_PATHS)[keyof typeof BUILD_PATHS],
                    ][]
                  ).map(([k, path]) => {
                    const count = (path.keys as readonly string[]).filter(
                      (key) => ((shopStats[key] ?? 0) as number) >= 1,
                    ).length;
                    const active = syns2.includes(k);
                    return (
                      <div
                        key={k}
                        className="text-xs px-1.5 py-0.5 font-mono"
                        style={{
                          background: active
                            ? `${path.color}30`
                            : "rgba(0,0,0,0.4)",
                          border: `1px solid ${active ? path.color : "#333"}`,
                          color: active ? path.color : "#666",
                          fontSize: "9px",
                        }}
                      >
                        {active ? "⚡" : "○"} {path.label} ({count}/3)
                        {active ? ` ${path.bonusDesc}` : ""}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {UPGRADES.map((ug, i) => {
                const lvl = (shopStats[ug.key] ?? 0) as number;
                const maxed = lvl >= UPGRADE_MAX_LEVEL;
                const cost = maxed ? 0 : ug.costs[lvl];
                const penaltyNote =
                  ug.penalty && lvl >= 1 ? ` ⚠${ug.penalty}` : "";
                const pathColor = ug.buildColor;
                return (
                  <button
                    type="button"
                    key={ug.key}
                    data-ocid={`upgrade.button.${i + 1}`}
                    onClick={() => !maxed && buyUpgrade(ug.key, lvl)}
                    disabled={maxed || hud.bob < cost}
                    className="px-2 py-1 text-xs border bg-orange-950/50 text-orange-300 hover:bg-orange-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: `${pathColor}60` }}
                    title={ug.desc + penaltyNote}
                  >
                    <span
                      className="text-xs font-bold mr-1 px-0.5 rounded"
                      style={{
                        background: pathColor,
                        color: "#000",
                        fontSize: "8px",
                      }}
                    >
                      {ug.buildTag}
                    </span>
                    {ug.icon} {ug.label} {maxed ? "(MAX)" : `(${cost})`} [{lvl}/
                    {UPGRADE_MAX_LEVEL}]
                    {ug.penalty && lvl >= 1 ? (
                      <span className="text-yellow-600 ml-1">⚠</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* ── CONSUMABLES ── */}
            <div className="mt-2 border-t border-orange-900/40 pt-2">
              <div
                className="text-xs tracking-widest mb-1"
                style={{ color: "#8B6914" }}
              >
                CONSUMABLES
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  data-ocid="shop.sonar_button"
                  onClick={() => buyConsumable("sonar")}
                  disabled={hud.sonarCount >= 3 || hud.bob < 150}
                  className="px-2 py-1 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(34,211,238,0.1)",
                    borderColor: "#22d3ee88",
                    color: "#22d3ee",
                  }}
                  title="Reveals a 10-tile radius on minimap. Costs 5 fuel."
                >
                  📡 Sonar Ping (150 BOB) [{hud.sonarCount}/3]
                </button>
                <button
                  type="button"
                  data-ocid="shop.charge_button"
                  onClick={() => buyConsumable("charge")}
                  disabled={hud.chargesCount >= 3 || hud.bob < 250}
                  className="px-2 py-1 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(255,102,0,0.1)",
                    borderColor: "#ff660088",
                    color: "#ff9966",
                  }}
                  title="Blasts 3x3 area of tiles. Collects any ore inside."
                >
                  💥 Explosive Charge (250 BOB) [{hud.chargesCount}/3]
                </button>
                <button
                  type="button"
                  data-ocid="shop.surface_call_button"
                  onClick={buySurfaceCall}
                  disabled={hud.surfaceCallCount >= 1 || hud.bob < 300}
                  className="px-2 py-1 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(167,139,250,0.1)",
                    borderColor: "#a78bfa88",
                    color: "#a78bfa",
                  }}
                  title="Auto-return to surface at 2x speed. Press [R] to activate."
                >
                  🚀 Surface Call (300 BOB) [{hud.surfaceCallCount}/1]
                </button>
                <button
                  type="button"
                  data-ocid="shop.refinement_kit_button"
                  onClick={buyRefinementKit}
                  disabled={
                    hud.bob < 500 ||
                    playerRef.current.stats.refinementKitCount >= 1
                  }
                  className="px-2 py-1 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "rgba(253,224,71,0.1)",
                    borderColor: "#fde04788",
                    color: "#fde047",
                  }}
                  title="Activate with [X]: double value of your next cargo haul."
                >
                  🔬 Refinement Kit (500 BOB) [
                  {playerRef.current.stats.refinementKitCount}/1]
                </button>
              </div>
              {/* Veteran Cache */}
              {(() => {
                const vetMeta = metaProgressRef.current;
                const vetWins = vetMeta?.totalRunsCompleted ?? 0;
                const vetBonus = vetMeta?.veteranSellBonus ?? 0;
                if (vetWins < 1 || vetBonus >= 3) return null;
                return (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={buyVeteranCache}
                      disabled={hud.bob < 1500}
                      className="px-2 py-1 text-xs border disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "rgba(212,168,75,0.12)",
                        borderColor: "#d4a84b88",
                        color: "#fbbf24",
                      }}
                      title="Permanent +5% sell bonus for all future runs. Stack up to 3x."
                    >
                      ⭐ BOB Veteran's Cache (1500 BOB) — +5% permanent sell
                      bonus [{vetBonus}/3]
                    </button>
                  </div>
                );
              })()}
              <div
                className="text-xs mt-1 opacity-50"
                style={{ color: "#8B6914" }}
              >
                [Q] Sonar · [E] Charge · [R] Surface · [X] Refinery
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Canvas Vignette ─────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background:
            "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      {/* ── Left Comms Panel removed — messages go to ticker ── */}

      {/* ── Top Cockpit Strip ──────────────────────────────────────────────── */}
      {screen === "game" && (
        <div
          className="fixed top-0 left-0 right-0 font-mono select-none"
          style={{
            height: 50,
            zIndex: 30,
            background: "linear-gradient(180deg, #1a1208 0%, #0d0a04 100%)",
            borderBottom: "2px solid #8B6914",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,200,50,0.06)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)",
            }}
          />
          {/* Rivets */}
          {(["left-2 top-1.5", "left-2 bottom-1.5"] as const).map((pos) => (
            <div
              key={pos}
              className={`absolute ${pos} w-1.5 h-1.5 rounded-full`}
              style={{
                background: "#8B6914",
                boxShadow: "0 0 3px rgba(139,105,20,0.6)",
              }}
            />
          ))}
          {/* 5-column unified row — reserve right 120px for minimap extension */}
          <div
            className="relative h-full flex items-stretch"
            style={{ zIndex: 1, marginRight: 120 }}
          >
            {/* FUEL */}
            <div className="flex flex-col justify-center px-3 flex-1 min-w-0">
              <div
                className="text-xs tracking-widest mb-0.5"
                style={{
                  color: fuelCritical ? "#ef4444" : "#d4a84b",
                  fontSize: 9,
                }}
              >
                FUEL
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 h-2 rounded-sm overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(139,105,20,0.4)",
                  }}
                >
                  <div
                    className={
                      fuelCritical
                        ? "h-full bob-bar-critical"
                        : "h-full transition-all"
                    }
                    style={{
                      width: `${Math.max(0, (hud.fuel / hud.maxFuel) * 100)}%`,
                      background: fuelCritical
                        ? "#ef4444"
                        : "linear-gradient(90deg, #d4a84b, #f5c542)",
                      boxShadow: fuelCritical
                        ? "0 0 6px #ef4444"
                        : "0 0 4px rgba(245,197,66,0.4)",
                    }}
                  />
                </div>
                <span
                  className="tabular-nums"
                  style={{
                    color: fuelCritical ? "#ef4444" : "#6b7280",
                    fontSize: 9,
                    minWidth: 24,
                    textAlign: "right",
                  }}
                >
                  {Math.ceil((hud.fuel / hud.maxFuel) * 100)}%
                </span>
              </div>
            </div>

            <div
              className="w-px my-2"
              style={{ background: "rgba(139,105,20,0.35)" }}
            />

            {/* HULL */}
            <div className="flex flex-col justify-center px-3 flex-1 min-w-0">
              <div
                className="text-xs tracking-widest mb-0.5"
                style={{
                  color: hullCritical ? "#ef4444" : "#d4a84b",
                  fontSize: 9,
                }}
              >
                HULL
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="flex-1 h-2 rounded-sm overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(139,105,20,0.4)",
                  }}
                >
                  <div
                    className={
                      hullCritical
                        ? "h-full bob-bar-critical"
                        : "h-full transition-all"
                    }
                    style={{
                      width: `${Math.max(0, (hud.hull / hud.maxHull) * 100)}%`,
                      background: hullCritical
                        ? "#ef4444"
                        : hud.hull / hud.maxHull > 0.5
                          ? "linear-gradient(90deg, #22c55e, #4ade80)"
                          : "linear-gradient(90deg, #eab308, #f59e0b)",
                      boxShadow: hullCritical
                        ? "0 0 6px #ef4444"
                        : "0 0 4px rgba(34,197,94,0.3)",
                    }}
                  />
                </div>
                <span
                  className="tabular-nums"
                  style={{
                    color: hullCritical ? "#ef4444" : "#6b7280",
                    fontSize: 9,
                    minWidth: 24,
                    textAlign: "right",
                  }}
                >
                  {Math.ceil((hud.hull / hud.maxHull) * 100)}%
                </span>
              </div>
            </div>

            <div
              className="w-px my-2"
              style={{ background: "rgba(139,105,20,0.35)" }}
            />

            {/* CARGO */}
            <div
              className="flex flex-col items-center justify-center px-3 flex-shrink-0"
              style={{
                minWidth: 54,
                animation:
                  hud.cargoW >= hud.maxCargo * 0.9
                    ? "cargoNearFull 1s ease-in-out infinite"
                    : "none",
                borderRadius: 4,
              }}
            >
              <div
                className="tracking-widest"
                style={{
                  color:
                    hud.cargoW >= hud.maxCargo * 0.9 ? "#f97316" : "#d4a84b",
                  fontSize: 9,
                }}
              >
                CARGO
              </div>
              <div
                className="font-bold tabular-nums"
                style={{
                  color:
                    hud.cargoW >= hud.maxCargo
                      ? "#ef4444"
                      : hud.cargoW >= hud.maxCargo * 0.9
                        ? "#f97316"
                        : "#9ca3af",
                  fontSize: 15,
                  lineHeight: 1.2,
                }}
              >
                {Math.round(hud.cargoW)}
                <span style={{ color: "#6b7280", fontSize: 9 }}>
                  /{hud.maxCargo}
                </span>
              </div>
            </div>

            <div
              className="w-px my-2"
              style={{ background: "rgba(139,105,20,0.35)" }}
            />

            {/* DEPTH */}
            <div
              className="flex flex-col items-center justify-center px-3 flex-shrink-0"
              style={{ minWidth: 54 }}
            >
              <div
                className="tracking-widest"
                style={{ color: "#d4a84b", fontSize: 9 }}
              >
                DEPTH
              </div>
              <div
                className="font-bold tabular-nums"
                style={{
                  color:
                    hud.depth >= 130
                      ? "#ff3050"
                      : hud.depth >= 100
                        ? "#ff8c00"
                        : "#22d3ee",
                  textShadow: `0 0 8px ${hud.depth >= 130 ? "#ff305066" : hud.depth >= 100 ? "#ff8c0066" : "#22d3ee66"}`,
                  fontSize: 15,
                  lineHeight: 1.2,
                }}
              >
                {hud.depth}
                <span style={{ color: "#6b7280", fontSize: 9 }}>m</span>
                <span
                  style={{
                    color: "#6b7280",
                    fontSize: 8,
                    display: "block",
                    marginTop: 1,
                  }}
                >
                  {(() => {
                    const d = hud.depth;
                    if (d >= 155) return "GENESIS";
                    if (d >= 131) return "LAVA FIELDS";
                    if (d >= 101) return "DEEP STONE";
                    if (d >= 71) return "CRYSTAL ZONE";
                    if (d >= 41) return "STONE LAYER";
                    if (d >= 21) return "DIRT LAYER";
                    return "SURFACE";
                  })()}
                </span>
              </div>
            </div>

            <div
              className="w-px my-2"
              style={{ background: "rgba(139,105,20,0.35)" }}
            />

            {/* BOB */}
            <div
              className="flex flex-col items-center justify-center px-3 flex-shrink-0"
              style={{ minWidth: 70 }}
            >
              <div
                className="tracking-widest"
                style={{ color: "#d4a84b", fontSize: 9 }}
              >
                BOB
              </div>
              <div
                className="font-bold tabular-nums"
                style={{
                  color: "#f5c542",
                  textShadow: "0 0 10px rgba(245,197,66,0.55)",
                  fontSize: 15,
                  lineHeight: 1.2,
                }}
              >
                {Math.floor(hud.bob).toLocaleString()}
              </div>
            </div>

            {/* HEAT gauge — only shown underground */}
            {hud.depth > 5 && (
              <>
                <div
                  className="w-px my-2"
                  style={{ background: "rgba(139,105,20,0.35)" }}
                />
                <div
                  className="flex flex-col justify-center px-2 flex-shrink-0"
                  style={{ minWidth: 40 }}
                >
                  <div
                    className="tracking-widest mb-0.5"
                    style={{
                      color: hud.drillOverheated
                        ? "#ef4444"
                        : hud.drillHeat > 70
                          ? "#f97316"
                          : "#d4a84b",
                      fontSize: 9,
                    }}
                  >
                    {hud.drillOverheated ? "COOL" : "HEAT"}
                  </div>
                  <div
                    className="h-2 rounded-sm overflow-hidden"
                    style={{
                      width: 36,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(139,105,20,0.4)",
                    }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${hud.drillOverheated ? 100 : hud.drillHeat}%`,
                        background: hud.drillOverheated
                          ? "#ef4444"
                          : hud.drillHeat > 80
                            ? "#f97316"
                            : hud.drillHeat > 50
                              ? "#eab308"
                              : "#22c55e",
                        boxShadow: hud.drillOverheated
                          ? "0 0 6px #ef4444"
                          : hud.drillHeat > 70
                            ? "0 0 4px #f9731660"
                            : "none",
                        animation: hud.drillOverheated
                          ? "heatPulse 0.5s ease-in-out infinite"
                          : "none",
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Sonar & Charge indicators */}
            {(hud.sonarCount > 0 || hud.chargesCount > 0) && (
              <>
                <div
                  className="w-px my-2"
                  style={{ background: "rgba(139,105,20,0.35)" }}
                />
                <div className="flex flex-col gap-0.5 items-center justify-center px-2 flex-shrink-0">
                  {hud.sonarCount > 0 && (
                    <div
                      className="text-xs font-bold tabular-nums"
                      style={{
                        color: "#22d3ee",
                        fontSize: 10,
                        textShadow: "0 0 8px #22d3ee88",
                      }}
                    >
                      📡×{hud.sonarCount}
                    </div>
                  )}
                  {hud.chargesCount > 0 && (
                    <div
                      className="text-xs font-bold tabular-nums"
                      style={{
                        color: "#ff9966",
                        fontSize: 10,
                        textShadow: "0 0 8px #ff660088",
                      }}
                    >
                      💥×{hud.chargesCount}
                    </div>
                  )}
                  {refinementKitActiveRef.current && (
                    <div
                      className="text-xs font-bold tabular-nums"
                      style={{
                        color: "#fde047",
                        fontSize: 10,
                        textShadow: "0 0 8px #fde04788",
                        animation: "pulse 1s ease-in-out infinite alternate",
                      }}
                    >
                      🔬 2x
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ── Right-side Minimap Panel ─────────────────────────────────────── */}
      {screen === "game" && (
        <div
          className="fixed font-mono select-none pointer-events-none"
          style={{
            top: 50,
            right: 0,
            width: 120,
            height: 200,
            zIndex: 28,
            background: "linear-gradient(180deg, #1a1208 0%, #0d0a04 100%)",
            borderLeft: "2px solid #8B6914",
            borderTop: "2px solid #8B6914",
            borderBottom: "2px solid #8B6914",
            borderBottomLeftRadius: 6,
            boxShadow:
              "-2px 4px 16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,200,50,0.04)",
          }}
        >
          {/* Scan-line overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)",
              zIndex: 1,
            }}
          />
          {/* MAP label */}
          <div
            className="text-xs tracking-widest px-2 pt-1 pb-0.5 flex items-center justify-between"
            style={{
              color: "#8B6914",
              fontSize: 9,
              borderBottom: "1px solid rgba(139,105,20,0.3)",
              zIndex: 2,
              position: "relative",
            }}
          >
            <span>◈ MAP</span>
            <span style={{ color: "#4a3a10" }}>depth</span>
          </div>
          {/* Minimap canvas */}
          <div
            className="relative"
            style={{
              padding: "3px 3px 2px 3px",
              height: "calc(100% - 22px)",
              zIndex: 2,
            }}
          >
            <canvas
              ref={cockpitMinimapRef}
              style={{
                width: "100%",
                height: "100%",
                imageRendering: "pixelated",
                display: "block",
              }}
            />
          </div>
          {/* Rivets */}
          <div
            className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full"
            style={{
              background: "#8B6914",
              boxShadow: "0 0 3px rgba(139,105,20,0.6)",
              zIndex: 3,
            }}
          />
          <div
            className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{
              background: "#8B6914",
              boxShadow: "0 0 3px rgba(139,105,20,0.6)",
              zIndex: 3,
            }}
          />
        </div>
      )}

      {/* ── Bottom Ticker ──────────────────────────────────────────────────── */}
      {screen === "game" && (
        <div
          className="fixed left-0 right-0 font-mono select-none pointer-events-none overflow-hidden"
          style={{
            bottom: isTouchDevice
              ? "calc(44px + env(safe-area-inset-bottom, 0px))"
              : 0,
            height: 32,
            paddingBottom: isTouchDevice
              ? 0
              : "env(safe-area-inset-bottom, 0px)",
            zIndex: 30,
            background:
              "linear-gradient(180deg, rgba(4,2,0,0.97) 0%, rgba(8,5,1,0.99) 100%)",
            borderTop: "1px solid #4a3a10",
            boxShadow:
              "0 -4px 16px rgba(0,0,0,0.8), 0 -1px 0 rgba(245,197,66,0.1)",
          }}
        >
          {/* Scan-line */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,200,0,0.015) 3px, rgba(255,200,0,0.015) 4px)",
            }}
          />
          {/* Ticker label */}
          <div
            className="absolute left-0 top-0 bottom-0 flex items-center px-2"
            style={{
              background: "linear-gradient(90deg, #1a1208 80%, transparent)",
              zIndex: 2,
              borderRight: "1px solid #4a3a10",
            }}
          >
            <span
              className="text-xs tracking-widest font-bold"
              style={{ color: "#d4a84b", fontSize: 9 }}
            >
              ⬡ BOB
            </span>
          </div>
          {/* Scrolling text */}
          <div
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: 42, right: 0, overflow: "hidden" }}
          >
            <div
              className="whitespace-nowrap text-xs"
              style={{
                color: "#9ca3af",
                fontSize: 11,
                animation: "bobTicker 20s linear infinite",
              }}
            >
              {currentTickerMsg
                ? `${currentTickerMsg} ◆ `
                : "BOB Mining Co. ◆ Drill deep. Find the Genesis Block. ◆ Upgrade your rig. Push further. ◆ "}
              {currentTickerMsg
                ? `${currentTickerMsg} ◆ `
                : "BOB Mining Co. ◆ Drill deep. Find the Genesis Block. ◆ Upgrade your rig. Push further. ◆ "}
            </div>
          </div>
        </div>
      )}

      {/* ── Character Portrait (NPC/Antagonist Dialog) ─────────────────────── */}
      {screen === "game" && activePortrait && (
        <div
          className="fixed font-mono select-none pointer-events-none"
          style={{
            bottom: isTouchDevice ? 225 : 38,
            left: 8,
            zIndex: 35,
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            maxWidth: "calc(100vw - 16px)",
          }}
        >
          {/* Portrait box */}
          <div
            style={{
              width: 64,
              height: 64,
              border: `2px solid ${activePortrait.color}`,
              boxShadow: `0 0 16px ${activePortrait.color}44, inset 0 0 8px rgba(0,0,0,0.5)`,
              background: "#050302",
              flexShrink: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <NpcPortrait npcId={activePortrait.npcId} size={64} />
            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 4px)",
              }}
            />
          </div>
          {/* Speech bubble */}
          <div
            style={{
              maxWidth: "min(220px, calc(100vw - 100px))",
              background: "rgba(8,6,2,0.95)",
              border: `1px solid ${activePortrait.color}`,
              boxShadow: `0 0 12px ${activePortrait.color}33`,
              padding: "6px 10px",
              position: "relative",
            }}
          >
            {/* Pointer triangle */}
            <div
              style={{
                position: "absolute",
                left: -7,
                bottom: 16,
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderRight: `7px solid ${activePortrait.color}`,
              }}
            />
            <div
              style={{
                color: activePortrait.color,
                fontSize: 9,
                letterSpacing: "0.1em",
                marginBottom: 2,
              }}
            >
              {activePortrait.npcId.replace(/_/g, " ").toUpperCase()}
            </div>
            <div className="text-xs leading-snug" style={{ color: "#e5d5a0" }}>
              {activePortrait.text.substring(0, 120)}
            </div>
          </div>
        </div>
      )}

      {/* Controls hint above instrument panel */}
      {!isTouchDevice && controlsHintAlpha > 0 && screen === "game" && (
        <div
          className="fixed z-20 text-xs text-right select-none px-2 py-1.5 rounded pointer-events-none font-mono"
          style={{
            bottom: 42,
            right: 130,
            opacity: controlsHintAlpha,
            background: "rgba(8,6,2,0.75)",
            color: "#6b7280",
            transition: "opacity 1s ease-out",
            border: "1px solid rgba(139,105,20,0.25)",
          }}
        >
          <div>WASD / Arrows: Move &amp; Drill</div>
          <div>W / ↑: Ascend | Enter: Shop</div>
        </div>
      )}

      {/* Mobile touch controls */}
      {isTouchDevice && screen === "game" && (
        <>
          {/* D-pad cluster - bottom left */}
          <div
            className="fixed z-40 select-none"
            style={{
              bottom: "calc(44px + env(safe-area-inset-bottom, 0px))",
              left: 12,
              background: "rgba(0,0,0,0.4)",
              borderRadius: "16px",
              padding: "8px",
              display: "grid",
              gridTemplateColumns:
                "min(90px, 28vw) min(90px, 28vw) min(90px, 28vw)",
              gridTemplateRows: "min(90px, 13vh) min(90px, 13vh)",
              gap: "4px",
            }}
          >
            <div />
            <div />
            <div />
            <button
              type="button"
              data-ocid="game.toggle"
              aria-label="Move left"
              className="touch-btn"
              onTouchStart={(e) => {
                e.preventDefault();
                touchPress("ArrowLeft");
              }}
              onTouchEnd={() => touchRelease("ArrowLeft")}
              onTouchCancel={() => touchRelease("ArrowLeft")}
            >
              ◀
            </button>
            <button
              type="button"
              aria-label="Drill down"
              className="touch-btn"
              onTouchStart={(e) => {
                e.preventDefault();
                touchPress("ArrowDown");
              }}
              onTouchEnd={() => touchRelease("ArrowDown")}
              onTouchCancel={() => touchRelease("ArrowDown")}
            >
              ▼
            </button>
            <button
              type="button"
              aria-label="Move right"
              className="touch-btn"
              onTouchStart={(e) => {
                e.preventDefault();
                touchPress("ArrowRight");
              }}
              onTouchEnd={() => touchRelease("ArrowRight")}
              onTouchCancel={() => touchRelease("ArrowRight")}
            >
              ▶
            </button>
          </div>

          {/* SONAR and CHARGE action buttons */}
          <div
            className="fixed z-40 select-none flex flex-col gap-2"
            style={{
              bottom: "calc(44px + env(safe-area-inset-bottom, 0px))",
              right: 130,
            }}
          >
            <button
              type="button"
              data-ocid="game.sonar_button"
              aria-label="Sonar ping"
              className="touch-btn"
              style={{
                width: 72,
                height: 56,
                fontSize: 11,
                background: "rgba(0,40,50,0.85)",
                borderColor: "#22d3ee88",
                color: "#22d3ee",
                flexDirection: "column",
                gap: 1,
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                triggerSonar();
              }}
            >
              <span style={{ fontSize: 18 }}>📡</span>
              <span style={{ fontSize: 9 }}>SONAR [{hud.sonarCount}]</span>
            </button>
            <button
              type="button"
              data-ocid="game.charge_button"
              aria-label="Explosive charge"
              className="touch-btn"
              style={{
                width: 72,
                height: 56,
                fontSize: 11,
                background: "rgba(50,20,0,0.85)",
                borderColor: "#ff660088",
                color: "#ff9966",
                flexDirection: "column",
                gap: 1,
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                triggerCharge();
              }}
            >
              <span style={{ fontSize: 18 }}>💥</span>
              <span style={{ fontSize: 9 }}>CHARGE [{hud.chargesCount}]</span>
            </button>
          </div>

          {/* UP thrust - bottom right */}
          <button
            type="button"
            aria-label="Thrust up"
            className="touch-btn touch-btn-up fixed z-40 select-none"
            style={{
              bottom: "calc(44px + env(safe-area-inset-bottom, 0px))",
              right: 12,
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              touchPress("ArrowUp");
            }}
            onTouchEnd={() => touchRelease("ArrowUp")}
            onTouchCancel={() => touchRelease("ArrowUp")}
          >
            ▲
          </button>

          {atSurface && (
            <button
              type="button"
              data-ocid="shop.sell_button"
              className="fixed z-40 px-4 py-2 bg-yellow-500 text-black font-bold text-sm rounded select-none"
              style={{
                top: 54,
                right: 130,
                maxWidth: 160,
                fontSize: "0.75rem",
              }}
              onClick={sellAll}
            >
              SELL ALL ({cargoTotalValue(playerRef.current.cargo)} BOB)
              {maxDepthReachedRef.current >= 60 && (
                <span className="ml-1 text-xs">
                  [
                  {maxDepthReachedRef.current >= 130
                    ? "3x"
                    : maxDepthReachedRef.current >= 100
                      ? "2x"
                      : "1.5x"}
                  ]
                </span>
              )}
            </button>
          )}

          <style>{`
            .touch-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: min(90px, 28vw);
              height: min(90px, 13vh);
              background: rgba(0,0,0,0.7);
              border: 2.5px solid rgba(255,180,0,0.6);
              border-radius: 12px;
              color: #f5c542;
              font-size: 28px;
              -webkit-tap-highlight-color: transparent;
              user-select: none;
              touch-action: none;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            }
            .touch-btn:active {
              background: rgba(245,197,66,0.25);
              box-shadow: 0 0 20px rgba(245,197,66,0.8), 0 0 8px rgba(245,197,66,0.4);
              border-color: #f5c542;
              border-width: 3px;
            }
            @keyframes milestoneReveal {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
            @keyframes questPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(249,115,22,0.3); }
  50% { box-shadow: 0 0 12px rgba(249,115,22,0.8); border-color: #fb923c !important; }
}
@keyframes questFlash {
              0% { background: rgba(212,168,75,0.5); }
              100% { background: rgba(212,168,75,0.12); }
            }
            @keyframes bobTicker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .touch-btn-up { width: 100px; height: 100px; font-size: 34px; }
            @keyframes cargoNearFull {
              0%, 100% { box-shadow: none; }
              50% { box-shadow: 0 0 10px rgba(249,115,22,0.6); background: rgba(249,115,22,0.05); }
            }
            @keyframes heatPulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            @keyframes deepDiveFadeOut {
              0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              70% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
              100% { opacity: 0; transform: translate(-50%, -50%) scale(0.98); }
            }
            @keyframes questPulseComplete {
              0%, 100% { background: rgba(30,20,4,0.95); border-color: #fbbf24; }
              50% { background: rgba(251,191,36,0.15); border-color: #fde68a; box-shadow: 0 0 16px rgba(251,191,36,0.6); }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
