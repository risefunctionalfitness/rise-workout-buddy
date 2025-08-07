import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const ScrollToTop = () => {
  const location = useLocation()

  useEffect(() => {
    // Don't scroll to top on the main dashboard/overview page (/pro)
    if (location.pathname !== '/pro') {
      window.scrollTo(0, 0)
    }
  }, [location.pathname])

  return null
}