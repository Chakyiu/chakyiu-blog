'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/markdown-content'
import { renderMarkdownAction } from '@/lib/actions/markdown'
import { cn } from '@/lib/utils'
import { ImagePlus } from 'lucide-react'

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
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [activeTab, setActiveTab] = React.useState<string>('write')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

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

  const uploadImage = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `Upload failed (${res.status})`)
      }

      const { url } = (await res.json()) as { url: string }
      const markdown = `![${file.name}](${url})`

      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart ?? value.length
        const end = textarea.selectionEnd ?? value.length
        const newValue = value.slice(0, start) + markdown + value.slice(end)
        onChange(newValue)
        requestAnimationFrame(() => {
          const pos = start + markdown.length
          textarea.setSelectionRange(pos, pos)
          textarea.focus()
        })
      } else {
        onChange(value ? `${value}\n${markdown}` : markdown)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void uploadImage(file)
    }
    e.target.value = ''
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Tabs
        defaultValue="write"
        className="w-full"
        onValueChange={(v) => setActiveTab(v)}
      >
        <div className="flex items-center justify-between gap-2">
          <TabsList className="grid grid-cols-2 lg:w-[200px]">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview" onClick={handlePreview}>
              Preview
            </TabsTrigger>
          </TabsList>

          {activeTab === 'write' && (
            <div className="flex items-center gap-2">
              {uploadError && (
                <span className="text-xs text-destructive">{uploadError}</span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 gap-1.5 text-xs"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {isUploading ? 'Uploading…' : 'Upload Image'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        <TabsContent value="write" className="mt-2">
          <Textarea
            ref={textareaRef}
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
