import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");
    if (!filename) return new NextResponse("Missing filename", { status: 400 });

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), "public/uploads", safeFilename);

    if (!fs.existsSync(filePath)) {
        return new NextResponse("File not found at " + filePath, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Attempt to guess mime type or just default to octet-stream/mp3
    let contentType = "application/octet-stream";
    if (safeFilename.endsWith(".mp3")) contentType = "audio/mpeg";
    if (safeFilename.endsWith(".wav")) contentType = "audio/wav";
    if (safeFilename.endsWith(".png")) contentType = "image/png";
    if (safeFilename.endsWith(".jpg")) contentType = "image/jpeg";

    return new NextResponse(fileBuffer, {
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${safeFilename}"`
        }
    });
}
