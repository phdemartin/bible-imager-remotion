import { NextRequest, NextResponse } from "next/server";
import { renderStore } from "@/lib/render-store";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // In a real app with database, fetch from DB
    // Here using in-memory store
    const job = renderStore ? renderStore.getJob(id) : null;

    if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
}
