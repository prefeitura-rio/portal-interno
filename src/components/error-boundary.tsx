'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error: Error
    reset: () => void
  }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch and handle rendering errors
 * Based on React documentation: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} reset={this.reset} />
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback error={this.state.error} reset={this.reset} />
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Algo deu errado</h2>
          <p className="text-muted-foreground text-sm">
            Ocorreu um erro ao carregar esta página. Por favor, tente novamente.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-muted rounded-md text-left">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex gap-2 justify-center">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Recarregar página
          </Button>
        </div>
      </div>
    </div>
  )
}
