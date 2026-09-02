import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MainLayout } from '../components/layout/MainLayout'

/**
 * Tests for MainLayout — Phase 1 Foundation
 * Verifies the layout shell renders correctly with navigation.
 */
describe('MainLayout', () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        {ui}
      </MemoryRouter>
    )
  }

  it('should render the header title', () => {
    renderWithRouter(<MainLayout />)
    expect(screen.getByText('Gujarat Police CCTV Command Center')).toBeInTheDocument()
  })

  it('should render all navigation items', () => {
    renderWithRouter(<MainLayout />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Cameras')).toBeInTheDocument()
    expect(screen.getByText('Alerts')).toBeInTheDocument()
    expect(screen.getByText('Incidents')).toBeInTheDocument()
  })

  it('should render the Gujarat Police branding', () => {
    renderWithRouter(<MainLayout />)
    expect(screen.getByText('Gujarat Police')).toBeInTheDocument()
    expect(screen.getByText('CCTV Analytics')).toBeInTheDocument()
  })

  it('should render system online status', () => {
    renderWithRouter(<MainLayout />)
    expect(screen.getByText('System Online')).toBeInTheDocument()
  })

  it('should render phase indicator', () => {
    renderWithRouter(<MainLayout />)
    expect(screen.getByText('Phase 1 — Foundation')).toBeInTheDocument()
  })

  it('should render navigation links with correct hrefs', () => {
    renderWithRouter(<MainLayout />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')
  })
})

describe('App routing', () => {
  it('should confirm test environment is working', () => {
    expect(true).toBe(true)
  })

  it('should have jsdom environment for DOM testing', () => {
    const div = document.createElement('div')
    div.textContent = 'test'
    expect(div.textContent).toBe('test')
  })
})
