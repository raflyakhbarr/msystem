"use client"

import * as React from "react"
import {
  Command,
  Server,
  Link,
  Users,
  SquareStack,
  User,
  Braces,
  Settings,
  LogOut,
  LayoutDashboard,
  GitFork,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Get user data from localStorage
const getUserData = () => {
  const username = localStorage.getItem('username') || 'User'
  const userDataString = localStorage.getItem('user')
  let userData = { name: username, email: '', avatar: '' }

  if (userDataString) {
    try {
      const parsedUser = JSON.parse(userDataString)
      userData = {
        name: username,
        email: parsedUser.email || '',
        avatar: parsedUser.avatar || ''
      }
    } catch (error) {
      console.error("Failed to parse user data", error)
    }
  }

  return userData
}

const data = {
  user: getUserData(),
  navMain: [
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
      url: "", 
      icon: GitFork,
      isActive: false,
      items: [
        {
          title: "Items",
          url: "/items",
          isActive: false,
        },
        {
          title: "Visualisasi",
          url: "/visualization",
          isActive: false,
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
              <a href="#">
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  )
}
