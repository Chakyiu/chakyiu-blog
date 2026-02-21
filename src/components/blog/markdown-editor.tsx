'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MarkdownContent } from '@/components/markdown-content'
import { renderMarkdownAction } from '@/lib/actions/markdown'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  SquareCode,
  Link as LinkIcon,
  Quote,
  List,
  ListOrdered,
  Minus,
  ImagePlus,
  Columns2,
  PanelLeft,
} from 'lucide-react'
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Transaction } from '@codemirror/state'
import { useTheme } from '@/components/theme-provider'

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
  const [showPreviewSideBySide, setShowPreviewSideBySide] = React.useState(true)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const mobileEditorRef = React.useRef<ReactCodeMirrorRef>(null)
  const desktopEditorRef = React.useRef<ReactCodeMirrorRef>(null)
  const { theme } = useTheme()
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light')

  const getActiveView = () => {
    if (typeof window === 'undefined') return null
    if (window.matchMedia('(min-width: 768px)').matches) {
      return desktopEditorRef.current?.view
    }
    return mobileEditorRef.current?.view
  }

  React.useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(isDark ? 'dark' : 'light')
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => setResolvedTheme(e.matches ? 'dark' : 'light')
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      setResolvedTheme(theme as 'light' | 'dark')
    }
  }, [theme])

  React.useEffect(() => {
    const timer = setTimeout(async () => {
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
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value])

  const insertText = (
    prefix: string,
    suffix: string = '',
    replaceSelection: boolean = false
  ) => {
    const view = getActiveView()
    if (!view) return

    const state = view.state
    const { from, to } = state.selection.main
    const selectedText = state.sliceDoc(from, to)
    
    let textToInsert = ''
    let newCursorPos = 0

    if (replaceSelection) {
      textToInsert = `${prefix}${selectedText}${suffix}`
      newCursorPos = from + prefix.length + selectedText.length + suffix.length
    } else {
      textToInsert = `${prefix}${selectedText}${suffix}`
      if (from === to) {
         newCursorPos = from + prefix.length
      } else {
         newCursorPos = from + textToInsert.length
      }
    }

    const transaction = state.update({
      changes: { from, to, insert: textToInsert },
      selection: { anchor: newCursorPos },
      userEvent: 'input.type',
      scrollIntoView: true,
    })

    view.dispatch(transaction)
    onChange(view.state.doc.toString())
    view.focus()
  }

  const insertAtStartOfLine = (prefix: string) => {
    const view = getActiveView()
    if (!view) return

    const state = view.state
    const { from } = state.selection.main
    const line = state.doc.lineAt(from)
    const lineContent = line.text

    let transaction: Transaction

    if (lineContent.startsWith(prefix)) {
      transaction = state.update({
        changes: { from: line.from, to: line.from + prefix.length, insert: '' },
        userEvent: 'delete',
      })
    } else if (/^#{1,6}\s/.test(lineContent) && prefix.startsWith('#')) {
      const match = lineContent.match(/^#{1,6}\s/)
      if (match) {
         transaction = state.update({
          changes: { from: line.from, to: line.from + match[0].length, insert: prefix },
          userEvent: 'input',
         })
      } else {
         transaction = state.update({
           changes: { from: line.from, insert: prefix },
           userEvent: 'input',
         })
      }
    } else {
      transaction = state.update({
        changes: { from: line.from, insert: prefix },
        userEvent: 'input',
      })
    }
    
    view.dispatch(transaction)
    onChange(view.state.doc.toString())
    view.focus()
  }

  const handleBold = () => insertText('**', '**')
  const handleItalic = () => insertText('*', '*')
  const handleCode = () => insertText('`', '`')
  const handleCodeBlock = () => insertText('```\n', '\n```')
  const handleLink = () => {
    const url = prompt('Enter URL:')
    if (url) insertText('[', `](${url})`)
  }
  const handleBlockquote = () => insertAtStartOfLine('> ')
  const handleUnorderedList = () => insertAtStartOfLine('- ')
  const handleOrderedList = () => insertAtStartOfLine('1. ')
  const handleH1 = () => insertAtStartOfLine('# ')
  const handleH2 = () => insertAtStartOfLine('## ')
  const handleH3 = () => insertAtStartOfLine('### ')
  const handleHorizontalRule = () => insertText('\n---\n')

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

      const view = getActiveView()
      if (view) {
        const { from } = view.state.selection.main
        const transaction = view.state.update({
          changes: { from, insert: markdown },
          selection: { anchor: from + markdown.length },
        })
        view.dispatch(transaction)
        onChange(view.state.doc.toString())
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      void uploadImage(file)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
     if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
       e.preventDefault(); handleBold();
     } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
       e.preventDefault(); handleItalic();
     } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
       e.preventDefault(); handleLink();
     } else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
       e.preventDefault(); handleCode();
     }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write" className="mt-2">
            <div className="flex flex-col gap-2">
              <Toolbar 
                onBold={handleBold} 
                onItalic={handleItalic} 
                onH1={handleH1} onH2={handleH2} onH3={handleH3}
                onCode={handleCode} onCodeBlock={handleCodeBlock}
                onLink={handleLink} onBlockquote={handleBlockquote}
                onUl={handleUnorderedList} onOl={handleOrderedList}
                onHr={handleHorizontalRule}
                onImage={() => fileInputRef.current?.click()}
                isUploading={isUploading}
              />
              <div 
                className="relative min-h-[400px] border rounded-md overflow-hidden"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <CodeMirror
                  ref={mobileEditorRef}
                  value={value}
                  height="100%"
                  minHeight={`${minHeight}px`}
                  extensions={[
                    markdown(), 
                    EditorView.lineWrapping,
                    keymap.of([{ key: "Tab", run: (view) => { view.dispatch(view.state.replaceSelection("  ")); return true; } }])
                  ]}
                  theme={resolvedTheme === 'dark' ? oneDark : 'light'}
                  onChange={(val) => onChange(val)}
                  onKeyDown={handleKeyDown}
                  className="text-sm font-mono"
                  basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: false,
                  }}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <PreviewPane html={previewHtml} isLoading={isLoading} minHeight={minHeight} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="hidden md:flex flex-col gap-2">
        <div className="flex items-center justify-between border-b pb-2">
           <Toolbar 
              onBold={handleBold} 
              onItalic={handleItalic} 
              onH1={handleH1} onH2={handleH2} onH3={handleH3}
              onCode={handleCode} onCodeBlock={handleCodeBlock}
              onLink={handleLink} onBlockquote={handleBlockquote}
              onUl={handleUnorderedList} onOl={handleOrderedList}
              onHr={handleHorizontalRule}
              onImage={() => fileInputRef.current?.click()}
              isUploading={isUploading}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreviewSideBySide(!showPreviewSideBySide)}
              title={showPreviewSideBySide ? "Hide Preview" : "Show Preview"}
            >
              {showPreviewSideBySide ? <Columns2 className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: showPreviewSideBySide ? '1fr 1fr' : '1fr' }}>
          <div 
             className="relative border rounded-md overflow-hidden bg-background"
             onDrop={handleDrop}
             onDragOver={(e) => e.preventDefault()}
          >
             <CodeMirror
                ref={desktopEditorRef}
                value={value}
                minHeight={`${minHeight}px`}
                extensions={[
                  markdown(), 
                  EditorView.lineWrapping,
                  keymap.of([{ key: "Tab", run: (view) => { view.dispatch(view.state.replaceSelection("  ")); return true; } }])
                ]}
                theme={resolvedTheme === 'dark' ? oneDark : 'light'}
                onChange={(val) => onChange(val)}
                onKeyDown={handleKeyDown}
                className="text-sm font-mono"
                 basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    dropCursor: false,
                    allowMultipleSelections: false,
                    indentOnInput: false,
                  }}
              />
          </div>
          
          {showPreviewSideBySide && (
            <PreviewPane html={previewHtml} isLoading={isLoading} minHeight={minHeight} />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {uploadError && <p className="text-sm text-destructive mt-1">{uploadError}</p>}
    </div>
  )
}

