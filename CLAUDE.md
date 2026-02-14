# CLAUDE.md — ws-redmine-wiki-sidebar

## Project
Redmine plugin that adds a docs-style hierarchical sidebar to wiki pages.
Like GitBook, Notion, or Confluence — a tree navigation panel showing all wiki pages.
Open source, MIT license. Copyright Web Solutions Ltd (ws.agency). Initial development Kristijan Lukačin.

## Stack
- **Backend:** Ruby on Rails (Redmine 6.1 plugin architecture, Rails 7.2.3)
- **Frontend:** Vanilla JS, CSS (no jQuery, no frameworks)

## What It Does

### Sidebar Navigation
- Adds a **collapsible sidebar** on the LEFT side of wiki pages
- Shows **hierarchical tree** of all wiki pages in the current project
- Tree structure comes from Redmine's existing `parent_id` on WikiPage model
- **Top-level pages** (no parent) are root nodes
- **Child pages** are nested under their parent, collapsible
- **Current page** is highlighted and auto-expanded in the tree
- Pages sorted alphabetically within each level
- Clicking a page navigates to it (normal link, no AJAX needed)

### UI/UX Details
- Sidebar width: ~280px, with a drag handle to resize (store in localStorage)
- **Toggle button** to show/hide sidebar (icon in wiki toolbar area)
- On mobile/small screens: sidebar hidden by default, hamburger toggle
- **Search/filter** input at top of sidebar — filters pages by title as you type (client-side)
- **Indent guides** — subtle vertical lines showing tree depth (like VS Code)
- Page icons: 📄 regular page, 📁 page with children (expanded), 📂 page with children (collapsed)
- **Collapse all / Expand all** buttons at top
- Smooth animations for expand/collapse (CSS transitions, ~200ms)

### Tree State
- Remember expanded/collapsed state per project in localStorage
- Remember sidebar width in localStorage
- Remember sidebar visible/hidden in localStorage
- Auto-expand path to current page on load

### Wiki Content Area
- Main content shifts right to make room for sidebar
- Sidebar + content = full width (flexbox layout)
- When sidebar is hidden, content takes full width (as before)
- **Do NOT break** existing wiki layout — the sidebar is an addition, not a replacement

### Integration with Redmine Wiki
- Redmine WikiPage model already has:
  - `parent_id` — foreign key to parent WikiPage
  - `WikiPage.find_page(title)` — find by title
  - `wiki.pages` — all pages in a wiki
- Use Redmine's WikiController hooks and/or a custom controller for tree data
- **API endpoint** needed: `GET /projects/:project_id/wiki_sidebar.json` — returns page tree as JSON

## Architecture

### Files to Create
```
init.rb                                          — Plugin registration, routes
app/controllers/wiki_sidebar_controller.rb       — JSON API for page tree
assets/javascripts/wiki_sidebar.js               — Sidebar UI logic
assets/stylesheets/wiki_sidebar.css              — Sidebar styles
lib/redmine_wiki_sidebar/hooks.rb                — View hooks
config/routes.rb                                 — Route for sidebar data API
config/locales/en.yml                            — English translations
config/locales/hr.yml                            — Croatian translations
README.md                                        — Documentation
LICENSE                                          — MIT license
```

### JSON API Response Format
```json
{
  "pages": [
    {
      "title": "Wiki",
      "slug": "wiki",
      "url": "/projects/myproject/wiki/Wiki",
      "children": [
        {
          "title": "Installation",
          "slug": "installation",
          "url": "/projects/myproject/wiki/Installation",
          "children": []
        },
        {
          "title": "Configuration",
          "slug": "configuration",
          "url": "/projects/myproject/wiki/Configuration",
          "children": [
            {
              "title": "Database Setup",
              "slug": "database-setup",
              "url": "/projects/myproject/wiki/Database_Setup",
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "current_page": "database-setup"
}
```

### Controller
```ruby
class WikiSidebarController < ApplicationController
  before_action :find_project
  accept_api_auth :index

  def index
    wiki = @project.wiki
    return render_404 unless wiki

    pages = wiki.pages.includes(:parent).order(:title)
    tree = build_tree(pages)

    respond_to do |format|
      format.json { render json: { pages: tree, current_page: params[:page] } }
    end
  end

  private

  def find_project
    @project = Project.find(params[:project_id])
  rescue ActiveRecord::RecordNotFound
    render_404
  end

  def build_tree(pages)
    # Build nested tree from flat list using parent_id
    # Root pages (parent_id nil) are top level
    # Recursively nest children
  end
end
```

### CSS Layout
```css
/* Wrapper around wiki content */
.wiki-with-sidebar {
  display: flex;
  min-height: calc(100vh - 120px); /* Account for Redmine header/footer */
}

.wiki-sidebar {
  width: 280px;
  min-width: 200px;
  max-width: 500px;
  border-right: 1px solid var(--border-color, #e0e0e0);
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: calc(100vh - 120px);
}

.wiki-sidebar-content {
  flex: 1;
  min-width: 0;
  padding: 0 20px;
}
```

## Critical Redmine 6.1 + Rails 7.2 Rules
1. Use `prepend` for any controller patches (NOT `alias_method_chain`)
2. Plugin assets: `assets/` → served from `/plugin_assets/redmine_wiki_sidebar/`
3. Routes: namespace under project wiki routes
4. No database migrations needed — uses existing WikiPage.parent_id
5. Permissions: respect existing wiki view permissions (don't show pages user can't access)
6. Also respect our wiki-acl plugin if installed (check if WikiPageAcl model exists)
7. Works on: wiki/show, wiki/edit, wiki/history pages

## Quality Checklist
- [ ] Sidebar shows on all wiki pages (show, edit, history)
- [ ] Tree hierarchy matches Redmine's parent/child page structure
- [ ] Current page highlighted and path expanded
- [ ] Expand/collapse works with smooth animations
- [ ] Search/filter filters pages by title
- [ ] Sidebar resizable with drag handle
- [ ] Toggle show/hide sidebar
- [ ] State persisted in localStorage (expanded nodes, width, visibility)
- [ ] Mobile responsive (hidden by default, toggle to show)
- [ ] No layout breakage — existing wiki content looks normal
- [ ] JSON API returns correct tree structure
- [ ] Respects wiki permissions (don't show restricted pages)
- [ ] No JavaScript errors in console
- [ ] Plugin installs cleanly (no migrations needed)
- [ ] Works with both light and dark themes
- [ ] Fast — no perceivable delay loading sidebar
