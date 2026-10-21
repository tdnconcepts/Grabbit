import type {YtDlpFormat} from '@shared/ytdlp/infoDict.js'

// Only one signed stream reaches the renderer. Prefer a low-cost progressive
// stream; keep its own frame rate rather than assuming the download's FPS.
export function selectPreviewSource(formats: readonly YtDlpFormat[]): {previewUrl: string; previewFps?: number} | undefined {
	const candidates = formats.filter(format => format.url?.startsWith('https://') && format.vcodec !== undefined && format.vcodec !== 'none' && (format.ext === 'mp4' || format.ext === 'webm') && !format.protocol?.toLowerCase().includes('m3u8'))
	const score = (format: YtDlpFormat): number => (format.acodec !== undefined && format.acodec !== 'none' ? 10_000 : 0) + (format.ext === 'mp4' ? 1_000 : 0) - Math.abs((format.height ?? 480) - 480)
	const selected = candidates.toSorted((left, right) => score(right) - score(left))[0]
	if (!selected?.url) return undefined
	return {previewUrl: selected.url, ...(typeof selected.fps === 'number' && Number.isFinite(selected.fps) && selected.fps > 0 && selected.fps <= 240 ? {previewFps: selected.fps} : {})}
}
