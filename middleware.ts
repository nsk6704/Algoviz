import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define all public routes
const isPublicRoute = createRouteMatcher([
  '/',                   // Homepage
  '/sign-in(.*)',        // Sign in pages
  '/sign-up(.*)',        // Sign up pages
  '/algorithms/(.*)',    // All algorithm visualization pages
  '/api/chat(.*)',       // Chat API endpoints
  '/learn/(.*)',         // Learning resources
  '/((?!dashboard|profile).*)' // Everything except dashboard and profile
])

export default clerkMiddleware(async (auth, req) => {
  // Only protect routes that aren't public
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}