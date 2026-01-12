import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
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
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    const token = localStorage.getItem('token')
    
    if (!isAuthenticated || !token) {
      navigate('/login') 
      return
    }
    
  }, [navigate])

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
      'setting-feature': 'Setting Feature',
      'setting-token': 'Setting Token'
    }
    
    const filteredPathnames = pathnames.filter((name, index) => {
      return !(pathnames[index - 1] === 'setting-menu' && pathnames[index - 2] === 'account-group') &&
             !(pathnames[index - 1] === 'setting-feature' && pathnames[index - 2] === 'account-group')
    })
    
    const breadcrumbs = filteredPathnames.map((name, index) => {
      const originalIndex = pathnames.indexOf(name)
      const routeTo = `/${pathnames.slice(0, originalIndex + 1).join('/')}`
      const isLast = index === filteredPathnames.length - 1
      
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
      <SidebarInset className="h-screen flex flex-col">
        {location.pathname === '/visualization' ? (
          <>{children}</>
        ) : (
          <>
            <header className="flex h-12 shrink-0 items-center gap-2 border-b">
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
                        <BreadcrumbLink asChild>
                          <Link to="/dashboard">Dashboard</Link>
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      {getBreadcrumbs().map((crumb) => (
                        <div key={crumb.href} className="flex items-center">
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {crumb.isLast ? (
                              <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={crumb.href}>
                                  {crumb.name}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </div>
                      ))}
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>
              <div className="flex-1" />
              <div className="mr-3">
                <ModeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-hidden bg-linear-to-br from-background to-background/95 p-6 min-h-0">
              <div className="w-full h-full overflow-hidden">{children}</div>
            </main>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Layout