import { z } from "zod";

export const TermSchema = z.object({
	aliases: z.array(z.string()).default([]),
	definition: z.string(),
});

export const VocabularySchema = z.object({
	terms: z.record(z.string(), TermSchema),
});

export type Term = z.infer<typeof TermSchema>;
export type Vocabulary = z.infer<typeof VocabularySchema>;
