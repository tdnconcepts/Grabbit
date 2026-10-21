import fs from 'node:fs'
import path from 'node:path'
import {expect, test} from '@playwright/test'
import {FIXTURE_VIDEO_IDS, runProcess} from './fixtureHarness.js'
import {withFixtureProductApp} from './fixtureProductE2E.js'

test('Electron downloads only the selected start and end range', async () => {
	test.setTimeout(150_000)
	await withFixtureProductApp({userDataPrefix: 'grabbit-clip-user-', outputPrefix: 'grabbit-clip-out-'}, async ({page, urls, queue, files, fixtureServer}) => {
		await page.getByTestId('profiles-main-input').fill(urls.video(FIXTURE_VIDEO_IDS[0]))
		await expect(page.getByTestId('download-options-panel')).toBeVisible({timeout: 45_000})
		await page.getByTestId('clip-range-custom').click()
		await page.getByTestId('clip-start').fill('00:01.5')
		await page.getByTestId('clip-end').fill('00:04.5')
		await expect(page.getByTestId('clip-summary')).toContainText('00:03')
		await expect(page.getByTestId('btn-download')).toBeEnabled()
		await page.getByTestId('btn-download').click()
		await queue.expectStatus('Fixture Video 1', 'done', 100_000)
		const outputs = files.mediaFiles('.mp4')
		expect(outputs).toHaveLength(1)
		expect(fs.statSync(outputs[0]).size).toBeGreaterThan(10_000)
		const platform = `${process.platform}-${process.arch === 'arm64' ? 'arm64' : 'x64'}`
		const ffprobe = path.join(process.cwd(), 'build', 'embedded', platform, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')
		const result = await runProcess(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', outputs[0]])
		expect(result.exitCode).toBe(0)
		const duration = Number(result.stdout.trim())
		expect(Number.isFinite(duration)).toBe(true)
		expect(duration).toBeGreaterThan(2.7)
		expect(duration).toBeLessThan(3.3)
		expect(fixtureServer.telemetry().requests.some(request => request.kind === 'media' && request.status === 200)).toBe(true)
	})
})
