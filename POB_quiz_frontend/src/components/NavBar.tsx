import { Home, Trophy, User } from "lucide-react"
import { NavLink } from "react-router-dom"

export default function NavBar() {
  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/quiz", label: "Quiz", icon: Trophy },
    { to: "/profile", label: "Profile", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-fig/95 border-t border-lotus/30 backdrop-blur-md px-6 py-2 flex justify-between items-center shadow-lg">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs font-medium transition-all ${
              isActive
                ? "text-prosperity drop-shadow-[0_0_6px_#FCFF52]"
                : "text-lotus/60 hover:text-lotus"
            }`
          }
        >
          <Icon className="h-5 w-5 mb-1" strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
