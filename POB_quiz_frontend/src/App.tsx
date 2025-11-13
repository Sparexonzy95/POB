// src/App.tsx
import * as React from "react";
import { motion } from "framer-motion";

import TopNavbar from "./components/TopNavbar";
import BreadcrumbNav from "./components/BreadcrumbNav";
import { ToastContainer } from "./components/Toast";
import { PageTransition, Celebration } from "./components/PageTransition";

import { AppStateProvider, useAppState } from "./context/AppStateProvider";
import { useTabs } from "./navigation/useTabs";
import { getBreadcrumbItems } from "./navigation/Breadcrumbs";

import { Home } from "./pages/Home";
import { How } from "./pages/How";
import { Learn } from "./pages/Learn";
import { Buy } from "./pages/Buy";
import { Quiz } from "./pages/Quiz";
import { Tournament } from "./pages/Tournament";
import { Play } from "./pages/Play";
import { Profile } from "./pages/Profile";

import {
  Home as HomeIcon,
  Medal,
  Brain,
  BookOpen,
  User as UserIcon,
} from "lucide-react";

import "./celo-quiz-extensions.css";
import "./styles/miniPay.css";

function AppShell() {
  // ✅ Call useAppState ONCE and reuse the values
  const {
    isMiniPayBrowser,
    address,
    setAddress,
    playingTournamentId,
    setPlayingTournamentId,
  } = useAppState();

  // Tabs & navigation helpers
  const {
    tab,
    navigate,
    goHome,
    goQuiz,
    goTournament,
    goProfile,
    goLearn,
    goBuy,
  } = useTabs("home");

  const [showCelebration, setShowCelebration] = React.useState(false);

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const crumbs = getBreadcrumbItems(tab, playingTournamentId);

  return (
    <div
      className={`min-h-[100dvh] bg-background text-highlight flex flex-col ${
        isMiniPayBrowser ? "minipay-mode" : ""
      }`}
    >
      <ToastContainer />
      {showCelebration && <Celebration />}

      {/* Top nav gets address and navigator */}
      <TopNavbar
        address={address}
        onAddress={setAddress}
        onNavigate={navigate}
        currentTab={tab}
      />

      {tab !== "home" && (
        <div className="border-b border-secondary/20 bg-[#1c2a0c]/30">
          <div className="max-w-md mx-auto px-4 py-2">
            <BreadcrumbNav
              items={crumbs}
              onNavigate={navigate}
              showBackButton={tab === "play"}
            />
          </div>
        </div>
      )}

      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto p-4 space-y-5">
          {/* Home */}
          <PageTransition isVisible={tab === "home"} direction="up">
            <Home
              today={today}
              goQuiz={goQuiz}
              goTournament={goTournament}
              goBuy={goBuy} // ✅ important
            />
          </PageTransition>

          {/* How */}
          <PageTransition isVisible={tab === "how"}>
            <How goQuiz={goQuiz} goTournament={goTournament} />
          </PageTransition>

          {/* Learn */}
          <PageTransition isVisible={tab === "learn"}>
            <Learn />
          </PageTransition>

          {/* Buy */}
          <PageTransition isVisible={tab === "buy"}>
            <Buy />
          </PageTransition>

          {/* Quiz */}
          <PageTransition isVisible={tab === "quiz"}>
            <Quiz navigate={navigate} />
          </PageTransition>

          {/* Tournament list */}
          <PageTransition isVisible={tab === "tournament"}>
            <Tournament
              onPlay={(id) => {
                setPlayingTournamentId(id);
                navigate("play");
              }}
            />
          </PageTransition>

          {/* Tournament play */}
          <PageTransition isVisible={tab === "play"} direction="left">
            <Play onNavigate={navigate} />
          </PageTransition>

          {/* Profile */}
          <PageTransition isVisible={tab === "profile"}>
            <Profile goBuy={goBuy} />
          </PageTransition>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-secondary/60 ${
          isMiniPayBrowser ? "pb-safe" : ""
        }`}
      >
        <div className="max-w-md mx-auto grid grid-cols-5 text-center text-xs">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goHome}
            className={
              "py-2.5 flex flex-col items-center gap-0.5 " +
              (tab === "home"
                ? "text-primary"
                : "text-highlight/70 hover:text-highlight")
            }
          >
            <HomeIcon className="h-5 w-5" /> Home
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goQuiz}
            className={
              "py-2.5 flex flex-col items-center gap-0.5 " +
              (tab === "quiz"
                ? "text-primary"
                : "text-highlight/70 hover:text-highlight")
            }
          >
            <Brain className="h-5 w-5" /> Quiz
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goTournament}
            className={
              "py-2.5 flex flex-col items-center gap-0.5 " +
              (tab === "tournament" || tab === "play"
                ? "text-primary"
                : "text-highlight/70 hover:text-highlight")
            }
          >
            <Medal className="h-5 w-5" /> Tournament
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goLearn}
            className={
              "py-2.5 flex flex-col items-center gap-0.5 " +
              (tab === "learn"
                ? "text-primary"
                : "text-highlight/70 hover:text-highlight")
            }
          >
            <BookOpen className="h-5 w-5" /> Learn
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={goProfile}
            className={
              "py-2.5 flex flex-col items-center gap-0.5 " +
              (tab === "profile"
                ? "text-primary"
                : "text-highlight/70 hover:text-highlight")
            }
          >
            <UserIcon className="h-5 w-5" /> Profile
          </motion.button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
