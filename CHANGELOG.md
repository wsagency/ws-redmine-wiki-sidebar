# Changelog

All notable changes to ws-redmine-wiki-sidebar will be documented in this file.

## [1.0.2] - 2026-02-16

### Fixed
- Replace `page.slug` with `page.title` — Redmine 6.1 WikiPage has no `slug` attribute, causing `NoMethodError` crash on wiki pages
- Remove `accept_api_auth :index` from controller — it caused Redmine to send `WWW-Authenticate: Basic` header on 401 for JSON requests, triggering browser's native Basic Auth dialog
- Replace generic `authorize` filter with `check_wiki_view_permission` that checks `:view_wiki_pages` and returns empty JSON on failure (no popup)
- Remove `format: :json` from sidebar URL in hooks — use `Accept` header instead

## [1.0.0] - 2026-02-14

### Added
- Docs-style hierarchical tree sidebar for wiki pages
- Collapsible/expandable tree nodes with persistent state (localStorage)
- Search/filter input for quick page lookup
- Auto-expand path to current page
- Resizable sidebar with drag handle (200–500px)
- Mobile-responsive: hidden by default on small screens
- Toggle button to show/hide sidebar
- Expand all / Collapse all buttons
- Integration with ws-redmine-wiki-acl (filters restricted pages if installed)
