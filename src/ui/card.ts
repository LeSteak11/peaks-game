import type { Card, Rank, Suit } from '../engine/types';

/**
 * Code-generated SVG card faces. Design constraints (PM, Step 4): rank + suit in the
 * top-left corner AND a large centered rank glyph; red hearts/diamonds, near-black
 * clubs/spades; readable at arm's length at 360px; no court-card art.
 */

export const SUIT_GLYPH: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export function isRed(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function rankLabel(rank: Rank): string {
  if (rank === 1) return 'A';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

/** viewBox 0 0 100 140. Colors via CSS classes so themes can tune them. */
export function cardFaceSvg(card: Card): string {
  const label = rankLabel(card.rank);
  const glyph = SUIT_GLYPH[card.suit];
  const colorClass = isRed(card.suit) ? 'suit-red' : 'suit-black';
  // The centered rank is the arm's-length read; corner rank+suit is the planning read.
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="card-bg" x="1.5" y="1.5" width="97" height="137" rx="10"/>
  <text class="card-corner-rank ${colorClass}" x="9" y="27">${label}</text>
  <text class="card-corner-suit ${colorClass}" x="9" y="48">${glyph}</text>
  <text class="card-center-rank ${colorClass}" x="56" y="96">${label}</text>
  <text class="card-center-suit ${colorClass}" x="56" y="126">${glyph}</text>
</svg>`;
}

export function cardBackSvg(): string {
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect class="card-back-bg" x="1.5" y="1.5" width="97" height="137" rx="10"/>
  <rect class="card-back-inner" x="8" y="8" width="84" height="124" rx="6"/>
  <path class="card-back-peak" d="M50 38 L82 108 L18 108 Z"/>
  <path class="card-back-snow" d="M50 38 L60 60 L55 56 L50 62 L45 56 L40 60 Z"/>
  <circle class="card-back-sun" cx="26" cy="34" r="7"/>
</svg>`;
}

/** Crack overlay for cracked ice — sits above the face, below input. */
export function crackSvg(): string {
  return `<svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path class="crack-line" d="M22 8 L38 44 L30 62 L46 88 L40 118"/>
  <path class="crack-line" d="M38 44 L58 52 L78 40"/>
  <path class="crack-line" d="M46 88 L66 96 L84 122"/>
</svg>`;
}

/** Accessible name, e.g. "Queen of Hearts". */
export function cardName(card: Card): string {
  const ranks = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];
  const suits: Record<Suit, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  return `${ranks[card.rank - 1]} of ${suits[card.suit]}`;
}
