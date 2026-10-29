"use client";

import { Player } from "@remotion/player";
import { BibleVideo } from "./RemotionVideo";
import { Segment } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { calculateSlideTimings } from "@/lib/video-utils";

interface RemotionPlayerProps {
    segments: Segment[];
    audioFile: File | null;
    totalDuration: number;
    language?: string;
}

export const RemotionPlayerWrapper: React.FC<RemotionPlayerProps> = (props) => {
    const { segments, audioFile, totalDuration } = props;
    const [audioUrl, setAudioUrl] = useState<string>("");
    const [preparedImages, setPreparedImages] = useState<any[]>([]);

    useEffect(() => {
        if (audioFile) {
            const url = URL.createObjectURL(audioFile);
            setAudioUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [audioFile]);

    useEffect(() => {
        const images = calculateSlideTimings(segments, totalDuration);
        setPreparedImages(images);
    }, [segments, totalDuration]);

    // Calculate total frames properly including the appended black slide
    const finalDuration = preparedImages.length > 0
        ? preparedImages[preparedImages.length - 1].start + preparedImages[preparedImages.length - 1].duration
        : totalDuration;

    const durationInFrames = Math.max(1, Math.ceil((finalDuration || 1) * 30));

    if (!audioUrl || preparedImages.length === 0) {
        return <div className="p-8 text-center text-slate-500">Generate images to preview video</div>;
    }

    return (
        <div className="space-y-4">
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                <Player
                    component={BibleVideo as any}
                    durationInFrames={durationInFrames}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    fps={30}
                    style={{
                        width: '100%',
                        height: '100%',
                    }}
                    controls
                    inputProps={{
                        audioSrc: audioUrl,
                        titleText: (segments.length > 0 && segments[0].theme) ? segments[0].theme : (audioFile?.name.replace(/\.[^/.]+$/, "") || "Bible Study"),
                        images: preparedImages,
                        language: props.language
                    }}
                />
            </div>
            <p className="text-center text-xs text-slate-500">
                Preview only. Use the "Video Export" button above to generate the final MP4 file.
            </p>
        </div>
    );
};
