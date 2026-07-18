import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Metrolab - Lab Management System",
  description: "Comprehensive laboratory management and test reporting platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={openSans.variable}>
      <body className={openSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
