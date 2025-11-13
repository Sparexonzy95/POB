import { motion } from "framer-motion";
import TournamentPlay from "../components/TournamentPlay";
import { useAppState } from "../context/AppStateProvider";

export function Play({ onNavigate }: { onNavigate: (t: any) => void }) {
  const { address, playingTournamentId } = useAppState();
  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
      <TournamentPlay address={address} tournamentId={playingTournamentId} onNavigate={onNavigate} />
    </motion.div>
  );
}
