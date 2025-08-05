import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedCache } from './useOptimizedCache';
import { performanceMonitor } from '@/utils/performance';

interface ConflictResolutionStrategy {
  type: 'last-write-wins' | 'merge' | 'user-choice' | 'operational-transform';
  resolver?: (local: any, remote: any, base?: any) => any;
}

interface SyncOptions {
  conflictResolution?: ConflictResolutionStrategy;
  enableOptimisticUpdates?: boolean;
  syncInterval?: number;
  retryAttempts?: number;
}

interface PendingUpdate {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  originalData?: any;
  timestamp: number;
  retryCount: number;
}

interface ConflictEvent {
  table: string;
  recordId: string;
  localData: any;
  remoteData: any;
  baseData?: any;
  strategy: ConflictResolutionStrategy;
}

export function useAdvancedSync(options: SyncOptions = {}) {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, PendingUpdate>>(new Map());
  const [conflicts, setConflicts] = useState<ConflictEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  const cache = useOptimizedCache({ maxSize: 500, ttl: 10 * 60 * 1000 }); // 10 minutes
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const conflictResolvers = useRef<Map<string, (conflict: ConflictEvent) => Promise<any>>>(new Map());

  const defaultOptions: Required<SyncOptions> = {
    conflictResolution: { type: 'last-write-wins' },
    enableOptimisticUpdates: true,
    syncInterval: 30000, // 30 seconds
    retryAttempts: 3,
    ...options
  };

  // Optimistic update with conflict tracking
  const optimisticUpdate = useCallback(async (
    table: string,
    id: string,
    updates: any,
    operation: 'insert' | 'update' | 'delete' = 'update'
  ) => {
    if (!defaultOptions.enableOptimisticUpdates) {
      return;
    }

    const updateId = `${table}-${id}-${Date.now()}`;
    const timestamp = Date.now();

    // Store original data for conflict resolution
    const originalData = cache.get(`${table}-${id}`);
    
    const pendingUpdate: PendingUpdate = {
      id: updateId,
      table,
      operation,
      data: { id, ...updates },
      originalData,
      timestamp,
      retryCount: 0
    };

    setPendingUpdates(prev => new Map(prev).set(updateId, pendingUpdate));

    // Apply optimistic update to cache
    if (operation === 'update') {
      const currentData = cache.get(`${table}-${id}`) as Record<string, any> || {};
      const mergedData = { ...currentData, ...updates };
      cache.set(`${table}-${id}`, mergedData);
    } else if (operation === 'delete') {
      cache.invalidate(`${table}-${id}`);
    }

    // Try to sync immediately
    try {
      await syncUpdate(pendingUpdate);
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });
    } catch (error) {
      console.error('[AdvancedSync] Failed to sync update:', error);
      // Will be retried in the next sync cycle
    }
  }, [cache, defaultOptions.enableOptimisticUpdates]);

  // Sync individual update to server
  const syncUpdate = useCallback(async (update: PendingUpdate): Promise<void> => {
    performanceMonitor.markStart(`sync-${update.table}-${update.operation}`);
    
    try {
      const tableName = update.table as 'cameras' | 'events' | 'profiles' | 'switch_logs' | 'user_roles';
      let query = supabase.from(tableName);
      
      switch (update.operation) {
        case 'insert':
          await query.insert(update.data);
          break;
        case 'update':
          await query.update(update.data).eq('id', update.data.id);
          break;
        case 'delete':
          await query.delete().eq('id', update.data.id);
          break;
      }
      
      performanceMonitor.markEnd(`sync-${update.table}-${update.operation}`);
    } catch (error: any) {
      performanceMonitor.markEnd(`sync-${update.table}-${update.operation}`);
      
      // Check if it's a conflict (409) or version mismatch
      if (error.code === '23505' || error.message?.includes('conflict')) {
        await handleConflict(update, error);
      } else {
        throw error;
      }
    }
  }, []);

  // Handle data conflicts
  const handleConflict = useCallback(async (update: PendingUpdate, error: any) => {
    console.log('[AdvancedSync] Conflict detected:', update, error);
    
    // Fetch current server state
    const tableName = update.table as 'cameras' | 'events' | 'profiles' | 'switch_logs' | 'user_roles';
    const { data: serverData } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', update.data.id)
      .single();

    const conflict: ConflictEvent = {
      table: update.table,
      recordId: update.data.id,
      localData: update.data,
      remoteData: serverData,
      baseData: update.originalData,
      strategy: defaultOptions.conflictResolution
    };

    // Resolve conflict based on strategy
    const resolvedData = await resolveConflict(conflict);
    
    if (resolvedData) {
      // Apply resolved data
      if (update.operation === 'update') {
        await supabase.from(tableName).update(resolvedData).eq('id', update.data.id);
      }
      
      // Update cache with resolved data
      cache.set(`${update.table}-${update.data.id}`, resolvedData);
    }
  }, [cache, defaultOptions.conflictResolution]);

  // Resolve conflicts based on strategy
  const resolveConflict = useCallback(async (conflict: ConflictEvent): Promise<any | null> => {
    const { strategy, localData, remoteData, baseData } = conflict;
    
    switch (strategy.type) {
      case 'last-write-wins':
        // Compare timestamps if available
        const localTime = localData.updated_at || localData.timestamp || 0;
        const remoteTime = remoteData.updated_at || remoteData.timestamp || 0;
        return localTime > remoteTime ? localData : remoteData;
        
      case 'merge':
        // Simple merge strategy - combine non-conflicting fields
        return { ...remoteData, ...localData, updated_at: new Date().toISOString() };
        
      case 'operational-transform':
        // Apply operational transformation if custom resolver provided
        if (strategy.resolver) {
          return await strategy.resolver(localData, remoteData, baseData);
        }
        return localData; // Fallback to local
        
      case 'user-choice':
        // Store conflict for user resolution
        setConflicts(prev => [...prev, conflict]);
        return null; // User must choose
        
      default:
        return localData;
    }
  }, []);

  // Register custom conflict resolver
  const registerConflictResolver = useCallback((
    table: string,
    resolver: (conflict: ConflictEvent) => Promise<any>
  ) => {
    conflictResolvers.current.set(table, resolver);
  }, []);

  // Resolve user conflicts
  const resolveUserConflict = useCallback(async (
    conflictIndex: number,
    resolution: 'local' | 'remote' | 'custom',
    customData?: any
  ) => {
    const conflict = conflicts[conflictIndex];
    if (!conflict) return;

    let resolvedData: any;
    
    switch (resolution) {
      case 'local':
        resolvedData = conflict.localData;
        break;
      case 'remote':
        resolvedData = conflict.remoteData;
        break;
      case 'custom':
        resolvedData = customData;
        break;
    }

    // Apply resolution
    if (resolvedData) {
      const tableName = conflict.table as 'cameras' | 'events' | 'profiles' | 'switch_logs' | 'user_roles';
      await supabase.from(tableName).update(resolvedData).eq('id', conflict.recordId);
      cache.set(`${conflict.table}-${conflict.recordId}`, resolvedData);
    }

    // Remove resolved conflict
    setConflicts(prev => prev.filter((_, index) => index !== conflictIndex));
  }, [conflicts, cache]);

  // Periodic sync of pending updates
  const syncPendingUpdates = useCallback(async () => {
    if (pendingUpdates.size === 0 || isSyncing) return;

    setIsSyncing(true);
    console.log('[AdvancedSync] Syncing pending updates:', pendingUpdates.size);

    const updates = Array.from(pendingUpdates.values());
    const failedUpdates: PendingUpdate[] = [];

    for (const update of updates) {
      try {
        await syncUpdate(update);
      } catch (error) {
        console.error('[AdvancedSync] Failed to sync update:', error);
        
        if (update.retryCount < defaultOptions.retryAttempts) {
          failedUpdates.push({ ...update, retryCount: update.retryCount + 1 });
        }
      }
    }

    // Update pending updates with failed retries
    const newPendingUpdates = new Map<string, PendingUpdate>();
    failedUpdates.forEach(update => {
      newPendingUpdates.set(update.id, update);
    });
    
    setPendingUpdates(newPendingUpdates);
    setLastSyncTime(Date.now());
    setIsSyncing(false);
  }, [pendingUpdates, isSyncing, defaultOptions.retryAttempts, syncUpdate]);

  // Setup periodic sync
  useEffect(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
    }

    syncTimerRef.current = setInterval(() => {
      syncPendingUpdates();
    }, defaultOptions.syncInterval);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [syncPendingUpdates, defaultOptions.syncInterval]);

  // Force sync all pending updates
  const forcSync = useCallback(async () => {
    await syncPendingUpdates();
  }, [syncPendingUpdates]);

  // Get sync statistics
  const getSyncStats = useCallback(() => {
    return {
      pendingCount: pendingUpdates.size,
      conflictCount: conflicts.length,
      lastSyncTime,
      isSyncing
    };
  }, [pendingUpdates.size, conflicts.length, lastSyncTime, isSyncing]);

  return {
    optimisticUpdate,
    conflicts,
    resolveUserConflict,
    registerConflictResolver,
    forcSync,
    getSyncStats,
    isSyncing,
    pendingUpdates: Array.from(pendingUpdates.values()),
    lastSyncTime
  };
}