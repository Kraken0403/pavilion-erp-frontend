import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const RouteHistoryContext = createContext({
    canGoBack: false,
    goBack: () => { },
})

export const RouteHistoryProvider = ({ children }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const [historyStack, setHistoryStack] = useState([])
    const skipRecordRef = useRef(false)

    useEffect(() => {
        const currentRoute = `${location.pathname}${location.search}${location.hash}`

        if (currentRoute === '/') {
            setHistoryStack([])
            return
        }

        if (skipRecordRef.current) {
            skipRecordRef.current = false
            return
        }

        setHistoryStack((prev) => {
            const nextBase = prev.filter((route) => route && route !== '/')

            if (nextBase[nextBase.length - 1] === currentRoute) {
                return nextBase
            }
            return [...nextBase, currentRoute]
        })
    }, [location.pathname, location.search, location.hash])

    const goBack = useCallback(() => {
        setHistoryStack((prev) => {
            if (prev.length <= 1) {
                return prev
            }

            const nextStack = prev.slice(0, -1)
            const targetRoute = nextStack[nextStack.length - 1]

            skipRecordRef.current = true
            navigate(targetRoute, { replace: true })

            return nextStack
        })
    }, [navigate])

    const value = useMemo(
        () => ({
            canGoBack: historyStack.length > 1,
            goBack,
        }),
        [historyStack.length, goBack]
    )

    return (
        <RouteHistoryContext.Provider value={value}>
            {children}
        </RouteHistoryContext.Provider>
    )
}

export const useRouteHistory = () => useContext(RouteHistoryContext)
