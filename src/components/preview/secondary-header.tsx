'use client'

import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

interface SecondaryHeaderProps {
  title?: string
  logo?: ReactNode
  className?: string
  style?: React.CSSProperties
  fixed?: boolean
}

export function SecondaryHeader({
  title,
  logo,
  className = 'max-w-4xl',
  style,
  fixed = true,
}: SecondaryHeaderProps) {
  return (
    <>
      <header
        className={`px-4 py-4 md:py-6 ${fixed ? 'fixed' : 'relative'} w-full ${className} mx-auto ${fixed ? 'z-50' : ''} bg-background text-foreground h-auto transition-all duration-200`}
        style={fixed ? { top: 0, ...style } : style}
      >
        <div className="grid grid-cols-3 items-center">
          {/* Left column - Back button */}
          <div className="flex justify-start">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-card">
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </div>
          </div>

          {/* Center column - Title or Logo */}
          <div className="flex justify-center">
            {logo ? (
              logo
            ) : (
              <h1 className="text-xl text-nowrap font-medium text-center text-foreground">
                {title}
              </h1>
            )}
          </div>

          {/* Right column - empty space */}
          <div className="flex justify-end" />
        </div>
      </header>
    </>
  )
}
