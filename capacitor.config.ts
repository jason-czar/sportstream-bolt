import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e5ca290503e54e10ab5a86eb0b1e607e',
  appName: 'sportscast-live',
  webDir: 'dist',
  server: {
    url: "https://e5ca2905-03e5-4e10-ab5a-86eb0b1e607e.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'microphone']
    }
  }
};

export default config;