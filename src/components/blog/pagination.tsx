import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  searchParams?: Record<string, string | string[] | undefined>
}

export function Pagination({ currentPage, totalPages, basePath, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    
    // Preserve existing params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v))
        } else {
          params.append(key, value)
        }
      }
    })
    
    params.set('page', page.toString())
    return `${basePath}?${params.toString()}`
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first, last, current, and surrounding
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push(-1) // Ellipsis
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1)
        pages.push(-1) // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push(-1)
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push(-1)
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        asChild={currentPage > 1}
      >
        {currentPage > 1 ? (
          <Link href={createPageUrl(currentPage - 1)}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Page</span>
          </Link>
        ) : (
          <span>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Page</span>
          </span>
        )}
      </Button>

      <div className="hidden sm:flex items-center space-x-2">
        {getPageNumbers().map((page, i) => (
          page === -1 ? (
            <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              asChild
            >
              <Link href={createPageUrl(page)}>
                {page}
              </Link>
            </Button>
          )
        ))}
      </div>

      <div className="sm:hidden flex items-center">
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <Button
        variant="outline"
        size="icon"
        disabled={currentPage >= totalPages}
        asChild={currentPage < totalPages}
      >
        {currentPage < totalPages ? (
          <Link href={createPageUrl(currentPage + 1)}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next Page</span>
          </Link>
        ) : (
          <span>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next Page</span>
          </span>
        )}
      </Button>
    </div>
  )
}
