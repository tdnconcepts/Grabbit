import {expect, test} from '@playwright/test'

test('initial loading screen shows its logo and indicator without visible text', async ({page}) => {
	await page.goto('/?bootSplash=1&theme=dark')
	const splash = page.locator('#boot-splash')
	await expect(splash).toBeVisible()
	await expect(splash.locator('img')).toBeVisible()
	await expect(splash.locator('.boot-splash__bar')).toBeVisible()
	await expect(splash).toHaveText('')
	await expect(splash).toHaveAccessibleName('Starting Grabbit')
	await page.screenshot({path: 'dist/Grabbit-loading-no-text.png'})
})
