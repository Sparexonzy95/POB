// LocalStorage helpers for TournamentPanel

const DAILY_PLAYS_KEY = "tournament_daily_plays";
const REGISTERED_TOURNAMENTS_KEY = "registered_tournaments";

export function getDailyPlays(address: string, tournamentId: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `${DAILY_PLAYS_KEY}_${address.toLowerCase()}_${tournamentId}_${today}`;
    const raw = localStorage.getItem(key);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function incDailyPlays(address: string, tournamentId: number) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `${DAILY_PLAYS_KEY}_${address.toLowerCase()}_${tournamentId}_${today}`;
    const v = getDailyPlays(address, tournamentId) + 1;
    localStorage.setItem(key, String(v));
  } catch {}
}

export function loadRegistered(address?: string | null): number[] {
  try {
    if (!address) return [];
    const key = `${REGISTERED_TOURNAMENTS_KEY}_${address.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRegistered(address: string, tournamentId: number) {
  try {
    const list = loadRegistered(address);
    if (!list.includes(tournamentId)) {
      const key = `${REGISTERED_TOURNAMENTS_KEY}_${address.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify([...list, tournamentId]));
    }
  } catch {}
}
