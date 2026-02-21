import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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
  Calendar,
  Users,
  AlertCircle,
  Share2,
  Home
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSharedCmdb } from '@/services/api';
import { transformItemsToNodes, transformConnectionsToEdges } from '../../utils/cmdb-utils/flowHelpers';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);

  // Password protection
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [verifiedPassword, setVerifiedPassword] = useState(null);

  const socketRef = useRef(null);
  const reactFlowInstance = useRef(null);

  // Fetch shared CMDB data
  const fetchSharedData = useCallback(async (password = null) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSharedCmdb(token, password);

      setShareInfo(data.share_info);

      // Transform items to nodes
      const transformedNodes = transformItemsToNodes(data.items, data.groups);
      setNodes(transformedNodes);

      // Transform connections to edges
      const transformedEdges = transformConnectionsToEdges(
        data.connections,
        transformedNodes
      );
      setEdges(transformedEdges);

      // Setup socket for real-time updates
      setupSocket(data.workspace_id, token);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching shared CMDB:', err);
      setLoading(false);

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

  // Auto-fit view when nodes load
  useEffect(() => {
    if (reactFlowInstance.current && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.current.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    }
  }, [nodes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-center text-muted-foreground">Loading shared workspace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <Button onClick={() => navigate('/cmdb')} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Back to CMDB
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b sticky top-0 z-50">
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
                {shareInfo?.expires_at && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    Expires: {new Date(shareInfo.expires_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate('/cmdb')}>
              <Home className="w-4 h-4 mr-2" />
              Back to CMDB
            </Button>
          </div>
        </div>
      </header>

      {/* Read-only Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Eye className="w-4 h-4" />
              <span>This is a read-only view. You cannot make changes to this workspace.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div style={{ height: 'calc(100vh - 120px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
          }}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            animated: true,
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
