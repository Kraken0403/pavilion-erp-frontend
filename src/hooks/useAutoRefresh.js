import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_INTERVAL_MS = 20000
const DEFAULT_MIN_GAP_MS = 1500

function useAutoRefresh(refreshFn, options = {}) {
    const {
        enabled = true,
        intervalMs = DEFAULT_INTERVAL_MS,
        minGapMs = DEFAULT_MIN_GAP_MS,
        watch = [],
    } = options

    const location = useLocation()
    const refreshFnRef = useRef(refreshFn)
    const inFlightRef = useRef(false)
    const lastRunAtRef = useRef(0)
    const watchKey = JSON.stringify(watch || [])

    useEffect(() => {
        refreshFnRef.current = refreshFn
    }, [refreshFn])

    const runRefresh = useCallback(async (context = {}) => {
        if (!enabled || inFlightRef.current) return

        const isAutoRefresh = Boolean(context.isAutoRefresh)
        const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible'

        // Skip automatic refreshes when tab is hidden.
        if (isAutoRefresh && !isVisible) return

        const now = Date.now()
        // De-duplicate near-simultaneous triggers (focus + visibility + interval).
        if (isAutoRefresh && now - lastRunAtRef.current < Number(minGapMs || 0)) return

        inFlightRef.current = true
        lastRunAtRef.current = now

        try {
            await refreshFnRef.current?.({
                reason: context.reason || 'manual',
                source: context.source || 'manual',
                isAutoRefresh,
            })
        } catch (error) {
            console.error('Auto refresh failed', error)
        } finally {
            inFlightRef.current = false
        }
    }, [enabled, minGapMs])

    useEffect(() => {
        runRefresh({ reason: 'route-change', source: 'location', isAutoRefresh: false })
    }, [runRefresh, location.pathname, watchKey])

    useEffect(() => {
        if (!enabled || !intervalMs || intervalMs <= 0) return undefined

        const timerId = setInterval(() => {
            runRefresh({ reason: 'interval', source: 'timer', isAutoRefresh: true })
        }, intervalMs)

        return () => clearInterval(timerId)
    }, [enabled, intervalMs, runRefresh])

    useEffect(() => {
        if (!enabled) return undefined

        const handleWindowFocus = () => runRefresh({ reason: 'focus', source: 'window', isAutoRefresh: true })
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                runRefresh({ reason: 'visible', source: 'document', isAutoRefresh: true })
            }
        }
        const handleSidebarRefresh = () => runRefresh({ reason: 'sidebar', source: 'event', isAutoRefresh: true })

        window.addEventListener('focus', handleWindowFocus)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('crm:refresh-data', handleSidebarRefresh)

        return () => {
            window.removeEventListener('focus', handleWindowFocus)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('crm:refresh-data', handleSidebarRefresh)
        }
    }, [enabled, runRefresh])

    return { refreshNow: runRefresh }
}

export default useAutoRefresh