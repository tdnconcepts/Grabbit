import {useEffect, useRef, useState, type ReactNode} from 'react'
import {Pause, Play, Repeat2, RotateCcw, Scissors, SkipBack, SkipForward, StepBack, StepForward, ZoomIn, ZoomOut} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {formatMediaTime, parseMediaTime, validateClipRange} from '@shared/clipRange.js'
import {useAppStore} from '../../store/useAppStore.js'
import {Button} from '../ui/button.js'
import {Field, FieldError, FieldLabel} from '../ui/field.js'
import {Input} from '../ui/input.js'
import {SectionLabel} from '../shared/SectionLabel.js'
import {useClipThumbnails} from './useClipThumbnails.js'

const CLIP_ERROR_KEYS = {start: 'wizard.url.workspace.trim.error.start', end: 'wizard.url.workspace.trim.error.end', order: 'wizard.url.workspace.trim.error.order', duration: 'wizard.url.workspace.trim.error.duration'} as const
const FRAME_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]

interface ClipRangeSectionProps {
	previewUrl?: string
	thumbnail: string
	title: string
}

export function ClipRangeSection({previewUrl, thumbnail, title}: ClipRangeSectionProps): ReactNode {
	const {t} = useTranslation()
	const videoRef = useRef<HTMLVideoElement>(null)
	const [currentSeconds, setCurrentSeconds] = useState(0)
	const [previewFailed, setPreviewFailed] = useState(false)
	const [playing, setPlaying] = useState(false)
	const [zoom, setZoom] = useState(1)
	const [windowStart, setWindowStart] = useState(0)
	const [loopClip, setLoopClip] = useState(false)
	const mode = useAppStore(state => state.wizardClipMode)
	const start = useAppStore(state => state.wizardClipStart)
	const end = useAppStore(state => state.wizardClipEnd)
	const duration = useAppStore(state => state.wizardDuration)
	const previewFps = useAppStore(state => state.wizardPreviewFps)
	const setMode = useAppStore(state => state.setWizardClipMode)
	const setStart = useAppStore(state => state.setWizardClipStart)
	const setEnd = useAppStore(state => state.setWizardClipEnd)
	const reset = useAppStore(state => state.resetWizardClipRange)
	const setPreviewDuration = useAppStore(state => state.setWizardPreviewDuration)
	const validation = mode === 'range' ? validateClipRange({start, end, durationSeconds: duration}) : null
	const errorKey = validation && !validation.ok ? CLIP_ERROR_KEYS[validation.reason] : null
	const durationSeconds = duration !== undefined && Number.isFinite(duration) && duration > 0 ? duration : 0
	const startSeconds = Math.min(durationSeconds || Number.POSITIVE_INFINITY, parseMediaTime(start) ?? 0)
	const endSeconds = Math.min(durationSeconds || Number.POSITIVE_INFINITY, parseMediaTime(end) ?? durationSeconds)
	const span = durationSeconds / zoom
	const viewStart = Math.max(0, Math.min(windowStart, durationSeconds - span))
	const viewEnd = viewStart + span
	const isInView = (seconds: number): boolean => seconds >= viewStart - 0.0005 && seconds <= viewEnd + 0.0005
	const frames = useClipThumbnails(previewFailed ? undefined : previewUrl, viewStart, durationSeconds > 0 ? viewEnd : undefined)
	const fps = previewFps !== undefined && Number.isFinite(previewFps) && previewFps > 0 && previewFps <= 240 ? previewFps : null
	const frameStep = fps ? 1 / fps : 0.1
	const rangeStart = validation?.ok ? validation.range.startSeconds : null
	const rangeEnd = validation?.ok ? validation.range.endSeconds : null
	const percent = (seconds: number): number => (span > 0 ? Math.min(100, Math.max(0, ((seconds - viewStart) / span) * 100)) : 0)
	const startPercent = mode === 'range' ? percent(startSeconds) : 0
	const endPercent = mode === 'range' ? Math.max(startPercent, percent(endSeconds)) : 100
	const canPlayPreview = Boolean(previewUrl) && !previewFailed

	// timeupdate alone runs only a few times a second. Watch the boundary on
	// animation frames so short loops do not overshoot by a quarter second.
	useEffect(() => {
		if (!playing || rangeStart === null || rangeEnd === null) return
		let request = 0
		const tick = (): void => {
			const video = videoRef.current
			if (!video) return
			if (video.currentTime >= rangeEnd && !video.paused) {
				if (!loopClip) video.pause()
				video.currentTime = loopClip ? rangeStart : rangeEnd
				setCurrentSeconds(video.currentTime)
			}
			request = window.requestAnimationFrame(tick)
		}
		request = window.requestAnimationFrame(tick)
		return () => window.cancelAnimationFrame(request)
	}, [playing, loopClip, rangeStart, rangeEnd])

	const seekTo = (seconds: number): void => {
		const next = durationSeconds > 0 ? Math.min(durationSeconds, Math.max(0, seconds)) : Math.max(0, seconds)
		setCurrentSeconds(next)
		if (zoom > 1 && (next < viewStart || next > viewEnd)) setWindowStart(Math.max(0, Math.min(next - span / 2, durationSeconds - span)))
		if (videoRef.current) videoRef.current.currentTime = next
	}
	const changeZoom = (next: number): void => {
		const nextSpan = durationSeconds / next
		const anchor = currentSeconds >= viewStart && currentSeconds <= viewEnd ? currentSeconds : viewStart + span / 2
		setZoom(next)
		setWindowStart(Math.max(0, Math.min(anchor - nextSpan / 2, durationSeconds - nextSpan)))
	}
	const stepFrame = (direction: number): void => {
		const video = videoRef.current
		if (!video) return
		video.pause()
		setPlaying(false)
		const time = video.currentTime
		seekTo(fps ? (direction > 0 ? Math.floor(time * fps + 0.0001) + 1 : Math.ceil(time * fps - 0.0001) - 1) / fps : time + direction * frameStep)
	}
	const enableRange = (): void => {
		setMode('range')
		if (!end && durationSeconds > 0) setEnd(formatMediaTime(durationSeconds))
	}
	const captureStart = (): void => {
		enableRange()
		setStart(formatMediaTime(currentSeconds))
		if (durationSeconds > 0 && endSeconds <= currentSeconds) setEnd(formatMediaTime(durationSeconds))
	}
	const captureEnd = (): void => {
		enableRange()
		if (startSeconds >= currentSeconds) setStart('00:00')
		setEnd(formatMediaTime(currentSeconds))
	}
	const togglePlayback = (): void => {
		const video = videoRef.current
		if (!video) return
		if (!video.paused) return video.pause()
		if (validation?.ok && (video.currentTime < validation.range.startSeconds || video.currentTime >= validation.range.endSeconds)) seekTo(validation.range.startSeconds)
		void video.play().catch(() => setPlaying(false))
	}
	const readPreviewDuration = (video: HTMLVideoElement): void => {
		if (previewUrl) setPreviewDuration(previewUrl, video.duration)
	}

	return (
		<section className="clip-editor grabbit-clip-editor" data-testid="clip-range-section">
			<div className="clip-editor-heading">
				<div className="flex min-w-0 items-center gap-3">
					<div className="clip-editor-icon" aria-hidden>
						<Scissors />
					</div>
					<div>
						<SectionLabel>{t('wizard.url.workspace.trim.heading')}</SectionLabel>
						<p className="mt-1 text-xs text-muted-foreground">{t('wizard.url.workspace.trim.previewDescription')}</p>
					</div>
				</div>
				<div className="grabbit-clip-mode" role="group" aria-label={t('wizard.url.workspace.trim.heading')}>
					<Button type="button" size="sm" variant={mode === 'full' ? 'secondary' : 'ghost'} aria-pressed={mode === 'full'} onClick={() => setMode('full')}>
						{t('wizard.url.workspace.trim.full')}
					</Button>
					<Button type="button" size="sm" variant={mode === 'range' ? 'secondary' : 'ghost'} aria-pressed={mode === 'range'} onClick={enableRange} data-testid="clip-range-custom">
						{t('wizard.url.workspace.trim.custom')}
					</Button>
				</div>
			</div>
			<div className="clip-editor-grid">
				<div className="clip-editor-controls">
					<div className="clip-timeline-wrap">
						<div className="clip-timeline">
							<div className="grabbit-filmstrip" aria-hidden>
								{FRAME_SLOTS.map(slot => (
									<span key={slot}>{frames[slot] || thumbnail ? <img src={frames[slot] || thumbnail} alt="" referrerPolicy="no-referrer" /> : null}</span>
								))}
							</div>
							<div className="grabbit-trim-mask" style={{width: startPercent + '%'}} aria-hidden />
							<div className="grabbit-trim-mask grabbit-trim-mask-end" style={{width: 100 - endPercent + '%'}} aria-hidden />
							<div className="clip-timeline-selection" style={{left: startPercent + '%', right: 100 - endPercent + '%'}} aria-hidden />
							<div className="clip-timeline-playhead" style={{left: percent(currentSeconds) + '%'}} aria-hidden />
							<Input
								className="clip-seek"
								type="range"
								min={viewStart}
								max={Math.max(viewStart + 0.001, viewEnd)}
								step={0.001}
								value={Math.max(viewStart, Math.min(currentSeconds, viewEnd))}
								disabled={durationSeconds <= 0}
								aria-label={t('wizard.url.workspace.trim.previewHeading')}
								onChange={event => seekTo(Number(event.target.value))}
							/>
							{mode === 'range' ? (
								<>
									<Input
										type="range"
										className="grabbit-range-handle grabbit-range-start"
										min={viewStart}
										max={Math.max(viewStart + 0.001, viewEnd)}
										step={0.001}
										value={startSeconds}
										style={{visibility: isInView(startSeconds) ? 'visible' : 'hidden'}}
										disabled={durationSeconds <= 0}
										aria-label={t('wizard.url.workspace.trim.start')}
										data-testid="clip-start-slider"
										onChange={event => {
											const next = Math.max(0, Math.min(Number(event.target.value), endSeconds - 0.001))
											setStart(formatMediaTime(next))
											seekTo(next)
										}}
									/>
									<Input
										type="range"
										className="grabbit-range-handle grabbit-range-end"
										min={viewStart}
										max={Math.max(viewStart + 0.001, viewEnd)}
										step={0.001}
										value={endSeconds}
										style={{visibility: isInView(endSeconds) ? 'visible' : 'hidden'}}
										disabled={durationSeconds <= 0}
										aria-label={t('wizard.url.workspace.trim.end')}
										data-testid="clip-end-slider"
										onChange={event => {
											const next = Math.min(durationSeconds, Math.max(Number(event.target.value), startSeconds + 0.001))
											setEnd(formatMediaTime(next))
											seekTo(next)
										}}
									/>
								</>
							) : null}
						</div>
						<div className="grabbit-transport">
							<Button type="button" variant="secondary" size="icon-sm" disabled={!canPlayPreview} onClick={togglePlayback} aria-label={t('wizard.url.workspace.trim.previewHeading')}>
								{playing ? <Pause aria-hidden /> : <Play aria-hidden />}
							</Button>
							<Button type="button" variant="ghost" size="icon-sm" disabled={!canPlayPreview || currentSeconds <= 0} onClick={() => stepFrame(-1)} aria-label={t(fps ? 'wizard.url.workspace.trim.previousFrame' : 'wizard.url.workspace.trim.stepBack')} data-testid="clip-frame-back">
								<StepBack aria-hidden />
							</Button>
							<Button type="button" variant="ghost" size="icon-sm" disabled={!canPlayPreview || durationSeconds <= 0 || currentSeconds >= durationSeconds} onClick={() => stepFrame(1)} aria-label={t(fps ? 'wizard.url.workspace.trim.nextFrame' : 'wizard.url.workspace.trim.stepForward')} data-testid="clip-frame-forward">
								<StepForward aria-hidden />
							</Button>
							<Button
								type="button"
								variant={loopClip ? 'secondary' : 'ghost'}
								size="icon-sm"
								disabled={!canPlayPreview || !validation?.ok}
								aria-pressed={loopClip}
								onClick={() => setLoopClip(value => !value)}
								aria-label={t('wizard.url.workspace.trim.loop')}
								title={t('wizard.url.workspace.trim.loop')}
								data-testid="clip-loop"
							>
								<Repeat2 aria-hidden />
							</Button>
							<span data-testid="clip-preview-time">
								{formatMediaTime(currentSeconds)} / {durationSeconds > 0 ? formatMediaTime(durationSeconds) : '—'}
							</span>
							<div className="ms-auto flex gap-1">
								<Button type="button" variant="ghost" size="icon-sm" disabled={durationSeconds > 0 && currentSeconds >= durationSeconds} onClick={captureStart} aria-label={t('wizard.url.workspace.trim.setStart')} title={t('wizard.url.workspace.trim.setStart')}>
									<SkipBack aria-hidden />
								</Button>
								<Button type="button" variant="ghost" size="icon-sm" disabled={currentSeconds <= 0} onClick={captureEnd} aria-label={t('wizard.url.workspace.trim.setEnd')} title={t('wizard.url.workspace.trim.setEnd')}>
									<SkipForward aria-hidden />
								</Button>
							</div>
						</div>
						<div className="grabbit-timeline-tools">
							<Button type="button" variant="ghost" size="icon-sm" disabled={zoom <= 1 || durationSeconds <= 0} onClick={() => changeZoom(Math.max(1, zoom / 2))} aria-label={t('app.zoomOut')}>
								<ZoomOut aria-hidden />
							</Button>
							<span aria-label={t('wizard.url.workspace.trim.zoom')} data-testid="clip-zoom-level">
								{zoom}×
							</span>
							<Button type="button" variant="ghost" size="icon-sm" disabled={zoom >= 64 || durationSeconds <= 0} onClick={() => changeZoom(Math.min(64, zoom * 2))} aria-label={t('app.zoomIn')}>
								<ZoomIn aria-hidden />
							</Button>
							<Input type="range" min={0} max={Math.max(0.001, durationSeconds - span)} step={0.001} value={viewStart} disabled={zoom === 1 || durationSeconds <= 0} onChange={event => setWindowStart(Number(event.target.value))} aria-label={t('wizard.url.workspace.trim.position')} data-testid="clip-pan" />
							<span className="grabbit-timeline-window">
								{formatMediaTime(viewStart)}–{formatMediaTime(viewEnd)}
							</span>
						</div>
					</div>
					<div className="grabbit-cut-fields">
						<Field className="gap-1.5">
							<FieldLabel htmlFor="clip-start" size="sm">
								{t('wizard.url.workspace.trim.start')}
							</FieldLabel>
							<Input
								id="clip-start"
								value={start}
								onChange={event => {
									enableRange()
									setStart(event.target.value)
								}}
								placeholder="00:00"
								inputMode="decimal"
								aria-invalid={validation?.ok === false && validation.reason === 'start'}
								data-testid="clip-start"
							/>
						</Field>
						<Field className="gap-1.5">
							<FieldLabel htmlFor="clip-end" size="sm">
								{t('wizard.url.workspace.trim.end')}
							</FieldLabel>
							<Input
								id="clip-end"
								value={mode === 'full' && !end && durationSeconds > 0 ? formatMediaTime(durationSeconds) : end}
								onChange={event => {
									enableRange()
									setEnd(event.target.value)
								}}
								placeholder="00:00"
								inputMode="decimal"
								aria-invalid={validation?.ok === false && validation.reason !== 'start'}
								data-testid="clip-end"
							/>
						</Field>
						<Button type="button" variant="ghost" size="icon-sm" onClick={reset} aria-label={t('wizard.url.workspace.trim.reset')} title={t('wizard.url.workspace.trim.reset')}>
							<RotateCcw aria-hidden />
						</Button>
					</div>
					{validation?.ok ? (
						<p className="clip-range-summary" data-testid="clip-summary">
							{t('wizard.url.workspace.trim.summary', {start: formatMediaTime(validation.range.startSeconds), end: formatMediaTime(validation.range.endSeconds), length: formatMediaTime(validation.range.endSeconds - validation.range.startSeconds)})}
						</p>
					) : errorKey ? (
						<FieldError data-testid="clip-error">{t(errorKey)}</FieldError>
					) : null}
				</div>
				<div className="clip-preview-card">
					<div className="clip-preview-shell" title={canPlayPreview ? t('wizard.url.workspace.trim.previewHeading') : t('wizard.url.workspace.trim.previewUnavailable')}>
						{canPlayPreview ? (
							<video
								ref={videoRef}
								className="size-full object-contain"
								controls
								muted
								playsInline
								preload="metadata"
								poster={thumbnail || undefined}
								src={previewUrl}
								aria-label={t('wizard.url.workspace.trim.previewHeading')}
								onPlay={event => {
									if (validation?.ok && (event.currentTarget.currentTime < validation.range.startSeconds || event.currentTarget.currentTime >= validation.range.endSeconds)) seekTo(validation.range.startSeconds)
									setPlaying(true)
								}}
								onPause={() => setPlaying(false)}
								onEnded={() => {
									if (loopClip && validation?.ok) {
										seekTo(validation.range.startSeconds)
										void videoRef.current?.play().catch(() => setPlaying(false))
									}
								}}
								onLoadedMetadata={event => readPreviewDuration(event.currentTarget)}
								onDurationChange={event => readPreviewDuration(event.currentTarget)}
								onTimeUpdate={event => {
									const video = event.currentTarget
									setCurrentSeconds(video.currentTime)
									if (validation?.ok && video.currentTime >= validation.range.endSeconds && !video.paused) {
										if (!loopClip) video.pause()
										seekTo(loopClip ? validation.range.startSeconds : validation.range.endSeconds)
									}
								}}
								onSeeked={event => setCurrentSeconds(event.currentTarget.currentTime)}
								onError={() => setPreviewFailed(true)}
							/>
						) : (
							<div className="clip-preview-fallback">{thumbnail ? <img src={thumbnail} alt="" className="absolute inset-0 size-full object-contain" /> : <Scissors className="text-primary" aria-hidden />}</div>
						)}
					</div>
					<p className="grabbit-preview-caption" title={title}>
						{canPlayPreview ? t('wizard.url.workspace.trim.previewHeading') : t('wizard.url.workspace.trim.previewUnavailable')}
					</p>
				</div>
			</div>
		</section>
	)
}
