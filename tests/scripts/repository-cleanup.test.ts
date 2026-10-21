import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vite-plus/test'

describe('Grabbit repository presentation', () => {
	it('keeps one directly maintained root README without translation-generation tooling', () => {
		expect(readdirSync('.').filter(file => /^README(?:\.[\w-]+)?\.md$/.test(file))).toEqual(['README.md'])
		expect(existsSync('readme-src/build.mjs')).toBe(false)
		expect(existsSync('scripts/check-locale-parity.ts')).toBe(false)
		const scripts = readFileSync('package.json', 'utf8')
		const hooks = readFileSync('vite.config.ts', 'utf8')
		expect(scripts).not.toMatch(/build:readme|check:readme|check:locales/)
		expect(hooks).not.toContain('readme-src')
		expect(scripts).toContain('bun scripts/check-app-i18n.ts --strict && bun run i18n:check')
		expect(readFileSync('README.md', 'utf8')).not.toMatch(/README\.[\w-]+\.md|Read in:|\{\{\w+\}\}/)
	})

	it('does not ship upstream donation or personal maintainer material', () => {
		for (const file of [
			'DONATE.md',
			'.github/FUNDING.yml',
			'scripts/check-donation-addresses.mjs',
			'build/donate-btc.png',
			'build/donate-tron.png',
			'build/demo.gif',
			'.coderabbit.yaml',
			'.agents/memory/donation-rails-are-crypto-only.md',
			'.agents/memory/windows-vm-testing.md',
			'.agents/memory/linux-vm-testing.md',
			'.agents/memory/coderabbit-review-workflow.md',
			'.agents/memory/backdrop-webgl-scenes.md',
			'.agents/memory/glow-intensity-policy.md',
			'.agents/memory/readme-edits-skip-pr.md',
			'.agents/skills/ship-fix/SKILL.md'
		]) {
			expect(existsSync(file), file).toBe(false)
		}
	})

	it('removes the obsolete donation gate without removing quality checks', () => {
		const scripts = readFileSync('package.json', 'utf8')
		const gates = readFileSync('vite.config.ts', 'utf8')
		expect(scripts).not.toContain('check:donation-addresses')
		expect(gates).not.toContain('check:donation-addresses')
		expect(gates).toContain('check:static')
		expect(gates).toContain('check:i18n')
	})

	it('uses Grabbit ownership and contribution links while preserving notices', () => {
		const owners = readFileSync('.github/CODEOWNERS', 'utf8')
		const contributing = readFileSync('CONTRIBUTING.md', 'utf8')
		const contacts = readFileSync('.github/ISSUE_TEMPLATE/config.yml', 'utf8')
		expect(owners).toContain('@tdnconcepts')
		for (const content of [owners, contributing, contacts]) expect(content).not.toMatch(/antonio-orionus|orionus\.dev|discord\.gg/)
		expect(contributing).toContain('https://github.com/tdnconcepts/Grabbit')
		expect(readFileSync('LICENSE', 'utf8')).toContain('Copyright (c) 2026 Antonio Orionus')
		expect(existsSync('THIRD_PARTY_NOTICES.txt')).toBe(true)
	})
})
