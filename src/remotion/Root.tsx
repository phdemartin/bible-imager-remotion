import { Composition, registerRoot } from 'remotion';
import "@fontsource/fredericka-the-great";
import { BibleVideo } from '../components/RemotionVideo';
import { bibleVideoSchema } from '../lib/video-schema';

export const RemotionRoot: React.FC = () => {
    // Force bundle invalidation: 2026-01-24T17:55:00
    return (
        <>
            <Composition
                id="BibleVideo"
                component={BibleVideo as any}
                schema={bibleVideoSchema}
                // default duration to 5 mins, but we will use calculateMetadata to be precise
                durationInFrames={30 * 60}
                fps={30}
                width={1920}
                height={1080}
                defaultProps={{
                    audioSrc: '',
                    titleText: 'Bible Study',
                    images: [],
                }}
                calculateMetadata={async ({ props }) => {
                    const images = props.images as any[];
                    const lastImage = images[images.length - 1];
                    const durationInSeconds = lastImage ? lastImage.start + lastImage.duration : 30;
                    return {
                        durationInFrames: Math.ceil(durationInSeconds * 30),
                    };
                }}
            />
        </>
    );
};

registerRoot(RemotionRoot);
