'use client';
import { ConfirmProvider } from './ConfirmModal';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ConfirmProvider>{children}</ConfirmProvider>;
}
