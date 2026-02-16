class WikiSidebarController < ApplicationController
  # NOTE: Do NOT use accept_api_auth here! It causes Redmine to send
  # WWW-Authenticate: Basic header on 401 for JSON requests, which
  # triggers the browser's native basic auth dialog for AJAX calls.
  before_action :find_project_by_project_id
  before_action :check_wiki_view_permission

  def index
    wiki = @project.wiki
    return render json: { pages: [], current_page: nil }, status: :not_found unless wiki

    pages = wiki.pages.includes(:parent, :wiki).order(:title)

    # If WikiPageAcl model exists (ws wiki-acl plugin), filter by page-level permissions
    if defined?(WikiPageAcl)
      visible_pages = pages.select { |p| WikiPageAcl.visible_to?(p, User.current) rescue true }
    else
      visible_pages = pages.to_a
    end

    tree = build_tree(visible_pages)

    respond_to do |format|
      format.json { render json: { pages: tree, current_page: params[:page] } }
      format.html { render json: { pages: tree, current_page: params[:page] } }
    end
  end

  private

  # Check :view_wiki_pages permission instead of using the generic
  # `authorize` filter (which would fail because no Redmine permission
  # is mapped to wiki_sidebar#index). Returns empty JSON on failure
  # instead of triggering a login dialog.
  def check_wiki_view_permission
    unless User.current.allowed_to?(:view_wiki_pages, @project)
      render json: { pages: [], current_page: nil }, status: :forbidden
      return false
    end
    true
  end

  def build_tree(pages)
    pages_by_parent = pages.group_by(&:parent_id)

    build_children = ->(parent_id) do
      (pages_by_parent[parent_id] || []).sort_by { |p| p.title.downcase }.map do |page|
        {
          title: page.title,
          slug: page.slug,
          url: project_wiki_page_path(@project, page.slug),
          children: build_children.call(page.id)
        }
      end
    end

    build_children.call(nil)
  end
end
