# Peaks — Making "Ice" Strategically Meaningful

**To:** PM, Peaks · **From:** Research · **Date:** 2026-08-19 · **Blocks:** Step 7 scope

---

## TL;DR (blunt version)

Ice's _art and tap model_ are fine. Ice's _rule_ is dead because it is decoupled from every resource the player actually manages: rank on the pile, pack draws, combo, and undos. In every game we studied, the blockers players tolerate — and the ones that print money — are coupled to one of those things: an unlock **key** you have to route toward (Fairway's Sand Wedge, Solitaire Showtime's Hammer, Grand Harvest's rank-locks), **layers** that make you come back (King's "layered" blocker attribute, Zen Match ice), or a **countdown/mutation** that forces timing (Fairway Crabgrass, Candy Bombs, Tiki's Butterfly Vault). The blockers players hate are the ones that spread unpredictably (Candy Crush chocolate: "among the most disliked blockers in the game"), hide information (Balatro's face-down blinds: "may as well just quit"), or are pure stat walls (Balatro's The Wall: "extremely lazy game design").

**Recommendation: keep the ice name, the frost/cracked art, and the two-tap feel — replace the rule.** Rank #1 (Key Ice) and #2 (Slow Thaw) both reuse Step 4 art almost untouched. Do not throw ice away; do not ship it as-is either. Ship #1 in Phase 1, hold #2/#3 as the second and third hazards for Phase 2 content variety.

Coverage caveat: Reddit was blocked from our fetch environment; player sentiment below is from App Store/Play reviews, Steam forums, ComplaintsBoard, fan wikis, and King/Dream Games community pages. Where a game's exact rule was undocumented (TriPeaks Journey, Emerland glass/vine) we say so rather than guess.

---

## Ranked designs

### 1. Key Ice — "Play the key to thaw it" ★ Recommended for Phase 1

**Rule (one line):** Each iced card shows a _key rank_ on its frost; the moment any card of that rank is played onto the pile (from the board or the pack), every ice card sharing that key thaws instantly and becomes a normal card.

**Player-facing:** "Frozen cards show a number — play that number to melt them."

**Decision forced — routing.** The player now has a _reason_ to prefer one chain over another: the chain that passes through the key rank. Two-move example: pile is **7♥**; exposed cards are **6♣**, **8♦**, and further up a **frozen J♠ with key "9"**. Chain A (6♣ → 5 → 4…) is longer for combo; chain B (8♦ → **9♣**) is shorter but the 9 thaws the Jack, which unlocks the whole right peak. That's a real routing call: combo now vs. board access later.

**Borrowed from / evidence:** Fairway Solitaire's _Sand Wedge_ ("Playing the Wedge unlocks the Sand Traps") and _Water cards_ ("Play all Water Cards to unlock the Water Hazards") — the reviewer at Solitaire Laboratory calls hazards "excellent features, adding strategy and variety… if used within reason" (http://www.solitairelaboratory.com/solitairearcade/fairway.html; official rules https://fairwaysolitaireblast.zendesk.com/hc/en-us/articles/360000239194-Sand-Hazard). Solitaire Showtime's _Hammer_ card breaks Ice when revealed (https://jamcity.helpshift.com/hc/en/47-solitaire-showtime/faq/5675-special-cards/). Grand Harvest's rank-locks ("Each of these cards had to be played from the screen before the lock would open" — https://www.complaintsboard.com/solitaire-grand-harvest-b157543) — that same complaint tells you the failure mode: the key must actually be reachable. Candy Crush's _Sugar Key/Chest_ is the same remote-unlock shape (https://candycrush.fandom.com/wiki/Sugar_Key). Grand Harvest sells level-specific "Lock Removers" only on levels where locks appear (https://frvr.com/blog/solitaire-grand-harvest-strategy-guide-coin-management-tips/); Naavik documents the whole model driving ~$196M/yr (https://naavik.co/deep-dives/solitaire-grand-harvest-deconstruction/).

**Determinism / winnability:** Key rank is chosen from the deal's seeded RNG stream. Because the pack is always eventually drawn onto the pile, the key rank _always_ appears at some point — a Key Ice board is never less winnable than a plain board where the iced card is simply covered until late; the generator should add one guard: at least one copy of the key rank must not sit _under_ an iced card. Optional: choose the key from ranks present in the bottom two rows so it's tractable on easy days.

**Cost:** Engine (`hazards.ts` assigns key per ice slot; `applyMove` thaws on rank match; replay unaffected) + tiny UI (rank badge replaces the ❄ on the frost overlay). ~½ day. **Reuses Step 4 art fully** — frost stays; "cracked" becomes a 150 ms shatter transition to plain.

**Booster hook:** "Pickaxe" — thaw one ice now (coin sink, exactly Tiki's _Defroster_ / Fairway's _Midas Club_ pattern). Fail-offer variant: "+5 cards" is unchanged.

**Risk:** If a Friday board's three keys are all deep in the pack, the ice is inert until late — feels like plain ice. Mitigate with the "key not under ice" guard and a per-tier key placement rule.

---

### 2. Slow Thaw — "Layers melt as you clear"

**Rule:** Iced cards have 2 layers (hard days: 3). Each _clear_ you make anywhere on the board melts one layer off every exposed iced card; draws melt nothing. A card with layers left cannot be played; at 0 layers it's normal.

**Player-facing:** "Frozen cards thaw a little every time you clear a card — keep the chain going and they'll melt by themselves."

**Decision forced — timing + routing.** You want ice _exposed early_ so it thaws while you work elsewhere, and you want to _keep clearing rather than drawing_ while it's exposed. Example: pile **9♣**; exposed **10♥**, **8♠**, and a just-exposed **frozen 6♦ (2 layers)**. Playing 10♥ → J → Q is a three-clear chain that fully thaws the 6 by the time you'd need it. Drawing instead leaves it frozen and you're stuck behind it. It rewards exactly the behavior the combo already rewards — long chains — but now with a spatial payoff, not just points.

**Borrowed from / evidence:** King's blocker framework classifies "Layered" + "Match beside" as the accepted baseline (Frosting: "maximum of five layers"; https://www.pockettactics.com/candy-crush-soda-saga/blockers; John Davies: modern blockers must "create meaningful choices… reward planning" https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/). Zen Match Ice: "three cold layers… collect any three tiles to melt" (https://support.zenmatchgame.com/hc/en-us/articles/18374346351762-What-are-Blockers). Fairway Rough: "need to be played twice" and Deep Rough three times (https://fairway-solitaire.fandom.com/wiki/Hazards). Sentiment: layered/adjacent blockers (frosting, boxes, crates) draw no hate in any source we found; the hated ones are spreading (chocolate) and hard-fail (bombs).

**Determinism / winnability:** Fully deterministic. Winnability is _better_ than current ice for the player who chains, worse only if a 2-layer card is exposed with the pack nearly empty and no chain — bound layers to 2 on medium, 3 on Friday only.

**Cost:** Engine (`layers` replaces `IceState`; decrement in `applyMove` for clears; undo restores) + UI (2-state art already exists: intact = 2 layers, cracked = 1 layer; add "3" for hard days). ~½ day. **Reuses Step 4 art fully.**

**Booster hook:** "Torch" — melt all layers on the board. Also a natural Base Camp perk: "ice starts one layer thinner."

**Risk:** Read as "passive"; a player who never notices thaw thinks it's random. Fix with the layer number on the frost.

---

### 3. Rope Team — "Two climbers roped together"

**Rule:** Two board cards are joined by a rope; when you play one, the other is played onto the pile immediately after it (regardless of rank), and it counts as a clear for combo.

**Player-facing:** "Roped cards climb together — play one and its partner follows."

**Decision forced — risk/reward + routing.** The partner is a _free clear_ but it changes the pile's top card, which can either open the next chain or kill it. Example: pile **4♥**; exposed **5♠ roped to a Q♦** on the other peak; also exposed **3♣**. Play 5♠ → Q♦ auto-follows: +2 combo, but now the pile is a Queen — great if you have a K/J exposed, terrible if your live chain was 3-2-A. Play 3♣ first and save the rope for when a J or K is exposed. That is a genuine "when do I pull the trigger" bet, fully visible, no randomness.

**Borrowed from / evidence:** Solitaire Showtime's _Connected Card_ — "when the Card on one end is played, the Card on the other end is played immediately after" (https://jamcity.helpshift.com/hc/en/47-solitaire-showtime/faq/5675-special-cards/); Candy Crush _Rainbow Twist_ chains (destroy one link, chain goes; https://fran-ruiz.medium.com/match-3-level-design-study-building-three-candy-crush-levels-60f88465af7b); Balatro's boss blinds that _reshape_ the decision (The Psychic, The Eye) are the ones players defend, versus stat walls (https://www.thegamer.com/balatro-best-boss-blinds/). Thematically it is the best fit Peaks will ever get for a mountain game.

**Determinism / winnability:** Deterministic. Strictly _helps_ winnability (extra free clear); the only cost is chain disruption. Not a "hazard" in the punitive sense — it's a puzzle element, which is why it should be hazard #2, not the daily-difficulty knob.

**Cost:** Engine (pair slot ids; `applyMove` chains a second clear + snapshot; replay/undo need care to treat it as one move) + UI (rope line between two cards, two-step animation). ~1–1.5 days. **New art**, but ice art is untouched — this is additive.

**Booster hook:** none needed; make it a _positive_ thing you look forward to. Coin-sink candidate: "Cut rope" is pointless — skip.

**Risk:** Undo/replay bookkeeping; and if the roped partner is face-down, the player is playing blind (avoid — only rope face-up-eligible slots, or reveal partner rank on the rope).

---

### 4. Ice Picks — "Cracking costs a pick, or a draw"

**Rule:** Cracking ice spends one Ice Pick (Daily gives 2, like undos give 3); with no picks left, cracking instead pulls the next pack card onto the pile (a forced draw, combo resets).

**Player-facing:** "You've got two ice picks — after that, breaking ice costs you a card from your pack."

**Decision forced — resource trade-off.** With 3 ice on Friday and 2 picks, one ice card will cost a draw: _which one_, and _when_ (crack it during a lull when combo is already 0, not mid-chain). Example: combo ×4, pile **8♠**, frozen **7♥** exposed, one pick left, another frozen card still buried. Spend the last pick now to keep the ×4 chain alive, or draw (lose the combo) and save the pick for the buried card you can't see yet.

**Borrowed from / evidence:** This is the industry monetization pattern: Tiki's Trap Torch/Shark Hook/Defroster, sold per-hazard (https://scopely.helpshift.com/hc/en/58-tiki-solitaire-tripeaks/faq/8500-how-do-boosters-work/); Grand Harvest's per-level Lock/Bomb Removers; PocketGamer.biz on Grand Harvest: players "spend ~35% more currency per level than they win, yet maintain positive feelings" (https://www.pocketgamer.biz/boosting-revenue-in-2022-solitaire-grand-harvest/). Miracle Merchant's _visible-count_ negatives (you always know how many are left) are the fairness model (https://www.appunwrapper.com/2017/08/02/miracle-merchant-walkthrough-guide-tips-and-tricks/).

**Determinism / winnability:** Deterministic. Slightly _worse_ than plain (an ice card can cost a pack card), bounded: worst case Friday = 1 extra draw. Acceptable, but it's the only design here that spends the pack.

**Cost:** Engine (`picksUsed`/`pickLimit` in state, mirroring undo budget) + HUD ("Picks · 2" beside "Undo · 3"). ~½ day. **Reuses Step 4 art fully.**

**Booster hook: the strongest of the five.** Picks are a direct coin sink ("+1 pick, 500 coins") and a Base Camp perk ("unlimited picks"). Fail-offer pairs naturally.

**Risk:** Reads as pay-to-win the moment picks are sold — the reviews on Tiki ("levels impossible to defeat unless you buy boosters") and Grand Harvest ("Expect to pay at least $25 USD per week") are the exact sentiment you'd inherit. Keep the free budget ≥ ice count on all non-Friday days.

---

### 5. Cold Match — "Ice only breaks against its own colour"

**Rule:** An iced card can be cracked only while the pile's top card is the same colour (red/black); the second tap still needs ±1 rank.

**Player-facing:** "Ice breaks only against a card of the same colour."

**Decision forced — timing.** You have to _leave the right colour on top_ when the iced card becomes exposed, which means ordering the last two clears of a chain. Example: pile **6♥**; exposed **5♠**, **7♦**, and a **frozen 8♣**. Play 7♦ (red on top → can't crack the black 8). Play 5♠ first (black on top → crack), _then_ 7♦, then the 8. Same three cards, one order works.

**Borrowed from / evidence:** Fairway Solitaire _Frost_: "you must match the suit of the card to break the ice" and Showtime's _Suitcurtain_ (colour/suit-gated removal) (https://fairway-solitaire.fandom.com/wiki/Hazards; Showtime link above).

**Determinism / winnability:** Deterministic. Strictly _more_ restrictive than plain ice, so marginally more unwinnable boards; colour (50%) rather than suit (25%) keeps it small.

**Cost:** Engine (one condition in `tapAction`) + UI (red/blue tint on frost). ~2 hours. **Reuses Step 4 art fully.**

**Booster hook:** weak — "Pickaxe" from #1 covers it.

**Risk:** The PM's own test — "does it reduce to a small tax?" — this one is closest to failing it. It's a cheap upgrade over today, not a destination. Include only if #1 slips.

---

## Ranking rationale

| #   | Design     | Decision type      | Art reuse | Eng cost   | Booster hook            | Winnability vs plain      |
| --- | ---------- | ------------------ | --------- | ---------- | ----------------------- | ------------------------- |
| 1   | Key Ice    | Routing            | Full      | ½ day      | Strong (Pickaxe)        | Equal                     |
| 2   | Slow Thaw  | Timing + routing   | Full      | ½ day      | Good (Torch, Base Camp) | Equal/better for chainers |
| 3   | Rope Team  | Risk/reward        | New art   | 1–1.5 days | None needed             | Better                    |
| 4   | Ice Picks  | Resource trade-off | Full      | ½ day      | Strongest (coin sink)   | Slightly worse (bounded)  |
| 5   | Cold Match | Timing             | Full      | 2 hrs      | Weak                    | Slightly worse            |

Key Ice wins because it is the only one that changes _which chain you take_ on nearly every board it appears on, it is the most-proven pattern in the genre (Fairway, Showtime, Grand Harvest all use it), it costs half a day, and it makes the "cracked" state meaningful again as a shatter reveal. Slow Thaw is a close second and — importantly — pairs with the combo system rather than fighting it. Rope Team is the best _content_ idea and the best thematic fit but is a puzzle element, not a difficulty knob. Ice Picks is the best _business_ idea and the worst _sentiment_ idea; park it for Phase 2 when boosters exist. Cold Match is a patch.

## Should ice be replaced rather than fixed?

Fix it — meaning keep the noun "ice," the frost overlay, the cracked art, and the tap-to-crack gesture, and swap the rule for Key Ice. Every one of the four top designs preserves Step 4's visuals; only Rope Team needs new art, and it's additive. Replacing ice wholesale would throw away tested UI for no design gain, and "ice" is the right hazard for a mountain. The thing to kill is the _current rule_: "crack any exposed ice any time for free."

## Two Phase 2 notes that fell out of the research

The genre standard is one hazard-specific booster per hazard, sold only when that hazard is on the board (Tiki, Grand Harvest, Fairway) — design the booster shop schema around `hazardType → boosterId` now so it's free later. And every studied game hard-caps how _often_ a level fails to a blocker rather than to skill (King: "crazy hard levels never pay off," https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/) — which is another argument for the solver-verified generator already on the Phase 2 list.

## Sources (primary)

- Fairway Solitaire Blast hazard rules: https://fairwaysolitaireblast.zendesk.com/hc/en-us/articles/360000239194-Sand-Hazard · https://fairwaysolitaireblast.zendesk.com/hc/en-us/articles/360000239074-Rough-Hazard · https://fairwaysolitaireblast.zendesk.com/hc/en-us/articles/360001139194-Crabgrass · fan wiki https://fairway-solitaire.fandom.com/wiki/Hazards · review http://www.solitairelaboratory.com/solitairearcade/fairway.html
- Solitaire Showtime special cards: https://jamcity.helpshift.com/hc/en/47-solitaire-showtime/faq/5675-special-cards/
- Solitaire Grand Harvest: how-to https://www.solitairegrandharvest.com/latests-posts/how-to-play-solitaire-grand-harvest/ · Naavik https://naavik.co/deep-dives/solitaire-grand-harvest-deconstruction/ · PocketGamer.biz https://www.pocketgamer.biz/boosting-revenue-in-2022-solitaire-grand-harvest/ · complaints https://www.complaintsboard.com/solitaire-grand-harvest-b157543 · reviews https://apps.apple.com/us/app/solitaire-grand-harvest/id1223338261?see-all=reviews
- Tiki Solitaire TriPeaks boosters: https://scopely.helpshift.com/hc/en/58-tiki-solitaire-tripeaks/faq/8500-how-do-boosters-work/ · Butterfly Vault https://solitairetripeaks.com/theres-a-new-chief-in-town-meet-chief-roko-and-his-butterfly-vault/ · reviews https://apps.apple.com/us/app/tiki-solitaire-tripeaks/id892521917?see-all=reviews
- Sensor Tower solitaire revenue Q2 2023: https://sensortower.com/blog/top-5-solitaire-apps-performance-in-the-us-for-q-2-2023
- King blocker framework (GDC 2020): https://www.pockettactics.com/candy-crush-soda-saga/blockers · Davies interview https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase/ · Candy Crush wiki (chocolate, bombs, keys) https://candycrush.fandom.com/wiki/Blocker
- Royal Match / DoF: https://www.deconstructoroffun.com/blog/2021/3/21/royal-match-the-new-king-from-turkey · https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b
- Zen Match blockers: https://support.zenmatchgame.com/hc/en-us/articles/18374346351762-What-are-Blockers
- Balatro blinds: https://balatrowiki.org/w/Blinds_and_Antes · sentiment https://steamcommunity.com/app/2379780/discussions/0/4694531145715173333/ · https://www.thegamer.com/balatro-best-boss-blinds/
- Slay the Spire curses: https://slaythespire.wiki.gg/wiki/Curse · sentiment https://steamcommunity.com/app/646570/discussions/0/1734339901253879694/
- Card Thief tension design: https://www.gamedeveloper.com/design/game-design-deep-dive-creating-tension-in-i-card-thief-i- · Miracle Merchant https://www.appunwrapper.com/2017/08/02/miracle-merchant-walkthrough-guide-tips-and-tricks/
- Threes! design log (cut blockers): https://asherv.com/threes/threemails/
