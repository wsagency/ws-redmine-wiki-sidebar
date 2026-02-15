class WikiSidebarController < ApplicationController
  before_action :find_project_by_project_id
  before_action :authorize
  accept_api_auth :index

  def index
    wiki = @project.wiki
    return render_404 unless wiki

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
    end
  end

  private

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
