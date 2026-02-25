'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createProject, updateProject, fetchGithubReadme } from '@/lib/actions/projects'
import type { ProjectView } from '@/types'
import { Loader2, RefreshCw, Github } from 'lucide-react'

interface ProjectFormProps {
  initialData?: ProjectView
}

export function ProjectForm({ initialData }: ProjectFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isFetchingReadme, setIsFetchingReadme] = React.useState(false)

  const [title, setTitle] = React.useState(initialData?.title ?? '')
  const [description, setDescription] = React.useState(initialData?.description ?? '')
  const [githubUrl, setGithubUrl] = React.useState(initialData?.githubUrl ?? '')
  const [imageUrl, setImageUrl] = React.useState(initialData?.imageUrl ?? '')
  const [status, setStatus] = React.useState<'draft' | 'published' | 'archived'>(
    initialData?.status ?? 'draft'
  )
  const [readmePreview, setReadmePreview] = React.useState<string | null>(
    initialData?.cachedReadme ?? null
  )

  const handleFetchReadme = async () => {
    const url = githubUrl.trim()
    if (!url) {
      toast({
        title: 'GitHub URL required',
        description: 'Please enter a GitHub repository URL first.',
        variant: 'destructive',
      })
      return
    }

    setIsFetchingReadme(true)
    try {
      const result = await fetchGithubReadme(url)
      if (result.success) {
        setReadmePreview(result.data)
        toast({
          title: 'README fetched',
          description: 'README content loaded successfully. It will be saved with the project.',
        })
      } else {
        toast({
          title: 'Failed to fetch README',
          description: result.error,
          variant: 'destructive',
        })
      }
    } finally {
      setIsFetchingReadme(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title is required',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title,
        description: description || null,
        githubUrl: githubUrl || null,
        imageUrl: imageUrl || null,
        status,
      }

      const result = initialData
        ? await updateProject(initialData.id, payload)
        : await createProject(payload)

      if (result.success) {
        toast({
          title: 'Success',
          description: initialData ? 'Project updated' : 'Project created',
        })
        router.push('/admin/projects')
        router.refresh()
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter project title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: 'draft' | 'published' | 'archived') => setStatus(value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown on the project card"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="githubUrl">GitHub Repository URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="githubUrl"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="pl-9"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchReadme}
            disabled={isFetchingReadme || !githubUrl.trim()}
          >
            {isFetchingReadme ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isFetchingReadme ? 'Fetching…' : 'Fetch README'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The README will be automatically loaded when creating or updating the project.
          Use the button to preview it here first.
        </p>
      </div>

      {readmePreview && (
        <div className="space-y-2">
          <Label>README Preview</Label>
          <div className="rounded-md border p-4 bg-muted/30 max-h-64 overflow-y-auto">
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {readmePreview.slice(0, 2000)}
              {readmePreview.length > 2000 && '\n\n… (truncated for preview)'}
            </pre>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Cover Image URL (Optional)</Label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/screenshot.png"
        />
        <p className="text-xs text-muted-foreground">
          Displayed as the project card thumbnail.
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/projects')}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}
