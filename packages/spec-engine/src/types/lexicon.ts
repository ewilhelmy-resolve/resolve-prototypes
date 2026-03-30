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

export const EndpointSpecSchema = z.object({
	method: z.string(),
	path: z.string(),
	summary: z.string(),
	description: z.string(),
	tags: z.array(z.string()),
	requestSchemas: z.array(z.string()),
	responseSchemas: z.array(
		z.object({ status: z.number(), schema: z.string() }),
	),
	auth: z.object({
		authenticated: z.boolean(),
		roles: z.array(z.string()),
	}),
	file: z.string(),
	line: z.number(),
});

export const SSEEventTypeSchema = z.object({
	name: z.string(),
	type: z.string(),
	fields: z.array(z.object({ name: z.string(), type: z.string() })),
});

export const SSEEmitterSchema = z.object({
	service: z.string(),
	method: z.string(),
	eventType: z.string(),
	target: z.enum(["user", "organization"]),
	file: z.string(),
	line: z.number(),
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
	endpoints: z.array(EndpointSpecSchema).optional(),
	sseEvents: z.array(SSEEventTypeSchema).optional(),
	sseEmitters: z.array(SSEEmitterSchema).optional(),
	hooks: z
		.array(
			z.object({
				name: z.string(),
				file: z.string(),
				type: z.enum(["query", "mutation", "infinite"]),
				apiCalls: z.array(z.string()),
				queryKeys: z.array(z.string()),
				invalidates: z.array(z.string()),
			}),
		)
		.optional(),
	dependencies: z
		.array(
			z.object({
				from: z.string(),
				to: z.string(),
				type: z.enum(["import", "method-call"]),
				file: z.string(),
			}),
		)
		.optional(),
	stats: StatsSchema,
});

export type Lexicon = z.infer<typeof LexiconSchema>;
export type Stats = z.infer<typeof StatsSchema>;
