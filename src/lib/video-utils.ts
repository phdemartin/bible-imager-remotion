import { Segment } from "./mock-data";

export interface PreparedImage {
    url: string;
    start: number; // in seconds
    duration: number; // in seconds
}

export function parseTimestampToSeconds(timestamp: string): number {
    if (!timestamp) return 0;
    try {
        const parts = timestamp.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return parts[0] * 60 + parts[1];
        }
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    } catch {
        return 0;
    }
}

export function calculateSlideTimings(segments: Segment[], totalDuration: number): PreparedImage[] {
    const validSegments = segments.filter(s => s.imageUrl);
    if (validSegments.length === 0) return [];

    const hasTitleSlide = validSegments[0]?.id === "title-slide";
    const minSlideDuration = 3; // minimum 3 seconds per content slide

    const starts: number[] = [];

    if (hasTitleSlide) {
        // Title slide starts at 0
        starts[0] = 0;
        const contentCount = validSegments.length - 1;

        if (contentCount > 0) {
            const contentAudioDuration = Math.max(5, totalDuration - 5);
            const defaultStep = contentAudioDuration / contentCount;

            // First content slide starts at 5s (after Title)
            starts[1] = 5;

            for (let i = 2; i < validSegments.length; i++) {
                const ts = parseTimestampToSeconds(validSegments[i].timestamp);
                const prevStart = starts[i - 1];

                // If original timestamp is valid and properly spaced after prevStart, use it
                if (ts > prevStart + minSlideDuration && ts < totalDuration) {
                    starts[i] = ts;
                } else {
                    // Fallback to even distribution from 5s onwards
                    const stepStart = 5 + (i - 1) * defaultStep;
                    starts[i] = Math.max(prevStart + minSlideDuration, stepStart);
                }
            }
        }
    } else {
        // No title slide: first slide starts at 0
        starts[0] = 0;
        const count = validSegments.length;
        const defaultStep = Math.max(minSlideDuration, totalDuration / Math.max(1, count));

        for (let i = 1; i < validSegments.length; i++) {
            const ts = parseTimestampToSeconds(validSegments[i].timestamp);
            const prevStart = starts[i - 1];

            if (ts > prevStart + minSlideDuration && ts < totalDuration) {
                starts[i] = ts;
            } else {
                starts[i] = Math.max(prevStart + minSlideDuration, i * defaultStep);
            }
        }
    }

    // Now compute durations based on calculated starts
    const prepared: PreparedImage[] = validSegments.map((seg, index) => {
        const start = starts[index];
        let duration = 5;

        if (index === 0 && hasTitleSlide) {
            // Title slide is strictly 5s (or start of slide 1)
            const nextStart = starts[1] !== undefined ? starts[1] : 5;
            duration = Math.max(3, nextStart - start);
        } else if (index < validSegments.length - 1) {
            const nextStart = starts[index + 1];
            duration = Math.max(minSlideDuration, nextStart - start);
        } else {
            // Last content slide: extends to total audio duration
            if (totalDuration > start) {
                duration = Math.max(minSlideDuration, totalDuration - start);
            } else {
                duration = 5;
            }
        }

        return {
            url: seg.imageUrl,
            start,
            duration
        };
    });

    // Append 5s black trailing spacer for end sequence (Like/Subscribe overlays)
    if (prepared.length > 0) {
        const last = prepared[prepared.length - 1];
        const endOfLast = last.start + last.duration;
        prepared.push({
            url: "",
            start: endOfLast,
            duration: 5
        });
    }

    return prepared;
}
