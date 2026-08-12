import { buildDeck, RANKS } from './deck.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const HAND_SIZE = 5;
export const MAX_PLAY = 3;

export class Game {
  constructor(channelId, hostId) {
    this.channelId = channelId;
    this.hostId = hostId;
    this.status = 'WAITING'; // WAITING | PLAYING | FINISHED
    this.players = new Map(); // id -> { id, name, hand:[], lives cylinder/bullet, eliminated }
    this.joinOrder = [];
    this.round = 0;
    this.target = null;
    this.roundQueue = [];   // ids with cards left to act this round
    this.turnIndex = 0;
    this.pendingPlay = null; // { playerId, cards: [card,...] }
    this.lastLoserId = null;
    this.winnerId = null;
  }

  addPlayer(id, name) {
    if (this.status !== 'WAITING') throw new Error('اللعبة بدأت، ما تقدر تنضم الحين.');
    if (this.players.has(id)) throw new Error('انت منضم بالفعل.');
    if (this.players.size >= MAX_PLAYERS) throw new Error('الطاولة مكتملة (٤ ناجين كحد أقصى).');
    // secret bullet chamber, hidden from everyone including the player
    const bullet = Math.floor(Math.random() * 6);
    this.players.set(id, {
      id, name, hand: [], eliminated: false, cylinder: 0, bullet, safeThisRound: false,
    });
    this.joinOrder.push(id);
  }

  canStart() {
    return this.status === 'WAITING' && this.players.size >= MIN_PLAYERS;
  }

  start() {
    if (!this.canStart()) throw new Error('محتاج لاعبين اثنين ع الأقل عشان تبدأ.');
    this.status = 'PLAYING';
    this.round = 0;
    this._startRound(this.joinOrder[0]);
  }

  activePlayers() {
    return this.joinOrder.map((id) => this.players.get(id)).filter((p) => !p.eliminated);
  }

  _startRound(starterId) {
    this.round += 1;
    this.target = RANKS[Math.floor(Math.random() * RANKS.length)];
    const deck = buildDeck();
    const active = this.activePlayers();
    for (const p of active) {
      p.hand = deck.splice(0, HAND_SIZE);
      p.safeThisRound = false;
    }
    // build round queue starting at starterId, in join order
    const startIdx = this.joinOrder.indexOf(starterId);
    const ordered = [
      ...this.joinOrder.slice(startIdx),
      ...this.joinOrder.slice(0, startIdx),
    ].filter((id) => !this.players.get(id).eliminated);
    this.roundQueue = ordered;
    this.turnIndex = 0;
    this.pendingPlay = null;
  }

  currentPlayerId() {
    if (!this.roundQueue.length) return null;
    return this.roundQueue[this.turnIndex % this.roundQueue.length];
  }

  getHand(playerId) {
    return this.players.get(playerId)?.hand ?? [];
  }

  // Player plays 1–3 cards from hand, claiming they are all `target` rank.
  // The cards played may or may not actually match — that's the bluff.
  playCards(playerId, cardIds) {
    if (this.status !== 'PLAYING') throw new Error('ما فيه جولة نشطة.');
    if (this.pendingPlay) throw new Error('فيه ادّعاء معلق، لازم يتحل أول.');
    if (this.currentPlayerId() !== playerId) throw new Error('مو دورك.');
    if (cardIds.length < 1 || cardIds.length > MAX_PLAY) throw new Error('تقدر تلعب من ١ إلى ٣ بطاقات.');

    const player = this.players.get(playerId);
    const cards = [];
    for (const id of cardIds) {
      const idx = player.hand.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('بطاقة غير موجودة بيدك.');
      cards.push(player.hand.splice(idx, 1)[0]);
    }

    this.pendingPlay = { playerId, cards };

    // remove player from round queue if hand is now empty (safe for this round)
    if (player.hand.length === 0) {
      player.safeThisRound = true;
      const idx = this.roundQueue.indexOf(playerId);
      this.roundQueue.splice(idx, 1);
      if (this.turnIndex >= this.roundQueue.length) this.turnIndex = 0;
    } else {
      this.turnIndex = (this.turnIndex + 1) % this.roundQueue.length;
    }

    return { cards, count: cards.length };
  }

  // Next player accepts the claim as true. No reveal — cards are discarded,
  // and it becomes their turn to play their own cards.
  believe(playerId) {
    if (!this.pendingPlay) throw new Error('ما فيه ادّعاء تقدر تصدقه.');
    if (this.currentPlayerId() !== playerId) throw new Error('مو دورك.');
    this.pendingPlay = null;

    if (this.roundQueue.length === 0) {
      // everyone emptied their hands without a challenge — round ends safely
      this._endRoundSafely();
      return { roundEndedSafely: true };
    }
    return { roundEndedSafely: false };
  }

  // Next player calls bluff on the pending play. Resolves immediately.
  callBluff(playerId) {
    if (!this.pendingPlay) throw new Error('ما فيه ادّعاء تقدر تكذّبه.');
    if (this.currentPlayerId() !== playerId) throw new Error('مو دورك.');

    const { playerId: claimantId, cards } = this.pendingPlay;
    const truth = cards.every((c) => c.rank === this.target || c.rank === 'JOKER');
    const loserId = truth ? playerId : claimantId;
    const loser = this.players.get(loserId);

    const eliminated = this._spin(loser);
    this.lastLoserId = loserId;
    this.pendingPlay = null;

    const result = {
      truth,
      cards,
      loserId,
      eliminated,
      chamber: loser.cylinder, // position reached (1-indexed feel for display)
    };

    if (this.activePlayers().length <= 1) {
      this.status = 'FINISHED';
      this.winnerId = this.activePlayers()[0]?.id ?? null;
      result.gameOver = true;
      result.winnerId = this.winnerId;
      return result;
    }

    // next round starts with the loser if they survived, otherwise the
    // player after them in join order among the still-active players.
    let starter = loserId;
    if (eliminated) {
      const idx = this.joinOrder.indexOf(loserId);
      for (let step = 1; step <= this.joinOrder.length; step++) {
        const cand = this.joinOrder[(idx + step) % this.joinOrder.length];
        if (!this.players.get(cand).eliminated) { starter = cand; break; }
      }
    }
    this._startRound(starter);
    result.gameOver = false;
    return result;
  }

  _endRoundSafely() {
    // nobody was caught — next round starts with the player after the
    // previous round's starter, in join order among active players.
    const active = this.activePlayers();
    if (active.length <= 1) {
      this.status = 'FINISHED';
      this.winnerId = active[0]?.id ?? null;
      return;
    }
    const prevStarter = this.roundQueue[0] ?? this.lastLoserId ?? this.joinOrder[0];
    const idx = this.joinOrder.indexOf(prevStarter);
    let starter = prevStarter;
    for (let step = 1; step <= this.joinOrder.length; step++) {
      const cand = this.joinOrder[(idx + step) % this.joinOrder.length];
      if (!this.players.get(cand).eliminated) { starter = cand; break; }
    }
    this._startRound(starter);
  }

  // Single-bullet, six-chamber revolver, unique per player, never reloaded.
  // Each loss pulls the trigger once; the chamber only advances on a miss,
  // so repeated bad luck for one player becomes fatal within 6 pulls.
  _spin(player) {
    const hit = player.cylinder === player.bullet;
    if (hit) {
      player.eliminated = true;
    } else {
      player.cylinder += 1;
    }
    return hit;
  }
}
