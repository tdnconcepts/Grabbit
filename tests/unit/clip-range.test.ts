import {describe, expect, it} from 'vite-plus/test'
import {formatMediaTime, parseMediaTime, validateClipRange} from '@shared/clipRange.js'

describe('clip range', () => {
	it.each([
		['0', 0],
		['75', 75],
		['01:20', 80],
		['00:20.5', 20.5],
		['1:02:03.125', 3723.125],
		['1:02:03', 3723]
	])('parses %s', (input, expected) => {
		expect(parseMediaTime(input)).toBe(expected)
	})

	it.each(['', '-1', '1:60', '1:2:60', '1:20.1234', '1.5:20', 'abc', '1:2:3:4'])('rejects %s', input => {
		expect(parseMediaTime(input)).toBeNull()
	})

	it('formats compact media times', () => {
		expect(formatMediaTime(80)).toBe('01:20')
		expect(formatMediaTime(3723)).toBe('01:02:03')
		expect(formatMediaTime(20.5)).toBe('00:20.5')
		expect(formatMediaTime(3723.125)).toBe('01:02:03.125')
	})

	it('accepts a valid range within the video duration', () => {
		expect(validateClipRange({start: '01:20', end: '03:45', durationSeconds: 600})).toEqual({ok: true, range: {startSeconds: 80, endSeconds: 225}})
	})

	it('accepts the rounded video end and clamps the submitted boundary to the exact duration', () => {
		const duration = Number('95.16666700000004')
		expect(validateClipRange({start: '00:11.03', end: formatMediaTime(duration), durationSeconds: duration})).toEqual({ok: true, range: {startSeconds: 11.03, endSeconds: duration}})
		expect(validateClipRange({start: '00:11.03', end: '01:35.168', durationSeconds: duration})).toMatchObject({ok: false, reason: 'duration'})
	})

	it.each([
		[{start: '', end: '10'}, 'start'],
		[{start: '10', end: ''}, 'end'],
		[{start: '10', end: '10'}, 'order'],
		[{start: '11', end: '10'}, 'order'],
		[{start: '10', end: '101', durationSeconds: 100}, 'duration']
	] as const)('rejects invalid range %o', (input, reason) => {
		expect(validateClipRange(input)).toMatchObject({ok: false, reason})
	})
})
