"use client"

import Link from "next/link"
import { GitGraph, ChevronRight } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export function Header() {
  // Access the sidebar state
  const { isCollapsed, toggleCollapsed } = useSidebar()
  
  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 h-16 bg-black/90 backdrop-blur-lg z-50",
        "border-b border-white/10 transition-all duration-300",
      )}
    >
      {/* Sidebar indicator arrow - positioned absolutely */}
  
      
      <div 
        className={cn(
          "h-full flex items-center justify-between",
          "px-4 md:px-8 ml-8 md:ml-24", // Added left margin to make room for the arrow
        )}
      >
        {/* Logo on leftmost */}
        <Link href="/" className="flex items-center gap-2">
          <GitGraph className="w-7 h-7 text-purple-500" />
          <span className="text-xl font-bold bg-gradient-to-r from-purple-500 to-cyan-500 text-transparent bg-clip-text">
            AlgoViz
          </span>
        </Link>
        
        {/* Auth buttons and Contact Us */}
        <div className="flex items-center gap-3">
          {/* Contact Us button with improved styling */}
          <Link href="/contact">
            <button className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/90 to-cyan-500/90 text-white font-medium text-sm hover:from-purple-600 hover:to-cyan-600 transition-all shadow-md shadow-purple-500/20">
              Contact Us
            </button>
          </Link>
        </div>
      </div>
    </header>
  )
}