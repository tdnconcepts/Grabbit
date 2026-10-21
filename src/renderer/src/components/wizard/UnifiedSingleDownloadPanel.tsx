import {useMemo, useState, type ReactNode} from 'react'
import {ChevronDown, Download, FolderOpen, RotateCcw, Settings2, Zap} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {useShallow} from 'zustand/react/shallow'
import {formatMediaTime, validateClipRange} from '@shared/clipRange.js'
import {humanSize} from '@shared/format.js'
import {isYouTubeExtractor} from '@shared/ytdlp/extractorPredicates.js'
import {formatHomeRelativePath} from '@renderer/lib/utils.js'
import {useAppStore} from '../../store/useAppStore.js'
import {useFormatSelectionView, type FormatSelectionFilters} from '../../store/formatSelectionView.js'
import {formatProbeError} from '../../store/helpers.js'
import {Alert, AlertDescription} from '../ui/alert.js'
import {Button} from '../ui/button.js'
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card.js'
import {Input} from '../ui/input.js'
import {Field, FieldLabel} from '../ui/field.js'
import {Spinner} from '../ui/spinner.js'
import {DetectedVideoPanel} from '../shared/DetectedVideoPanel.js'
import {ClipRangeSection} from './ClipRangeSection.js'
import {AudioColumn} from './format/AudioColumn.js'
import {BotWallNotice} from './format/BotWallNotice.js'
import {PresetStrip} from './format/PresetStrip.js'
import {VideoColumn} from './format/VideoColumn.js'
import {StepOutput} from './StepOutput.js'
import {StepSponsorBlock} from './StepSponsorBlock.js'
import {StepSubtitles} from './StepSubtitles.js'

