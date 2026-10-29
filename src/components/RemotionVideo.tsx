import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';
// import "@fontsource/fredericka-the-great"; // Removed in favor of Google Fonts link for robustness

interface BibleVideoProps {
    audioSrc: string;
    titleText?: string;
    images: {
        url: string;
        start: number; // in seconds
        duration: number; // in seconds
    }[];
    captions?: {
        text: string;
        start: number;
        end: number;
    }[];
    language?: string;
    baseUrl?: string;
    likeIconSrc?: string;
    subscribeIconSrc?: string;
}

export const BibleVideo: React.FC<BibleVideoProps> = (props) => {
    const { audioSrc, titleText, images, captions, language, baseUrl } = props;
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // We expect images to already contain the black slide if needed (passed from wrapper)
    const processedImages = images;

    return (
        <AbsoluteFill className="bg-black">
            <Audio src={audioSrc} />
            <link
                href="https://fonts.googleapis.com/css2?family=Fredericka+the+Great&display=swap"
                rel="stylesheet"
            />

            {processedImages.map((image, index) => {
                const isFirst = index === 0;
                const isLast = index === images.length - 1;

                let fromFrame = Math.floor(image.start * fps);
                let durationFrames = Math.floor(image.duration * fps);

                if (isFirst) {
                    fromFrame = 0;
                }

                const fadeDurationInFrames = 30;
                const imageSrc = image.url;

                if (!image.url || image.url.trim() === "") {
                    // If it's the ending spacer or black slide, we might skip it if we have a custom end sequence
                    // But PlayerWrapper adds a 5s block. We can overlay our end sequence on it or replace it.
                    // IMPORTANT: PlayerWrapper currently adds a 5s black slide at the end. 
                    // We will use that timeframe for our End Sequence.
                    return null; // Skip rendering black slide, we'll render End Sequence instead
                }

                return (
                    <Sequence key={index} from={fromFrame} durationInFrames={durationFrames + fadeDurationInFrames}>
                        <FadingImage
                            src={imageSrc}
                            isFirst={isFirst}
                            isLast={isLast}
                            fadeDuration={fadeDurationInFrames}
                            durationInFrames={durationFrames + fadeDurationInFrames}
                        />
                    </Sequence>
                );
            })}

            {/* End Sequence */}
            {(() => {
                // Determine start based on last valid image
                // Determine start based on last valid image OR just the last image structure
                // effectively we want to start overlap 1s before the visual content ends.

                const validImages = processedImages.filter(img => img.url && img.url.trim() !== "");
                let lastImage = validImages.pop();

                // If no valid images, maybe we still want end screen at end of audio?
                // But assume we have at least Title.
                if (!lastImage && processedImages.length > 0) {
                    lastImage = processedImages[processedImages.length - 1];
                }

                if (!lastImage) return null;

                // Start 1 second (30 frames) BEFORE the end of the last image for overlap
                const overlapDuration = 30;
                const endTimestampFrames = Math.floor((lastImage.start + lastImage.duration) * fps);
                const startFrame = Math.max(0, endTimestampFrames - overlapDuration);

                // End Sequence duration: 5 seconds total + the overlap we consumed?
                // Actually the "spacer" from wrapper is 5s. 
                // We want to fill that 5s fully, plus the 1s overlap.
                // Total duration of this Sequence = 5s + 1s = 6s (180 frames)
                const endSeqDuration = (5 * fps) + overlapDuration;

                const lang = (language || "fr").toLowerCase();

                // Asset Paths
                const parchmentSrc = staticFile("/images/Parchemin.png");
                const likeSrc = staticFile("/Like.png");
                const subscribeSrc = staticFile(`/Suscribe_${lang}.png`);

                console.log("Assets:", { parchmentSrc, likeSrc, subscribeSrc, lang });

                // Animation Timings (relative to start of THIS sequence)
                // Sequence starts at T_end - 1s.
                // 0s - 1s (Frame 0-30): Parchment Fades In (Overlapping last slide).
                // 1s - 6s: Parchment stays fully opaque.

                // Icons should appear AFTER the parchment is established.
                // Let's say we want them to appear similar to before.
                // Before: Like started at frame 10 (0.33s).
                // Now: We have an extra 1s (30 frames) at the start.
                // So Like should start at 10 + 30 = 40.
                // Subscribe should start at 80 + 30 = 110.

                return (
                    <Sequence from={startFrame} durationInFrames={endSeqDuration}>
                        {/* Background Parchment with Fade In */}
                        <AbsoluteFill>
                            <FadingParchment src={parchmentSrc} fadeDuration={overlapDuration} />
                        </AbsoluteFill>

                        {/* Like Icon - Bottom Right-ish */}
                        {/* Sequence: Like appears at 40, stays for 60 frames (2s), then fades out. */}
                        {/* Subscribe starts at 110. This ensures sequential appearance and no overlap. */}
                        <Sequence from={40} durationInFrames={60}>
                            <FadingElement
                                src={likeSrc}
                                style={{ width: '13%' }}
                                containerStyle={{
                                    justifyContent: 'flex-end',
                                    alignItems: 'flex-end',
                                    paddingBottom: '5%',
                                    paddingRight: '35%' // Push to the left anyway
                                }}
                                // persist={false} // Default is false, which means it fades out at end of duration
                                durationInFrames={60}
                            />
                        </Sequence>

                        {/* Subscribe Icon - Bottom Right, Smaller */}
                        {/* Start at frame 110, stay until end. Total duration = endSeqDuration - 110 */}
                        <Sequence from={110} durationInFrames={endSeqDuration - 110}>
                            <FadingElement
                                src={subscribeSrc}
                                style={{ width: '26%' }}
                                containerStyle={{
                                    justifyContent: 'flex-end',
                                    alignItems: 'flex-end',
                                    paddingBottom: '5%',
                                    paddingRight: '5%'
                                }}
                                persist={true}
                                durationInFrames={endSeqDuration - 110}
                            />
                        </Sequence>
                    </Sequence>
                );
            })()}
        </AbsoluteFill>
    );
};

