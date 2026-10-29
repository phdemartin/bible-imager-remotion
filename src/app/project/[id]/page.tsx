"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Download, Image as ImageIcon, Clock, Loader2, Video, AlertTriangle, RefreshCw, Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MOCK_SEGMENTS, Segment } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useLanguage } from "@/components/providers/LanguageContext";
import { getDictionary } from "@/lib/dictionaries";
import { useFile } from "@/components/providers/FileContext";
import { VideoExporter } from "@/components/VideoExporter";
import { ServerVideoExporter } from "@/components/ServerVideoExporter";

import { RemotionPlayerWrapper } from "@/components/RemotionPlayerWrapper";

const ERA_PRESETS: Record<string, { icon: string; label: string; prompt: string }> = {
    "Biblical": { icon: "📜", label: "Biblique (Par défaut)", prompt: "Biblical scene, ancient Middle Eastern setting, spiritual atmosphere" },
    "WW2": { icon: "⚔️", label: "Deuxième Guerre mondiale (39-45)", prompt: "World War II (1939-1945) historical era, dramatic vintage military & civilian mood" },
    "AITech": { icon: "🤖", label: "Technologie de l'IA", prompt: "Futuristic artificial intelligence technology, sleek sci-fi cybernetic aesthetic, glowing neural circuits" },
    "Ancient": { icon: "🏛️", label: "Histoire Antique", prompt: "Classical ancient antiquity, Greco-Roman marble temples, historic epic style" },
    "Medieval": { icon: "🏰", label: "Époque Médiévale", prompt: "Medieval era, castles, knights, illuminated manuscripts, historic atmosphere" },
};

