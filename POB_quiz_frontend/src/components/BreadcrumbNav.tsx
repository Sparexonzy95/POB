// src/components/BreadcrumbNav.tsx
import { ArrowLeft, Home, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type BreadcrumbItem = {
  label: string;
  path: string;
};

type BreadcrumbNavProps = {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  showBackButton?: boolean;
};

export default function BreadcrumbNav({ items, onNavigate, showBackButton = false }: BreadcrumbNavProps) {
  const handleBack = () => {
    if (items.length > 1) {
      // Navigate to the parent breadcrumb
      onNavigate(items[items.length - 2].path);
    } else {
      // If no parent, navigate to home
      onNavigate("home");
    }
  };

  return (
    <nav className="flex items-center py-2">
      {showBackButton && (
        <motion.button
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className="mr-3 flex items-center gap-1 text-highlight/80 hover:text-[#94C751] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </motion.button>
      )}

      <div className="flex items-center text-sm">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate("home")}
          className="text-highlight/80 hover:text-[#94C751] transition-colors"
        >
          <Home className="w-4 h-4" />
        </motion.button>

        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2 text-highlight/40" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate(item.path)}
              className={`${
                index === items.length - 1
                  ? "text-[#94C751] font-medium"
                  : "text-highlight/80 hover:text-[#94C751]"
              } transition-colors`}
            >
              {item.label}
            </motion.button>
          </div>
        ))}
      </div>
    </nav>
  );
}