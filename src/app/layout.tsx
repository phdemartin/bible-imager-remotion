import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@fontsource/fredericka-the-great";
import { LanguageProvider } from "@/components/providers/LanguageContext";
import { FileProvider } from "@/components/providers/FileContext";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Bible Imager Video",
    description: "Generate videos from audio Bible studies",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-black text-white flex flex-col`}>
                <LanguageProvider>
                    <FileProvider>
                        <Header />
                        <main className="flex-1">
                            {children}
                        </main>
                    </FileProvider>
                </LanguageProvider>
            </body>
        </html>
    );
}
