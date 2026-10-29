"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Music, FileText, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/LanguageContext";
import { getDictionary } from "@/lib/dictionaries";
import { analyzeAudio } from "@/lib/gemini";
import { useFile } from "@/components/providers/FileContext";
import { RemotionPlayerWrapper } from "@/components/RemotionPlayerWrapper";

const STYLE_METADATA: Record<string, { icon: string; gradient: string; desc: string }> = {
    "Cinematic": { icon: "🎬", gradient: "from-blue-600 to-indigo-950", desc: "Dramatic lighting, epic movie feel" },
    "Biblical Watercolor": { icon: "🎨", gradient: "from-teal-600 to-emerald-950", desc: "Soft, flowing colors, classic look" },
    "Photorealistic": { icon: "📷", gradient: "from-slate-700 to-slate-900", desc: "Highly detailed, lifelike capture" },
    "Minimalist": { icon: "⬜", gradient: "from-zinc-700 to-zinc-900", desc: "Clean lines, simple focus" },
    "Oil Painting": { icon: "🖌️", gradient: "from-amber-700 to-red-950", desc: "Rich textures, classic oils" },
    "Illustration": { icon: "✏️", gradient: "from-orange-600 to-amber-900", desc: "Clean hand-drawn graphic art" },
    "Comics": { icon: "💥", gradient: "from-yellow-600 to-red-700", desc: "Bold outlines, comic book action" },
    "Abstract": { icon: "🌀", gradient: "from-purple-700 to-pink-700", desc: "Conceptual, symbolic shapes" },
    "PowerPoint": { icon: "📊", gradient: "from-sky-600 to-blue-800", desc: "Clean modern presentation slide" },
    "Sketch": { icon: "📝", gradient: "from-neutral-600 to-neutral-800", desc: "Pencil sketch, hand-drawn look" },
    "Cyberpunk": { icon: "⚡", gradient: "from-pink-600 to-purple-900", desc: "Neon lights, futuristic style" },
    "Watercolor": { icon: "💧", gradient: "from-cyan-600 to-blue-700", desc: "Traditional artistic watercolor" },
    "Anime": { icon: "🌸", gradient: "from-rose-500 to-pink-700", desc: "Japanese animation style" },
    "Medieval": { icon: "🛡️", gradient: "from-yellow-800 to-amber-950", desc: "Historic manuscript look" },
    "Renaissance": { icon: "🏛️", gradient: "from-yellow-700 to-stone-800", desc: "Classical Italian master feel" },
    "Pixel Art": { icon: "👾", gradient: "from-green-600 to-blue-900", desc: "Retro 8-bit / 16-bit video game" },
    "3D Render": { icon: "🧱", gradient: "from-violet-600 to-fuchsia-900", desc: "Modern CGI / Blender render" },
    "Claymation": { icon: "🧸", gradient: "from-amber-800 to-amber-950", desc: "Stop-motion clay animation" },
    "Custom": { icon: "⚙️", gradient: "from-slate-700 to-slate-900", desc: "Define your own unique style" }
};

type EraKey = "Biblical" | "WW2" | "AITech" | "Ancient" | "Medieval" | "Custom";

const ERA_PRESETS: Record<string, { icon: string; nameKey: EraKey; defaultPrompt: string }> = {
    "Biblical": { icon: "📜", nameKey: "Biblical", defaultPrompt: "Biblical scene, ancient Middle Eastern setting, spiritual atmosphere" },
    "WW2": { icon: "⚔️", nameKey: "WW2", defaultPrompt: "World War II (1939-1945) historical era, dramatic vintage military & civilian mood" },
    "AITech": { icon: "🤖", nameKey: "AITech", defaultPrompt: "Futuristic artificial intelligence technology, sleek sci-fi cybernetic aesthetic, glowing neural circuits" },
    "Ancient": { icon: "🏛️", nameKey: "Ancient", defaultPrompt: "Classical ancient antiquity, Greco-Roman marble temples, historic epic style" },
    "Medieval": { icon: "🏰", nameKey: "Medieval", defaultPrompt: "Medieval era, castles, knights, illuminated manuscripts, historic atmosphere" },
    "Custom": { icon: "⚙️", nameKey: "Custom", defaultPrompt: "" }
};

