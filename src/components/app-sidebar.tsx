"use client"
import * as React from "react"
import {  Command, Server, Link, Users, SquareStack, User, Braces, LayoutDashboard, GitFork, BookOpen} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar"

const getUserData = () => {
  const username = localStorage.getItem('username')
  const userDataString = localStorage.getItem('user')
  let userData = { name: username || '', email: '', avatar: '' }

  if (userDataString) {
    try {
      const parsedUser = JSON.parse(userDataString)
      userData = {
        name: username || '',
        email: parsedUser.email || '',
        avatar: parsedUser.avatar || ''
      }
    } catch (error) {
      console.error("Failed to parse user data", error)
    }
  }

  return userData
}
const navMainItems = [
  {
    title: "Dashboard",
    url:"/dashboard",
    icon:LayoutDashboard,
    isActive: false,
    items: [],
  },
  {
    title: "System",
    url: "/sistem",
    icon: Server,
    isActive: false,
    items: [],
  },
  {
    title: "Endpoint Group",
    url: "/menu",
    icon: Link,
    isActive: false,
    items: [],
  },
  {
    title: "Endpoint",
    url: "/menu-data",
    icon: Braces,
    isActive: false,
    items: []
  },
  {
    title: "Account Group",
    url: "/account-group",
    icon: Users,
    isActive: false,
    items: [],
  },
  {
    title: "Account",
    url: "/account",
    icon: User,
    isActive: false,
    items: []
  },
  {
    title: "Fitur",
    url: "/fitur",
    icon: SquareStack,
    isActive: false,
    items: [],
  },
  {
    title: "CMDB",
    url: "/cmdb",
    icon: GitFork,
    isActive: true,
    items: [
      {
        title: "Items",
        url: "/cmdb/items",
        isActive: false,
      },
      {
        title: "Visualisasi",
        url: "/cmdb/visualization",
        isActive: false,
      },
    ],
  },
  
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = getUserData()

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">System</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
