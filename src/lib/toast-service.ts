import { toast } from '@/hooks/use-toast';

interface ToastOptions {
  title?: string;
  description: string;
  duration?: number;
}

export const toastService = {
  success: ({ title = 'Success', description, duration = 5000 }: ToastOptions) => {
    toast({
      title,
      description,
      variant: 'default',
      duration,
    });
  },

  error: ({ title = 'Error', description, duration = 7000 }: ToastOptions) => {
    toast({
      title,
      description,
      variant: 'destructive',
      duration,
    });
  },

  warning: ({ title = 'Warning', description, duration = 6000 }: ToastOptions) => {
    toast({
      title,
      description,
      // Note: We'll use default variant since shadcn doesn't have warning variant by default
      variant: 'default',
      duration,
    });
  },

  info: ({ title = 'Info', description, duration = 4000 }: ToastOptions) => {
    toast({
      title,
      description,
      variant: 'default',
      duration,
    });
  },

  // Specific application toasts
  auth: {
    signInSuccess: () => toastService.success({
      title: 'Welcome back!',
      description: 'You have been signed in successfully.',
    }),

    signOutSuccess: () => toastService.success({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    }),

    signUpSuccess: () => toastService.success({
      title: 'Account created!',
      description: 'Please check your email to verify your account.',
    }),

    sessionExpired: () => toastService.warning({
      title: 'Session expired',
      description: 'Please sign in again to continue.',
    }),

    permissionDenied: () => toastService.error({
      title: 'Access denied',
      description: 'You don\'t have permission to perform this action.',
    }),
  },

  event: {
    created: (eventCode: string) => toastService.success({
      title: 'Event created successfully!',
      description: `Event code: ${eventCode}. Share this with camera operators to join.`,
      duration: 8000,
    }),

    streamStarted: () => toastService.success({
      title: 'Stream started',
      description: 'Your live stream is now active and broadcasting!',
    }),

    streamEnded: () => toastService.info({
      title: 'Stream ended',
      description: 'The live stream has been stopped successfully.',
    }),

    cameraConnected: (deviceLabel: string) => toastService.success({
      title: 'Camera connected',
      description: `${deviceLabel} has joined the event successfully.`,
    }),

    cameraSwitched: (deviceLabel: string) => toastService.info({
      title: 'Camera switched',
      description: `Now showing: ${deviceLabel}`,
    }),

    eventNotFound: () => toastService.error({
      title: 'Event not found',
      description: 'Invalid event code. Please check and try again.',
    }),

    simulcastConfigured: () => toastService.success({
      title: 'Simulcast configured',
      description: 'YouTube and Twitch streaming targets have been set up.',
    }),
  },

  camera: {
    accessGranted: () => toastService.success({
      title: 'Camera access granted',
      description: 'Your camera and microphone are now active.',
    }),

    accessDenied: () => toastService.error({
      title: 'Camera access denied',
      description: 'Please allow camera and microphone access to continue.',
      duration: 8000,
    }),

    connectionLost: () => toastService.warning({
      title: 'Connection lost',
      description: 'Attempting to reconnect to the stream...',
    }),

    reconnected: () => toastService.success({
      title: 'Reconnected',
      description: 'Camera stream has been restored.',
    }),
  },

  network: {
    offline: () => toastService.warning({
      title: 'You are offline',
      description: 'Some features may not work until you reconnect.',
      duration: 10000,
    }),

    backOnline: () => toastService.success({
      title: 'Back online',
      description: 'Connection restored. All features are now available.',
    }),

    slowConnection: () => toastService.warning({
      title: 'Slow connection detected',
      description: 'Video quality may be affected by your network speed.',
    }),
  },

  loading: {
    eventCreating: () => toastService.info({
      title: 'Creating event...',
      description: 'Please wait while we set up your streaming event.',
    }),

    camerasLoading: () => toastService.info({
      title: 'Loading cameras...',
      description: 'Fetching connected camera feeds.',
    }),
  },
};