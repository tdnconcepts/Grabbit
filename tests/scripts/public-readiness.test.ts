import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vite-plus/test'
import {WEBSITE_URL, defaultAppSettings} from '@shared/constants.js'
import {resolveUpdateFeed} from '@main/updateFeed.js'

describe('Grabbit public-source safeguards', () => {
	it('uses Grabbit project and updater destinations', () => {
		expect(WEBSITE_URL).toBe('https://github.com/tdnconcepts/Grabbit')
		expect(resolveUpdateFeed({}, 'latest').feed).toEqual({provider: 'github', owner: 'tdnconcepts', repo: 'Grabbit', channel: 'latest'})
		expect(readFileSync('electron-builder.json5', 'utf8')).toContain('"owner": "tdnconcepts"')
	})

	it('does not embed telemetry credentials or expose the removed upload integration', () => {
		expect(defaultAppSettings('/tmp').common.analyticsEnabled).toBe(false)
		expect(readFileSync('electron.vite.config.ts', 'utf8')).not.toContain('loadEnv')
		expect(readFileSync('src/shared/api.ts', 'utf8')).not.toContain('uploadFeedbackDiagnostic')
		for (const file of ['src/renderer/src/lib/tallyWidget.ts', 'src/main/services/FeedbackDiagnostics.ts', 'workers/feedback-upload/src/index.ts']) expect(existsSync(file), file).toBe(false)
		expect(readFileSync('src/renderer/index.html', 'utf8')).not.toContain('tally.so')
		expect(readFileSync('.gitignore', 'utf8')).toContain('.env.*')
	})

	it('builds artifacts manually without publishing to upstream registries or websites', () => {
		const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
		expect(workflow).toContain('workflow_dispatch:')
		expect(workflow).toContain('bun run dist:win')
		expect(workflow).toContain('scan-windows-defender.ps1')
		expect(workflow).not.toMatch(/contents: write|id-token: write|antonio-orionus|gh release|npm publish/)
		for (const file of ['release_to_winget.yml', 'publish-yt-dlp-bridge.yml', 'publish-ytdlp-errors.yml', 'flatpak.yml']) expect(existsSync(`.github/workflows/${file}`), file).toBe(false)
	})
})
