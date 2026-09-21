/**
 * Mock data for the dashboard UI.
 *
 * Single source of truth for UI work until Prisma/Neon is wired up.
 * Shapes mirror the planned schema (see context/item-types.md) so that
 * swapping these arrays for real queries is a drop-in change.
 *
 * Import directly — no helpers, no lookups:
 *   import { MOCK_ITEMS, MOCK_COLLECTIONS } from '@/lib/mock-data';
 */

// ─────────────────────────────  Types  ─────────────────────────────

export type ContentType = 'TEXT' | 'FILE' | 'URL';

export type Plan = 'FREE' | 'PRO';

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: Plan;
}

export interface ItemType {
  id: string;
  name: string;
  label: string;
  /** Lucide icon name — map to a component in the UI, not here. */
  icon: string;
  /** Hex, used for the icon foreground and a tinted background. */
  color: string;
  contentType: ContentType;
  route: string;
  isPro: boolean;
  /** Display-only sidebar badge. Not derived from MOCK_ITEMS. */
  itemCount: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFavorite: boolean;
  /** Display-only card stat. Not derived from MOCK_ITEMS. */
  itemCount: number;
  /** Type icons shown on the card; the first one tints the card border. */
  itemTypeIds: string[];
}

export interface Item {
  id: string;
  title: string;
  description: string;
  itemTypeId: string;
  contentType: ContentType;
  /** TEXT items: snippet, prompt, command, note. */
  content: string | null;
  /** Snippets only — syntax highlighting hint. */
  language: string | null;
  /** URL items. */
  url: string | null;
  /** FILE items: file, image. */
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  isPinned: boolean;
  isFavorite: boolean;
  tags: string[];
  collectionIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────  User  ─────────────────────────────

export const MOCK_USER: User = {
  id: 'user_1',
  name: 'John Doe',
  email: 'john@example.com',
  image: null,
  plan: 'PRO',
};

// ─────────────────────────  Item types  ─────────────────────────

export const MOCK_ITEM_TYPES: ItemType[] = [
  {
    id: 'type_snippet',
    name: 'snippet',
    label: 'Snippets',
    icon: 'Code',
    color: '#3b82f6',
    contentType: 'TEXT',
    route: '/items/snippets',
    isPro: false,
    itemCount: 24,
  },
  {
    id: 'type_prompt',
    name: 'prompt',
    label: 'Prompts',
    icon: 'Sparkles',
    color: '#8b5cf6',
    contentType: 'TEXT',
    route: '/items/prompts',
    isPro: false,
    itemCount: 18,
  },
  {
    id: 'type_command',
    name: 'command',
    label: 'Commands',
    icon: 'Terminal',
    color: '#f97316',
    contentType: 'TEXT',
    route: '/items/commands',
    isPro: false,
    itemCount: 15,
  },
  {
    id: 'type_note',
    name: 'note',
    label: 'Notes',
    icon: 'StickyNote',
    color: '#fde047',
    contentType: 'TEXT',
    route: '/items/notes',
    isPro: false,
    itemCount: 12,
  },
  {
    id: 'type_file',
    name: 'file',
    label: 'Files',
    icon: 'File',
    color: '#6b7280',
    contentType: 'FILE',
    route: '/items/files',
    isPro: true,
    itemCount: 5,
  },
  {
    id: 'type_image',
    name: 'image',
    label: 'Images',
    icon: 'Image',
    color: '#ec4899',
    contentType: 'FILE',
    route: '/items/images',
    isPro: true,
    itemCount: 3,
  },
  {
    id: 'type_link',
    name: 'link',
    label: 'Links',
    icon: 'Link',
    color: '#10b981',
    contentType: 'URL',
    route: '/items/links',
    isPro: false,
    itemCount: 8,
  },
];

// ─────────────────────────  Collections  ─────────────────────────

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col_react_patterns',
    name: 'React Patterns',
    slug: 'react-patterns',
    description: 'Common React patterns and hooks',
    isFavorite: true,
    itemCount: 12,
    itemTypeIds: ['type_snippet', 'type_note', 'type_link'],
  },
  {
    id: 'col_python_snippets',
    name: 'Python Snippets',
    slug: 'python-snippets',
    description: 'Useful Python code snippets',
    isFavorite: false,
    itemCount: 8,
    itemTypeIds: ['type_snippet', 'type_note'],
  },
  {
    id: 'col_context_files',
    name: 'Context Files',
    slug: 'context-files',
    description: 'AI context files for projects',
    isFavorite: true,
    itemCount: 5,
    itemTypeIds: ['type_file', 'type_note'],
  },
  {
    id: 'col_interview_prep',
    name: 'Interview Prep',
    slug: 'interview-prep',
    description: 'Technical interview preparation',
    isFavorite: false,
    itemCount: 24,
    itemTypeIds: ['type_note', 'type_snippet', 'type_link', 'type_prompt'],
  },
  {
    id: 'col_git_commands',
    name: 'Git Commands',
    slug: 'git-commands',
    description: 'Frequently used git commands',
    isFavorite: true,
    itemCount: 15,
    itemTypeIds: ['type_command', 'type_note'],
  },
  {
    id: 'col_ai_prompts',
    name: 'AI Prompts',
    slug: 'ai-prompts',
    description: 'Curated AI prompts for coding',
    isFavorite: false,
    itemCount: 18,
    itemTypeIds: ['type_prompt', 'type_snippet', 'type_note'],
  },
];