export default function ProjectPage() {
    const { language } = useLanguage();
    const dict = getDictionary(language);
    const params = useParams();
    const searchParams = useSearchParams();
    const isDemo = searchParams.get("demo") === "true";
    const { file, fileDuration, setFile, setFileDuration } = useFile();

    const [segments, setSegments] = useState<Segment[]>([]);
    const [totalDuration, setTotalDuration] = useState<number>(0);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
    const [selectedEra, setSelectedEra] = useState<string>("Biblical");
    const [globalStylePrompt, setGlobalStylePrompt] = useState<string>("Scène biblique, Moyen-Orient ancien, style cinématique");
    const isGeneratingRef = useRef(false);

    // Sync total duration from context or fallback
    useEffect(() => {
        if (fileDuration > 0) {
            setTotalDuration(fileDuration);
        }
    }, [fileDuration]);

    useEffect(() => {
        if (isDemo) {
            setSegments([]);
            let loadedIndex = 0;
            setTotalDuration(360);

            const interval = setInterval(() => {
                if (loadedIndex < MOCK_SEGMENTS.length) {
                    const segmentToAdd = MOCK_SEGMENTS[loadedIndex];
                    if (segmentToAdd) {
                        setSegments(prev => {
                            if (prev.find(s => s.id === segmentToAdd.id)) return prev;
                            return [...prev, segmentToAdd];
                        });
                    }
                    loadedIndex++;
                } else {
                    clearInterval(interval);
                }
            }, 1000);
            return () => clearInterval(interval);
        } else {
            const projectId = params.id as string; // 'new' or actual id
            let storedData = sessionStorage.getItem(`project-${projectId}`);
            if (!storedData && projectId === "new") {
                storedData = sessionStorage.getItem("projectData");
            }

            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData);
                    let loadedSegments = parsedData.segments || [];

                    if (parsedData.selectedEra) setSelectedEra(parsedData.selectedEra);
                    if (parsedData.globalStylePrompt) setGlobalStylePrompt(parsedData.globalStylePrompt);

                    const hasTitleSlide = loadedSegments.find((s: Segment) => s.id === "title-slide");

                    if (parsedData.fileName && !hasTitleSlide) {
                        const initTitle = async () => {
                            setSegments(loadedSegments);

                            const { createTitleSlideImage, cleanTitleName } = await import("@/lib/image-utils");
                            const titleImage = await createTitleSlideImage(parsedData.fileName);
                            const cleanTitle = cleanTitleName(parsedData.fileName);

                            const titleSegment: Segment = {
                                id: "title-slide",
                                timestamp: "00:00",
                                verse: "",
                                theme: cleanTitle,
                                prompt: "Title Slide",
                                imageUrl: titleImage
                            };

                            setSegments(prev => {
                                if (prev.find(s => s.id === "title-slide")) return prev;
                                return [titleSegment, ...prev];
                            });
                        };
                        initTitle();
                    } else {
                        setSegments(loadedSegments);
                    }
                    if (parsedData.totalDuration) setTotalDuration(parsedData.totalDuration);
                } catch (e) {
                    console.error("Failed to parse stored project data", e);
                }
            }
        }
    }, [isDemo, params.id]);

    // Image Generation Loop
    useEffect(() => {
        if (isDemo) return;
        if (isGeneratingRef.current) return;

        const generateImagesSequentially = async () => {
            const apiKey = localStorage.getItem("google_gemini_api_key");
            if (!apiKey) return;

            const segmentsToGenerate = segments.filter(s => !s.imageUrl && !s.error);
            if (segmentsToGenerate.length === 0) return;

            isGeneratingRef.current = true;

            for (const seg of segmentsToGenerate) {
                if (seg.imageUrl) continue;

                try {
                    setGeneratingIndex(segments.findIndex(s => s.id === seg.id));
                    const { generateImage } = await import("@/lib/gemini");
                    const stylePrefix = globalStylePrompt ? `[${globalStylePrompt}] ` : "Visualization ";
                    const enhancedPrompt = `${stylePrefix}${seg.verse ? `${seg.verse} ` : ""}(${seg.theme}): ${seg.prompt}`;

                    const quality = (localStorage.getItem("image_quality") as "draft" | "final") || "draft";
                    const imageUrl = await generateImage(enhancedPrompt, apiKey, quality);

                    setSegments(prev => prev.map(s =>
                        s.id === seg.id ? { ...s, imageUrl, error: undefined } : s
                    ));

                    await new Promise(resolve => setTimeout(resolve, 6000));
                } catch (err: any) {
                    console.error("Failed to generate image", err);
                    setSegments(prev => prev.map(s =>
                        s.id === seg.id ? { ...s, error: err.message } : s
                    ));
                }
            }

            setGeneratingIndex(null);
            isGeneratingRef.current = false;
        };

        if (segments.length > 0) {
            generateImagesSequentially();
        }
    }, [segments, isDemo]);

    const handleReupload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            const audio = new Audio(URL.createObjectURL(f));
            audio.onloadedmetadata = () => {
                setFileDuration(audio.duration);
                setTotalDuration(audio.duration);
            };
        }
    };

    const parseTimestampToSeconds = (timestamp: string): number => {
        try {
            const parts = timestamp.split(':').map(Number);
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            return 0;
        } catch { return 0; }
    };

    const validateTimestamp = (timestamp: string): boolean => {
        return /^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp);
    };

    const sortSegments = (segs: Segment[]): Segment[] => {
        const title = segs.find(s => s.id === "title-slide");
        const rest = segs.filter(s => s.id !== "title-slide");
        const sortedRest = [...rest].sort((a, b) => {
            return parseTimestampToSeconds(a.timestamp) - parseTimestampToSeconds(b.timestamp);
        });
        return title ? [title, ...sortedRest] : sortedRest;
    };

    const saveProject = (segs: Segment[]) => {
        const projectId = params.id as string;
        const key = projectId === "new" ? "projectData" : `project-${projectId}`;
        const stored = sessionStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                parsed.segments = segs;
                sessionStorage.setItem(key, JSON.stringify(parsed));
            } catch (e) {
                console.error("Failed to save project data", e);
            }
        }
    };

    const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
    const [editingPrompt, setEditingPrompt] = useState("");
    const [editingTheme, setEditingTheme] = useState("");
    const [editingVerse, setEditingVerse] = useState("");

    const [isAddingSegment, setIsAddingSegment] = useState(false);
    const [newSegmentTime, setNewSegmentTime] = useState("00:00");
    const [newSegmentVerse, setNewSegmentVerse] = useState("");
    const [newSegmentTheme, setNewSegmentTheme] = useState("");
    const [newSegmentPrompt, setNewSegmentPrompt] = useState("");

    const [editingTimestamps, setEditingTimestamps] = useState<Record<string, string>>({});

    const handleStartEdit = (segment: Segment) => {
        setEditingSegmentId(segment.id);
        setEditingPrompt(segment.prompt);
        setEditingTheme(segment.theme);
        setEditingVerse(segment.verse);
    };

    const handleCancelEdit = () => {
        setEditingSegmentId(null);
        setEditingPrompt("");
        setEditingTheme("");
        setEditingVerse("");
    };

    const handleSaveEdit = async (id: string) => {
        const seg = segments.find(s => s.id === id);
        const promptChanged = seg ? seg.prompt !== editingPrompt : false;

        setSegments(prev => {
            const updated = prev.map(s =>
                s.id === id ? { ...s, prompt: editingPrompt, theme: editingTheme, verse: editingVerse } : s
            );
            saveProject(updated);
            return updated;
        });
        setEditingSegmentId(null);

        if (promptChanged) {
            await handleRegenerate(id, editingPrompt);
        }
    };

    const handleTimestampChange = (id: string, value: string) => {
        setEditingTimestamps(prev => ({ ...prev, [id]: value }));
    };

    const handleTimestampBlur = (id: string) => {
        const value = editingTimestamps[id];
        if (value === undefined) return;

        if (!validateTimestamp(value)) {
            alert("Invalid timestamp format. Use MM:SS or HH:MM:SS (e.g. 01:23)");
            setEditingTimestamps(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
            return;
        }

        setSegments(prev => {
            const updated = prev.map(s => s.id === id ? { ...s, timestamp: value } : s);
            const sorted = sortSegments(updated);
            saveProject(sorted);
            return sorted;
        });

        setEditingTimestamps(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    };

    const handleDeleteSegment = (id: string) => {
        if (id === "title-slide") return;
        if (confirm("Are you sure you want to delete this slide?")) {
            setSegments(prev => {
                const updated = prev.filter(s => s.id !== id);
                saveProject(updated);
                return updated;
            });
        }
    };

    const handleStartAddSegment = () => {
        setIsAddingSegment(true);
        if (segments.length > 0) {
            const last = segments[segments.length - 1];
            const secs = parseTimestampToSeconds(last.timestamp) + 10;
            const mins = Math.floor(secs / 60);
            const remainingSecs = secs % 60;
            const pad = (n: number) => String(n).padStart(2, '0');
            setNewSegmentTime(`${pad(mins)}:${pad(remainingSecs)}`);
        } else {
            setNewSegmentTime("00:05");
        }
        setNewSegmentVerse("");
        setNewSegmentTheme("");
        setNewSegmentPrompt("");
    };

    const handleSaveAddSegment = async () => {
        if (!validateTimestamp(newSegmentTime)) {
            alert("Invalid timestamp format. Use MM:SS or HH:MM:SS (e.g. 01:23)");
            return;
        }

        const newSeg: Segment = {
            id: "user-" + Date.now(),
            timestamp: newSegmentTime,
            verse: newSegmentVerse,
            theme: newSegmentTheme,
            prompt: newSegmentPrompt,
            imageUrl: ""
        };

        setSegments(prev => {
            const updated = sortSegments([...prev, newSeg]);
            saveProject(updated);
            return updated;
        });

        setIsAddingSegment(false);
    };

    const handleRegenerateAll = () => {
        if (confirm("Voulez-vous régénérer toutes les images avec ce style ?")) {
            setSegments(prev => prev.map(s => s.id === "title-slide" ? s : { ...s, imageUrl: "", error: undefined }));
        }
    };

    const handleRegenerate = async (id: string, promptOverride?: string) => {
        const seg = segments.find(s => s.id === id);
        if (!seg) return;

        const promptToUse = promptOverride || seg.prompt;
        const apiKey = localStorage.getItem("google_gemini_api_key");
        if (!apiKey) return;

        setSegments(prev => prev.map(s => s.id === id ? { ...s, imageUrl: "", error: undefined, prompt: promptToUse } : s));
        const index = segments.findIndex(s => s.id === id);
        setGeneratingIndex(index);

        try {
            const { generateImage } = await import("@/lib/gemini");
            const stylePrefix = globalStylePrompt ? `[${globalStylePrompt}] ` : "Visualization ";
            const enhancedPrompt = `${stylePrefix}${seg.verse ? `${seg.verse} ` : ""}(${seg.theme}): ${promptToUse}`;

            const quality = (localStorage.getItem("image_quality") as "draft" | "final") || "draft";
            const imageUrl = await generateImage(enhancedPrompt, apiKey, quality);

            setSegments(prev => prev.map(s =>
                s.id === id ? { ...s, imageUrl, error: undefined } : s
            ));
        } catch (err: any) {
            console.error("Failed to regenerate image", err);
            setSegments(prev => prev.map(s =>
                s.id === id ? { ...s, error: err.message } : s
            ));
        } finally {
            setGeneratingIndex(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm font-mono">{dict.project}</span>
                        {dict.study}
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">{segments.length} segments • Duration: {Math.round(totalDuration)}s</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleStartAddSegment}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Slide
                    </Button>
                </div>
            </div>

            {/* Top Global Era & Style Control Banner */}
            <div className="mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                        ✨ {dict.globalPromptLabel || "Prompt de Style & d'Époque Global"}
                    </label>
                    <button
                        type="button"
                        onClick={handleRegenerateAll}
                        className="text-xs font-semibold bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        title="Appliquer le style et régénérer les images"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {dict.applyStyleToAll || "Appliquer le style à toutes les images"}
                    </button>
                </div>

                {/* Quick Era Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(ERA_PRESETS).map(([key, preset]) => {
                        const isSelected = selectedEra === key;
                        const labelText = (dict.eras as Record<string, string>)?.[key] || preset.label;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setSelectedEra(key);
                                    setGlobalStylePrompt(`${preset.prompt}. Style visuel: Cinematic.`);
                                }}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                                    isSelected
                                        ? "border-blue-500 bg-blue-950/80 text-blue-300 ring-1 ring-blue-500"
                                        : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700"
                                }`}
                            >
                                <span>{preset.icon}</span>
                                <span>{labelText}</span>
                            </button>
                        );
                    })}
                </div>

                <textarea
                    rows={2}
                    value={globalStylePrompt}
                    onChange={(e) => setGlobalStylePrompt(e.target.value)}
                    placeholder={dict.globalPromptPlaceholder || "Modifiez le style et l'époque de vos images ici..."}
                    className="w-full bg-black/60 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none resize-none transition-all"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Visual Timeline (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {segments.map((segment, index) => (
                            <div key={segment.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group">
                                <div className="aspect-video relative bg-black flex items-center justify-center">
                                    {segment.imageUrl ? (
                                        <Image src={segment.imageUrl} alt={segment.theme} fill className="object-cover" />
                                    ) : segment.error ? (
                                        <div className="text-red-400 p-4 text-center">
                                            <AlertTriangle className="mx-auto mb-2" />
                                            <span className="text-xs">{dict.error}</span>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 flex flex-col items-center">
                                            {generatingIndex === index ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                                                    <span className="text-xs">{dict.processing}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ImageIcon className="w-6 h-6 mb-2 opacity-20" />
                                                    <span className="text-xs">{dict.waiting}</span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Clock / Editable Timestamp */}
                                    <div className="absolute top-2 left-2 bg-black/75 px-2 py-1 rounded text-xs text-white font-mono flex items-center gap-1.5 border border-slate-700/50 backdrop-blur-sm">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                        {segment.id === "title-slide" ? (
                                            <span>00:00</span>
                                        ) : (
                                            <input
                                                type="text"
                                                value={editingTimestamps[segment.id] !== undefined ? editingTimestamps[segment.id] : segment.timestamp}
                                                onChange={(e) => handleTimestampChange(segment.id, e.target.value)}
                                                onBlur={() => handleTimestampBlur(segment.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }}
                                                className="w-12 bg-transparent text-xs text-white font-mono text-center focus:border-b focus:border-blue-500 outline-none"
                                            />
                                        )}
                                    </div>

                                    {/* Delete Button */}
                                    {segment.id !== "title-slide" && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSegment(segment.id)}
                                            className="absolute top-2 right-2 bg-black/75 hover:bg-red-600/90 text-slate-400 hover:text-white p-1.5 rounded-lg border border-slate-700/50 backdrop-blur-sm transition-all duration-200"
                                            title="Delete Slide"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-sm text-white mb-1">{segment.theme}</h4>
                                            <p className="text-xs text-blue-400 mb-1">{segment.verse}</p>
                                            <p className="text-[10px] text-slate-500 line-clamp-2" title={segment.prompt}>{segment.prompt}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleStartEdit(segment)}
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                                title="Edit Details"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRegenerate(segment.id)}
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                                                title={dict.retry}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Export Controls (Right 1/3) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-6">
                        <ServerVideoExporter
                            segments={segments}
                            audioFile={file}
                            titleText={dict.study}
                            totalDuration={totalDuration}
                            language={language}
                        />

                        <VideoExporter
                            segments={segments}
                            audioFile={file}
                            totalDuration={totalDuration || 0}
                        />

                        {/* Remotion Preview */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                                <Video className="w-5 h-5 text-purple-400" />
                                Remotion Preview
                            </h3>
                            <RemotionPlayerWrapper
                                segments={segments}
                                audioFile={file}
                                totalDuration={totalDuration || 0}
                                language={language}
                            />
                        </div>
                    </div>

                    {!file && !isDemo && (
                        <div className="bg-yellow-900/20 border border-yellow-900/50 p-4 rounded-xl text-yellow-500 text-sm">
                            <h4 className="font-bold flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4" />
                                Audio Missing
                            </h4>
                            <p className="mb-3">Since you refreshed the page, the audio file was lost from memory.</p>
                            <label className="cursor-pointer bg-yellow-700/20 hover:bg-yellow-700/40 text-yellow-200 px-3 py-2 rounded flex items-center justify-center gap-2 transition-colors">
                                Re-upload Audio MP3
                                <input type="file" className="hidden" accept="audio/*" onChange={handleReupload} />
                            </label>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Slide Details Modal */}
            {editingSegmentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    Edit Slide Details
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Modify segment text content and image prompts.</p>
                            </div>
                            <Button variant="ghost" onClick={handleCancelEdit} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full p-2 h-8 w-8 flex items-center justify-center">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme / Title</label>
                                <input
                                    type="text"
                                    value={editingTheme}
                                    onChange={(e) => setEditingTheme(e.target.value)}
                                    className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verse Reference</label>
                                <input
                                    type="text"
                                    value={editingVerse}
                                    onChange={(e) => setEditingVerse(e.target.value)}
                                    className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image Prompt</label>
                                <textarea
                                    value={editingPrompt}
                                    onChange={(e) => setEditingPrompt(e.target.value)}
                                    className="w-full h-32 bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none leading-relaxed font-serif"
                                    placeholder="Describe the image to generate..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                            <Button variant="outline" onClick={handleCancelEdit} className="text-slate-300 border-slate-700 hover:bg-slate-800 h-10 px-4 text-sm">
                                Cancel
                            </Button>
                            <Button onClick={() => handleSaveEdit(editingSegmentId)} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 text-sm font-medium flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Save & Regenerate
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Slide Modal */}
            {isAddingSegment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    Add New Slide
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">Insert a new slide segment into the timeline.</p>
                            </div>
                            <Button variant="ghost" onClick={() => setIsAddingSegment(false)} className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full p-2 h-8 w-8 flex items-center justify-center">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp (MM:SS)</label>
                                <input
                                    type="text"
                                    value={newSegmentTime}
                                    onChange={(e) => setNewSegmentTime(e.target.value)}
                                    placeholder="e.g. 00:15"
                                    className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium font-mono"
                                />
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Theme / Title</label>
                                <input
                                    type="text"
                                    value={newSegmentTheme}
                                    onChange={(e) => setNewSegmentTheme(e.target.value)}
                                    placeholder="Theme or title of the scene"
                                    className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verse Reference</label>
                                <input
                                    type="text"
                                    value={newSegmentVerse}
                                    onChange={(e) => setNewSegmentVerse(e.target.value)}
                                    placeholder="e.g. Genesis 1:1"
                                    className="w-full bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm font-medium"
                                />
                            </div>

                            <div className="space-y-1 text-left">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Image Prompt</label>
                                <textarea
                                    value={newSegmentPrompt}
                                    onChange={(e) => setNewSegmentPrompt(e.target.value)}
                                    className="w-full h-24 bg-slate-950 text-white p-3 rounded-lg border border-slate-700 focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none leading-relaxed font-serif"
                                    placeholder="Describe the image to generate..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                            <Button variant="outline" onClick={() => setIsAddingSegment(false)} className="text-slate-300 border-slate-700 hover:bg-slate-800 h-10 px-4 text-sm">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveAddSegment} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 text-sm font-medium flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Add Slide
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
