// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { SecurityProvider } from '@/contexts/SecurityContext';
import { SecurityGate } from '@/components/SecurityGate';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { InstallPrompt } from '@/components/InstallPrompt';
import { NotificationPermission } from '@/components/NotificationPermission';
import { ServiceWorkerManager } from '@/components/ServiceWorkerManager';
import { InstallPromptProvider } from '@/contexts/InstallPromptContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Journal App',
  description: 'Personal journal with rich text and photo attachments',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Journal App',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        {/* iOS Safari PWA Support */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="日记" />

        {/* PWA Icons */}
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* iOS Splash Screens - iPhone */}
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/apple-splash-iphone6.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/apple-splash-iphonex.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/apple-splash-iphonexr.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/apple-splash-iphone12.png" />

        {/* iOS Splash Screens - iPad */}
        <link rel="apple-touch-startup-image" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/apple-splash-ipad.png" />
        <link rel="apple-touch-startup-image" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/apple-splash-ipadpro11.png" />

        {/* 主题初始化脚本 - 防止闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('journal-theme-preference');
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  let shouldUseDark = false;
                  if (savedTheme === 'dark') {
                    shouldUseDark = true;
                  } else if (savedTheme === 'system' || !savedTheme) {
                    shouldUseDark = systemPrefersDark;
                  }
                  if (shouldUseDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <InstallPromptProvider>
            <SecurityProvider>
              <SecurityGate>
                {children}
              </SecurityGate>
              <ServiceWorkerManager />
              <NotificationPermission />
            </SecurityProvider>
            <InstallPrompt />
          </InstallPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