export function UnifiedSingleDownloadPanel(): ReactNode {
	const {t} = useTranslation()
	const state = useAppStore(
		useShallow(s => ({
			formatsLoading: s.formatsLoading,
			wizardStep: s.wizardStep,
			wizardError: s.wizardError,
			wizardTitle: s.wizardTitle,
			wizardThumbnail: s.wizardThumbnail,
			wizardDuration: s.wizardDuration,
			wizardPreviewUrl: s.wizardPreviewUrl,
			wizardUploader: s.wizardUploader,
			wizardWebpageUrl: s.wizardWebpageUrl,
			wizardExtractor: s.wizardExtractor,
			wizardFormats: s.wizardFormats,
			selectedVideoFormatId: s.selectedVideoFormatId,
			audioSelection: s.audioSelection,
			activePreset: s.activePreset,
			wizardSubtitles: s.wizardSubtitles,
			wizardAutomaticCaptions: s.wizardAutomaticCaptions,
			wizardOutputDir: s.wizardOutputDir,
			wizardClipMode: s.wizardClipMode,
			wizardClipStart: s.wizardClipStart,
			wizardClipEnd: s.wizardClipEnd,
			settings: s.settings,
			commonPaths: s.commonPaths,
			isSubmittingToQueue: s.isSubmittingToQueue,
			setSelectedVideoFormatId: s.setSelectedVideoFormatId,
			setAudioSelection: s.setAudioSelection,
			setPreset: s.setPreset,
			chooseWizardFolder: s.chooseWizardFolder,
			setFilenameTemplate: s.setFilenameTemplate,
			addAndDownloadImmediately: s.addAndDownloadImmediately,
			retryFormatProbe: s.retryFormatProbe
		}))
	)
	const [videoExtFilter, setVideoExtFilter] = useState<string | null>(null)
	const [dynamicRangeFilter, setDynamicRangeFilter] = useState<string | null>(null)
	const [audioExtFilter, setAudioExtFilter] = useState<string | null>(null)
	const filters = useMemo<FormatSelectionFilters>(() => ({audioExt: audioExtFilter, dynamicRange: dynamicRangeFilter, videoExt: videoExtFilter}), [audioExtFilter, dynamicRangeFilter, videoExtFilter])
	const view = useFormatSelectionView(filters)

	if (state.formatsLoading) {
		return (
			<Card variant="inset" className="items-center gap-2 py-5" data-testid="url-analysis-loading">
				<Spinner className="size-5 text-primary" aria-hidden />
				<p className="text-sm font-medium">{t('wizard.url.workspace.analyzing')}</p>
				<p className="text-xs text-muted-foreground">{t('wizard.formats.loadingHint')}</p>
			</Card>
		)
	}

	if (state.wizardStep === 'error' && state.wizardError) {
		return (
			<Alert variant="warning" data-testid="url-analysis-error">
				<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
					<span>{formatProbeError(state.wizardError) || t('wizard.url.quickProbeFailed')}</span>
					<Button type="button" variant="outline" size="sm" onClick={() => void state.retryFormatProbe()}>
						<RotateCcw data-icon="inline-start" aria-hidden />
						{t('common.retry')}
					</Button>
				</AlertDescription>
			</Alert>
		)
	}

	if (state.wizardFormats.length === 0 || !state.wizardTitle) return null

	const clipValidation = state.wizardClipMode === 'range' ? validateClipRange({start: state.wizardClipStart, end: state.wizardClipEnd, durationSeconds: state.wizardDuration}) : null
	const clipValid = clipValidation === null || clipValidation.ok
	const hasSubtitles = Object.keys(state.wizardSubtitles).length > 0 || Object.keys(state.wizardAutomaticCaptions).length > 0
	const selectedFormat = state.wizardFormats.find(format => format.formatId === state.selectedVideoFormatId)
	const mediaSummary = view.mode === 'audio-only' ? t('wizard.formats.audioOnly') : view.mode === 'subtitle-only' ? t('presets.subtitle-only.label') : [selectedFormat?.ext?.toUpperCase(), selectedFormat?.resolution].filter(Boolean).join(' · ')
	const audioSummary = state.audioSelection.kind === 'none' ? t('wizard.formats.noAudio') : state.audioSelection.kind === 'native' ? t('wizard.url.workspace.bestAudio') : state.audioSelection.target.toUpperCase()
	const clipSummary = clipValidation?.ok ? `${formatMediaTime(clipValidation.range.startSeconds)}–${formatMediaTime(clipValidation.range.endSeconds)}` : t('wizard.url.workspace.trim.full')
	const destination = formatHomeRelativePath(state.wizardOutputDir, state.commonPaths)
	const canDownload = view.canContinue && clipValid && Boolean(state.wizardOutputDir) && !state.isSubmittingToQueue

	return (
		<div className="grabbit-download-grid" data-testid="unified-download-options">
			<DetectedVideoPanel thumbnail={state.wizardThumbnail} title={state.wizardTitle} duration={state.wizardDuration} resolution={view.currentResolutionLabel} webpageUrl={state.wizardWebpageUrl} uploader={state.wizardUploader} filesize={view.selectedFilesize} />
			<Card className="utility-panel grabbit-options-panel gap-0 py-0" data-testid="download-options-panel">
				<CardHeader className="grabbit-options-heading">
					<CardTitle className="grabbit-panel-title">
						<Settings2 className="grabbit-heading-icon" aria-hidden />
						{t('wizard.url.workspace.options')}
					</CardTitle>
					<span className="grabbit-quality-note">
						<Zap aria-hidden />
						{state.activePreset ? t(`presets.${state.activePreset}.label`) : mediaSummary}
					</span>
				</CardHeader>
				<CardContent className="grabbit-options-content">
					<PresetStrip activePreset={state.activePreset} onSelect={state.setPreset} />
					<BotWallNotice />
					<div className="grabbit-format-columns">
						<VideoColumn view={view.video} selectedVideoFormatId={state.selectedVideoFormatId} videoExtFilter={videoExtFilter} dynamicRangeFilter={dynamicRangeFilter} onVideoExtFilterChange={setVideoExtFilter} onDynamicRangeFilterChange={setDynamicRangeFilter} onSelect={state.setSelectedVideoFormatId} />
						<AudioColumn view={view.audio} mode={view.mode} audioSelection={state.audioSelection} audioExtFilter={audioExtFilter} onAudioExtFilterChange={setAudioExtFilter} onSelect={state.setAudioSelection} />
					</div>
				</CardContent>
				<div className="grabbit-download-footer" data-testid="download-action-bar">
					<div className="grabbit-destination">
						<FolderOpen aria-hidden />
						<div className="min-w-0 flex-1">
							<p>{t('wizard.url.workspace.destination')}</p>
							<span title={state.wizardOutputDir}>{destination}</span>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={() => void state.chooseWizardFolder()} aria-label={t('wizard.url.workspace.changeDestination')}>
							<FolderOpen aria-hidden />
						</Button>
					</div>
					<Button
						type="button"
						variant="glow"
						size="lg"
						className="grabbit-download-button"
						disabled={!canDownload}
						onClick={() => void state.addAndDownloadImmediately()}
						data-testid="btn-download"
						title={[mediaSummary, audioSummary, clipSummary, view.selectedFilesize ? humanSize(view.selectedFilesize) : null].filter(Boolean).join(' • ')}
					>
						{state.isSubmittingToQueue ? <Spinner aria-hidden /> : <Download data-icon="inline-start" aria-hidden />}
						{t('wizard.url.workspace.download')}
					</Button>
				</div>
			</Card>
			{state.activePreset !== 'subtitle-only' ? <ClipRangeSection key={state.wizardPreviewUrl ?? state.wizardWebpageUrl} previewUrl={state.wizardPreviewUrl} thumbnail={state.wizardThumbnail} title={state.wizardTitle} /> : null}
			<details className="grabbit-more-options utility-section">
				<summary className="utility-summary">
					{t('wizard.url.workspace.advanced')}
					<ChevronDown aria-hidden />
				</summary>
				<div className="mt-4 grid gap-3 lg:grid-cols-2">
					<div className="lg:col-span-2">
						<PresetStrip activePreset={state.activePreset} onSelect={state.setPreset} advanced />
					</div>
					{hasSubtitles ? (
						<details className="utility-section">
							<summary className="utility-summary">
								{t('wizard.steps.subtitles')}
								<ChevronDown aria-hidden />
							</summary>
							<div className="mt-3">
								<StepSubtitles embedded />
							</div>
						</details>
					) : null}
					<section className="utility-section">
						<div className="utility-summary">{t('wizard.steps.output')}</div>
						<div className="mt-3 grid gap-4">
							{isYouTubeExtractor(state.wizardExtractor) && state.activePreset !== 'audio-only' && state.activePreset !== 'subtitle-only' ? <StepSponsorBlock embedded /> : null}
							{state.activePreset !== 'subtitle-only' ? <StepOutput embedded /> : null}
							<Field className="gap-1.5">
								<FieldLabel htmlFor="single-filename-template" size="sm">
									{t('wizard.url.workspace.filenameTemplate')}
								</FieldLabel>
								<Input id="single-filename-template" defaultValue={state.settings?.common?.filenameTemplate ?? ''} onBlur={event => void state.setFilenameTemplate(event.target.value)} />
							</Field>
						</div>
					</section>
				</div>
			</details>
		</div>
	)
}
