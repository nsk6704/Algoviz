"use client"

import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"
import {
  Home,
  BookOpen,
  Code,
  Brain,
  ChevronRight,
  ChevronLeft,
  GitGraph,
} from "lucide-react"
import { 
  SignInButton, 
  SignUpButton, 
  SignedIn, 
  SignedOut, 
  UserButton 
} from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Simplified navigation data
const navItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Machine Learning",
    url: "/#machine-learning",
    icon: Brain,
  },
  {
    title: "AI Algorithms",
    url: "/#artificial-intelligence",
    icon: Code,
  },
  {
    title: "Learning Resources",
    url: "/learn",
    icon: BookOpen,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isCollapsed, toggleCollapsed } = useSidebar()
  
  return (
    <Sidebar 
      className="bg-black border-r border-gray-800 text-white" 
      {...props}
    >
      <div className="flex items-center justify-between p-4">
      </div>
      
      {/* Main navigation */}
      <SidebarContent className="bg-black">
        <nav className="px-3 py-4">
          <div className={cn("mb-2", !isCollapsed && "px-2 text-xs text-gray-500 uppercase font-medium")}>
            {!isCollapsed && "Navigation"}
          </div>
          
          {navItems.map((item) => (
            <Link 
              key={item.title}
              href={item.url}
              className="flex items-center gap-3 mb-1 rounded-md px-3 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
      </SidebarContent>
      
      {/* Authentication buttons */}
      <SidebarFooter className="bg-black border-t border-gray-800 p-4">
        <SignedOut>
          <div className={cn(
            "flex",
            isCollapsed ? "flex-col items-center gap-2" : "flex-col gap-2"
          )}>
            <SignInButton mode="modal">
              <button className={cn(
                "flex items-center justify-center w-full bg-white/10 hover:bg-white/20 rounded-md transition-colors",
                isCollapsed ? "p-2" : "px-4 py-2"
              )}>
                {isCollapsed ? "" : "Sign In"}
                {isCollapsed && <ChevronRight className="h-4 w-4" />}
              </button>
            </SignInButton>
            
            <SignUpButton mode="modal">
              <button className={cn(
                "flex items-center justify-center w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:opacity-90 rounded-md transition-colors",
                isCollapsed ? "p-2" : "px-4 py-2"
              )}>
                {isCollapsed ? "" : "Sign Up"}
                {isCollapsed && <ChevronRight className="h-4 w-4" />}
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <div className="flex items-center justify-center">
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-9 h-9"
                }
              }}
              afterSignOutUrl="/"
            />
          </div>
        </SignedIn>
      </SidebarFooter>
      
      <SidebarRail className="bg-black border-r border-gray-800" />
    </Sidebar>
  )
}