// ─────────────────────────────  Items  ─────────────────────────────

export const MOCK_ITEMS: Item[] = [
  {
    id: 'item_use_auth_hook',
    title: 'useAuth Hook',
    description: 'Custom authentication hook for React applications',
    itemTypeId: 'type_snippet',
    contentType: 'TEXT',
    content: `import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}`,
    language: 'typescript',
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: true,
    isFavorite: true,
    tags: ['react', 'auth', 'hooks'],
    collectionIds: ['col_react_patterns'],
    createdAt: '2024-01-15T09:24:00.000Z',
    updatedAt: '2024-01-15T09:24:00.000Z',
  },
  {
    id: 'item_api_error_handling',
    title: 'API Error Handling Pattern',
    description: 'Fetch wrapper with exponential backoff retry logic',
    itemTypeId: 'type_snippet',
    contentType: 'TEXT',
    content: `export async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, options)
    if (res.ok) return res.json()
    await new Promise((r) => setTimeout(r, 2 ** attempt * 200))
  }
  throw new Error('Request failed after ' + retries + ' attempts')
}`,
    language: 'typescript',
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: true,
    isFavorite: false,
    tags: ['fetch', 'error-handling', 'retry'],
    collectionIds: ['col_react_patterns', 'col_interview_prep'],
    createdAt: '2024-01-12T14:02:00.000Z',
    updatedAt: '2024-01-12T14:02:00.000Z',
  },
  {
    id: 'item_debounce_hook',
    title: 'useDebounce Hook',
    description: 'Debounce a fast-changing value before using it',
    itemTypeId: 'type_snippet',
    contentType: 'TEXT',
    content: `import { useEffect, useState } from 'react'

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}`,
    language: 'typescript',
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: true,
    tags: ['react', 'hooks', 'performance'],
    collectionIds: ['col_react_patterns'],
    createdAt: '2024-01-11T08:15:00.000Z',
    updatedAt: '2024-01-18T11:40:00.000Z',
  },
  {
    id: 'item_python_dedupe',
    title: 'Dedupe While Preserving Order',
    description: 'Remove duplicates from a Python list without losing order',
    itemTypeId: 'type_snippet',
    contentType: 'TEXT',
    content: `def dedupe(items):
    seen = set()
    return [x for x in items if not (x in seen or seen.add(x))]`,
    language: 'python',
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['python', 'lists'],
    collectionIds: ['col_python_snippets'],
    createdAt: '2024-01-09T16:30:00.000Z',
    updatedAt: '2024-01-09T16:30:00.000Z',
  },
  {
    id: 'item_code_review_prompt',
    title: 'Code Review Prompt',
    description: 'Ask an LLM for a focused review of a diff',
    itemTypeId: 'type_prompt',
    contentType: 'TEXT',
    content: `You are a senior engineer reviewing a pull request.

Review the diff below for correctness bugs, missing edge cases, and
security issues. Ignore formatting. For each finding give the file,
the problem, and a concrete fix.

Diff:
{{diff}}`,
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: true,
    isFavorite: true,
    tags: ['review', 'ai', 'quality'],
    collectionIds: ['col_ai_prompts'],
    createdAt: '2024-01-14T10:05:00.000Z',
    updatedAt: '2024-01-14T10:05:00.000Z',
  },
  {
    id: 'item_commit_message_prompt',
    title: 'Commit Message Writer',
    description: 'Turn a staged diff into a conventional commit message',
    itemTypeId: 'type_prompt',
    contentType: 'TEXT',
    content: `Write a conventional commit message for the staged changes.

Rules: one line under 72 characters, imperative mood, no body unless
the change is non-obvious.

Changes:
{{diff}}`,
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['git', 'ai', 'workflow'],
    collectionIds: ['col_ai_prompts'],
    createdAt: '2024-01-08T13:45:00.000Z',
    updatedAt: '2024-01-08T13:45:00.000Z',
  },
  {
    id: 'item_git_undo_commit',
    title: 'Undo Last Commit (Keep Changes)',
    description: 'Move HEAD back one commit and keep the work staged',
    itemTypeId: 'type_command',
    contentType: 'TEXT',
    content: 'git reset --soft HEAD~1',
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: true,
    tags: ['git', 'undo'],
    collectionIds: ['col_git_commands'],
    createdAt: '2024-01-10T07:20:00.000Z',
    updatedAt: '2024-01-10T07:20:00.000Z',
  },
  {
    id: 'item_git_prune_branches',
    title: 'Prune Merged Branches',
    description: 'Delete local branches already merged into main',
    itemTypeId: 'type_command',
    contentType: 'TEXT',
    content: "git branch --merged main | grep -v 'main' | xargs git branch -d",
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['git', 'cleanup'],
    collectionIds: ['col_git_commands'],
    createdAt: '2024-01-06T09:00:00.000Z',
    updatedAt: '2024-01-06T09:00:00.000Z',
  },
  {
    id: 'item_rsc_notes',
    title: 'Server vs Client Components',
    description: 'When a component actually needs the client boundary',
    itemTypeId: 'type_note',
    contentType: 'TEXT',
    content: `## Rules of thumb

- Server by default. Only add \`'use client'\` for interactivity,
  hooks, or browser APIs.
- The boundary is one-way: everything imported by a client component
  ships to the browser too.
- Push \`'use client'\` down the tree — wrap the button, not the page.`,
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['nextjs', 'react', 'architecture'],
    collectionIds: ['col_react_patterns', 'col_interview_prep'],
    createdAt: '2024-01-05T15:10:00.000Z',
    updatedAt: '2024-01-17T09:30:00.000Z',
  },
  {
    id: 'item_big_o_notes',
    title: 'Big-O Cheat Sheet',
    description: 'Complexity of the usual suspects, for interview prep',
    itemTypeId: 'type_note',
    contentType: 'TEXT',
    content: `| Operation | Array | Hash map | Balanced BST |
| --- | --- | --- | --- |
| Lookup | O(n) | O(1) | O(log n) |
| Insert | O(n) | O(1) | O(log n) |
| Ordered scan | O(n) | O(n log n) | O(n) |`,
    language: null,
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['algorithms', 'interview'],
    collectionIds: ['col_interview_prep'],
    createdAt: '2024-01-03T12:00:00.000Z',
    updatedAt: '2024-01-03T12:00:00.000Z',
  },
  {
    id: 'item_claude_context_file',
    title: 'CLAUDE.md Starter',
    description: 'Baseline agent context file for new projects',
    itemTypeId: 'type_file',
    contentType: 'FILE',
    content: null,
    language: null,
    url: null,
    fileUrl: 'https://files.example.com/user_1/claude-starter.md',
    fileName: 'CLAUDE.md',
    fileSize: 4812,
    isPinned: false,
    isFavorite: true,
    tags: ['ai', 'context', 'template'],
    collectionIds: ['col_context_files'],
    createdAt: '2024-01-07T11:25:00.000Z',
    updatedAt: '2024-01-07T11:25:00.000Z',
  },
  {
    id: 'item_architecture_diagram',
    title: 'DevStash Architecture Diagram',
    description: 'Exported diagram of the app and data layers',
    itemTypeId: 'type_image',
    contentType: 'FILE',
    content: null,
    language: null,
    url: null,
    fileUrl: 'https://files.example.com/user_1/architecture.png',
    fileName: 'architecture.png',
    fileSize: 268431,
    isPinned: false,
    isFavorite: false,
    tags: ['architecture', 'diagram'],
    collectionIds: ['col_context_files'],
    createdAt: '2024-01-04T17:45:00.000Z',
    updatedAt: '2024-01-04T17:45:00.000Z',
  },
  {
    id: 'item_link_next_docs',
    title: 'Next.js App Router Docs',
    description: 'Official guide for routing, layouts, and server actions',
    itemTypeId: 'type_link',
    contentType: 'URL',
    content: null,
    language: null,
    url: 'https://nextjs.org/docs/app',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: true,
    tags: ['nextjs', 'docs'],
    collectionIds: ['col_react_patterns'],
    createdAt: '2024-01-02T10:30:00.000Z',
    updatedAt: '2024-01-02T10:30:00.000Z',
  },
  {
    id: 'item_link_tailwind_v4',
    title: 'Tailwind CSS v4 Theme Reference',
    description: 'CSS-first configuration with the @theme directive',
    itemTypeId: 'type_link',
    contentType: 'URL',
    content: null,
    language: null,
    url: 'https://tailwindcss.com/docs/theme',
    fileUrl: null,
    fileName: null,
    fileSize: null,
    isPinned: false,
    isFavorite: false,
    tags: ['tailwind', 'css', 'docs'],
    collectionIds: [],
    createdAt: '2024-01-01T08:00:00.000Z',
    updatedAt: '2024-01-01T08:00:00.000Z',
  },
];
