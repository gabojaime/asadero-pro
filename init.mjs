#!/usr/bin/env node
/**
 * asadero-pro agent harness initializer.
 * Validates harness files and feature_list.json. Optionally runs pnpm lint.
 * This project is independent of Reental.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const PROJECT_ID = 'asadero-pro'

const REQUIRED_FILES = [
	'AGENTS.md',
	'CHECKPOINTS.md',
	'feature_list.json',
	'docs/architecture.md',
	'docs/conventions.md',
	'docs/database-schema.md',
	'docs/supabase.md',
	'docs/metrics.md',
	'docs/testing.md',
	'docs/specs.md',
	'docs/verification.md',
	'docs/decisions/001-harness-independent-of-reental.md',
	'docs/decisions/002-presentation-follows-design-md.md',
	'DESIGN.md',
	'progress/README.md',
	'specs/README.md',
	'.cursor/rules/00-asadero-harness.mdc',
	'.cursor/rules/skills-routing.mdc',
	'.cursor/rules/hexagonal-architecture.mdc',
	'.cursor/rules/ui-design.mdc'
]

const VALID_STATUSES = new Set([
	'pending',
	'spec_ready',
	'in_progress',
	'review_pending',
	'done',
	'blocked'
])

const VALID_VERIFICATION = new Set(['manual', 'automated'])

let errors = 0
let warnings = 0

function fail(msg) {
	console.error(`✗ ${msg}`)
	errors += 1
}

function warn(msg) {
	console.warn(`⚠ ${msg}`)
	warnings += 1
}

function ok(msg) {
	console.log(`✓ ${msg}`)
}

function checkRequiredFiles() {
	console.log('\n--- Required harness files ---')
	for (const rel of REQUIRED_FILES) {
		const full = join(ROOT, rel)
		if (existsSync(full)) {
			ok(rel)
		} else {
			fail(`Missing: ${rel}`)
		}
	}

	const specsDir = join(ROOT, 'specs')
	if (!existsSync(specsDir)) {
		fail('Missing directory: specs/')
	} else {
		ok('specs/ directory')
	}

	const progressDir = join(ROOT, 'progress')
	if (!existsSync(progressDir)) {
		fail('Missing directory: progress/')
	} else {
		ok('progress/ directory')
	}
}

function validateFeatureList() {
	console.log('\n--- feature_list.json ---')
	const path = join(ROOT, 'feature_list.json')
	if (!existsSync(path)) {
		fail('feature_list.json not found')
		return
	}

	let data
	try {
		const raw = readFileSync(path, 'utf8')
		data = JSON.parse(raw)
	} catch (e) {
		fail(`Invalid JSON: ${e.message}`)
		return
	}

	if (typeof data.version !== 'number') {
		fail('feature_list.json: "version" must be a number')
	}

	if (data.project !== PROJECT_ID) {
		fail(`feature_list.json: "project" must be "${PROJECT_ID}" (got ${JSON.stringify(data.project)})`)
	} else {
		ok(`project: ${PROJECT_ID}`)
	}

	if (!Array.isArray(data.features)) {
		fail('feature_list.json: "features" must be an array')
		return
	}

	if (data.features.length === 0) {
		warn('feature_list.json: no features defined yet')
		ok('Validated 0 feature(s)')
		return
	}

	const ids = new Set()

	for (const [i, feature] of data.features.entries()) {
		const prefix = `features[${i}]`

		for (const field of ['id', 'title', 'status', 'progress_path']) {
			if (typeof feature[field] !== 'string' || !feature[field].trim()) {
				fail(`${prefix}: missing or invalid "${field}"`)
			}
		}

		if (feature.spec_path != null && (typeof feature.spec_path !== 'string' || !feature.spec_path.trim())) {
			fail(`${prefix}: invalid "spec_path"`)
		}

		if (feature.id) {
			if (ids.has(feature.id)) {
				fail(`${prefix}: duplicate id "${feature.id}"`)
			}
			ids.add(feature.id)
		}

		if (feature.status && !VALID_STATUSES.has(feature.status)) {
			fail(`${prefix}: invalid status "${feature.status}"`)
		}

		const verification = feature.verification ?? 'manual'
		if (!VALID_VERIFICATION.has(verification)) {
			fail(`${prefix}: invalid verification "${verification}" (use "manual" or "automated")`)
		}

		if (feature.progress_path) {
			const progressFile = join(ROOT, feature.progress_path)
			if (!existsSync(progressFile)) {
				warn(`${prefix}: progress file not found: ${feature.progress_path}`)
			}
		}

		if (feature.spec_path) {
			const specDir = join(ROOT, feature.spec_path)
			if (!existsSync(specDir)) {
				ok(`${prefix}: spec path reserved (not yet created): ${feature.spec_path}`)
			}
		}
	}

	ok(`Validated ${data.features.length} feature(s)`)
}

function runLint() {
	console.log('\n--- pnpm lint (optional) ---')
	const packageJsonPath = join(ROOT, 'package.json')
	if (!existsSync(packageJsonPath)) {
		warn('No package.json yet — skipping lint (app not scaffolded)')
		return
	}

	const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
	const which = spawnSync(pnpmCmd, ['--version'], {
		cwd: ROOT,
		encoding: 'utf8',
		shell: process.platform === 'win32'
	})

	if (which.status !== 0) {
		warn('pnpm not available — skipping lint')
		return
	}

	const nodeModules = join(ROOT, 'node_modules')
	if (!existsSync(nodeModules)) {
		warn('node_modules not found — run pnpm install first, skipping lint')
		return
	}

	console.log('Running pnpm lint…')
	const lint = spawnSync(pnpmCmd, ['lint'], {
		cwd: ROOT,
		encoding: 'utf8',
		stdio: 'inherit',
		shell: process.platform === 'win32'
	})

	if (lint.status === 0) {
		ok('pnpm lint passed')
	} else {
		warn(`pnpm lint exited with code ${lint.status ?? 'unknown'}`)
	}
}

function checkUserAgents() {
	console.log('\n--- User-level agents (~/.cursor/agents/) ---')
	const home = process.env.USERPROFILE || process.env.HOME
	if (!home) {
		warn('Could not resolve home directory — skipping agent check')
		return
	}

	const required = ['leader.md', 'spec_author.md', 'implementer.md', 'reviewer.md']
	const optional = ['web-performance-auditor.md']
	const agentsDir = join(home, '.cursor', 'agents')

	for (const file of required) {
		const full = join(agentsDir, file)
		if (existsSync(full)) {
			ok(`~/.cursor/agents/${file}`)
		} else {
			warn(`Missing user agent: ~/.cursor/agents/${file}`)
		}
	}

	for (const file of optional) {
		const full = join(agentsDir, file)
		if (existsSync(full)) {
			ok(`~/.cursor/agents/${file} (optional)`)
		} else {
			warn(`Optional agent missing: ~/.cursor/agents/${file}`)
		}
	}

	const notion = join(agentsDir, 'notion-task-manager.md')
	if (existsSync(notion)) {
		warn('notion-task-manager is installed globally but must NOT be invoked in asadero-pro (Reental Kanban only)')
	}
}

function main() {
	console.log('asadero-pro agent harness — init')
	console.log('This repository is not Reental.')
	console.log(`Root: ${ROOT}`)

	checkRequiredFiles()
	validateFeatureList()
	checkUserAgents()
	runLint()

	console.log('\n--- Summary ---')
	if (errors > 0) {
		console.error(`Failed with ${errors} error(s), ${warnings} warning(s).`)
		process.exit(1)
	}

	console.log(`OK — ${warnings} warning(s).`)
	process.exit(0)
}

main()
