"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { useLanguage } from "./providers/LanguageContext";
import { getDictionary } from "@/lib/dictionaries";
import { useState, useEffect } from "react";

export function Header() {
    const { language, setLanguage } = useLanguage();
    // Force UI to always be English, but keep language state for Content Generation
    const dict = getDictionary('en');
    const [apiKey, setApiKey] = useState("");

    const [showKeyModal, setShowKeyModal] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem("google_gemini_api_key");
        if (storedKey) {
            setApiKey(storedKey);
        } else {
            setShowKeyModal(true);
        }
    }, []);

    const handleSaveKey = () => {
        if (!apiKey.trim()) return;
        localStorage.setItem("google_gemini_api_key", apiKey);
        setShowKeyModal(false);
        // alert("API Key saved!"); // No annoying alert needed if modal dismisses
    };

    return (
        <>
            {/* API Key Blocking Modal */}
            {showKeyModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl max-w-md w-full shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-300">
                        <div className="bg-blue-600/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-white">Bible Imager Video</h2>
                            <p className="text-slate-400 text-sm">
                                {dict.apiKeyModal.description}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <input
                                type="password"
                                placeholder={dict.apiKeyModal.placeholder}
                                className="w-full bg-black/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <button
                                onClick={handleSaveKey}
                                disabled={!apiKey.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                {dict.apiKeyModal.start}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            {dict.apiKeyModal.storageNote}
                        </p>
                    </div>
                </div>
            )}

            <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-lg">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            Bible Imager Video
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-900 rounded-md p-1 border border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase px-2">Video Language</span>
                            {(['es', 'fr', 'en', 'ar', 'fa'] as const).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={`px-2 py-1 text-xs font-bold rounded uppercase transition-colors ${language === lang
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    {lang}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {/* Input simplified in header since modal handles initial set */}
                            <button
                                onClick={() => setShowKeyModal(true)}
                                className="text-xs text-slate-400 hover:text-white underline"
                            >
                                {apiKey ? dict.apiKeyModal.changeKey : dict.apiKeyModal.setKey}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
