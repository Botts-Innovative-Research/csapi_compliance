import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'CS API Compliance Assessor',
  description:
    'Test any OGC Connected Systems API endpoint against OGC 23-001 and OGC 23-002 requirements.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {/* Skip Link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          Skip to main content
        </a>

        {/* Header */}
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-lg font-bold text-gray-900">
              {t('app.nav.home')}
            </Link>
            <nav aria-label="Main navigation">
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t('app.nav.newAssessment')}
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main id="main-content" className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-center text-xs text-gray-500">
              {t('app.footer.disclaimer')}
            </p>
            <p className="mt-2 text-center text-xs text-gray-400">
              {t('app.footer.version')} |{' '}
              <a
                href="https://docs.ogc.org/DRAFTS/23-001r0.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-600"
              >
                {t('app.footer.standardLink')}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
