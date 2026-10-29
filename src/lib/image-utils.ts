export function cleanTitleName(filename: string): string {
    return filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export async function createTitleSlideImage(title: string): Promise<string> {
    if (typeof document === 'undefined') return "";

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');

    if (!ctx) return "";

    // Load background image
    const bgImage = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = "/images/Parchemin.png";
    });

    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback
        ctx.fillStyle = "#f5f5dc"; // Beige fallback
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Clean title
    const cleanTitle = cleanTitleName(title);

    // Text Settings
    // Try to ensure font is loaded
    try {
        await document.fonts.load('100px "Fredericka the Great"');
    } catch (e) {
        console.warn("Font load failed, fallback used");
    }

    ctx.fillStyle = "#1c1917"; // stone-900
    ctx.font = '200px "Fredericka the Great", cursive'; // Adjusted to 200px per user request
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Shadow for better legibility on parchment
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    // Word wrap logic
    const words = cleanTitle.split(' ');
    let lines = [];
    let currentLine = words[0];

    const maxWidth = 1600; // Slightly less than 1720 for padding

    for (let i = 1; i < words.length; i++) {
        const width = ctx.measureText(currentLine + " " + words[i]).width;
        if (width < maxWidth) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);

    if (lines.length === 1 && lines[0].length > 20 && words.length >= 2) {
        const mid = Math.ceil(words.length / 2);
        lines = [
            words.slice(0, mid).join(" "),
            words.slice(mid).join(" ")
        ];
    }

    const lineHeight = 240; // Adjusted for 200px font // Increased line height for bigger font
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + (lineHeight / 2);

    lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + (index * lineHeight));
    });

    return canvas.toDataURL("image/png");
}
