import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ModelMind - AI-Powered Diagram Assistant",
  description: "Create, modify, and analyze PlantUML diagrams with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased app-container`}>        
        <header className="app-header px-3 flex items-center">
          <div className="flex items-center">
            <div className="relative mr-2">
              <div 
                className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-transparent border-b-indigo-500 glow-effect"
              />
            </div>
            <h1 className="text-2xl font-bold text-white">ModelMind</h1>
          </div>         

        </header>
        
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}