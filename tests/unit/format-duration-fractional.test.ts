import {describe, expect, it} from 'vite-plus/test'
import {formatDuration} from '@renderer/lib/formatDuration.js'

describe('fractional media duration labels', () => {
	it('does not leak floating-point seconds into video cards', () => {
		expect(formatDuration(Number('95.16666700000004'))).toBe('1:35')
		expect(formatDuration(3605.5)).toBe('1:00:05')
	})
})
