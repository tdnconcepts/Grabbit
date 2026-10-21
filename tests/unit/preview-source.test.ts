import {describe, expect, it} from 'vite-plus/test'
import {selectPreviewSource} from '@main/services/previewSource.js'

describe('preview frame rate', () => {
	it('reports the selected preview stream FPS, not a different download format', () => {
		expect(
			selectPreviewSource([
				{url: 'https://cdn.example/4k.mp4', ext: 'mp4', vcodec: 'h264', acodec: 'aac', height: 2160, fps: 60},
				{url: 'https://cdn.example/480.mp4', ext: 'mp4', vcodec: 'h264', acodec: 'aac', height: 480, fps: 25}
			])
		).toEqual({previewUrl: 'https://cdn.example/480.mp4', previewFps: 25})
	})
	it('does not invent a frame rate or weaken HTTPS restrictions', () => {
		expect(selectPreviewSource([{url: 'https://cdn.example/v.mp4', ext: 'mp4', vcodec: 'h264', fps: 0}])).toEqual({previewUrl: 'https://cdn.example/v.mp4'})
		expect(selectPreviewSource([{url: 'http://cdn.example/v.mp4', ext: 'mp4', vcodec: 'h264', fps: 30}])).toBeUndefined()
	})
})
