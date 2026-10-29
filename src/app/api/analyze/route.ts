import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    let apiKey = "";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const apiKey = (formData.get("apiKey") as string)?.trim();
        const styleInput = (formData.get("style") as string) || "Photorealistic";
        const language = (formData.get("language") as string) || "es";
        const segmentCountInput = formData.get("segmentCount") as string;
        const eraStyle = (formData.get("eraStyle") as string) || "Biblical";
        const globalStylePrompt = (formData.get("globalStylePrompt") as string) || "";
        const isAutoCount = segmentCountInput === "auto";
        const segmentCount = parseInt(segmentCountInput) || 10;

        // Define detailed prompts for specific styles
        let style = styleInput;
        if (styleInput === "Biblical Watercolor") {
            style = "Soft watercolor illustration, classic storybook style, with organic edges and visible watercolor paper texture. Warm and contemplative atmosphere, soft golden lighting contrasting with deep blue skies. Simple clothing, earth tones. Balanced and narrative composition, with a sense of calm, humility and hope. Soft light emanating from the center of the scene, without modern effects. Background painted with watercolor washes, no hard lines, with atmospheric depth.";
        }

        // Map language code to full name for the prompt
        const languageMap: Record<string, string> = {
            "en": "English",
            "fr": "French",
            "es": "Spanish",
            "ar": "Arabic",
            "fa": "Farsi"
        };
        const targetLanguage = languageMap[language] || "Spanish";

        if (!file || !apiKey) {
            return NextResponse.json({ error: "File or API Key missing" }, { status: 400 });
        }

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");

        const genAI = new GoogleGenerativeAI(apiKey);

        const isBiblical = eraStyle.toLowerCase().includes("biblic") || eraStyle === "Biblical";
        const isWW2 = eraStyle.toLowerCase().includes("ww2") || eraStyle.toLowerCase().includes("guerre") || eraStyle.toLowerCase().includes("world war");
        const isAI = eraStyle.toLowerCase().includes("ai") || eraStyle.toLowerCase().includes("tech") || eraStyle.toLowerCase().includes("ia");

        let eraContextInstruction = `You are an expert content analyzer and visual media director.`;
        if (isBiblical) {
            eraContextInstruction = `You are an expert Bible study assistant and visual media creator. Focus on biblical verses, spiritual themes, and ancient Middle Eastern settings.`;
        } else if (isWW2) {
            eraContextInstruction = `You are an expert historical analyst and visual media creator specializing in World War II (1939-1945). Focus on historic events, military & civilian scenes, period-accurate 1939-1945 details, and dramatic historical narratives.`;
        } else if (isAI) {
            eraContextInstruction = `You are an expert technology analyst and sci-fi visual media creator. Focus on AI technology, cybernetics, digital futuristic landscapes, data flows, and advanced tech concepts.`;
        } else {
            eraContextInstruction = `You are an expert content analyzer focusing on theme: ${eraStyle}. Frame all visual scenes around this specific era/theme context.`;
        }

        let prompt = isAutoCount ? `
      ${eraContextInstruction} Analyze this content (audio file or document).
      Extract key segments where a distinct scene, major event, quote, or main concept is discussed.
      Automatically determine the appropriate number of segments based on length and density.
      For each segment, provide:
      1. timestamp (format MM:SS) - If text/PDF, use "Page X" or "Section X".
      2. verse (e.g., "Ref / Title / John 3:16") - USE ${targetLanguage.toUpperCase()} notation.
      3. theme (short title) - TRANSLATE TO ${targetLanguage.toUpperCase()}.
      4. prompt (a detailed, artistic image generation prompt matching the chosen era/style). Keep in English for optimal image generation quality.
` : `
      ${eraContextInstruction} Analyze this content (audio file or document).
      Extract exactly ${segmentCount} key segments representing distinct scenes or concepts.
      For each segment, provide:
      1. timestamp (format MM:SS) - If text/PDF, use "Page X" or "Section X".
      2. verse (e.g., "Ref / Title / John 3:16") - USE ${targetLanguage.toUpperCase()} notation.
      3. theme (short title) - TRANSLATE TO ${targetLanguage.toUpperCase()}.
      4. prompt (a detailed, artistic image generation prompt matching the chosen era/style). Keep in English for optimal image generation quality.
`;

        prompt += `
      **CRITICAL IMAGE GENERATION RULES:**
      - **Art Style:** ${style}.
      - **Era & Theme Context:** ${globalStylePrompt || eraStyle}.
`;

        if (isBiblical) {
            prompt += `
      - **NO DIVINE FIGURES:** Do NOT depict God, Jesus, angels, or divine figures directly. Use symbolic, metaphorical, or atmospheric representations (e.g., bright light, dove, vast landscapes).
      - **HUMBLE RESPECTFUL STYLE:** Favor simple, naturalistic, or humble representations consistent with respectful aesthetics.
`;
        }

        prompt += `
      - **TEXT LANGUAGE & RENDERING:** Any text inside the image MUST be in ${targetLanguage.toUpperCase()}. strictly.
      - **SPELLING ACCURACY:** Wrap any rendered text in double quotes (e.g. "TEXT") with instructions for perfect spelling and legibility.

      Return ONLY a JSON array of objects with keys: id (unique string), timestamp, verse, theme, prompt.
      Example:
      [
        { "id": "1", "timestamp": "00:45", "verse": "Ref 1", "theme": "Introduction", "prompt": "A detailed scene description..." }
      ]
    `;

        // Liste des modèles à tenter par ordre de préférence (basée sur les modèles disponibles de l'utilisateur)
        // STRICTEMENT LIMITÉ AUX MODÈLES FLASH POUR RÉDUIRE LES COÛTS
        const modelNames = [
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-002",
            "gemini-1.5-flash-8b",
        ];

        let result = null;
        let lastError = null;

        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: file.type,
                            data: base64Audio
                        }
                    }
                ]);

                if (result) break; // Succès
            } catch (e: any) {
                console.warn(`Model ${modelName} failed:`, e.message);
                lastError = e;
                // On continue avec le prochain modèle
            }
        }

        if (!result) {
            throw new Error(`All models failed. Last error: ${lastError?.message}`);
        }

        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const segments = JSON.parse(jsonStr);

        return NextResponse.json({ segments });
    } catch (error: any) {
        console.error("Error analyzing audio:", error);

        // Tentative de récupération de la liste des modèles pour le débogage
        let availableModels = "Could not fetch models";
        let listErrorDetails = "";
        try {
            if (!apiKey) {
                availableModels = "API Key not found in request processing";
            } else {
                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (listResponse.ok) {
                    const listData = await listResponse.json();
                    availableModels = listData.models
                        ? listData.models.map((m: any) => m.name).join(", ")
                        : "No models found";
                } else {
                    const errorText = await listResponse.text();
                    availableModels = `Failed to list models: ${listResponse.status} ${listResponse.statusText}`;
                    listErrorDetails = `Details: ${errorText}`;
                }
            }
        } catch (listError: any) {
            console.error("Error listing models:", listError);
            availableModels = `Exception listing models: ${listError.message}`;
        }

        return NextResponse.json({
            error: `Analysis failed. \n\nDebug Info:\n- Last Model Error: ${error.message}\n- API Key Status: ${availableModels}\n- ${listErrorDetails}`
        }, { status: 500 });
    }
}
