import { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Wrench,
  Network,
  Clock,
  Eye,
  Zap,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCMDB } from '../../hooks/cmdb-hooks/useCMDB';
import { io } from 'socket.io-client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle2 },
  inactive: { label: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-50', icon: XCircle },
  maintenance: { label: 'Maintenance', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Wrench },
  decommissioned: { label: 'Decommissioned', color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertTriangle },
};

// Warna untuk chart (konversi dari tailwind colors ke hex)
const CHART_COLORS = {
  'green-600': '#16a34a',
  'gray-600': '#4b5563', 
  'yellow-600': '#ca8a04',
  'red-600': '#dc2626',
  'blue-600': '#2563eb',
  'purple-600': '#9333ea',
  'indigo-600': '#4f46e5',
  'pink-600': '#db2777',
  'teal-600': '#0d9488',
  'orange-600': '#ea580c',
  'cyan-600': '#0891b2',
  'lime-600': '#65a30d',
};

// Warna untuk data chart dinamis
const DYNAMIC_COLORS = [
  '#2563eb', '#9333ea', '#4f46e5', '#db2777', '#0d9488',
  '#ea580c', '#0891b2', '#65a30d', '#dc2626', '#ca8a04',
];

// Custom tooltip untuk chart
const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = total > 0 ? (data.value / total) * 100 : 0;
    
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value} item{data.value !== 1 ? 's' : ''} ({percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function CMDBDashboard() {
  const { items, groups, connections, groupConnections, loading, fetchAll } = useCMDB();
  const [selectedTab, setSelectedTab] = useState('type');
  const [chartType, setChartType] = useState('progress'); // 'progress', 'pie', 'bar'
  const [detailChartType, setDetailChartType] = useState('pie'); // untuk tab detail

  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('cmdb_update', () => {
      fetchAll();
    });

    socket.on('item_updated', () => {
      fetchAll();
    });

    socket.on('connection_updated', () => {
      fetchAll();
    });

    socket.on('group_updated', () => {
      fetchAll();
    });

    return () => {
      socket.off('cmdb_update');
      socket.off('item_updated');
      socket.off('connection_updated');
      socket.off('group_updated');
      socket.disconnect();
    };
  }, [fetchAll]);

  const stats = useMemo(() => {
    const total = items.length;
    
    const statusCount = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    const typeCount = items.reduce((acc, item) => {
      if (item.type) {
        acc[item.type] = (acc[item.type] || 0) + 1;
      }
      return acc;
    }, {});

    const locationCount = items.reduce((acc, item) => {
      if (item.location) {
        acc[item.location] = (acc[item.location] || 0) + 1;
      }
      return acc;
    }, {});

    const envCount = items.reduce((acc, item) => {
      if (item.env_type) {
        acc[item.env_type] = (acc[item.env_type] || 0) + 1;
      }
      return acc;
    }, {});

    const categoryCount = items.reduce((acc, item) => {
      if (item.category) {
        acc[item.category] = (acc[item.category] || 0) + 1;
      }
      return acc;
    }, {});

    const groupCount = items.reduce((acc, item) => {
      const key = item.group_id || 'ungrouped';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const healthScore = total > 0 ? ((statusCount.active || 0) / total) * 100 : 0;
    const totalConnections = connections.length + groupConnections.length;
    const avgConnections = total > 0 ? totalConnections / total : 0;

    return {
      total,
      statusCount,
      typeCount,
      locationCount,
      envCount,
      categoryCount,
      groupCount,
      healthScore,
      totalConnections,
      avgConnections,
    };
  }, [items, connections, groupConnections]);
  
  // Data untuk chart
  const chartData = useMemo(() => {
    return Object.entries(STATUS_CONFIG).map(([status, config]) => {
      const count = stats.statusCount[status] || 0;
      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
      
      return {
        name: config.label,
        value: count,
        percentage: percentage,
        color: config.color,
        colorKey: config.color.replace('text-', ''),
        icon: config.icon,
      };
    }).filter(item => item.value > 0);
  }, [stats]);

  const criticalItems = useMemo(() => {
    return items
      .filter(item => item.status === 'maintenance' || item.status === 'inactive')
      .slice(0, 5);
  }, [items]);

  const recentActivity = useMemo(() => {
    return items.slice(-5).reverse().map(item => ({
      action: item.status === 'active' ? 'Updated' : item.status === 'maintenance' ? 'Maintenance' : 'Changed',
      item: item.name,
      time: 'Recently',
      type: item.status === 'active' ? 'success' : item.status === 'maintenance' ? 'warning' : 'info',
    }));
  }, [items]);

  const highlyConnectedItems = useMemo(() => {
    const connectionCounts = items.map(item => {
      const asSource = connections.filter(c => c.source_id === item.id).length;
      const asTarget = connections.filter(c => c.target_id === item.id).length;
      return {
        item,
        totalConnections: asSource + asTarget,
        dependencies: asTarget,
        dependents: asSource,
      };
    });

    return connectionCounts
      .filter(c => c.totalConnections > 0)
      .sort((a, b) => b.totalConnections - a.totalConnections)
      .slice(0, 5);
  }, [items, connections]);

  // Fungsi helper untuk render chart dinamis
  const renderDetailChart = (dataObj, title) => {
    const chartData = Object.entries(dataObj)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
        name,
        value,
        color: DYNAMIC_COLORS[index % DYNAMIC_COLORS.length],
      }));

    if (detailChartType === 'pie') {
      return (
        <div className="flex flex-col items-center">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip total={stats.total} />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend dengan detail */}
          <div className="mt-6 grid grid-cols-2 gap-3 w-full">
            {chartData.map((item) => {
              const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
              
              return (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.value} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Bar chart
    return (
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis 
              dataKey="name" 
              stroke="hsl(var(--foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip total={stats.total} />} />
            <Bar 
              dataKey="value" 
              radius={[4, 4, 0, 0]}
              fill="#8884d8"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render Status Overview berdasarkan chart type
  const renderStatusOverview = () => {
    if (chartType === 'progress') {
      return (
        <div className="space-y-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = stats.statusCount[status] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            const Icon = config.icon;
            
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${config.color}`} />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>
      );
    }

    if (chartType === 'pie') {
      return (
        <div className="flex flex-col items-center h-[300px]">
          {chartData.length > 0 ? (
            <>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[entry.colorKey] || "#8884d8"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip total={stats.total} />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {chartData.map((item) => {
                  const percentage = stats.total > 0 ? (item.value / stats.total) * 100 : 0;
                  const color = CHART_COLORS[item.colorKey] || "#8884d8";
                  
                  return (
                    <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.value} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>No data available for pie chart</p>
            </div>
          )}
        </div>
      );
    }

    if (chartType === 'bar') {
      return (
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip total={stats.total} />} />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  fill="#8884d8"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[entry.colorKey] || "#8884d8"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>No data available for bar chart</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header dengan indikator realtime */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CMDB Dashboard</h1>
          <p className="text-gray-500 mt-1">Configuration Management Database Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Updates</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Object.keys(stats.locationCount).length} locations • {groups.length} groups
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Items</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.statusCount.active || 0}
            </div>
            <Progress value={stats.healthScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.healthScore.toFixed(1)}% health score
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConnections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgConnections.toFixed(1)} avg per item
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {(stats.statusCount.maintenance || 0) + (stats.statusCount.inactive || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maintenance or inactive
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown dengan Tab Chart */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Status Overview</CardTitle>
                <CardDescription>Current status distribution of all items</CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Tabs value={chartType} onValueChange={setChartType} className="w-auto">
                  <TabsList className="grid w-[180px] grid-cols-3">
                    <TabsTrigger value="progress" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 flex items-center justify-center">
                          <div className="w-full h-1 bg-primary rounded"></div>
                        </div>
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Chart</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStatusOverview()}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Critical Alerts</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalItems.length > 0 ? (
                criticalItems.map((item) => {
                  const config = STATUS_CONFIG[item.status];
                  return (
                    <Alert 
                      key={item.id} 
                      className={`${config.bgColor} cursor-pointer hover:shadow-md transition-shadow`}
                    >
                      <AlertDescription className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                      </AlertDescription>
                    </Alert>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  ✓ No critical alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Highly Connected Items */}
      {highlyConnectedItems.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Highly Connected Items
            </CardTitle>
            <CardDescription>Items with the most dependencies and dependents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highlyConnectedItems.map(({ item, totalConnections, dependencies, dependents }) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Network className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="dark:text-black">
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <span className="text-blue-600">→</span> {dependencies} dependencies
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-green-600">←</span> {dependents} dependents
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-mono">
                    {totalConnections}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="type">By Type</TabsTrigger>
          <TabsTrigger value="location">By Location</TabsTrigger>
          <TabsTrigger value="environment">By Environment</TabsTrigger>
          <TabsTrigger value="group">By Group</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
        </TabsList>

        <TabsContent value="type" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items by Type</CardTitle>
                  <CardDescription>Distribution across different types</CardDescription>
                </div>
                <Tabs value={detailChartType} onValueChange={setDetailChartType} className="w-auto">
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.typeCount).length > 0 ? (
                renderDetailChart(stats.typeCount, 'Type')
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No type data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items by Location</CardTitle>
                  <CardDescription>Geographic distribution</CardDescription>
                </div>
                <Tabs value={detailChartType} onValueChange={setDetailChartType} className="w-auto">
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.locationCount).length > 0 ? (
                renderDetailChart(stats.locationCount, 'Location')
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No location data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items by Environment</CardTitle>
                  <CardDescription>Physical vs Virtual distribution</CardDescription>
                </div>
                <Tabs value={detailChartType} onValueChange={setDetailChartType} className="w-auto">
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.envCount).length > 0 ? (
                renderDetailChart(stats.envCount, 'Environment')
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No environment data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items by Group</CardTitle>
                  <CardDescription>Organization group distribution</CardDescription>
                </div>
                <Tabs value={detailChartType} onValueChange={setDetailChartType} className="w-auto">
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.groupCount).length > 0 ? (
                renderDetailChart(
                  Object.fromEntries(
                    Object.entries(stats.groupCount).map(([groupId, count]) => {
                      const group = groups.find(g => g.id === parseInt(groupId));
                      return [group?.name || 'No Group', count];
                    })
                  ),
                  'Group'
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No group data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items by Category</CardTitle>
                  <CardDescription>Internal vs External distribution</CardDescription>
                </div>
                <Tabs value={detailChartType} onValueChange={setDetailChartType} className="w-auto">
                  <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="pie" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <PieChartIcon className="w-3 h-3" />
                        <span className="text-xs">Pie</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="bar" className="h-8 px-2">
                      <div className="flex items-center gap-1">
                        <BarChartIcon className="w-3 h-3" />
                        <span className="text-xs">Bar</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.categoryCount).length > 0 ? (
                renderDetailChart(stats.categoryCount, 'Category')
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No category data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'success' ? 'bg-green-100 text-green-600' :
                      activity.type === 'info' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.action} <span className="text-muted-foreground">{activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{activity.action}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}