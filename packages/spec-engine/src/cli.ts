#!/usr/bin/env node
import { Command } from "commander";
import { buildCommand } from "./commands/build.js";
import { checkCommand } from "./commands/check.js";
import { extractCommand } from "./commands/extract.js";
import { generateCommand } from "./commands/generate.js";
import { healCommand } from "./commands/heal.js";

const program = new Command();

program
	.name("spec-engine")
	.description("Living specification engine for the Rita codebase")
	.version("0.1.0");

program
	.command("extract")
	.description("Extract metadata from source code into lexicon.json")
	.option(
		"-o, --output <path>",
		"Output path for lexicon.json",
		"docs/discover/lexicon.json",
	)
	.action(extractCommand);

program
	.command("build")
	.description("Full pipeline: extract + generate all artifacts")
	.option("-o, --output <path>", "Output directory", "docs/discover")
	.action(buildCommand);

program
	.command("generate <artifact>")
	.description("Generate a specific artifact from lexicon.json")
	.addHelpText(
		"after",
		"\nArtifacts: glossary, matrix, dashboard, inventory, all",
	)
	.option("-o, --output <path>", "Output directory", "docs/discover")
	.action(generateCommand);

program
	.command("check [scope]")
	.description("Validate spec integrity (links, frontmatter, vocabulary)")
	.addHelpText("after", "\nScopes: all (default), links, templates, vocabulary")
	.action(checkCommand);

program
	.command("heal")
	.description("Auto-fix spec issues (TOC, frontmatter, links)")
	.option("--fix", "Apply fixes (default is dry-run)")
	.action(healCommand);

program.parse();
