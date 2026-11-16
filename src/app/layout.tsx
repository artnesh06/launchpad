import Providers from '@/components/layout/providers';
import { fontVariables } from '@/lib/font';
import ThemeProvider from '@/components/layout/ThemeToggle/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import './theme.css';

const META_THEME_COLORS = {
  light: '#ffffff',
  dark: '#0D0E11'
};

export const metadata: Metadata = {
  title: "Odds",
  description:
    "Create art on-chain, track your collection, and grow your audience. Clean flow and simple actions — all on Odds Launchpad.",
  keywords: [
    "Odds",
    "NFT",
    "on-chain art",
    "launchpad",
    "crypto art",
    "blockchain",
    "digital art",
    "collection",
  ],
  authors: [{ name: "Odds" }],
  creator: "Odds",
  publisher: "Odds",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.oddslaunchpad.com",
    siteName: "Odds",
    title: "Odds",
    description:
      "Create art on-chain, track your collection, and grow your audience. Clean flow and simple actions — all on Odds Launchpad.",
    images: [
      {
        url: "/images/Banner.png",
        width: 1200,
        height: 630,
        alt: "Odds Banner",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Odds",
    description:
      "Create art on-chain, track your collection, and grow your audience. Clean flow and simple actions — all on Odds Launchpad.",
    images: ["/images/Banner.png"],
    creator: "@oddslaunchpad",
    site: "@oddslaunchpad",
  },
  icons: {
    icon: "/images/odds-logo.png",
    shortcut: "/images/odds-logo.png",
    apple: "/images/odds-logo.png",
  },
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: "9uI-5fS_HPf98hXryydfoKK6SaB5rgvhLSgT_8bhUpk",
  },
  alternates: {
    canonical: "https://www.oddslaunchpad.com",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: META_THEME_COLORS.light
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get('active_theme')?.value;
  const isScaled = activeThemeValue?.endsWith('-scaled');

  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || ((!('theme' in localStorage) || localStorage.theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.querySelector('meta[name="theme-color"]').setAttribute('content', '${META_THEME_COLORS.dark}')
                }
              } catch (_) {}
            `
          }}
        />
      </head>
      <body
        className={cn(
          'bg-[#0D0E11] font-sans antialiased',
          activeThemeValue ? `theme-${activeThemeValue}` : '',
          isScaled ? 'theme-scaled' : '',
          fontVariables
        )}
        suppressHydrationWarning
      >
        <NextTopLoader color="#B392F0" showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='system'
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers activeThemeValue={activeThemeValue as string}>
              {children}
            </Providers>
            <Toaster position="top-right" expand={false} richColors closeButton visibleToasts={3} />
          </ThemeProvider>
        </NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
}
