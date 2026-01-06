import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Server, Link as LinkIcon, SquareStack, GitFork, Settings, LayoutDashboard } from "lucide-react"

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ username?: string; name?: string } | null>(null)

  useEffect(() => {
    // Get user data from localStorage
    const userDataString = localStorage.getItem('user')
    const username = localStorage.getItem('username')

    if (userDataString) {
      try {
        const parsedUser = JSON.parse(userDataString)
        setUser({
          username: username || 'User',
          name: parsedUser.username || username || 'User'
        })
      } catch (error) {
        console.error("Failed to parse user data", error)
        setUser({ username: username || 'User' })
      }
    } else if (username) {
      setUser({ username })
    }
  }, [])

  const quickLinks = [
    {
      title: "Systems",
      description: "Manage system configurations",
      icon: Server,
      route: "/sistem",
      color: "text-blue-600"
    },
    {
      title: "Endpoint Groups",
      description: "Organize API endpoints",
      icon: LinkIcon,
      route: "/menu",
      color: "text-green-600"
    },
    {
      title: "Endpoints",
      description: "View and manage endpoints",
      icon: LinkIcon,
      route: "/menu-data",
      color: "text-emerald-600"
    },
    {
      title: "Account Groups",
      description: "Manage account groups",
      icon: Users,
      route: "/account-group",
      color: "text-purple-600"
    },
    {
      title: "Accounts",
      description: "User account management",
      icon: Users,
      route: "/account",
      color: "text-indigo-600"
    },
    {
      title: "Features",
      description: "System features configuration",
      icon: SquareStack,
      route: "/fitur",
      color: "text-orange-600"
    },
    {
      title: "CMDB Items",
      description: "Configuration items",
      icon: GitFork,
      route: "/items",
      color: "text-cyan-600"
    },
    {
      title: "CMDB Visualization",
      description: "Visualize relationships",
      icon: GitFork,
      route: "/visualization",
      color: "text-teal-600"
    },
    {
      title: "Settings",
      description: "System configuration",
      icon: Settings,
      route: "/settings",
      color: "text-gray-600"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username || user?.name || 'User'}!
          </p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
            onClick={() => navigate(link.route)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {link.title}
              </CardTitle>
              <link.icon className={`h-5 w-5 ${link.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {link.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
