import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Server, Link as LinkIcon, SquareStack, GitFork, Settings, Database, Layers, ArrowRight, Search, Clock, TrendingUp } from "lucide-react"
import { fetchAllSystems } from "@/api/SystemApi"
import { fetchMenu } from "@/api/menuApi"
import { fetchMenuGroup } from "@/api/menugroupApi"
import { fetchAccounts } from "@/api/accountApi"
import { fetchFitur } from "@/api/fiturApi"

interface DashboardStats {
  systems: number
  endpoints: number
  endpointGroups: number
  accounts: number
  features: number
}

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number, duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * value))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span>{count}</span>
}

// Skeleton Loader Component
function SkeletonCard() {
  return (
    <Card className="overflow-hidden border-2">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-12 w-12 bg-muted animate-pulse rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<{ username?: string; name?: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    systems: 0,
    endpoints: 0,
    endpointGroups: 0,
    accounts: 0,
    features: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [systems, endpoints, endpointGroups, accounts, features] = await Promise.all([
          fetchAllSystems().catch(() => []),
          fetchMenu().catch(() => []),
          fetchMenuGroup().catch(() => []),
          fetchAccounts().catch(() => []),
          fetchFitur().catch(() => [])
        ])

        setStats({
          systems: systems.length,
          endpoints: endpoints.length,
          endpointGroups: endpointGroups.length,
          accounts: accounts.length,
          features: features.length
        })
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const statCards = [
    {
      title: "Total Systems",
      value: stats.systems,
      icon: Server,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
      textColor: "text-blue-600 dark:text-blue-400",
      glow: "shadow-blue-500/20",
      borderColor: "border-blue-200 dark:border-blue-800"
    },
    {
      title: "Total Endpoints",
      value: stats.endpoints,
      icon: LinkIcon,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10 dark:bg-emerald-500/20",
      textColor: "text-emerald-600 dark:text-emerald-400",
      glow: "shadow-emerald-500/20",
      borderColor: "border-emerald-200 dark:border-emerald-800"
    },
    {
      title: "Endpoint Groups",
      value: stats.endpointGroups,
      icon: Layers,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10 dark:bg-green-500/20",
      textColor: "text-green-600 dark:text-green-400",
      glow: "shadow-green-500/20",
      borderColor: "border-green-200 dark:border-green-800"
    },
    {
      title: "Total Accounts",
      value: stats.accounts,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10 dark:bg-purple-500/20",
      textColor: "text-purple-600 dark:text-purple-400",
      glow: "shadow-purple-500/20",
      borderColor: "border-purple-200 dark:border-purple-800"
    },
    {
      title: "Features",
      value: stats.features,
      icon: SquareStack,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10 dark:bg-orange-500/20",
      textColor: "text-orange-600 dark:text-orange-400",
      glow: "shadow-orange-500/20",
      borderColor: "border-orange-200 dark:border-orange-800"
    }
  ]

  const quickLinks = {
    management: [
      {
        title: "Systems",
        description: "Manage system configurations",
        icon: Server,
        route: "/sistem",
        color: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-200 dark:border-blue-800",
        hoverBorder: "hover:border-blue-500 dark:hover:border-primary/50",
        glow: "shadow-blue-500/20"
      },
      {
        title: "Account Groups",
        description: "Manage account groups",
        icon: Users,
        route: "/account-group",
        color: "text-purple-600 dark:text-purple-400",
        borderColor: "border-purple-200 dark:border-border",
        hoverBorder: "hover:border-purple-500 dark:hover:border-primary/50",
        glow: "shadow-purple-500/20"
      },
      {
        title: "Accounts",
        description: "User account management",
        icon: Users,
        route: "/account",
        color: "text-indigo-600 dark:text-indigo-400",
        borderColor: "border-indigo-200 dark:border-border",
        hoverBorder: "hover:border-indigo-500 dark:hover:border-primary/50",
        glow: "shadow-indigo-500/20"
      }
    ],
    configuration: [
      {
        title: "Endpoint Groups",
        description: "Organize API endpoints",
        icon: Layers,
        route: "/menu",
        color: "text-green-600 dark:text-green-600",
        borderColor: "border-green-200 dark:border-border",
        hoverBorder: "hover:border-green-500 dark:hover:border-primary/50",
        glow: "shadow-green-500/20"
      },
      {
        title: "Endpoints",
        description: "View and manage endpoints",
        icon: LinkIcon,
        route: "/menu-data",
        color: "text-emerald-600 dark:text-emerald-400",
        borderColor: "border-emerald-200 dark:border-border",
        hoverBorder: "hover:border-emerald-500 dark:hover:border-primary/50",
        glow: "shadow-emerald-500/20"
      },
      {
        title: "Features",
        description: "System features configuration",
        icon: SquareStack,
        route: "/fitur",
        color: "text-orange-600 dark:text-orange-400",
        borderColor: "border-orange-200 dark:border-border",
        hoverBorder: "hover:border-orange-500 dark:hover:border-primary/50",
        glow: "shadow-orange-500/20"
      }
    ],
    cmdb: [
      {
        title: "CMDB Items",
        description: "Configuration items",
        icon: Database,
        route: "/cmdb/items",
        color: "text-cyan-600 dark:text-cyan-400",
        borderColor: "border-cyan-200 dark:border-border",
        hoverBorder: "hover:border-cyan-500 dark:hover:border-primary/50",
        glow: "shadow-cyan-500/20"
      },
      {
        title: "CMDB Visualization",
        description: "Visualize relationships",
        icon: GitFork,
        route: "/cmdb/visualization",
        color: "text-teal-600 dark:text-teal-400",
        borderColor: "border-teal-200 dark:border-teal-900/30",
        hoverBorder: "hover:border-teal-500 dark:hover:border-primary/50",
        glow: "shadow-teal-500/20"
      }
    ],
    system: [
      {
        title: "Settings",
        description: "System configuration",
        icon: Settings,
        route: "/settings",
        color: "text-gray-600 dark:text-gray-400",
        borderColor: "border-gray-200 dark:border-border",
        hoverBorder: "hover:border-gray-500 dark:hover:border-primary/50",
        glow: "shadow-gray-500/20"
      }
    ]
  }

  const allQuickLinks = [...quickLinks.management, ...quickLinks.configuration, ...quickLinks.cmdb, ...quickLinks.system]

  const filteredLinks = searchQuery
    ? allQuickLinks.filter(link =>
        link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        link.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null

  return (
    <div className={`space-y-8 overflow-y-auto h-full pb-8 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Decorative Background Pattern */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 dark:from-blue-500/10 dark:via-transparent dark:to-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Welcome Section */}
      <div className="relative">
        <div className=" from-primary/6 via-primary/5 to-transparent dark:from-primary/10 dark:via-primary/8 dark:to-transparent rounded-2xl p-6 ">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Dashboard
                </h1>
              </div>
              <p className="text-muted-foreground">
                Welcome back, <span className="font-semibold text-foreground">{user?.username || user?.name || 'User'}</span>!
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 ">
                <Clock className="h-4 w-4" />
                <span>{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-4 py-2 ">
                <span className="hidden sm:inline">{formatDate(currentTime)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for pages, features, or settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">
              Search Results for "{searchQuery}"
            </h2>
            <span className="text-sm text-muted-foreground">({filteredLinks?.length || 0} found)</span>
          </div>
          {filteredLinks && filteredLinks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLinks.map((link, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer hover:shadow-lg hover:shadow-${link.glow} transition-all duration-300 hover:-translate-y-1 ${link.borderColor} ${link.hoverBorder}`}
                  onClick={() => navigate(link.route)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base font-semibold">
                      {link.title}
                    </CardTitle>
                    <div className={`rounded-lg p-2`}>
                      <link.icon className={`h-5 w-5 ${link.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                    <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>Open</span>
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {!searchQuery && (
        <>
          {/* Stats Overview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Overview</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {loading ? (
                Array(5).fill(0).map((_, index) => <SkeletonCard key={index} />)
              ) : (
                statCards.map((stat, index) => (
                  <Card
                    key={index}
                    className={`overflow-hidden border-2 ${stat.borderColor} hover:shadow-lg hover:shadow-${stat.glow} transition-all duration-300 hover:-translate-y-1 group relative`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    <CardContent className="p-6 relative">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                          <p className="text-2xl font-bold">
                            <AnimatedCounter value={stat.value} />
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 bg-gradient-to-br ${stat.color} shadow-lg shadow-${stat.glow} group-hover:scale-110 transition-transform duration-300`}>
                          <stat.icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Quick Links by Category */}
          <div className="space-y-8">
            {/* Management Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full" />
                <h2 className="text-xl font-semibold">Management</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 to-transparent dark:from-blue-400/30 dark:to-transparent" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.management.map((link, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${link.borderColor} ${link.hoverBorder} group`}
                    onClick={() => navigate(link.route)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-semibold">
                        {link.title}
                      </CardTitle>
                      <div className={`rounded-lg p-2 group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>Open</span>
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Configuration Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 rounded-full" />
                <h2 className="text-xl font-semibold">Configuration</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/20 to-transparent dark:from-emerald-400/30 dark:to-transparent" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.configuration.map((link, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${link.borderColor} ${link.hoverBorder} group`}
                    onClick={() => navigate(link.route)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-semibold">
                        {link.title}
                      </CardTitle>
                      <div className={`rounded-lg p-2 group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>Open</span>
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* CMDB Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-500 rounded-full" />
                <h2 className="text-xl font-semibold">CMDB</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-teal-500/20 to-transparent dark:from-teal-400/30 dark:to-transparent" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.cmdb.map((link, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${link.borderColor} ${link.hoverBorder} group`}
                    onClick={() => navigate(link.route)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-semibold">
                        {link.title}
                      </CardTitle>
                      <div className={`rounded-lg p-2 group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>Open</span>
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* System Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-gradient-to-r from-gray-500 to-gray-600 dark:from-gray-400 dark:to-gray-500 rounded-full" />
                <h2 className="text-xl font-semibold">System</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-500/20 to-transparent dark:from-gray-400/30 dark:to-transparent" />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.system.map((link, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${link.borderColor} ${link.hoverBorder} group`}
                    onClick={() => navigate(link.route)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-semibold">
                        {link.title}
                      </CardTitle>
                      <div className={`rounded-lg p-2 group-hover:scale-110 transition-transform duration-300`}>
                        <link.icon className={`h-5 w-5 ${link.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        <span>Open</span>
                        <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
