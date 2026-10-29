"use client";

import { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Button } from "./ui/button";
import { Video, Loader2, Download, AlertCircle } from "lucide-react";
import { Segment } from "@/lib/mock-data";
import { calculateSlideTimings } from "@/lib/video-utils";

interface VideoExporterProps {
    segments: Segment[];
    audioFile: File | null;
    totalDuration: number;
}

export function VideoExporter({ segments, audioFile, totalDuration }: VideoExporterProps) {
    const [loaded, setLoaded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const ffmpegRef = useRef(new FFmpeg());
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const load = async () => {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        const ffmpeg = ffmpegRef.current;

        ffmpeg.on("log", ({ message }) => {
            console.log(message);
            // Simple heuristics for progress message
            setMessage(message);
        });

        ffmpeg.on("progress", ({ progress }) => {
            setProgress(Math.round(progress * 100));
        });

        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");

        await ffmpeg.load({
            coreURL,
            wasmURL,
        });

        setLoaded(true);
    };

    useEffect(() => {
        load();
    }, []);

    const parseTimestampToSeconds = (timestamp: string): number => {
        try {
            const parts = timestamp.split(':').map(Number);
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            return 0;
        } catch { return 0; }
    };

    const handleExport = async () => {
        if (!loaded || !audioFile) return;

        const validSegments = segments.filter(s => s.imageUrl);
        if (validSegments.length === 0) {
            alert("No images to generate video from.");
            return;
        }

        setIsProcessing(true);
        setVideoUrl(null);
        setProgress(0);

        try {
            const ffmpeg = ffmpegRef.current;

            // 1. Write Audio
            const audioData = await fetchFile(audioFile);
            await ffmpeg.writeFile("audio.mp3", audioData);

            // 2. Write Images and Create Concat List using calculateSlideTimings
            let concatText = "";
            const prepared = calculateSlideTimings(segments, totalDuration);

            for (let i = 0; i < prepared.length; i++) {
                const item = prepared[i];
                if (!item.url || item.url.trim() === "") continue;

                const duration = Math.max(0.5, item.duration);
                const imgFilename = `img${i}.png`;

                // Normalize image to 1920x1080 (Crop to fit)
                const normalizeImage = async (url: string): Promise<Uint8Array> => {
                    return new Promise((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = 1920;
                            canvas.height = 1080;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) { reject(new Error("No canvas context")); return; }

                            // Draw black background
                            ctx.fillStyle = "black";
                            ctx.fillRect(0, 0, canvas.width, canvas.height);

                            // Calculate scale to cover
                            const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                            const x = (canvas.width / 2) - (img.width / 2) * scale;
                            const y = (canvas.height / 2) - (img.height / 2) * scale;

                            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                            canvas.toBlob(async (blob) => {
                                if (blob) {
                                    const buf = await blob.arrayBuffer();
                                    resolve(new Uint8Array(buf));
                                } else {
                                    reject(new Error("Canvas to Blob failed"));
                                }
                            }, 'image/png');
                        };
                        img.onerror = (e) => reject(new Error("Image load failed"));
                        img.src = url;
                    });
                };

                // Write image file
                try {
                    const normalizedImage = await normalizeImage(item.url);
                    await ffmpeg.writeFile(imgFilename, normalizedImage);
                } catch (err) {
                    console.error(`Error normalizing image ${i}`, err);
                    // Fallback to direct write if normalization fails
                    await ffmpeg.writeFile(imgFilename, await fetchFile(item.url));
                }

                // Add to concat list
                // Syntax:
                // file 'filename'
                // duration 5
                concatText += `file '${imgFilename}'\n`;
                concatText += `duration ${duration}\n`;
            }

            // Fix for FFmpeg concat demuxer: sometimes the last file's duration is ignored or it stops early.
            // We repeat the last frame one more time just to be safe.
            if (validSegments.length > 0) {
                const lastIdx = validSegments.length - 1;
                const lastImgFilename = `img${lastIdx}.png`;
                concatText += `file '${lastImgFilename}'\n`;
                // No duration needed for the very last entry technically, but better valid syntax
                // or just act as a dummy tail.
            }

            // Important: Concat demuxer requires the last file to be repeated *without* duration properly or a quirk?
            // Actually, for the last image to show, we just specify it.
            // But strict standard says "duration applies to previous file".
            // So we need to ensure the last file is held until end of audio.
            // To be safe, we just let the last image list its duration.
            // And maybe repeat the last file one more time just to be sure FFmpeg doesn't cut early?
            // The logic above sets duration for EVERY segment including the last one.
            // But concat syntax is:
            // file 'A'
            // duration 5
            // file 'B'
            // duration 5
            // (Note: if user wants B to show for 5s, duration comes AFTER file)
            // AND IMPORTANT: The last image needs to be valid.
            // Often we need a dummy entry at the end if the last duration is ignored?
            // No, "duration" directive works.

            await ffmpeg.writeFile("list.txt", concatText);

            // 3. Run FFmpeg
            // -f concat -safe 0 -i list.txt -i audio.mp3 -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest out.mp4
            // -shortest stops when the shortest input stream ends. Our images define duration, audio defines duration.
            // Ideally they match. If not, we want audio to drive it mostly? 
            // Actually, if we calculated durations correctly, video stream length == audio length roughly.
            // We use -pix_fmt yuv420p for compatibility.
            // Using preset ultrafast for speed in browser.

            setMessage("Rendering video... This may take a while.");

            await ffmpeg.exec([
                "-f", "concat",
                "-safe", "0",
                "-i", "list.txt",
                "-i", "audio.mp3",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-shortest",
                "output.mp4"
            ]);

            // 4. Read Output
            const data = await ffmpeg.readFile("output.mp4");
            const url = URL.createObjectURL(new Blob([data as any], { type: "video/mp4" }));
            setVideoUrl(url);

        } catch (error: any) {
            console.error("FFmpeg error:", error);
            alert("Video generation failed: " + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-400" />
                    Video Export
                </h3>
                {!loaded && (
                    <span className="text-xs text-yellow-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading Core...
                    </span>
                )}
            </div>

            <p className="text-sm text-slate-400 mb-6">
                Generate an MP4 video with your images synchronized to the audio.
                <br />
                <span className="text-xs opacity-70">(Process runs locally in your browser)</span>
            </p>

            <div className="space-y-4">
                {!videoUrl ? (
                    <Button
                        onClick={handleExport}
                        disabled={!loaded || isProcessing || !audioFile}
                        className="w-full gap-2"
                        size="lg"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {message || `Processing ${progress}%...`}
                            </>
                        ) : (
                            <>
                                <Video className="w-4 h-4" />
                                Generate MP4
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-black rounded-lg overflow-hidden aspect-video">
                            <video src={videoUrl} controls className="w-full h-full" />
                        </div>
                        <a
                            href={videoUrl}
                            download={audioFile ? audioFile.name.replace(/\.[^/.]+$/, "") + ".mp4" : "bible-video.mp4"}
                            className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download Video
                        </a>
                        <Button
                            variant="ghost"
                            onClick={() => setVideoUrl(null)}
                            className="w-full"
                        >
                            Generate New
                        </Button>
                    </div>
                )}

                {progress > 0 && isProcessing && (
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-blue-500 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
