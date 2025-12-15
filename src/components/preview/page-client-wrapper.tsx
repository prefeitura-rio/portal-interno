'use client'

import { PrefLogo } from '@/components/icons/pref-logo'
import { SecondaryHeader } from '@/components/preview/secondary-header'
import type { ModelsPrefRioService } from '@/http-busca-search/models/modelsPrefRioService'
import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { PageClient } from './page-client'

interface PageClientWrapperProps {
  serviceData: ModelsPrefRioService
  orgaoGestorName: string | null
}

export function PageClientWrapper({
  serviceData,
  orgaoGestorName,
}: PageClientWrapperProps) {
  const [isDark, setIsDark] = useState(false)

  return (
    <>
      <style>{`
        .preview-wrapper-${isDark ? 'dark' : 'light'} {
          --preview-background: ${isDark ? '#09090b' : '#f9fafb'};
          --preview-foreground: ${isDark ? '#f8fafc' : '#09090b'};
          --preview-foreground-light: ${isDark ? '#e2e8f0' : '#71717b'};
          --preview-card: ${isDark ? '#18181b' : '#f1f1f4'};
          --preview-card-foreground: ${isDark ? '#ffffff' : '#020618'};
          --preview-primary: ${isDark ? '#8ec5ff' : '#13335a'};
          --preview-primary-foreground: ${isDark ? '#f8fafc' : '#f8fafc'};
          --preview-secondary: ${isDark ? '#27272a' : '#e4e4e7'};
          --preview-secondary-foreground: ${isDark ? '#0f172b' : '#0f172b'};
          --preview-terciary-foreground: ${isDark ? '#737373' : '#52525C'};
          --preview-muted: ${isDark ? '#57534d' : '#f5f5f5'};
          --preview-muted-foreground: ${isDark ? '#737373' : '#a1a1a1'};
          --preview-border: ${isDark ? '#27272a' : '#e2e8f0'};
          --preview-ring: ${isDark ? '#ffffff' : '#020618'};
        }

        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-foreground {
          color: var(--preview-foreground) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-foreground-light {
          color: var(--preview-foreground-light) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-primary {
          color: var(--preview-primary) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-muted-foreground {
          color: var(--preview-muted-foreground) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-card-foreground {
          color: var(--preview-card-foreground) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-secondary-foreground {
          color: var(--preview-secondary-foreground) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-terciary-foreground {
          color: var(--preview-terciary-foreground) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-background {
          background-color: var(--preview-background) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-card {
          background-color: var(--preview-card) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-primary {
          background-color: var(--preview-primary) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-secondary {
          background-color: var(--preview-secondary) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .text-background {
          color: var(--preview-primary-foreground) !important;
        }

        /* Button text colors */
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-primary,
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-primary * {
          color: var(--preview-primary-foreground) !important;
        }

        /* Gradient fade effect fix */
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-gradient-to-t {
          background-image: linear-gradient(to top, var(--preview-card), transparent) !important;
        }

        /* Ensure bg-card uses preview color */
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-card {
          background-color: var(--preview-card) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-card\\/50 {
          background-color: ${isDark ? 'rgba(24, 24, 27, 0.5)' : 'rgba(241, 241, 244, 0.5)'} !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .bg-card\\/80 {
          background-color: ${isDark ? 'rgba(24, 24, 27, 0.8)' : 'rgba(241, 241, 244, 0.8)'} !important;
        }

        /* Hover states for buttons and cards */
        .preview-wrapper-${isDark ? 'dark' : 'light'} .hover\\:bg-secondary:hover {
          background-color: var(--preview-secondary) !important;
        }
        .preview-wrapper-${isDark ? 'dark' : 'light'} .hover\\:bg-card\\/80:hover {
          background-color: ${isDark ? 'rgba(24, 24, 27, 0.8)' : 'rgba(241, 241, 244, 0.8)'} !important;
        }
      `}</style>
      <div
        className={`preview-wrapper preview-wrapper-${isDark ? 'dark' : 'light'} min-h-lvh ${isDark ? 'dark bg-[#09090b]' : 'bg-[#f9fafb]'}`}
      >
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setIsDark(!isDark)}
          className="fixed top-4 right-4 z-[60] p-2 rounded-full bg-card hover:bg-secondary transition-colors shadow-lg"
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-foreground" />
          )}
        </button>

        <div className="max-w-4xl mx-auto">
          <SecondaryHeader
            logo={
              <div className="cursor-pointer">
                <PrefLogo
                  fill={isDark ? '#8ec5ff' : '#13335a'}
                  className="h-8 w-20"
                />
              </div>
            }
            className="max-w-4xl"
          />

          <div className="pt-20 md:pt-24 pb-20 px-4">
            <PageClient
              serviceData={serviceData}
              orgaoGestorName={orgaoGestorName}
            />
          </div>
        </div>
      </div>
    </>
  )
}
