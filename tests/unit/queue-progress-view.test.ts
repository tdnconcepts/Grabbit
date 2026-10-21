import {describe, expect, it} from 'vite-plus/test'
import {queueProgressView} from '@renderer/components/queue/queueProgressView.js'
import {makeItem} from '../shared/fixtures.js'

describe('queue progress presentation', () => {
	it('shows measured speed and ETA during transfer', () => {
		const view = queueProgressView(makeItem({id: 'x', status: 'running', progressPercent: 42, lastStatus: {key: 'downloadingMedia'}, progressDetail: '4.50 MiB/s • ETA 1:23'}))
		expect(view).toMatchObject({labelKey: 'queue.progress.downloading', indeterminate: false, transfer: {speed: '4.50 MiB/s', etaSeconds: 83}})
	})
	it.each(['mergingFormats', 'embeddingMetadata', 'movingFiles'] as const)('does not show a completed bar or stale transfer estimates during %s', key => {
		const view = queueProgressView(makeItem({id: 'x', status: 'running', progressPercent: 100, lastStatus: {key}, progressDetail: '4.50 MiB/s • ETA 0:00'}))
		expect(view.indeterminate).toBe(true)
		expect(view.transfer).toBeNull()
		expect(view.labelKey).toBe(key === 'mergingFormats' ? 'queue.progress.merging' : 'queue.progress.finishing')
	})
	it('does not invent speed or remaining time when the source cannot report them', () => {
		expect(queueProgressView(makeItem({id: 'x', status: 'running', progressDetail: 'Unknown speed • ETA --:--'})).transfer).toBeNull()
	})
})
