"use client";

import React from "react";
import { useSidebar } from "@/components/ui/sidebar";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex-1 overflow-auto h-full">
      <main
        className={`
          flex flex-col
          transition-all duration-300 
          ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}
          px-4 py-8 md:pl-6 md:pr-8
          pt-20
          min-h-screen
        `}
      >
        <div className="w-full max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
