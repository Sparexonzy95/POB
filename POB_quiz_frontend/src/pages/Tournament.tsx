import { motion } from "framer-motion";
import TournamentPanel from "../components/TournamentPanel";
import { useAppState } from "../context/AppStateProvider";


export function Tournament({ onPlay }: { onPlay: (id: number) => void }) {
  return (
    <div className="space-y-4">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
        <TournamentPanel address={useAppState().address} onPlay={onPlay} />
      </motion.div>
    </div>
  );
}

