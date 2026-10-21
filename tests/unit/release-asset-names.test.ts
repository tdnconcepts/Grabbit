import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import {describe, expect, it} from 'vite-plus/test'
import {WINDOWS_APP_USER_MODEL_ID} from '@shared/constants.js'

const root = process.cwd()

interface ElectronBuilderDmgConfig {
	background?: string
	icon?: null
	title?: string
	iconSize?: number
	iconTextSize?: number
	window?: {width: number; height: number}
	contents?: Array<{x: number; y: number; type: string; path?: string}>
}

interface ElectronBuilderConfig {
	appId?: string
	dmg?: ElectronBuilderDmgConfig
}

function read(path: string): string {
	return readFileSync(join(root, path), 'utf8')
}

describe('release asset names', () => {
	const workflowText = () =>
		readdirSync(join(root, '.github', 'workflows'))
			.filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
			.map(file => read(join('.github', 'workflows', file)))
			.join('\n')

	it('configures electron-builder to publish stable platform-prefixed artifacts', () => {
		const config = read('electron-builder.json5')

		expect(config).toContain('"artifactName": "${productName}-win-${arch}-Setup.${ext}"')
		expect(config).toContain('"artifactName": "${productName}-win-${arch}-Portable.${ext}"')
		expect(config).toContain('"artifactName": "${productName}-mac-${arch}.${ext}"')
		expect(config).toContain('"artifactName": "${productName}-linux-${arch}.${ext}"')
		expect(config).not.toContain('"artifactName": "${productName}-Setup-${version}.${ext}"')
		expect(config).not.toContain('"artifactName": "${productName}-${version}.${ext}"')
	})

	it('configures a branded drag-to-Applications DMG window', () => {
		const config = JSON.parse(read('electron-builder.json5')) as ElectronBuilderConfig

		expect(existsSync(join(root, 'build', 'dmg-background.png'))).toBe(true)
		expect(config.dmg).toMatchObject({background: 'build/dmg-background.png', icon: null, title: '${productName} Installer', iconSize: 108, iconTextSize: 13, window: {width: 600, height: 360}})
		expect(config.dmg?.contents).toEqual([
			{x: 170, y: 222, type: 'file'},
			{x: 430, y: 222, type: 'link', path: '/Applications'}
		])
	})

	it('keeps Electron runAsNode enabled for yt-dlp JS runtime smoke', () => {
		const config = read('electron-builder.json5')

		expect(config).toContain('"electronFuses"')
		expect(config).toContain('"runAsNode": true')
		expect(config).not.toContain('"runAsNode": false')
	})

	it('applies Linux Electron fuses before replacing the executable with the no-sandbox wrapper', () => {
		const afterPack = read('build/afterPack.mjs')

		expect(afterPack).toContain('context.packager.addElectronFuses(context, fuseConfig)')
		expect(afterPack).toContain('context.packager.config.electronFuses = null')
		expect(afterPack.indexOf('context.packager.addElectronFuses(context, fuseConfig)')).toBeLessThan(afterPack.indexOf('fs.renameSync(execPath, realBin)'))
		expect(afterPack).toContain('--no-sandbox')
	})

	it('ad-hoc signs the macOS bundle under the app id so OS notifications are attributed', () => {
		const afterPack = read('build/afterPack.mjs')

		// Prebuilt Electron arrives linker-signed under the identifier "Electron".
		// Without a re-sign, macOS attributes notifications to that identity —
		// permanently unauthorized — so UNUserNotificationCenter silently drops
		// every post and never shows the one-time permission prompt.
		expect(afterPack).toContain('codesign')
		expect(afterPack).toContain('--identifier')
		expect(afterPack).toContain('context.packager.appInfo.id')
		// @electron/fuses rewrites the Mach-O and resets the ad-hoc signature, so
		// the re-sign must come after the fuse flip, not before.
		expect(afterPack.indexOf('addElectronFuses')).toBeLessThan(afterPack.indexOf('codesign'))
	})

	it('sets the Windows AppUserModelID to the same appId the NSIS shortcut registers', () => {
		const config = JSON.parse(read('electron-builder.json5')) as ElectronBuilderConfig
		const main = read('src/main/index.ts')

		// electron-builder's NSIS installer stamps the Start Menu shortcut with
		// `WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"`. Windows matches a
		// toast against the AUMID the *process* declares, so if main never calls
		// setAppUserModelId the implicit exe-derived id will not match that
		// shortcut and every toast is dropped without an error.
		expect(WINDOWS_APP_USER_MODEL_ID).toBe(config.appId)
		expect(main).toContain('app.setAppUserModelId(WINDOWS_APP_USER_MODEL_ID)')
	})

	it('passes Defender an absolute scan path so custom scans can resolve the target', () => {
		const defender = read('scripts/test-binaries/scan-windows-defender.ps1')

		expect(defender).toContain('$scanPath = (Resolve-Path -LiteralPath $Path).Path')
		expect(defender).toContain('-File $scanPath')
	})

	it('fails the Defender gate when antivirus signatures are stale', () => {
		const defender = read('scripts/test-binaries/scan-windows-defender.ps1')

		expect(defender).toContain('$signatureUpdateExit = $LASTEXITCODE')
		expect(defender).toContain('[TimeSpan]::FromHours(48)')
		expect(defender).toContain('$status.AntivirusSignatureLastUpdated')
		expect(defender).toContain('throw "Windows Defender signatures are stale')
	})

	it('runs packaged runtime smoke before UI cold-start on every PR platform', () => {
		const coldStart = read('.github/workflows/e2e-cold-start.yml')

		expect(coldStart).toContain('Run packaged runtime smoke')
		expect(coldStart).toContain("ARROXY_RUNTIME_SMOKE: '1'")
		expect(coldStart).toContain('Grabbit Runtime Ω Cold')
		expect(coldStart).toContain('fake old node')
		expect(coldStart).toContain('fake deno')
		expect(coldStart).toContain('fake yt-dlp')
		expect(coldStart).toContain('runtime-smoke.out')
		expect(coldStart).toContain('runtime-smoke.err')
		expect(coldStart).toContain('status=$?')
		expect(coldStart).toContain('exit "$status"')
	})

	it('does not run a live YouTube probe smoke as a cold-start gate', () => {
		const coldStart = read('.github/workflows/e2e-cold-start.yml')

		expect(coldStart).not.toContain('Run packaged live probe smoke')
		expect(coldStart).not.toContain('ARROXY_SMOKE_URL')
		expect(coldStart).not.toContain('ARROXY_LIVE_CANARY_URL')
	})

	it('keeps GitHub artifact actions off Node 20-backed refs', () => {
		const workflows = workflowText()

		expect(workflows).not.toContain('actions/upload-artifact@v4')
		expect(workflows).not.toContain('actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02')
		expect(workflows).not.toContain('actions/download-artifact@v4')
		expect(workflows).not.toContain('actions/download-artifact@018cc2cf5baa6db3ef3c5f8a56943fffe632ef53')
	})

	it('does not publish runtime binary manifests from the app repository', () => {
		const workflow = read('.github/workflows/runtime-binaries.yml')

		expect(workflow).toContain('name: Runtime Binary Manifest Validation')
		expect(workflow).toContain('workflow_dispatch:')
		expect(workflow).toContain('runtimeBinaryManifest.ts generate')
		expect(workflow).toContain('--validate')
		expect(workflow).not.toContain('schedule:')
		expect(workflow).not.toContain('contents: write')
		expect(workflow).not.toContain('ARROXY_RUNTIME_INDEX_SIGNING_KEY')
		expect(workflow).not.toContain('gh release')
	})

	it('presents Grabbit without upstream release or marketing links in the README', () => {
		const template = read('README.md')

		expect(template).toContain('# Grabbit')
		expect(template).toContain('https://github.com/tdnconcepts/Grabbit.git')
		expect(template).toContain('build/Main-screenshot.png')
		expect(template).toContain('[LICENSE](LICENSE)')
		expect(template).not.toMatch(/arroxy|antonio-orionus|orionus\.dev|discord\.gg|shields\.io|DONATE\.md|demo\.gif/i)
		for (const file of readdirSync(root).filter(name => /^README(?:\.[\w-]+)?\.md$/.test(name))) {
			const content = read(file)
			expect(content, file).toContain('# Grabbit')
			expect(content, file).not.toMatch(/arroxy|antonio-orionus|orionus\.dev|discord\.gg|shields\.io|DONATE\.md|demo\.gif/i)
			expect(content, file).not.toMatch(/\{\{\w+\}\}/)
		}
	})

	it('does not document stale versioned Windows filename patterns in the README', () => {
		const readmes = readdirSync(root).filter(file => /^README(?:\.[a-z]+)?\.md$/.test(file))

		for (const file of readmes) {
			const content = read(file)

			expect(content).not.toContain('Grabbit-Setup-*.exe')
			expect(content).not.toContain('Grabbit-Portable-*.exe')
		}
	})
})

describe('packaged app contents', () => {
	it('ships the bundled build output and no node_modules', () => {
		// The main, preload and renderer bundles inline every npm dependency
		// (scripts/check-main-bundle.ts guards main), so copying node_modules into
		// app.asar only added ~80 MB of dead files.
		const config = JSON.parse(read('electron-builder.json5')) as {files?: string[]}

		expect(config.files).toEqual(['out/**/*', '!node_modules/**/*'])
	})
})
