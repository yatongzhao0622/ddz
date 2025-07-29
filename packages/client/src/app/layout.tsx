import './globals.css';
import { Inter } from 'next/font/google';
import ReduxProvider from '../providers/ReduxProvider';
import NetworkStatus from '../components/common/NetworkStatus';
import RoomRedirect from '../components/common/RoomRedirect';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: '斗地主 Online - Dou Dizhu Card Game',
  description: 'Play Dou Dizhu (Fight the Landlord) card game online with friends',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          <RoomRedirect />
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
          <NetworkStatus />
        </ReduxProvider>
      </body>
    </html>
  );
}
