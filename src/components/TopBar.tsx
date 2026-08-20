import { useEffect, useRef, useState } from 'react'
import type { AppView } from '../App'
import '../styles/TopBar.css'

interface TopBarProps {
  view: AppView
  onNavigate: (view: AppView) => void
  /** true once gameplay is running — rolls the bar up out of the way. */
  autoHide?: boolean
}

function TopBar({ view, onNavigate, autoHide = false }: TopBarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pulledDown, setPulledDown] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // whenever auto-hide switches on (play just started) or off (back to a
  // calm screen like the hero or archives), forget any manual pull
  useEffect(() => {
    setPulledDown(false)
  }, [autoHide])

  const hidden = autoHide && !pulledDown

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isMenuOpen])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch {
      // fullscreen can be denied by the browser/user — fail silently
    }
  }

  const handleSelect = (target: AppView) => {
    onNavigate(target)
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className={`top-bar${hidden ? ' top-bar--hidden' : ''}`}>
        <div className="top-bar__brand">
        <span className="top-bar__brand-mark">緬</span>
        <span className="top-bar__brand-name">FRAGMEN — Kota Madiun</span>
      </div>

      <div className="top-bar__controls">
        <button
          className="top-bar__icon-btn"
          onClick={toggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>

        <div className="top-bar__menu" ref={menuRef}>
          <button
            className="top-bar__menu-trigger"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            Option
            <ChevronIcon open={isMenuOpen} />
          </button>

          {isMenuOpen && (
            <div className="top-bar__dropdown" role="menu">
              <button
                className="top-bar__dropdown-item"
                role="menuitem"
                data-active={view === 'game'}
                onClick={() => handleSelect('game')}
              >
                <span className="top-bar__dropdown-index">01</span>
                <span>
                  <span className="top-bar__dropdown-title">Play</span>
                  <span className="top-bar__dropdown-sub">Enter the game</span>
                </span>
              </button>
              <button
                className="top-bar__dropdown-item"
                role="menuitem"
                data-active={view === 'lore'}
                onClick={() => handleSelect('lore')}
              >
                <span className="top-bar__dropdown-index">02</span>
                <span>
                  <span className="top-bar__dropdown-title">Archives</span>
                  <span className="top-bar__dropdown-sub">Read the history, skip the game</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
      </header>

      {autoHide && (
        <button
          type="button"
          className={`top-bar__tail${hidden ? '' : ' top-bar__tail--open'}`}
          onClick={() => setPulledDown((v) => !v)}
          aria-label={hidden ? 'Show menu bar' : 'Hide menu bar'}
          title={hidden ? 'Show menu bar' : 'Hide menu bar'}
        >
          <ChevronIcon open={!hidden} />
        </button>
      )}
    </>
  )
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CompressIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 6h4V2M14 6h-4V2M2 10h4v4M14 10h-4v4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}
    >
      <path d="M1.5 3.5L5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default TopBar
