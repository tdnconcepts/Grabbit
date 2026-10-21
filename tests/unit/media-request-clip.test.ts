import {describe, expect, it} from 'vite-plus/test'
import {buildMediaRequest} from '@main/services/phases/mediaRequest.js'

const baseJob = {kind: 'single-format' as const, extractor: 'youtube', extractorKey: 'Youtube', formatId: '137+140', preset: 'custom' as const, sponsorBlock: {mode: 'off' as const}, embed: {chapters: false, metadata: false, thumbnail: false, description: false, thumbnailSidecar: false}}

describe('buildMediaRequest clip range', () => {
	it('passes a validated clip range to the bridge', () => {
		const request = buildMediaRequest({url: 'https://example.com/watch?v=1', outputDir: '/tmp', embed: false, job: {...baseJob, clipRange: {startSeconds: 80, endSeconds: 225}}})
		expect(request.download).toEqual({sections: ['*80-225']})
	})

	it('omits section arguments for a full-video download', () => {
		const request = buildMediaRequest({url: 'https://example.com/watch?v=1', outputDir: '/tmp', embed: false, job: baseJob})
		expect(request.download).toBeUndefined()
	})
})
