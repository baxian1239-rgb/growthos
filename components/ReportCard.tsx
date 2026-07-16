"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ReportCard({ title, icon: Icon, children, className, delay = 0 }: ReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "rounded-3xl border border-neutral-100 bg-white p-8 shadow-sm",
        className
      )}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0071e3]/10">
          <Icon className="h-5 w-5 text-[#0071e3]" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}
