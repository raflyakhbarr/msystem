import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/cmdb-utils/constants';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serviceItemStatusUpdates, setServiceItemStatusUpdates] = useState({});
  const statusUpdateCallbacksRef = useRef(new Set());

  useEffect(() => {
    // Create single socket connection
    if (!socketRef.current) {
      const socket = io(API_BASE_URL, {
        reconnectionAttempts: 5,
        reconnection: true,
        timeout: 10000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected (SocketContext)');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected (SocketContext)');
        setIsConnected(false);
      });

      // Service item status updates - trigger callbacks
      socket.on('service_item_status_update', (data) => {
        const { serviceItemId, newStatus, workspaceId, serviceId } = data;
        console.log('📡 Service item status update received:', { serviceItemId, newStatus, workspaceId, serviceId });

        // Update local state for immediate access
        setServiceItemStatusUpdates(prev => ({
          ...prev,
          [serviceItemId]: { status: newStatus, workspaceId, serviceId, timestamp: Date.now() }
        }));

        // Trigger all registered callbacks
        statusUpdateCallbacksRef.current.forEach(callback => {
          try {
            callback(data);
          } catch (err) {
            console.error('Error in status update callback:', err);
          }
        });
      });

      // Service updates (for refreshing service data)
      socket.on('service_update', (data) => {
        const { serviceId, workspaceId } = data;
        console.log('📡 SocketContext: service_update received:', {
          serviceId,
          workspaceId,
          serviceIdType: typeof serviceId,
          rawServiceId: data.serviceId,
          fullData: data
        });
        // Components handle this via their own listeners
      });

      // CMDB updates
      socket.on('cmdb_update', (data) => {
        console.log('📡 CMDB update received');
        // Let parent components handle this
      });
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount, as other components might need it
      // The socket will be disconnected when the app unmounts
    };
  }, []);

  // Register callback for status updates
  const registerStatusCallback = useCallback((callback) => {
    statusUpdateCallbacksRef.current.add(callback);
    return () => {
      statusUpdateCallbacksRef.current.delete(callback);
    };
  }, []);

  // Function to get latest status for a service item
  const getServiceItemStatus = useCallback((serviceItemId) => {
    return serviceItemStatusUpdates[serviceItemId]?.status || null;
  }, [serviceItemStatusUpdates]);

  // Function to check if there's a pending status update
  const hasStatusUpdate = useCallback((serviceItemId) => {
    const update = serviceItemStatusUpdates[serviceItemId];
    if (!update) return false;

    // Check if update is less than 5 seconds old
    const isRecent = (Date.now() - update.timestamp) < 5000;
    return isRecent;
  }, [serviceItemStatusUpdates]);

  // Function to clear status update after consuming
  const clearStatusUpdate = useCallback((serviceItemId) => {
    setServiceItemStatusUpdates(prev => {
      const updated = { ...prev };
      delete updated[serviceItemId];
      return updated;
    });
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    getServiceItemStatus,
    hasStatusUpdate,
    clearStatusUpdate,
    registerStatusCallback,
    serviceItemStatusUpdates
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
