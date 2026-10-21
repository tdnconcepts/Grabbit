import type {ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import type {QueueItem} from '@shared/types.js'
import {formatEta} from '@shared/progressFormat.js'
import {Progress} from '../ui/progress.js'
import {queueProgressView} from './queueProgressView.js'

export function QueueProgress({item}: {item: QueueItem}): ReactNode {
	const {t} = useTranslation()
	const view = queueProgressView(item)
	return (
		<div className={view.indeterminate ? 'grabbit-job-progress grabbit-job-progress-pending' : 'grabbit-job-progress'} data-testid="queue-progress">
			<div className="font-mono text-xs text-muted-foreground" data-testid="queue-progress-label">
				{view.indeterminate && view.labelKey ? t(view.labelKey) : `${item.status === 'running' ? Math.min(99, Math.floor(item.progressPercent)) : Math.round(item.progressPercent)}%`}
			</div>
			<Progress value={view.indeterminate ? null : item.progressPercent} aria-label={view.labelKey ? t(view.labelKey) : t('queue.table.progress')} className="mt-1 gap-0" />
			{view.transfer ? (
				<div className="grabbit-transfer-stats">
					<span title={t('queue.progress.speed')} data-testid="queue-speed">
						{view.transfer.speed}
					</span>
					<span title={t('queue.progress.remaining')} aria-label={`${t('queue.progress.remaining')}: ${formatEta(view.transfer.etaSeconds)}`} data-testid="queue-eta">
						{formatEta(view.transfer.etaSeconds)}
					</span>
				</div>
			) : null}
		</div>
	)
}
