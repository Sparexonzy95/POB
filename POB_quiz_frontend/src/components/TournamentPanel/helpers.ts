// Shared view helpers for TournamentPanel

export type TournamentPhase = "active" | "register" | "ended" | "unknown";

export function formatTimeLeft(timestamp: number): string {
  try {
    const now = Math.floor(Date.now() / 1000);
    const secondsLeft = timestamp - now;
    if (secondsLeft <= 0) return "Ended";

    const days = Math.floor(secondsLeft / 86400);
    const hours = Math.floor((secondsLeft % 86400) / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  } catch {
    return "Unknown";
  }
}

export function getTournamentPhase(t: any): TournamentPhase {
  try {
    const now = Math.floor(Date.now() / 1000);
    if (now >= t.startTime && now <= t.endTime) return "active";
    if (now < t.registrationEndTime) return "register";
    if (now > t.endTime) return "ended";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export function prettyWeiCusd(wei: string | number | bigint): string {
  try {
    const v = BigInt(wei);
    const whole = v / 10n ** 18n;
    const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${frac} cUSD`;
  } catch {
    return "—";
  }
}
