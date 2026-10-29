export interface Segment {
    id: string;
    timestamp: string;
    verse: string;
    theme: string;
    prompt: string;
    imageUrl: string; // Dans une vraie app, ce serait généré
    error?: string; // Pour gérer les erreurs de génération
}

export const MOCK_SEGMENTS: Segment[] = [
    {
        id: "1",
        timestamp: "00:45",
        verse: "Genèse 1:1",
        theme: "La Création",
        prompt: "A majestic and ethereal representation of the beginning of the universe, light emerging from darkness, cosmic dust, divine atmosphere, cinematic lighting, 8k resolution.",
        imageUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop"
    },
    {
        id: "2",
        timestamp: "02:15",
        verse: "Psaume 23:1",
        theme: "Le Berger",
        prompt: "A peaceful green pasture with a gentle stream, a shepherd in the distance, golden hour sunlight, serene atmosphere, oil painting style.",
        imageUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c7dd1?q=80&w=2000&auto=format&fit=crop"
    },
    {
        id: "3",
        timestamp: "05:30",
        verse: "Jean 3:16",
        theme: "L'Amour Divin",
        prompt: "A conceptual representation of divine love, a glowing heart or cross in the sky, warm colors, soft clouds, hope and redemption, digital art.",
        imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2000&auto=format&fit=crop"
    },
    {
        id: "4",
        timestamp: "08:10",
        verse: "Apocalypse 21:4",
        theme: "La Nouvelle Terre",
        prompt: "A futuristic yet ancient city of gold and crystal, no tears, eternal light, joy, intricate architecture, fantasy realism.",
        imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000&auto=format&fit=crop"
    }
];
