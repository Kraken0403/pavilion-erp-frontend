import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_INTERVAL_MS = 20000

function useAutoRefresh(refreshFn, options = {}) {
    const {
        enabled = true,
        intervalMs = DEFAULT_INTERVAL_MS,
        watch = [],
    } = options

    const location = useLocation()
    const refreshFnRef = useRef(refreshFn)
    const inFlightRef = useRef(false)
    const watchKey = JSON.stringify(watch || [])

    useEffect(() => {
        refreshFnRef.current = refreshFn
    }, [refreshFn])

    const runRefresh = useCallback(async () => {
        if (!enabled || inFlightRef.current) return

        inFlightRef.current = true

        try {
            await refreshFnRef.current?.()
        } catch (error) {
            console.error('Auto refresh failed', error)
        } finally {
            inFlightRef.current = false
        }
    }, [enabled])

    useEffect(() => {
        runRefresh()
    }, [runRefresh, location.pathname, location.key, watchKey])

    useEffect(() => {
        if (!enabled || !intervalMs || intervalMs <= 0) return undefined

        const timerId = setInterval(() => {
            runRefresh()
        }, intervalMs)

        return () => clearInterval(timerId)
    }, [enabled, intervalMs, runRefresh])

    useEffect(() => {
        if (!enabled) return undefined

        const handleWindowFocus = () => runRefresh()
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                runRefresh()
            }
        }
        const handleSidebarRefresh = () => runRefresh()

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