const FadingParchment: React.FC<{ src: string, fadeDuration: number }> = ({ src, fadeDuration }) => {
    const frame = useCurrentFrame();

    // Simple fade in from 0 to 1 over fadeDuration
    const opacity = Math.min(1, frame / fadeDuration);

    return (
        <Img
            src={src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity }}
        />
    );
};

// Helper for simple fade in/out elements with optional styling
const FadingElement: React.FC<{ src: string, style?: React.CSSProperties, containerStyle?: React.CSSProperties, persist?: boolean, durationInFrames?: number, delay?: number }> = ({ src, style, containerStyle, persist = false, durationInFrames, delay = 0 }) => {
    const frame = useCurrentFrame();

    // Calculate relative frame within this sequence
    const relativeFrame = frame;

    // Fade In duration
    const fadeFrames = 15;

    // Total duration of this component's lifespan in the sequence
    const duration = durationInFrames || 1000;

    let opacity = 0;

    if (relativeFrame < fadeFrames) {
        // Fading In
        opacity = relativeFrame / fadeFrames;
    } else if (persist) {
        // Stay fully visible
        opacity = 1;
    } else if (relativeFrame > duration - fadeFrames) {
        // Fading Out
        opacity = (duration - relativeFrame) / fadeFrames;
    } else {
        // Fully Visible
        opacity = 1;
    }

    return (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', ...containerStyle }}>
            <Img src={src} style={{ opacity, width: '40%', objectFit: 'contain', ...style }} />
        </AbsoluteFill>
    );
};

const FadingImage: React.FC<{
    src: string;
    isFirst: boolean;
    isLast: boolean;
    fadeDuration: number;
    durationInFrames: number;
}> = ({ src, isFirst, isLast, fadeDuration, durationInFrames }) => {
    const frame = useCurrentFrame();

    // Fade in
    let opacity = 1;

    // Fade in logic (if not first image)
    if (!isFirst) {
        opacity = Math.min(1, frame / fadeDuration);
    }

    // Cross-fade out (if not last image) relative to sequence
    // The sequence is `content + fade`. We start fading out `fadeDuration` before end.
    if (!isLast) {
        const timeUntilEnd = durationInFrames - frame;
        if (timeUntilEnd < fadeDuration) {
            opacity = Math.min(opacity, timeUntilEnd / fadeDuration);
        }
    }

    // Fade to Black (if last image)
    if (isLast) {
        const timeUntilEnd = durationInFrames - frame;
        if (timeUntilEnd < fadeDuration) {
            opacity = Math.min(opacity, timeUntilEnd / fadeDuration);
        }
    }

    // Debug logging for server-side render
    if (!src) {
        console.error("FadingImage: src is missing or empty!");
    } else if (src.startsWith('blob:')) {
        console.warn("FadingImage: src is a BLOB URL, this will fail in server-side render:", src);
    } // else console.log("FadingImage rendering:", src);

    return (
        <AbsoluteFill>
            {src ? (
                <Img
                    src={src}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity,
                    }}
                    onError={(e) => console.error("Img load error:", src, e)}
                />
            ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: 'black' }} />
            )}
        </AbsoluteFill>
    );
};
