import { useState } from "react";
import type { Tab } from "../types/tabs";

export function useTabs(initial: Tab = "home") {
  const [tab, setTab] = useState<Tab>(initial);
  const navigate = (t: Tab) => setTab(t);
  const goHome = () => navigate("home");
  const goBuy = () => navigate("buy");
  const goQuiz = () => navigate("quiz");
  const goTournament = () => navigate("tournament");
  const goProfile = () => navigate("profile");
  const goHow = () => navigate("how");
  const goLearn = () => navigate("learn");
  return { tab, navigate, goHome, goBuy, goQuiz, goTournament, goProfile, goHow, goLearn };
}
