import React, { createContext, useContext } from 'react'

const LayoutContext = createContext({
  sidebarOpen: true,
  toggleSidebar: () => {},
})

export const LayoutProvider = ({ value, children }) => {
  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => useContext(LayoutContext)
