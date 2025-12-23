import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ModeToggle } from './mode-toggle'
import { AppSidebar } from './app-sidebar'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

function Layout({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username?: string; name?: string } | null>(null) // State to hold the user data
  const navigate = useNavigate()
  const location = useLocation()

  // 1. Authentication Check & User Loading
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    const token = localStorage.getItem('token')
    
    if (!isAuthenticated || !token) {
      navigate('/login') // Redirect if not logged in
      return
    }
    
    const userDataString = localStorage.getItem('user')
    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString)
        setUser(parsedUser)
      } catch (error) {
        console.error("Failed to parse user data", error)
      }
    }
  }, [navigate])

  // 2. Storage Listener (Auto-logout if token is cleared elsewhere)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/login')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [navigate])


  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x)
    
    // Navigation data with titles from app-sidebar
    const navData: Record<string, string> = {
      'dashboard': 'Dashboard',
      'sistem': 'System',
      'menu': 'Endpoint Group',
      'menu-data': 'Endpoint',
      'account-group': 'Account Group',
      'account': 'Account',
      'fitur': 'Fitur',
      'settings': 'Settings',
      'setting-menu': 'Setting Menu',
      'setting-feature': 'Setting Feature'
    }
    
    // Filter out the accGroupId from the pathnames for breadcrumb display
    const filteredPathnames = pathnames.filter((name, index) => {
      // Skip the accGroupId if we're in the setting-menu or setting-feature route
      return !(pathnames[index - 1] === 'setting-menu' && pathnames[index - 2] === 'account-group') &&
             !(pathnames[index - 1] === 'setting-feature' && pathnames[index - 2] === 'account-group')
    })
    
    const breadcrumbs = filteredPathnames.map((name, index) => {
      // Get the original index to build the correct route
      const originalIndex = pathnames.indexOf(name)
      const routeTo = `/${pathnames.slice(0, originalIndex + 1).join('/')}`
      const isLast = index === filteredPathnames.length - 1
      
      // Use title from navData, fallback to capitalized name if not found
      const displayName = navData[name] || name.charAt(0).toUpperCase() + name.slice(1)
      
      return {
        name: displayName,
        href: routeTo,
        isLast
      }
    })
    
    return breadcrumbs
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <SidebarTrigger className="" />
          <Breadcrumb>
            <BreadcrumbList>
              {location.pathname === '/dashboard' ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                  </BreadcrumbItem>
                  {getBreadcrumbs().map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center">
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        {crumb.isLast ? (
                          <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>{crumb.name}</BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </div>
                  ))}
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1" />
          <div className='mr-3'>
          <ModeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-hidden bg-linear-to-br from-background to-background/95 p-6 min-h-0">
          <div className="w-full h-full overflow-hidden">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default Layout