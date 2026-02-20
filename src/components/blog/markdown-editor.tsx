'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownContent } from '@/components/markdown-content'
import { renderMarkdownAction } from '@/lib/actions/markdown'
import { cn } from '@/lib/utils'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write something...',
  minHeight = 400,
  className,
}: MarkdownEditorProps) {
  const [previewHtml, setPreviewHtml] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)

  const handlePreview = async () => {
    if (!value) {
      setPreviewHtml('')
      return
    }

    setIsLoading(true)
    try {
      const html = await renderMarkdownAction(value)
      setPreviewHtml(html)
    } catch (error) {
      console.error('Failed to render markdown:', error)
      setPreviewHtml('<p class="text-red-500">Failed to load preview</p>')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Tabs defaultValue="write" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[200px]">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview" onClick={handlePreview}>
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="write" className="mt-2">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="font-mono text-sm resize-y"
            style={{ minHeight: `${minHeight}px` }}
          />
        </TabsContent>
        <TabsContent value="preview" className="mt-2">
          <div
            className="w-full rounded-md border p-4 bg-background overflow-auto"
            style={{ minHeight: `${minHeight}px`, maxHeight: `${minHeight * 2}px` }}
          >
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading preview...
              </div>
            ) : (
              <MarkdownContent renderedHtml={previewHtml} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
