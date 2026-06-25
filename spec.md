# BOB Mining Co.

## Current State
Version 104, 6-file modular codebase. Main render loop already uses viewport culling. playOreCollect exists and is called. Summary screen shows stats, personal best, milestone, seed. NPC loyalty runs invisibly. No next-run goal nudge exists on summary. Ore codex tracked across runs.

## Requested Changes (Diff)

### Add
- Next run goal panel on SummaryScreen: show undiscovered ore count, next NG+ bonus, or depth milestone to chase.
- Ore pickup tone variation: rare ores get higher pitch than common.
- NPC loyalty hint dialog: Dom/Jerry/Whale loyalty-reactive lines when relationship has shifted.
- Subtle glow pulse on the NEXT RUN card.

### Modify
- SummaryScreen: add discoveredOreCount, totalOreCount, nextBonusLabel props and render goal card.
- setSummaryData calls: pass ore discovery counts.
- playOreCollect: accept tier param, vary pitch by rarity.
- NPC underground pools: add 2-3 loyalty-reactive lines per NPC.

### Remove
- Nothing.

## Implementation Plan
1. Update SummaryScreen props and render next-run goal card
2. Thread discoveredOreCount/totalOreCount into setSummaryData calls
3. Make playOreCollect vary pitch by ore tier
4. Wire tier into ore pickup handler
5. Add loyalty-reactive dialog lines for Dom, Jerry, Whale underground encounters
