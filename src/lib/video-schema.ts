import { z } from "zod";

export const bibleVideoSchema = z.object({
    audioSrc: z.string(),
    titleText: z.string().optional(),
    images: z.array(z.object({
        url: z.string(),
        start: z.number(),
        duration: z.number(),
    })),
    captions: z.array(z.object({
        text: z.string(),
        start: z.number(),
        end: z.number(),
    })).optional(),
    language: z.enum(["en", "Fr", "es", "fr", "ar", "fa"]).optional(),
    outputFilename: z.string().optional(),
});

export type BibleVideoProps = z.infer<typeof bibleVideoSchema>;
