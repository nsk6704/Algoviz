"use client"

import * as React from "react"
import { createContext, useContext, useState } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from "@/lib/utils"

// Types
type SidebarContextType = {
  isCollapsed: boolean
  toggleCollapsed: () => void
}

// Context
const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

// Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  
  const toggleCollapsed = () => setIsCollapsed(!isCollapsed)
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

// Hook
export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

// Trigger button
export function SidebarTrigger() {
  const { toggleCollapsed, isCollapsed } = useSidebar()
  
  return (
    <button 
      onClick={toggleCollapsed}
      className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
      aria-label="Toggle sidebar"
    >
      {isCollapsed ? (
        <ChevronRight className="w-5 h-5 text-white" />
      ) : (
        <ChevronLeft className="w-5 h-5 text-white" />
      )}
    </button>
  )
}

// Sidebar components
export function Sidebar({ 
  className, 
  children 
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isCollapsed } = useSidebar()
  
  return (
    <aside 
      className={cn(
        "fixed top-0 left-0 z-40 h-screen transition-all duration-300 transform",
        isCollapsed ? "w-16" : "w-64",
        "bg-black border-r border-gray-800 shadow-xl",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <div className="h-full flex flex-col">{children}</div>
}

export function SidebarGroup({ 
  className, 
  children 
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("py-2", className)}>{children}</div>
}

export function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar()
  if (isCollapsed) return null
  
  return (
    <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold">
      {children}
    </div>
  )
}

export function SidebarGroupContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

export function SidebarMenu({ children }: { children: React.ReactNode }) {
  return <nav>{children}</nav>
}

export function SidebarMenuItem({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return <div>{children}</div>
}

export function SidebarMenuButton({ 
  asChild = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  asChild?: boolean 
}) {
  if (asChild) {
    return <div className={cn("block", className)}>{children}</div>
  }
  
  return (
    <button 
      className={cn(
        "flex items-center w-full px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded-md",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}