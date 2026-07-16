"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 w-full border-b border-neutral-100/80 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0071e3]">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-900">
            GrowthOS
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-neutral-500 md:flex">
          <Link href="/#features" className="transition-colors hover:text-neutral-900">
            功能介绍
          </Link>
          <Link href="/assessment" className="transition-colors hover:text-neutral-900">
            免费诊断
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
