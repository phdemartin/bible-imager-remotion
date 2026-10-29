import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
        return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Safe filename generation
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2)}${path.extname(file.name)}`;

    // Path relative to project root
    // In production/standalone, process.cwd() is /app
    const uploadDir = path.join(process.cwd(), "public/uploads");

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeName);

    try {
        await writeFile(filePath, buffer);
        console.log("Uploaded file to", filePath);

        // Return both filename and a direct static path for local/simple use
        return NextResponse.json({
            success: true,
            filename: safeName,
            path: `/uploads/${safeName}`
        });
    } catch (e: any) {
        console.error("Upload failed", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
