import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://tikidoc.xyz"),
  title: "TikiDoc — 소통이 끊기지 않게. 신뢰가 끊기지 않게.",
  description: "외국인 환자와 병원의 신뢰와 존중을 예약부터 내원, 시술, 사후관리까지 이어주는 AI 커뮤니케이션 플랫폼.",
  openGraph: {
    title: "TikiDoc — 소통이 끊기지 않게. 신뢰가 끊기지 않게.",
    description: "통역이 아니라, 믿음이 끊기지 않게 만드는 시스템.",
    url: "https://tikidoc.xyz",
    siteName: "TikiDoc",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
