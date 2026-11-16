import { Metadata } from 'next';

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

export default function LaunchpadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full bg-[#0D0E11]">
      {children}
    </div>
  );
}