export default function Home() {
    const { language } = useLanguage();
    // Force UI to English/French dictionary
    const dict = getDictionary('fr');
    const router = useRouter();
    const { setFile, setFileDuration } = useFile();

    const [isDragOver, setIsDragOver] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedEra, setSelectedEra] = useState("Biblical");
    const [customEraPrompt, setCustomEraPrompt] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("Cinematic");
    const [customStyle, setCustomStyle] = useState("");
    const [globalStylePrompt, setGlobalStylePrompt] = useState("Scène biblique, Moyen-Orient ancien, style cinématique");
    const [segmentCount, setSegmentCount] = useState<number | string>("auto");
    // Initialize quality from localStorage or default to draft
    const [quality, setQuality] = useState(typeof window !== 'undefined' ? localStorage.getItem("image_quality") || "draft" : "draft");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const styleOptions = Object.keys(dict.styles) as Array<keyof typeof dict.styles>;
    const eraOptions = Object.keys(ERA_PRESETS);

    // Update global prompt when era or style changes
    const updateGlobalPrompt = (era: string, style: string, customE?: string, customS?: string) => {
        const eraText = era === "Custom" ? (customE || "Style d'époque personnalisé") : (ERA_PRESETS[era]?.defaultPrompt || era);
        const styleText = style === "Custom" ? (customS || "Style visuel personnalisé") : style;
        setGlobalStylePrompt(`${eraText}. Style visuel: ${styleText}.`);
    };

    const handleEraChange = (era: string) => {
        setSelectedEra(era);
        updateGlobalPrompt(era, selectedStyle, customEraPrompt, customStyle);
    };

    const handleStyleChange = (style: string) => {
        setSelectedStyle(style);
        updateGlobalPrompt(selectedEra, style, customEraPrompt, customStyle);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        let file: File | undefined;

        if ('dataTransfer' in e) {
            file = e.dataTransfer.files[0];
        } else {
            file = e.target.files?.[0];
        }

        if (!file) return;

        // Persist file in context
        setFile(file);

        // Get duration if audio
        if (file.type.startsWith('audio/')) {
            const audio = new Audio(URL.createObjectURL(file));
            audio.onloadedmetadata = () => {
                setFileDuration(audio.duration);
                console.log("Audio duration detected:", audio.duration);
            };
        }

        const apiKey = localStorage.getItem("google_gemini_api_key");
        if (!apiKey) {
            alert("Please enter a Gemini API Key first (top right).");
            return;
        }

        setAnalyzing(true);

        try {
            const activeStyle = selectedStyle === "Custom" ? customStyle : selectedStyle;
            const activeEra = selectedEra === "Custom" ? customEraPrompt : selectedEra;

            const segments = await analyzeAudio(
                file,
                apiKey,
                activeStyle,
                language,
                segmentCount,
                activeEra,
                globalStylePrompt
            );

            // Save result and redirect
            sessionStorage.setItem("projectData", JSON.stringify({
                segments,
                totalDuration: 0,
                fileName: file.name,
                selectedEra,
                selectedStyle: activeStyle,
                globalStylePrompt
            }));
            router.push("/project/new");

        } catch (error: any) {
            console.error(error);
            alert(error.message);
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-4 relative overflow-hidden">
            {/* Background Effects - Use z-0 and put content relative z-10 to ensure visibility */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl z-0 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl z-0 animate-pulse delay-1000 pointer-events-none" />

            <div className="relative z-10 text-center max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                        {dict.title}
                    </span>
                    <span className="text-slate-500 text-3xl ml-2">Video</span>
                </h1>
                <p className="text-xl text-slate-400 font-light">
                    {dict.subtitle}
                </p>

                {/* Top Global Era & Style Prompt Banner */}
                <div className="space-y-4 text-left bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-md max-w-2xl mx-auto">
                    {/* Era Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2 mb-2">
                            ⏳ {dict.eraLabel || "Style d'Époque & Contexte"}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {eraOptions.map((eraKey) => {
                                const preset = ERA_PRESETS[eraKey];
                                const isSelected = selectedEra === eraKey;
                                const eraName = dict.eras?.[preset.nameKey] || eraKey;
                                return (
                                    <button
                                        key={eraKey}
                                        type="button"
                                        onClick={() => handleEraChange(eraKey)}
                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all duration-200 relative select-none ${
                                            isSelected
                                                ? "border-blue-500 bg-blue-950/60 shadow-lg shadow-blue-500/20 scale-[1.01] ring-1 ring-blue-500"
                                                : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                                        }`}
                                    >
                                        <span className="text-xl">{preset.icon}</span>
                                        <div className="overflow-hidden">
                                            <div className="text-xs font-bold text-white truncate">{eraName}</div>
                                        </div>
                                        {isSelected && (
                                            <div className="ml-auto bg-blue-500 text-white rounded-full p-0.5 flex items-center justify-center shrink-0">
                                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom Era Input when Custom is selected */}
                    {selectedEra === "Custom" && (
                        <div className="pt-2">
                            <label className="text-xs text-slate-400 font-bold uppercase block mb-1">
                                Époque / Style personnalisé
                            </label>
                            <input
                                type="text"
                                placeholder="ex: Deuxième Guerre mondiale 39-45, Technologie de l'IA, Sci-Fi..."
                                className="w-full bg-black/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
                                value={customEraPrompt}
                                onChange={(e) => {
                                    setCustomEraPrompt(e.target.value);
                                    updateGlobalPrompt("Custom", selectedStyle, e.target.value, customStyle);
                                }}
                            />
                        </div>
                    )}

                    {/* Global Style Prompt Input Box at top */}
                    <div className="pt-2 border-t border-slate-800/60">
                        <label className="text-xs font-bold text-blue-400 tracking-wider uppercase flex items-center justify-between mb-1.5">
                            <span>✨ {dict.globalPromptLabel || "Prompt Global (Style & Époque)"}</span>
                            <span className="text-[10px] text-slate-500 font-normal">Personnalisable à volonté</span>
                        </label>
                        <textarea
                            rows={2}
                            value={globalStylePrompt}
                            onChange={(e) => setGlobalStylePrompt(e.target.value)}
                            placeholder={dict.globalPromptPlaceholder || "Entrez le style et l'époque de vos images..."}
                            className="w-full bg-black/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none resize-none transition-all"
                        />
                    </div>
                </div>

                {/* Style Selector Section */}
                <div className="space-y-3 text-left bg-slate-900/30 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-md max-w-2xl mx-auto">
                    <label className="text-xs font-bold text-slate-400 tracking-wider uppercase flex items-center gap-2">
                        🎨 Visual Art Style
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {styleOptions.map((style) => {
                            const meta = STYLE_METADATA[style] || { icon: "🎨", gradient: "from-blue-600 to-indigo-900", desc: "" };
                            const isSelected = selectedStyle === style;
                            return (
                                <button
                                    key={style}
                                    type="button"
                                    onClick={() => handleStyleChange(style)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all duration-200 relative overflow-hidden group select-none h-16 ${
                                        isSelected
                                            ? "border-blue-500 bg-gradient-to-br " + meta.gradient + " shadow-lg shadow-blue-500/25 scale-[1.02] ring-2 ring-blue-500/50 ring-offset-2 ring-offset-slate-950"
                                            : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
                                    }`}
                                >
                                    <span className="text-xl mb-0.5 transform group-hover:scale-110 transition-transform duration-200">{meta.icon}</span>
                                    <span className="text-[10px] font-bold text-white tracking-wide truncate w-full px-1">{dict.styles[style] || style}</span>
                                    {isSelected && (
                                        <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-0.5 flex items-center justify-center shadow-md">
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Configuration Area */}
                <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    {/* Quality Selector */}
                    <div className="space-y-2 text-left">
                        <label className="text-xs text-slate-400 font-bold uppercase">{dict.quality?.label || "Quality"}</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            value={quality}
                            onChange={(e) => {
                                localStorage.setItem("image_quality", e.target.value);
                                setQuality(e.target.value);
                            }}
                        >
                            <option value="draft">{dict.quality?.draft || "Draft"}</option>
                            <option value="final">{dict.quality?.final || "Final"}</option>
                        </select>
                    </div>

                    <div className="space-y-2 text-left">
                        <label className="text-xs text-slate-400 font-bold uppercase">Segments</label>
                        <div className="flex items-center gap-2">
                            <select
                                className={`${segmentCount === "auto" ? "w-full" : "w-1/2"} bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all`}
                                value={segmentCount === "auto" ? "auto" : "custom"}
                                onChange={(e) => {
                                    if (e.target.value === "auto") {
                                        setSegmentCount("auto");
                                    } else {
                                        setSegmentCount(10);
                                    }
                                }}
                            >
                                <option value="auto">Auto (Dynamic)</option>
                                <option value="custom">Custom</option>
                            </select>
                            {segmentCount !== "auto" && (
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    className="w-1/2 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none transition-all"
                                    value={segmentCount}
                                    onChange={(e) => setSegmentCount(parseInt(e.target.value) || 10)}
                                />
                            )}
                        </div>
                    </div>
                    {selectedStyle === "Custom" && (
                        <div className="col-span-2 space-y-2 text-left">
                            <label className="text-xs text-slate-400 font-bold uppercase">Custom Style</label>
                            <input
                                type="text"
                                placeholder={dict.customStylePlaceholder}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                value={customStyle}
                                onChange={(e) => setCustomStyle(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Upload Area */}
                <div
                    className={`
                    relative group mt-8 p-12 rounded-3xl border-2 border-dashed transition-all duration-300
                    ${isDragOver
                            ? 'border-blue-500 bg-blue-500/10 scale-102'
                            : 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-900/50'
                        }
                    ${analyzing ? 'opacity-50 pointer-events-none' : ''}
                `}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="audio/*,application/pdf"
                        onChange={handleFileSelect}
                    />

                    <div className="flex flex-col items-center gap-4">
                        {analyzing ? (
                            <>
                                <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">{dict.analyzing}</h3>
                                    <p className="text-slate-400 text-sm">Gemini is listening to your audio...</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-slate-800 p-4 rounded-full group-hover:bg-blue-600 transition-colors duration-300">
                                    <Upload className="w-8 h-8 text-slate-300 group-hover:text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{dict.dropFile}</h3>
                                    <p className="text-slate-400 text-sm">{dict.browse}</p>
                                </div>
                                <div className="flex gap-2 text-xs text-slate-500 mt-4">
                                    <span className="flex items-center gap-1"><Music className="w-3 h-3" /> MP3</span>
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> PDF</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
