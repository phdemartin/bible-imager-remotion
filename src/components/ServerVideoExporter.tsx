"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Loader2, Download, Video, AlertCircle } from "lucide-react";
import { Segment } from "@/lib/mock-data";
import { calculateSlideTimings } from "@/lib/video-utils";

interface ServerVideoExporterProps {
    segments: Segment[];
    audioFile: File | null;
    titleText: string;
    totalDuration: number;
    language: string;
}

export function ServerVideoExporter({ segments, audioFile, titleText, totalDuration, language }: ServerVideoExporterProps) {
    const [isEncoding, setIsEncoding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<"idle" | "uploading" | "rendering" | "done" | "error">("idle");

    // Poll for status
    useEffect(() => {
        if (!jobId || status === "done" || status === "error") return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/render/status?id=${jobId}`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.progress) setProgress(data.progress);
                if (data.status === "done") {
                    setStatus("done");
                    setDownloadUrl(`/api/render/download?id=${jobId}`);
                    clearInterval(interval);
                    setIsEncoding(false);
                } else if (data.status === "error") {
                    setStatus("error");
                    setError(data.error);
                    clearInterval(interval);
                    setIsEncoding(false);
                }
            } catch (e) {
                console.error(e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId, status]);

    const handleRender = async () => {
        if (!audioFile) return;

        try {
            setStatus("uploading");
            setIsEncoding(true);
            setError(null);
            setProgress(0);

            // 1. Upload Audio
            const formData = new FormData();
            formData.append("file", audioFile);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Audio upload failed");
            const uploadData = await uploadRes.json();
            const audioFilename = uploadData.filename;

            setStatus("rendering");

            // 2. Prepare Data using calculateSlideTimings
            const images = calculateSlideTimings(segments, totalDuration);

            // 3. Start Render
            // CRITICAL: use dynamic serve-upload route for audioSrc
            const audioSrc = `${window.location.origin}/api/serve-upload?filename=${audioFilename}`;

            const startRes = await fetch("/api/render/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    audioSrc,
                    titleText,
                    images,
                    language, // Pass actual language
                    outputFilename: audioFile.name.replace(/\.[^/.]+$/, "") + ".mp4"
                })
            });

            if (!startRes.ok) throw new Error("Failed to start render");
            const startData = await startRes.json();
            setJobId(startData.jobId);

        } catch (e: any) {
            console.error(e);
            setStatus("error");
            setError(e.message);
            setIsEncoding(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                <Video className="w-5 h-5 text-purple-400" />
                Render Pro (Server)
            </h3>
            <p className="text-sm text-slate-400 mb-6">
                High quality render with transitions and effects using Remotion (Chrome Headless).
            </p>

            {status === "idle" || status === "error" ? (
                <div className="space-y-4">
                    {status === "error" && (
                        <div className="text-red-400 text-sm flex items-center gap-2 bg-red-900/20 p-3 rounded">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <Button onClick={handleRender} className="w-full bg-purple-600 hover:bg-purple-700">
                        Start Server Render
                    </Button>
                </div>
            ) : status === "done" ? (
                <div className="space-y-4">
                    <div className="text-green-400 text-sm flex items-center gap-2 justify-center bg-green-900/20 p-3 rounded">
                        <Video className="w-4 h-4" />
                        Render Complete!
                    </div>
                    {downloadUrl && (
                        <a
                            href={downloadUrl}
                            download={audioFile ? audioFile.name.replace(/\.[^/.]+$/, ".mp4") : "video.mp4"}
                            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download
                        </a>
                    )}
                    <Button variant="ghost" onClick={() => { setStatus("idle"); setJobId(null); }} className="w-full">
                        Render Another
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-purple-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {status === "uploading" ? "Uploading Audio..." : `Rendering: ${Math.round(progress * 100)}%`}
                    </div>
                    {status === "rendering" && (
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
