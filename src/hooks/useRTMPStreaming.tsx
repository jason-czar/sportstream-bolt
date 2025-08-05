import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface RTMPStreamingOptions {
  rtmpUrl: string;
  streamKey: string;
  cameraFacing?: 'front' | 'back';
  videoBitrate?: number;
  audioBitrate?: number;
}

interface RTMPStreamingState {
  isStreaming: boolean;
  isInitialized: boolean;
  error: string | null;
}

export const useRTMPStreaming = () => {
  const [state, setState] = useState<RTMPStreamingState>({
    isStreaming: false,
    isInitialized: false,
    error: null,
  });

  const isNative = Capacitor.isNativePlatform();

  const initializeStreaming = useCallback(async (options: RTMPStreamingOptions) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      if (!isNative) {
        // Web fallback - just log for now
        console.log('Web platform detected - RTMP streaming not available');
        setState(prev => ({ ...prev, isInitialized: true }));
        return;
      }

      // For native platforms, we would initialize the RTMP streaming here
      // This is a placeholder for the actual native implementation
      console.log('Initializing RTMP streaming with options:', options);
      
      setState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Failed to initialize RTMP streaming:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize streaming' 
      }));
    }
  }, [isNative]);

  const startStreaming = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      if (!isNative) {
        console.log('Starting web-based preview (RTMP not available)');
        setState(prev => ({ ...prev, isStreaming: true }));
        return;
      }

      // Native RTMP streaming start
      console.log('Starting RTMP stream...');
      setState(prev => ({ ...prev, isStreaming: true }));
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start streaming' 
      }));
    }
  }, [isNative]);

  const stopStreaming = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      if (!isNative) {
        console.log('Stopping web preview');
        setState(prev => ({ ...prev, isStreaming: false }));
        return;
      }

      // Native RTMP streaming stop
      console.log('Stopping RTMP stream...');
      setState(prev => ({ ...prev, isStreaming: false }));
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to stop streaming' 
      }));
    }
  }, [isNative]);

  const switchCamera = useCallback(async () => {
    try {
      if (!isNative) {
        console.log('Camera switching on web platform');
        return;
      }

      console.log('Switching camera...');
    } catch (error) {
      console.error('Failed to switch camera:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to switch camera' 
      }));
    }
  }, [isNative]);

  const toggleAudio = useCallback(async (enabled: boolean) => {
    try {
      if (!isNative) {
        console.log(`Audio ${enabled ? 'enabled' : 'disabled'} on web platform`);
        return;
      }

      console.log(`${enabled ? 'Enabling' : 'Disabling'} audio...`);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  }, [isNative]);

  const toggleVideo = useCallback(async (enabled: boolean) => {
    try {
      if (!isNative) {
        console.log(`Video ${enabled ? 'enabled' : 'disabled'} on web platform`);
        return;
      }

      console.log(`${enabled ? 'Enabling' : 'Disabling'} video...`);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  }, [isNative]);

  return {
    ...state,
    isNative,
    initializeStreaming,
    startStreaming,
    stopStreaming,
    switchCamera,
    toggleAudio,
    toggleVideo,
  };
};