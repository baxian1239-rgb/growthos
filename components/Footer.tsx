import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="text-center md:text-left">
            <p className="text-sm font-medium text-neutral-900">GrowthOS</p>
            <p className="mt-1 text-sm text-neutral-500">
              企业增长成熟度测评系统
            </p>
          </div>
          <div className="flex gap-6 text-sm text-neutral-500">
            <Link href="/assessment" className="transition-colors hover:text-neutral-900">
              免费诊断
            </Link>
            <Link href="/#features" className="transition-colors hover:text-neutral-900">
              功能介绍
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-neutral-200 pt-8 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} GrowthOS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
