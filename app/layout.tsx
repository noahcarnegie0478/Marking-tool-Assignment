import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { GradingProvider } from "@/lib/state/GradingContext";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Year 12 Mathematics — Response Marking",
  description: "AI-assisted marking for one Year 12 maths exam, with every uncertain mark flagged for a human to check.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GradingProvider>{children}</GradingProvider>
      </body>
    </html>
  );
}
