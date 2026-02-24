import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from 'reactflow';
import { io } from 'socket.io-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Lock,
  Eye,
  EyeOff,
  Calendar,
  Users,
  AlertCircle,
  Share2,
  Home,
  PanelTopClose
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSharedCmdb } from '@/services/api';
import { transformItemsToNodes, transformConnectionsWithPropagation } from '../../utils/cmdb-utils/flowHelpers';
import {
  calculatePropagatedStatuses,
  getStatusColor,
  shouldShowCrossMarker
} from '../../utils/cmdb-utils/statusPropagation';
import CustomNode from '../../components/cmdb-components/CustomNode';
import CustomGroupNode from '../../components/cmdb-components/CustomGroupNode';
import PasswordDialog from '../../components/cmdb-components/PasswordDialog';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../utils/cmdb-utils/constants';

import 'reactflow/dist/style.css';

const nodeTypes = {
  custom: CustomNode,
  group: CustomGroupNode,
};

export default function CMDBSharedView() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [error, setError] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [edgeHandles, setEdgeHandles] = useState({});
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showNavbar, setShowNavbar] = useState(true);
  const hasLoadedRef = useRef(false);

  // Password protection
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState(null);

  const socketRef = useRef(null);
  const reactFlowInstance = useRef(null);

  // Fetch shared CMDB data
  const fetchSharedData = useCallback(async (password = null) => {
    setError(null);

    try {
      const data = await getSharedCmdb(token, password);

      setShareInfo(data.share_info);

      // Transform items to nodes
      const transformedNodes = transformItemsToNodes(data.items, data.groups);
      setNodes(transformedNodes);

      // Transform edge_handles array to object format for efficient lookup
      const edgeHandlesObject = {};
      if (data.edge_handles && Array.isArray(data.edge_handles)) {
        data.edge_handles.forEach(handle => {
          edgeHandlesObject[handle.edge_id] = {
            sourceHandle: handle.source_handle,
            targetHandle: handle.target_handle
          };
        });
      }

      // Transform connections to edges WITH status propagation
      const transformedEdges = transformConnectionsWithPropagation(
        data.connections,
        data.groupConnections || [],
        data.items,
        data.groups,
        transformedNodes,
        edgeHandlesObject
      );
      setEdges(transformedEdges);

      // Setup socket for real-time updates
      setupSocket(data.workspace_id, token);

    } catch (err) {
      console.error('Error fetching shared CMDB:', err);

      if (err.requires_password || err.error === 'Password required') {
        setShowPasswordDialog(true);
      } else if (err.error === 'Invalid password') {
        toast.error('Invalid password');
        setShowPasswordDialog(true);
      } else {
        setError(err.error || 'Failed to load shared workspace');
      }
    }
  }, [token, setNodes, setEdges]);

  // Setup socket for real-time updates (read-only)
  const setupSocket = useCallback((workspaceId, shareToken) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        share_token: shareToken,
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to share socket');
      socket.emit('join_workspace', { workspace_id: workspaceId, share_token: shareToken });
    });

    socket.on('cmdb_update', () => {
      fetchSharedData(verifiedPassword);
    });

    socket.on('item_updated', () => {
      fetchSharedData(verifiedPassword);
    });

    socket.on('connection_updated', () => {
      fetchSharedData(verifiedPassword);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from share socket');
    });
  }, [fetchSharedData, verifiedPassword]);

  // Handle password verification
  const handlePasswordVerified = (password) => {
    setVerifiedPassword(password);
    setShowPasswordDialog(false);
    fetchSharedData(password);
  };

  // Initial load
  useEffect(() => {
    fetchSharedData(verifiedPassword);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  // Auto-fit view only on initial load
  useEffect(() => {
    if (reactFlowInstance.current && nodes.length > 0 && !hasLoadedRef.current) {
      setTimeout(() => {
        reactFlowInstance.current.fitView({ padding: 0.2, duration: 800 });
        hasLoadedRef.current = true;
      }, 100);
    }
  }, [nodes]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Access Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 relative">
      {/* Floating Show Navbar Button - Partially Hidden */}
      {!showNavbar && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 group">
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowNavbar(true)}
            className="shadow-xl gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md hover:bg-white dark:hover:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-all duration-300 ease-out hover:scale-105 -translate-y-8 group-hover:translate-y-2"
          >
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">Show Menu</span>
          </Button>
        </div>
      )}

      {/* Header with Animation */}
      <header
        className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b z-50 transition-all duration-500 ease-in-out overflow-hidden ${
          showNavbar
            ? 'sticky top-0 opacity-100 max-h-[80px] translate-y-0'
            : 'opacity-0 max-h-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="text-lg font-semibold">Shared Workspace</h1>
                  <p className="text-xs text-muted-foreground">Read-only view</p>
                </div>
              </div>

              <div className="h-8 w-px bg-border" />

              <div className="flex items-center gap-2">
                {shareInfo?.has_password && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Protected
                  </Badge>
                )}
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMiniMap(!showMiniMap)}
                className="h-8 w-8"
                title={showMiniMap ? 'Hide MiniMap' : 'Show MiniMap'}
              >
                {showMiniMap ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>

              <div className="h-6 w-px bg-border mx-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNavbar(false)}
                className="h-8 w-8"
                title="Hide Navbar"
              >
                <PanelTopClose className="w-4 h-4"/>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Flow Canvas */}
      <div
        style={{
          height: showNavbar ? 'calc(100vh - 80px)' : '100vh',
          transition: 'height 500ms ease-in-out'
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
          }}
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: false,
            style: { stroke: '#94a3b8', strokeWidth: 2 },
          }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll={true}
          panOnScroll={true}
          selectNodesOnDrag={false}
        >
          <Background />
          <Controls />
          {showMiniMap && (
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'group':
                    return '#8b5cf6';
                  default:
                    return '#3b82f6';
                }
              }}
            />
          )}
        </ReactFlow>
      </div>

      {/* Password Dialog */}
      <PasswordDialog
        show={showPasswordDialog}
        token={token}
        onVerified={handlePasswordVerified}
        onClose={() => navigate('/cmdb')}
      />
    </div>
  );
}
