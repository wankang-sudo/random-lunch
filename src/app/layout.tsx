import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "랜덤런치 추첨기",
  description: "공정하고 재미있는 점심 조 추첨",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {/* 헤더 */}
        <header className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4 shadow-lg overflow-hidden">
          <div className="max-w-4xl mx-auto px-4">
            <div className="relative overflow-hidden">
              <div className="animate-marquee whitespace-nowrap text-2xl font-bold">
                <span>🍱</span>
                <span className="text-red-300">나</span>
                <span className="text-orange-300">노</span>
                <span className="text-yellow-300">비</span>
                <span className="text-green-300">크</span>
                <span className="text-cyan-300">랜</span>
                <span className="text-blue-300">덤</span>
                <span className="text-purple-300">런</span>
                <span className="text-pink-300">치</span>
                <span className="text-red-300">추</span>
                <span className="text-orange-300">첨</span>
                <span className="text-yellow-300">기</span>
                <span className="text-green-300">즐</span>
                <span className="text-cyan-300">거</span>
                <span className="text-blue-300">운</span>
                <span className="text-purple-300">금</span>
                <span className="text-pink-300">요</span>
                <span className="text-red-300">일</span>
                <span className="text-orange-300">행</span>
                <span className="text-yellow-300">복</span>
                <span className="text-green-300">한</span>
                <span className="text-cyan-300">대</span>
                <span className="text-blue-300">화</span>
                <span className="text-purple-300">를</span>
                <span className="text-pink-300">나</span>
                <span className="text-red-300">누</span>
                <span className="text-orange-300">어</span>
                <span className="text-yellow-300">보</span>
                <span className="text-green-300">아</span>
                <span className="text-cyan-300">요</span>
                <span>🍱</span>
                <span className="text-red-300">나</span>
                <span className="text-orange-300">노</span>
                <span className="text-yellow-300">비</span>
                <span className="text-green-300">크</span>
                <span className="text-cyan-300">랜</span>
                <span className="text-blue-300">덤</span>
                <span className="text-purple-300">런</span>
                <span className="text-pink-300">치</span>
                <span className="text-red-300">추</span>
                <span className="text-orange-300">첨</span>
                <span className="text-yellow-300">기</span>
                <span className="text-green-300">즐</span>
                <span className="text-cyan-300">거</span>
                <span className="text-blue-300">운</span>
                <span className="text-purple-300">금</span>
                <span className="text-pink-300">요</span>
                <span className="text-red-300">일</span>
                <span className="text-orange-300">행</span>
                <span className="text-yellow-300">복</span>
                <span className="text-green-300">한</span>
                <span className="text-cyan-300">대</span>
                <span className="text-blue-300">화</span>
                <span className="text-purple-300">를</span>
                <span className="text-pink-300">나</span>
                <span className="text-red-300">누</span>
                <span className="text-orange-300">어</span>
                <span className="text-yellow-300">보</span>
                <span className="text-green-300">아</span>
                <span className="text-cyan-300">요</span>
              </div>
            </div>
          </div>
        </header>

        {/* 네비게이션 */}
        <Navigation />

        {/* 메인 콘텐츠 */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
