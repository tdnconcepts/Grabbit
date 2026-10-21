import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vite-plus/test'
import {QueueProgress} from '@renderer/components/queue/QueueProgress.js'
import {makeItem} from '../shared/fixtures.js'

describe('download progress', () => {
	it('keeps unfinished work below 100 percent', () => {
		render(<QueueProgress item={makeItem({id: 'x', status: 'running', progressPercent: 100})} />)
		expect(screen.getByTestId('queue-progress-label')).toHaveTextContent('99%')
	})
	it('shows an indeterminate finishing state instead of stale transfer estimates', () => {
		render(<QueueProgress item={makeItem({id: 'x', status: 'running', progressPercent: 100, lastStatus: {key: 'movingFiles'}, progressDetail: '4.50 MiB/s • ETA 0:00'})} />)
		expect(screen.getByTestId('queue-progress-label')).toHaveTextContent('Finishing')
		expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
		expect(screen.queryByTestId('queue-speed')).not.toBeInTheDocument()
	})
})
