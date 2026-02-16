# Changelog

All notable changes to ws-redmine-wiki-sidebar will be documented in this file.

## [1.1.0] - 2026-02-16

### Changed
- Refactored layout: sidebar renders INSIDE `#content` as flex child — no DOM reparenting, preserves Redmine CSS
- Added plugin settings page with enable/disable toggle and default sidebar width
- Version bump to 1.1.0

### Fixed
- Broken page layout after saving wiki pages — `#content` was being moved out of its parent, breaking Redmine CSS structure

## [1.0.2] - 2026-02-16

### Fixed
- Replace `page.slug` with `page.title` — Redmine 6.1 WikiPage has no `slug` attribute
- Remove `accept_api_auth :index` — prevented browser Basic Auth popup on AJAX calls
- Replace generic `authorize` with `check_wiki_view_permission` (checks `:view_wiki_pages`)

## [1.0.0] - 2026-02-14

### Added
- Docs-style hierarchical tree sidebar for wiki pages
- Collapsible/expandable tree nodes with persistent state (localStorage)
- Search/filter input for quick page lookup
- Auto-expand path to current page
- Resizable sidebar with drag handle (200–500px)
- Toggle button to show/hide sidebar
- Integration with ws-redmine-wiki-acl (filters restricted pages if installed)
