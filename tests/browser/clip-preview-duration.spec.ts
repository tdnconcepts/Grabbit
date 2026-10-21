import {expect, test, type Locator, type Page} from '@playwright/test'
import {startFixtureServer} from '../e2e/fixtureHarness.js'

async function dragHandle(page: Page, slider: Locator, from: number, to: number): Promise<void> {
	const box = await slider.boundingBox()
	if (!box) throw new Error('Clip handle is not visible')
	const x = (fraction: number): number => box.x + 8.5 + (box.width - 17) * fraction
	await page.mouse.move(x(from), box.y + box.height / 2)
	await page.mouse.down()
	await page.mouse.move(x(to), box.y + box.height / 2, {steps: 16})
	await page.mouse.up()
}

test('a rounded fractional video end remains valid and its end handle can be dragged', async ({page}) => {
	await page.setViewportSize({width: 1800, height: 1100})
	await page.goto('/?scenario=probe-fractional-duration&mockStep=formats&locale=fr&theme=dark')
	await page.getByTestId('clip-range-custom').click()
	const endHandle = page.getByTestId('clip-end-slider')
	await expect(page.getByTestId('clip-end')).toHaveValue('01:35.167')
	await expect(endHandle).toBeVisible()
	await expect(page.getByTestId('clip-error')).toHaveCount(0)
	await expect(page.getByTestId('btn-download')).toBeEnabled()
	await expect(page.getByTestId('detected-video-panel')).not.toContainText('166667')
	await dragHandle(page, endHandle, 1, 0.6)
	await expect.poll(async () => Number(await endHandle.inputValue())).toBeLessThan(70)
	await page.getByTestId('clip-end').fill('01:35.167')
	await expect(endHandle).toBeVisible()
	await expect(page.getByTestId('clip-error')).toHaveCount(0)
	await expect(page.getByTestId('btn-download')).toBeEnabled()
	await page.screenshot({path: 'dist/Grabbit-end-handle-fixed.png'})
})

test('preview recovers missing duration and both cut handles can be dragged', async ({page}) => {
	const server = await startFixtureServer()
	try {
		await page.route('https://preview.grabbit.test/clip.mp4', async route => {
			const response = await route.fetch({url: `${server.baseUrl}/media/ARX00000001/22.mp4`})
			await route.fulfill({response, headers: {...response.headers(), 'access-control-allow-origin': '*'}})
		})
		await page.setViewportSize({width: 1600, height: 1000})
		await page.goto('/?scenario=probe-missing-duration&mockStep=formats&locale=en')
		await page.getByTestId('clip-range-custom').click()
		await expect(page.getByTestId('clip-end')).toHaveValue('00:08')
		await expect(page.getByTestId('clip-preview-time')).toContainText('/ 00:08')
		await expect(page.getByTestId('clip-start-slider')).toBeEnabled()
		await expect(page.getByTestId('btn-download')).toBeEnabled()
		await dragHandle(page, page.getByTestId('clip-start-slider'), 0, 0.25)
		await expect(page.getByTestId('clip-start')).toHaveValue('00:02')
		await dragHandle(page, page.getByTestId('clip-end-slider'), 1, 0.75)
		await expect(page.getByTestId('clip-end')).toHaveValue('00:06')
		await expect(page.getByTestId('clip-summary')).toContainText('Clip length 00:04')
		await expect(page.getByTestId('clip-error')).toHaveCount(0)
		await page.getByTestId('clip-end').fill('00:05.5')
		await expect(page.getByTestId('clip-summary')).toContainText('Clip length 00:03.5')
		await page.getByRole('button', {name: 'Clip preview', exact: true}).click()
		const video = page.locator('video[controls]')
		await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && element.currentTime >= 5.5 && element.paused)).toBe(true)
		await expect(page.getByTestId('clip-preview-time')).toContainText('00:05.5 / 00:08')
		await page.getByTestId('clip-frame-back').click()
		await expect.poll(() => video.evaluate(element => (element instanceof HTMLVideoElement ? element.currentTime : -1))).toBeCloseTo(5.5 - 1 / 30, 3)
		await page.getByTestId('clip-frame-forward').click()
		await expect.poll(() => video.evaluate(element => (element instanceof HTMLVideoElement ? element.currentTime : -1))).toBeCloseTo(5.5, 3)
		await page.getByRole('button', {name: 'Zoom in', exact: true}).click()
		await expect(page.getByTestId('clip-zoom-level')).toHaveText('2×')
		await page.getByTestId('clip-pan').fill('2')
		await expect(page.getByRole('slider', {name: 'Clip preview'})).toHaveAttribute('min', '2')
		await expect(page.getByTestId('clip-start')).toHaveValue('00:02')
		await page.getByTestId('clip-end').fill('00:03')
		await video.evaluate(element => {
			if (!(element instanceof HTMLVideoElement)) throw new Error('Expected preview video')
			let previous = element.currentTime
			let loops = 0
			element.addEventListener('timeupdate', () => {
				if (previous - element.currentTime > 0.5) element.dataset.loops = String(++loops)
				previous = element.currentTime
			})
		})
		await page.getByTestId('clip-loop').click()
		await page.getByRole('button', {name: 'Clip preview', exact: true}).click()
		await expect.poll(() => video.getAttribute('data-loops'), {timeout: 10_000}).toMatch(/^[2-9]\d*$/)
		await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && !element.paused && element.currentTime >= 2 && element.currentTime < 3.15)).toBe(true)
		await page.getByTestId('clip-loop').click()
		await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && element.paused && Math.abs(element.currentTime - 3) < 0.02)).toBe(true)
		await page.screenshot({path: 'dist/Grabbit-clip-range-fixed.png'})
	} finally {
		await server.close()
	}
})
