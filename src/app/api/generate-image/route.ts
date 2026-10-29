import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    let apiKey = "";
    try {
        const body = await req.json();
        let prompt = body.prompt;
        const quality = body.quality || "draft"; // "draft" | "final"

        // Aggrsessively force huge text for title slides
        if (prompt && (prompt.toLowerCase().includes("title") || prompt.length < 20)) {
            const originalPrompt = prompt;
            const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(originalPrompt);
            if (isArabic) {
                prompt = `A specific typographic design of the Arabic text "${originalPrompt}" on old parchment. The text is in an EXTREME CLOSE-UP. The letters are GIGANTIC, beautifully connected, and fill the entire screen from left to right. Elegant traditional Arabic calligraphy. Dark Ink. The focus is 100% on the massive text with perfect spelling and correct script connections. \n\nText to render: ${originalPrompt}`;
            } else {
                prompt = `A specific typographic design of the text "${originalPrompt}" on old parchment. The text is in an EXTREME CLOSE-UP. The letters are GIGANTIC and fill the entire screen from left to right. Fredericka style serif font. Dark Ink. The focus is 100% on the massive text with perfect spelling and correct accents (like á, é, í, ó, ú, ñ). \n\nText to render: ${originalPrompt}`;
            }
        }
        apiKey = body.apiKey;

        if (!prompt || !apiKey) {
            return NextResponse.json({ error: "Prompt or API Key missing" }, { status: 400 });
        }

        // List of models to try based on Quality setting
        // Draft = Gemini Flash Image (Cheap/Fast)
        // Final = Gemini Pro Image (High Quality/Resolution)
        let modelNames: string[] = [];

        if (quality === "final") {
            modelNames = [
                "gemini-3-pro-image", // High fidelity model for final render
                "gemini-3.1-flash-image", // Fallback to Flash
                "imagen-4.0-ultra-generate-001",
                "imagen-4.0-ultra-generate-preview-06-06",
                "imagen-4.0-generate-001", // Fallback to standard
                "gemini-2.5-flash-image",
            ];
        } else {
            // Default to DRAFT (Fast/Cheap)
            modelNames = [
                "gemini-3.1-flash-image",
                "imagen-4.0-fast-generate-001",
                "imagen-4.0-generate-001", // Standard as fallback
                "gemini-2.5-flash-image",
            ];
        }

        let imageUrl = null;
        let lastError = null;

        const genAI = new GoogleGenerativeAI(apiKey);

        for (const modelName of modelNames) {
            try {
                console.log(`Trying image model: ${modelName}`);

                // --- STRATEGY 1: GEMINI MODELS (SDK) ---
                if (modelName.includes("gemini")) {
                    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                    // Gemini Image models support native image config
                    const genResp = await fetch(genUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: {
                                responseModalities: ["TEXT", "IMAGE"],
                                imageConfig: {
                                    aspectRatio: "16:9",
                                    imageSize: quality === "final" ? "2K" : "1K"
                                }
                            }
                        })
                    });

                    if (genResp.ok) {
                        const genData = await genResp.json();
                        if (genData.candidates && genData.candidates[0] && genData.candidates[0].content && genData.candidates[0].content.parts) {
                            const parts = genData.candidates[0].content.parts;
                            const imgPart = parts.find((p: any) => p.inlineData);
                            if (imgPart && imgPart && imgPart.inlineData && imgPart.inlineData.data) {
                                imageUrl = `data:${imgPart.inlineData.mimeType || "image/png"};base64,${imgPart.inlineData.data}`;
                                break;
                            }
                        }
                    } else {
                        const errTxt = await genResp.text();
                        console.warn(`Gemini generateContent for ${modelName} failed: ${genResp.status} ${errTxt}`);
                        if (genResp.status === 429) {
                            console.warn("Quota exceeded for Gemini model");
                            lastError = new Error("Quota 429");
                        }
                    }
                    // If we fall through, we proceed to next model
                }

                // --- STRATEGY 2: IMAGEN MODELS (REST API) ---
                else {
                    // Revert to v1beta as v1 returned 404. 
                    // v1beta works but sometimes returns empty response (handled by failover).
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;

                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            instances: [
                                {
                                    prompt: prompt,
                                }
                            ],
                            parameters: {
                                sampleCount: 1,
                                aspectRatio: "16:9" // Ensure 1920x1080 output
                            }
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();

                        if (response.status === 404) {
                            console.warn(`Model ${modelName} not found (404).`);
                            lastError = new Error(`Model ${modelName} not found (404)`);
                            continue;
                        }
                        if (response.status === 403) {
                            console.warn(`Model ${modelName} permission denied (403).`);
                            lastError = new Error(`Model ${modelName} permission denied (403)`);
                            continue;
                        }
                        // If quota exceeded, we want to try the next model!
                        if (response.status === 429) {
                            console.warn(`Model ${modelName} quota exceeded (429).`);
                            lastError = new Error(`Model ${modelName} quota exceeded (429)`);
                            continue;
                        }

                        throw new Error(`Imagen API Error: ${response.status} ${response.statusText} - ${errorText}`);
                    }

                    const data = await response.json();

                    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                        const base64Image = data.predictions[0].bytesBase64Encoded;
                        imageUrl = `data:image/png;base64,${base64Image}`;
                        break; // Success
                    } else if (data.predictions && data.predictions[0] && data.predictions[0].mimeType && data.predictions[0].bytesBase64Encoded) {
                        // Variant for some endpoints
                        const base64Image = data.predictions[0].bytesBase64Encoded;
                        const mime = data.predictions[0].mimeType;
                        imageUrl = `data:${mime};base64,${base64Image}`;
                        break;
                    } else {
                        console.warn(`Unexpected response format for ${modelName}`, JSON.stringify(data).substring(0, 200));
                    }
                }

            } catch (error: any) {
                console.error(`Error with model ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (imageUrl) {
            return NextResponse.json({ imageUrl });
        } else {
            // DEBUG: List available models to see what the user actually has
            console.log("\n--- DEBUG: Listing available models for user ---");
            try {
                const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
                const listResp = await fetch(listUrl);
                if (listResp.ok) {
                    const listData = await listResp.json();
                    const available = listData.models?.map((m: any) => m.name) || [];
                    console.log("AVAILABLE MODELS:", JSON.stringify(available, null, 2));
                } else {
                    console.log("Failed to list models:", listResp.status, await listResp.text());
                }
            } catch (debugErr) {
                console.log("Error listing models:", debugErr);
            }
            console.log("------------------------------------------------\n");

            throw new Error(`All image models failed. Last error: ${lastError?.message}. Check server logs for available models.`);
        }

    } catch (error: any) {
        console.error("Error generating image:", error);

        // Try to identify if it's a quota issue
        if (error.message?.includes("429")) {
            return NextResponse.json({ error: "Quota exceeded (429). Please try again later or check your billing." }, { status: 429 });
        }

        return NextResponse.json({ error: error.message || "Image generation failed" }, { status: 500 });
    }
}
