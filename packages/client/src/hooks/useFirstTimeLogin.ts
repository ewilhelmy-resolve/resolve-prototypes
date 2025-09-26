/**
 * useFirstTimeLogin - Hook for managing first-time login detection
 *
 * TODO: Remove cookie-based approach and replace with proper server-side logic.
 * Current logic: If cookie is not set, show welcome modal. If cookie is set and marked as read, do not show it.
 * This is abstracted so it can be easily replaced with proper server-side logic later.
 */

import { useState, useEffect } from 'react'

const FIRST_LOGIN_COOKIE_NAME = 'rita_first_login_shown'
const COOKIE_VALUE_SHOWN = 'true'

interface FirstTimeLoginState {
  shouldShowModal: boolean
  markModalAsShown: () => void
}

/**
 * Hook for detecting first-time login and managing the welcome modal
 *
 * @returns Object with shouldShowModal flag and markModalAsShown function
 */
export const useFirstTimeLogin = (): FirstTimeLoginState => {
  const [shouldShowModal, setShouldShowModal] = useState(false)

  useEffect(() => {
    // TODO: Replace with server-side user preference/onboarding status check
    // Check if the cookie exists
    const cookieValue = getCookie(FIRST_LOGIN_COOKIE_NAME)

    // If cookie is not set, show the welcome modal
    // If cookie is set and marked as read, do not show it
    if (!cookieValue || cookieValue !== COOKIE_VALUE_SHOWN) {
      setShouldShowModal(true)
    }
  }, [])

  const markModalAsShown = () => {
    // TODO: Replace with server-side API call to mark user onboarding as complete
    // Set the cookie to indicate the modal has been shown
    setCookie(FIRST_LOGIN_COOKIE_NAME, COOKIE_VALUE_SHOWN, 365) // 1 year expiry
    setShouldShowModal(false)
  }

  return {
    shouldShowModal,
    markModalAsShown
  }
}

/**
 * Utility function to get a cookie value
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  const nameEQ = name + "="
  const ca = document.cookie.split(';')

  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }

  return null
}

/**
 * Utility function to set a cookie
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return

  const expires = new Date()
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000))

  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`
}