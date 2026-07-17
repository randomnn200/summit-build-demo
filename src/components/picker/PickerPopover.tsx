"use client";

import { AnimatePresence, motion } from "framer-motion";

export function PickerPopover({
  open,
  children,
  className = "",
  align = "start",
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`picker-popover ${align === "end" ? "picker-popover-end" : ""} ${className}`.trim()}
          role="dialog"
          aria-modal="false"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
