// Deck: 6 of each rank (A, K, Q, J) + 2 Jokers (wild — always count as a match).
// 26 cards total, which safely supports 2–4 players at 5 cards each per round.

export const RANKS = ['A', 'K', 'Q', 'J'];
export const RANK_LABEL = { A: 'ايس', K: 'كينج', Q: 'كوين', J: 'جاك', JOKER: 'جوكر' };
export const RANK_GLYPH = { A: 'A', K: 'K', Q: 'Q', J: 'J', JOKER: '★' };

let cardSeq = 0;

export function buildDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (let i = 0; i < 6; i++) deck.push({ id: `c${cardSeq++}`, rank });
  }
  for (let i = 0; i < 2; i++) deck.push({ id: `c${cardSeq++}`, rank: 'JOKER' });
  return shuffle(deck);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardGlyph(card) {
  return RANK_GLYPH[card.rank];
}
