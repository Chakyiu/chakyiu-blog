import { defaultSchema } from 'rehype-sanitize'

export const commentSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    pre: ['className', 'style', 'tabindex', ...(defaultSchema.attributes?.pre ?? [])],
    span: ['className', 'style', ...(defaultSchema.attributes?.span ?? [])],
    code: ['className', 'style', ...(defaultSchema.attributes?.code ?? [])],
    '*': ['className'],
  },
  tagNames: [...(defaultSchema.tagNames ?? []), 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del', 'input'],
}