interface ToolbarProps {
  onBold: () => void
  onItalic: () => void
  onH1: () => void
  onH2: () => void
  onH3: () => void
  onCode: () => void
  onCodeBlock: () => void
  onLink: () => void
  onBlockquote: () => void
  onUl: () => void
  onOl: () => void
  onHr: () => void
  onImage: () => void
  isUploading: boolean
}

interface ToolbarButtonProps {
  onClick: () => void
  icon: React.ReactNode
  title: string
  disabled?: boolean
}

function Toolbar({ 
  onBold, onItalic, onH1, onH2, onH3, onCode, onCodeBlock, onLink, onBlockquote, onUl, onOl, onHr, onImage, isUploading 
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ToolbarButton onClick={onBold} icon={<Bold className="h-4 w-4" />} title="Bold (Ctrl+B)" />
      <ToolbarButton onClick={onItalic} icon={<Italic className="h-4 w-4" />} title="Italic (Ctrl+I)" />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={onH1} icon={<Heading1 className="h-4 w-4" />} title="Heading 1" />
      <ToolbarButton onClick={onH2} icon={<Heading2 className="h-4 w-4" />} title="Heading 2" />
      <ToolbarButton onClick={onH3} icon={<Heading3 className="h-4 w-4" />} title="Heading 3" />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={onCode} icon={<Code className="h-4 w-4" />} title="Inline Code (Ctrl+E)" />
      <ToolbarButton onClick={onCodeBlock} icon={<SquareCode className="h-4 w-4" />} title="Code Block" />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={onLink} icon={<LinkIcon className="h-4 w-4" />} title="Link (Ctrl+K)" />
      <ToolbarButton onClick={onImage} icon={<ImagePlus className="h-4 w-4" />} title="Upload Image" disabled={isUploading} />
      <div className="w-px h-4 bg-border mx-1" />
      <ToolbarButton onClick={onBlockquote} icon={<Quote className="h-4 w-4" />} title="Blockquote" />
      <ToolbarButton onClick={onUl} icon={<List className="h-4 w-4" />} title="Unordered List" />
      <ToolbarButton onClick={onOl} icon={<ListOrdered className="h-4 w-4" />} title="Ordered List" />
      <ToolbarButton onClick={onHr} icon={<Minus className="h-4 w-4" />} title="Horizontal Rule" />
    </div>
  )
}

function ToolbarButton({ onClick, icon, title, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      disabled={disabled}
    >
      {icon}
    </Button>
  )
}

function PreviewPane({ html, isLoading, minHeight }: { html: string, isLoading: boolean, minHeight: number }) {
  return (
    <div 
      className="w-full rounded-md border p-4 bg-background overflow-auto"
      style={{ minHeight: `${minHeight}px`, maxHeight: '80vh' }}
    >
      {isLoading && !html ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          Loading preview...
        </div>
      ) : (
        <MarkdownContent renderedHtml={html} />
      )}
    </div>
  )
}
