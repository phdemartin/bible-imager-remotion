import { NextRequest, NextResponse } from "next/server";
import { renderStore } from "@/lib/render-store";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const job = renderStore ? renderStore.getJob(id) : null;

    if (!job || job.status !== 'done' || !job.outputFile) {
        return NextResponse.json({ error: "Job not ready or failed" }, { status: 404 });
    }

    if (!fs.existsSync(job.outputFile)) {
        return NextResponse.json({ error: "Output file missing on server" }, { status: 404 });
    }

    // Serve file
    const fileBuffer = fs.readFileSync(job.outputFile);
    const filename = job.outputFilename || "video.mp4";
    const encodedFilename = encodeURIComponent(filename).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A');

    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
        }
    });
}
