import {useEffect, useState} from 'react'

// Capture actual preview frames when the source permits canvas access. Sources
// without CORS support keep their poster; a filmstrip must never block playback.
export function useClipThumbnails(url: string | undefined, startSeconds = 0, endSeconds?: number): readonly string[] {
	const key = `${url ?? ''}:${startSeconds}:${endSeconds ?? ''}`
	const [result, setResult] = useState<{url: string; frames: string[]}>({url: '', frames: []})
	useEffect(() => {
		if (!url) return
		const video = document.createElement('video')
		const canvas = document.createElement('canvas')
		canvas.width = 144
		canvas.height = 80
		const context = canvas.getContext('2d')
		if (!context) return
		let cancelled = false
		const frames: string[] = []
		const stop = (): void => {
			if (cancelled) return
			cancelled = true
			window.clearTimeout(timeout)
			video.onerror = null
			video.onloadedmetadata = null
			video.onseeked = null
			video.removeAttribute('src')
			video.load()
		}
		const timeout = window.setTimeout(stop, 9_000)
		const next = (): void => {
			if (cancelled) return
			if (frames.length >= 8) return stop()
			const end = Math.min(video.duration, endSeconds ?? video.duration)
			const start = Math.max(0, Math.min(startSeconds, end))
			video.currentTime = Math.max(0, Math.min(video.duration - 0.001, start + ((end - start) * (frames.length + 0.5)) / 8))
		}
		video.crossOrigin = 'anonymous'
		video.muted = true
		video.preload = 'metadata'
		video.onloadedmetadata = () => {
			if (Number.isFinite(video.duration) && video.duration > 0) next()
			else stop()
		}
		video.onseeked = () => {
			if (cancelled || !video.videoWidth || !video.videoHeight) return
			try {
				const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight)
				context.drawImage(video, (canvas.width - video.videoWidth * scale) / 2, (canvas.height - video.videoHeight * scale) / 2, video.videoWidth * scale, video.videoHeight * scale)
				frames.push(canvas.toDataURL('image/jpeg', 0.65))
				setResult({url: key, frames: [...frames]})
				next()
			} catch {
				stop()
			}
		}
		video.onerror = stop
		const load = window.setTimeout(() => {
			video.src = url
		}, 180)
		return () => {
			window.clearTimeout(load)
			stop()
		}
	}, [url, key, startSeconds, endSeconds])
	return result.url === key ? result.frames : []
}
