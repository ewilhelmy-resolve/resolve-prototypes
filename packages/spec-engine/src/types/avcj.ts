import { z } from "zod";

export const SourceLocationSchema = z.object({
	file: z.string(),
	line: z.number().int(),
	package: z.string(),
});

export const MethodSchema = z.object({
	name: z.string(),
	description: z.string().default(""),
	params: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
			}),
		)
		.default([]),
	returns: z.string().optional(),
	source: SourceLocationSchema.optional(),
});

export const ActorSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum([
		"service",
		"consumer",
		"store",
		"hook",
		"middleware",
		"repository",
		"external",
	]),
	description: z.string().default(""),
	sources: z.array(SourceLocationSchema),
	methods: z.array(MethodSchema).default([]),
	tags: z.array(z.string()).default([]),
});

export const PropSchema = z.object({
	name: z.string(),
	type: z.string(),
	required: z.boolean(),
	description: z.string().optional(),
	default: z.string().optional(),
});

export const ViewSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum(["page", "component", "layout", "dialog", "story"]),
	description: z.string().default(""),
	sources: z.array(SourceLocationSchema),
	route: z.string().optional(),
	storybookPath: z.string().optional(),
	props: z.array(PropSchema).default([]),
	tags: z.array(z.string()).default([]),
});

export const JourneyStepSchema = z.object({
	order: z.number().int(),
	actor: z.string(),
	action: z.string(),
	view: z.string().optional(),
	endpoint: z
		.object({
			method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
			path: z.string(),
		})
		.optional(),
	description: z.string().default(""),
});

export const JourneySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().default(""),
	steps: z.array(JourneyStepSchema).default([]),
	actors: z.array(z.string()).default([]),
	views: z.array(z.string()).default([]),
	constraints: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
});

export const ConstraintSchema = z.object({
	id: z.string(),
	name: z.string(),
	kind: z.enum([
		"schema",
		"middleware",
		"validation",
		"auth-rule",
		"invariant",
		"rate-limit",
	]),
	description: z.string().default(""),
	enforcement: z.enum(["compile-time", "runtime", "both"]).default("runtime"),
	sources: z.array(SourceLocationSchema),
	tags: z.array(z.string()).default([]),
});

export type SourceLocation = z.infer<typeof SourceLocationSchema>;
export type Method = z.infer<typeof MethodSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Prop = z.infer<typeof PropSchema>;
export type View = z.infer<typeof ViewSchema>;
export type JourneyStep = z.infer<typeof JourneyStepSchema>;
export type Journey = z.infer<typeof JourneySchema>;
export type Constraint = z.infer<typeof ConstraintSchema>;
