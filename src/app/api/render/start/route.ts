import { NextRequest, NextResponse } from "next/server";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { renderStore } from "@/lib/render-store";
import fs from "fs";
import os from "os";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { audioSrc, titleText, images, language, outputFilename } = body;

        // Create a unique Job ID
        const jobId = Math.random().toString(36).substring(2, 15);

        // Physical filename (unique to prevent overwrite/collision on server)
        const physicalFilename = `video-${jobId}.mp4`;
        const outputLocation = path.join(process.cwd(), "public/outputs", physicalFilename);

        // Download name (what the user sees)
        const downloadName = outputFilename || physicalFilename;

        // Create output dir if needed
        const outputDir = path.dirname(outputLocation);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Initialize Job
        if (renderStore) {
            renderStore.createJob(jobId, downloadName);
        }

        // Start background rendering
        (async () => {
            try {
                // 1. Bundle
                const entryPoint = path.join(process.cwd(), "src/remotion/Root.tsx");
                const bundled = await bundle({ entryPoint });

                // 2. Select Composition
                const composition = await selectComposition({
                    serveUrl: bundled,
                    id: "BibleVideo",
                    inputProps: {
                        audioSrc,
                        titleText,
                        images,
                        language
                    },
                    chromiumOptions: {
                        gl: 'egl'
                    },
                    timeoutInMilliseconds: 120000
                });

                // 3. Render with concurrency & JPEG optimization for maximum speed
                const cpus = os.cpus().length;
                const concurrency = Math.max(2, Math.floor(cpus * 0.8));

                await renderMedia({
                    composition,
                    serveUrl: bundled,
                    codec: "h264",
                    imageFormat: "jpeg",
                    jpegQuality: 80,
                    concurrency,
                    outputLocation,
                    inputProps: {
                        audioSrc,
                        titleText,
                        images,
                        language
                    },
                    chromiumOptions: {
                        gl: 'egl'
                    },
                    timeoutInMilliseconds: 300000,
                    onProgress: ({ progress }) => {
                        if (renderStore) {
                            renderStore.updateProgress(jobId, progress);
                        }
                    },
                });

                if (renderStore) {
                    renderStore.completeJob(jobId, outputLocation);
                }
                console.log(`Render done: ${jobId}`);

            } catch (err: any) {
                console.error(`Render failed for ${jobId}`, err);
                if (renderStore) {
                    renderStore.failJob(jobId, err.message);
                }
            }
        })();

        return NextResponse.json({ jobId });

    } catch (e: any) {
        console.error("Failed to start render", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
