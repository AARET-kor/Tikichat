import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://tikidoc.xyz"),
  title: "TikiDoc",
  description: "AI-assisted clinic operations for patient flow, staff coordination, and in-room care.",
  openGraph: {
    title: "TikiDoc",
    description: "AI-assisted clinic operations for patient flow, staff coordination, and in-room care.",
    url: "https://tikidoc.xyz",
    siteName: "TikiDoc",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
