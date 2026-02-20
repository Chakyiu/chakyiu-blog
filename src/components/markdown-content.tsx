interface MarkdownContentProps {
  renderedHtml: string
  className?: string
}

export function MarkdownContent({ renderedHtml, className }: MarkdownContentProps) {
  return (
    <>
      <style>{`
        .shiki.github-dark { display: none; }
        .dark .shiki.github-light { display: none; }
        .dark .shiki.github-dark { display: block; }
      `}</style>
      <div
        className={[
          'prose prose-neutral dark:prose-invert max-w-none',
          'prose-pre:p-0 prose-pre:bg-transparent',
          'prose-code:before:content-none prose-code:after:content-none',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </>
  )
}
