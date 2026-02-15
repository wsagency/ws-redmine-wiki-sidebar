# Redmine Wiki Sidebar

A Redmine plugin that adds a docs-style hierarchical sidebar to wiki pages — like GitBook, Notion, or Confluence.

## Features

- **Hierarchical tree navigation** of all wiki pages in a project
- **Collapsible nodes** with expand/collapse all
- **Search/filter** pages by title (client-side, instant)
- **Current page highlighting** with auto-expanded path
- **Resizable sidebar** with drag handle (width persisted in localStorage)
- **Toggle show/hide** sidebar
- **State persistence** — expanded nodes, width, and visibility saved per project
- **Mobile responsive** — hidden by default on small screens, toggle to show
- **Dark theme support** — works with both light and dark Redmine themes
- **Permission-aware** — respects Redmine wiki view permissions
- **No database migrations** — uses existing WikiPage parent/child structure

## Requirements

- Redmine 6.0 or higher
- Ruby 3.0+

## Installation

1. Clone or download this plugin into your Redmine plugins directory:

   ```bash
   cd /path/to/redmine/plugins
   git clone https://github.com/nicbet/redmine_wiki_sidebar.git
   ```

2. Restart Redmine:

   ```bash
   # If using Puma
   bundle exec rails server

   # If using Passenger
   touch tmp/restart.txt
   ```

3. No database migration is needed.

4. The sidebar will appear automatically on all wiki pages.

## Configuration

No configuration required. The sidebar appears on all wiki pages for users with wiki view permissions.

### localStorage Keys

The sidebar persists the following state per project:

| Key | Description |
|-----|-------------|
| `wiki_sidebar_{project}_expanded` | Expanded/collapsed node state |
| `wiki_sidebar_{project}_width` | Sidebar width in pixels |
| `wiki_sidebar_{project}_visible` | Sidebar show/hide state |

## API

The plugin provides a JSON API endpoint for the page tree:

```
GET /projects/:project_id/wiki_sidebar.json?page=:current_page
```

Returns a nested tree structure of all wiki pages the current user can access.

## Compatibility

- Redmine 6.0+
- Rails 7.2+
- Compatible with the `redmine_wiki_acl` plugin (respects page-level permissions if installed)
- Works on wiki show, edit, and history pages

## License

MIT License. Copyright (c) 2025 Web Solutions Ltd (ws.agency).

See [LICENSE](LICENSE) for details.
