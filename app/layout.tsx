import './globals.css';
import Link from 'next/link';
import Sidebar from './components/sidebar';
import {ToastProvider} from './components/toast-provider';

export const metadata = { title: 'SEO Lead Intelligence', description: 'Private SEO prospecting dashboard' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">SEO Lead Intelligence</Link>
            <span className="badge">Private workspace</span>
          </header>
          <div className="layout">
            <Sidebar />
            <main className="main"><ToastProvider>{children}</ToastProvider></main>
          </div>
        </div>
      </body>
    </html>
  );
}