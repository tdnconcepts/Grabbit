import type {QueueItem} from '@shared/types.js'
import {parseEtaSeconds, parseSpeedBps} from '@shared/progressFormat.js'

const FINISHING = new Set(['extractingAudio', 'convertingVideo', 'embeddingMetadata', 'movingFiles', 'fetchingSubtitles'])

export function queueProgressView(item: QueueItem): {labelKey: 'queue.progress.downloading' | 'queue.progress.merging' | 'queue.progress.finishing' | null; indeterminate: boolean; transfer: {speed: string; etaSeconds: number} | null} {
	if (item.status !== 'running') return {labelKey: null, indeterminate: false, transfer: null}
	const key = item.lastStatus?.key
	if (key === 'mergingFormats') return {labelKey: 'queue.progress.merging', indeterminate: true, transfer: null}
	if (key && FINISHING.has(key)) return {labelKey: 'queue.progress.finishing', indeterminate: true, transfer: null}
	const match = /^(.+?)\s*[•·]\s*ETA\s+(\d+(?::\d{2}){1,2})$/.exec(item.progressDetail ?? '')
	const speed = match?.[1].trim()
	const etaSeconds = match ? parseEtaSeconds(match[2]) : null
	const speedBps = speed ? parseSpeedBps(speed) : null
	const transfer = speed && speedBps !== null && Number.isFinite(speedBps) && speedBps >= 0 && etaSeconds !== null && Number.isFinite(etaSeconds) && etaSeconds >= 0 ? {speed, etaSeconds} : null
	return {labelKey: 'queue.progress.downloading', indeterminate: false, transfer}
}
