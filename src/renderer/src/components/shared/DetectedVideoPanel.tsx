import type {ReactNode} from 'react'
import {Check, Clock3, HardDrive, Link2, Monitor, UserRound} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {humanSize} from '@shared/format.js'
import {formatDuration} from '@renderer/lib/formatDuration.js'
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card.js'

interface Props {
	thumbnail: string
	title: string
	uploader?: string
	webpageUrl?: string
	duration?: number
	resolution?: string
	filesize?: number
}

export function DetectedVideoPanel({thumbnail, title, uploader, webpageUrl, duration, resolution, filesize}: Props): ReactNode {
	const {t} = useTranslation()
	const host = webpageUrl && URL.canParse(webpageUrl) ? new URL(webpageUrl).hostname : null
	return (
		<Card className="utility-panel grabbit-video-panel" data-testid="detected-video-panel">
			<CardHeader className="grabbit-panel-heading">
				<div className="grabbit-section-icon" aria-hidden>
					<Link2 />
				</div>
				<div>
					<CardTitle className="grabbit-panel-title">
						{t('wizard.formats.video')}
						<span className="grabbit-verified" aria-hidden>
							<Check />
						</span>
					</CardTitle>
					<p className="grabbit-detected-source">{host ?? t('presets.best-quality.desc')}</p>
				</div>
			</CardHeader>
			<CardContent className="grabbit-video-content">
				<div className="grabbit-video-poster">
					{thumbnail ? <img src={thumbnail} alt={t('wizard.playlist.thumbnailAlt')} referrerPolicy="no-referrer" /> : <div className="thumb-shimmer size-full" aria-hidden />}
					{duration !== undefined ? <span className="grabbit-video-duration">{formatDuration(duration)}</span> : null}
				</div>
				<div className="grabbit-video-facts">
					<h2>{title}</h2>
					{uploader ? (
						<p className="grabbit-uploader">
							<UserRound aria-hidden />
							{uploader}
						</p>
					) : null}
					{host ? (
						<p className="grabbit-source">
							<Link2 aria-hidden />
							{host}
						</p>
					) : null}
					<dl className="grabbit-media-details">
						{duration !== undefined ? (
							<div>
								<Clock3 aria-hidden />
								<div>
									<dt>{t('wizard.playlistProfiles.columnDuration')}</dt>
									<dd>{formatDuration(duration)}</dd>
								</div>
							</div>
						) : null}
						{resolution ? (
							<div>
								<Monitor aria-hidden />
								<div>
									<dt>{t('wizard.profileEditor.field.resolution')}</dt>
									<dd>{resolution}</dd>
								</div>
							</div>
						) : null}
						{filesize ? (
							<div>
								<HardDrive aria-hidden />
								<div>
									<dt>{t('wizard.formats.total')}</dt>
									<dd>~{humanSize(filesize)}</dd>
								</div>
							</div>
						) : null}
					</dl>
				</div>
			</CardContent>
		</Card>
	)
}
