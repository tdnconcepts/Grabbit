export interface ClipRange {
	startSeconds: number
	endSeconds: number
}

export type ClipRangeValidation = {ok: true; range: ClipRange} | {ok: false; reason: 'start' | 'end' | 'order' | 'duration'}

export function parseMediaTime(value: string): number | null {
	const input = value.trim()
	if (!input || !/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(input)) return null
	const parts = input.split(':').map(Number)
	if (parts.some(part => !Number.isFinite(part) || part < 0 || part > Number.MAX_SAFE_INTEGER)) return null
	if (parts.length > 1 && parts.at(-1)! >= 60) return null
	if (parts.length === 3 && parts[1] >= 60) return null
	if (parts.length === 1) return parts[0]
	if (parts.length === 2) return parts[0] * 60 + parts[1]
	return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

export function formatMediaTime(seconds: number): string {
	const milliseconds = Math.max(0, Math.round(seconds * 1000))
	const whole = Math.floor(milliseconds / 1000)
	const fraction = milliseconds % 1000
	const hours = Math.floor(whole / 3600)
	const minutes = Math.floor((whole % 3600) / 60)
	const remainder = whole % 60
	const mm = String(minutes).padStart(2, '0')
	const ss = String(remainder).padStart(2, '0') + (fraction ? '.' + String(fraction).padStart(3, '0').replace(/0+$/, '') : '')
	return hours > 0 ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`
}

export function validateClipRange(input: {start: string; end: string; durationSeconds?: number}): ClipRangeValidation {
	let startSeconds = parseMediaTime(input.start)
	if (startSeconds === null) return {ok: false, reason: 'start'}
	let endSeconds = parseMediaTime(input.end)
	if (endSeconds === null) return {ok: false, reason: 'end'}
	if (endSeconds <= startSeconds) return {ok: false, reason: 'order'}
	if (input.durationSeconds !== undefined) {
		const duration = input.durationSeconds
		if (!Number.isFinite(duration) || duration < 0) return {ok: false, reason: 'duration'}
		// Fields display milliseconds, but media durations often contain fractions
		// of a frame. Accept our own rounded display without submitting a cut
		// beyond the real file end. A later millisecond is still rejected.
		const displayedEnd = Math.max(duration, Math.round(duration * 1000) / 1000)
		if (startSeconds > displayedEnd || endSeconds > displayedEnd) return {ok: false, reason: 'duration'}
		startSeconds = Math.min(startSeconds, duration)
		endSeconds = Math.min(endSeconds, duration)
		if (endSeconds <= startSeconds) return {ok: false, reason: 'order'}
	}
	return {ok: true, range: {startSeconds, endSeconds}}
}
