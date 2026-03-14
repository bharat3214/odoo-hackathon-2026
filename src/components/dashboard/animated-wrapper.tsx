"use client";

import { motion } from "framer-motion";

export function AnimatedWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-10 max-w-7xl mx-auto"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCard({
  children,
  index = 0,
  direction = "y",
}: {
  children: React.ReactNode;
  index?: number;
  direction?: "x" | "y" | "-x";
}) {
  const initial =
    direction === "x"
      ? { opacity: 0, x: 20 }
      : direction === "-x"
      ? { opacity: 0, x: -20 }
      : { opacity: 0, y: 20 };

  const animate =
    direction === "x"
      ? { opacity: 1, x: 0 }
      : direction === "-x"
      ? { opacity: 1, x: 0 }
      : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ duration: direction === "y" ? 0.4 : 0.5, delay: index * 0.1 }}
    >
      {children}
    </motion.div>
  );
}
