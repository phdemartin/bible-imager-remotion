import { Segment } from "./mock-data";

export async function analyzeAudio(
    file: File,
    apiKey: string,
    style: string = "Photorealistic",
    language: string = "es",
    segmentCount: number | string = "auto",
    eraStyle: string = "Biblical",
    globalStylePrompt: string = ""
): Promise<Segment[]> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("apiKey", apiKey);
    formData.append("style", style);
    formData.append("language", language);
    formData.append("segmentCount", segmentCount.toString());
    formData.append("eraStyle", eraStyle);
    formData.append("globalStylePrompt", globalStylePrompt);

    const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze audio");
    }

    const data = await response.json();
    return data.segments.map((s: any) => ({
        ...s,
        imageUrl: "", // Will be generated later
    }));
}

export async function generateImage(prompt: string, apiKey: string, quality: "draft" | "final" = "draft"): Promise<string> {
    const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, apiKey, quality }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
    }

    const data = await response.json();
    return data.imageUrl;
}
