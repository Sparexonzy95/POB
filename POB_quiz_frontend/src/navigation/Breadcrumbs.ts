import type { Tab } from "../types/tabs";

export function getBreadcrumbItems(tab: Tab, playingTournamentId: number) {
  switch (tab) {
    case "buy": return [{ label: "Buy Credits", path: "buy" }];
    case "quiz": return [{ label: "Quiz", path: "quiz" }];
    case "tournament": return [{ label: "Tournaments", path: "tournament" }];
    case "play":
      return [
        { label: "Tournaments", path: "tournament" },
        { label: `Tournament #${playingTournamentId}`, path: "play" },
      ];
    case "how": return [{ label: "How It Works", path: "how" }];
    case "profile": return [{ label: "Profile", path: "profile" }];
    case "learn": return [{ label: "Learn", path: "learn" }];
    default: return [];
  }
}
