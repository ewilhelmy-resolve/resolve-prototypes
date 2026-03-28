import { z } from "zod";
import {
	ActorSchema,
	ConstraintSchema,
	JourneySchema,
	ViewSchema,
} from "./avcj.js";
import { VocabularySchema } from "./vocabulary.js";

export const StatsSchema = z.object({
	totalFiles: z.number().int(),
	totalExports: z.number().int(),
	annotatedExports: z.number().int(),
	coveragePercent: z.number(),
});

export const LexiconSchema = z.object({
	version: z.literal("1.0"),
	generatedAt: z.string().datetime(),
	packages: z.array(z.string()),
	vocabulary: VocabularySchema.optional(),
	actors: z.array(ActorSchema),
	views: z.array(ViewSchema),
	journeys: z.array(JourneySchema),
	constraints: z.array(ConstraintSchema),
	stats: StatsSchema,
});

export type Lexicon = z.infer<typeof LexiconSchema>;
export type Stats = z.infer<typeof StatsSchema>;
