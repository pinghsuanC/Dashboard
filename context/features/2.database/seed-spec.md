# Database Seed

## Overview

Seed the database with the system item types and a demo user with sample content, so the dashboard has realistic data to work with.

## Requirements

- Make the seed idempotent: safe to run repeatedly without duplicating rows
- Use UUIDs for all ids

## Demo user

- John Doe, `john@example.com`, PRO plan, email verified

## System item types

| Name | Icon | Color |
| --- | --- | --- |
| snippet | `Code` | `#3b82f6` |
| prompt | `Sparkles` | `#8b5cf6` |
| command | `Terminal` | `#f97316` |
| note | `StickyNote` | `#fde047` |
| file | `File` | `#6b7280` |
| image | `Image` | `#ec4899` |
| link | `Link` | `#10b981` |

## Collections

★ = favorite

- **React Patterns** ★: useAuth Hook, API Error Handling Pattern, useDebounce Hook (snippets); Server vs Client Components (note); Next.js App Router Docs (link)
- **Python Snippets**: Dedupe While Preserving Order (snippet)
- **Context Files** ★: CLAUDE.md Starter (file); DevStash Architecture Diagram (image)
- **Interview Prep**: API Error Handling Pattern (snippet); Server vs Client Components, Big-O Cheat Sheet (notes)
- **Git Commands** ★: Undo Last Commit, Prune Merged Branches (commands)
- **AI Prompts**: Code Review Prompt, Commit Message Writer (prompts)

Plus one uncollected link: Tailwind CSS v4 Theme Reference.

## Notes

Use `src/lib/mock-data.ts` for item content, tags, and pinned/favorite flags. Items can belong to more than one collection.
