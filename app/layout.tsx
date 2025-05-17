export const dynamic = 'force-dynamic';

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ClerkProvider } from '@clerk/nextjs';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { ContentWrapper } from "@/components/content-wrapper"; // Move to separate client file

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AlgoViz',
  description: 'Interactive algorithm visualizations for learning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-black text-white antialiased overflow-y-auto`}>
          <SidebarProvider>
            <Header />
            <div className="flex">
              <AppSidebar className="hidden md:block" />
              <ContentWrapper>
                {children}
              </ContentWrapper>
            </div>
            <Analytics />
            <SpeedInsights />
          </SidebarProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}