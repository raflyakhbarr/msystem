import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Server, Link, SquareStack, Activity } from "lucide-react"

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ username?: string; name?: string } | null>(null)
  const [stats, setStats] = useState({
    systems: 0,
    endpoints: 0,
    accounts: 0,
    features: 0
  })

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

    // Mock stats - in a real app, these would come from API calls
    setStats({
      systems: 5,
      endpoints: 23,
      accounts: 12,
      features: 8
    })
  }, [])

  const statCards = [
    {
      title: "Systems",
      value: stats.systems,
      icon: Server,
      description: "Total systems configured",
      color: "text-blue-600",
      route: "/sistem"
    },
    {
      title: "Endpoints",
      value: stats.endpoints,
      icon: Link,
      description: "API endpoints available",
      color: "text-green-600",
      route: "/menu-data"
    },
    {
      title: "Accounts",
      value: stats.accounts,
      icon: Users,
      description: "User accounts in system",
      color: "text-purple-600",
      route: "/account"
    },
    {
      title: "Features",
      value: stats.features,
      icon: SquareStack,
      description: "Active features",
      color: "text-orange-600",
      route: "/fitur"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username || user?.name || 'User'}!
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System Active
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(card.route)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">API Gateway</p>
                  <p className="text-sm text-muted-foreground">Main system gateway</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Authentication Service</p>
                  <p className="text-sm text-muted-foreground">User authentication</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Database</p>
                  <p className="text-sm text-muted-foreground">Primary data store</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    System initialized successfully
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    New endpoint added
                  </p>
                  <p className="text-sm text-muted-foreground">
                    5 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    User account created
                  </p>
                  <p className="text-sm text-muted-foreground">
                    1 day ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard