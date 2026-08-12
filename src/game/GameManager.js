import { Game } from './Game.js';

const games = new Map(); // channelId -> Game

export function getGame(channelId) {
  return games.get(channelId) ?? null;
}

export function createGame(channelId, hostId) {
  if (games.has(channelId)) throw new Error('فيه طاولة نشطة بهذا الروم بالفعل.');
  const game = new Game(channelId, hostId);
  games.set(channelId, game);
  return game;
}

export function endGame(channelId) {
  games.delete(channelId);
}
