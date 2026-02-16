module RedmineWikiSidebar
  class Hooks < Redmine::Hook::ViewListener
    def view_layouts_base_html_head(context = {})
      return '' unless wiki_page?(context) && plugin_enabled?

      stylesheet_link_tag('wiki_sidebar', plugin: :redmine_wiki_sidebar) +
        javascript_include_tag('wiki_sidebar', plugin: :redmine_wiki_sidebar)
    end

    def view_layouts_base_body_bottom(context = {})
      return '' unless wiki_page?(context) && plugin_enabled?

      controller = context[:controller]
      project = controller.instance_variable_get(:@project)
      page = controller.instance_variable_get(:@page)

      return '' unless project&.wiki

      settings = Setting.plugin_redmine_wiki_sidebar || {}
      default_width = settings['default_width'] || '280'

      context[:controller].send(:render_to_string, {
        partial: 'wiki_sidebar/sidebar_init',
        locals: {
          project_id: project.identifier,
          sidebar_url: Rails.application.routes.url_helpers.wiki_sidebar_path(project),
          current_page: page&.title,
          default_width: default_width
        }
      })
    end

    private

    def wiki_page?(context)
      controller = context[:controller]
      controller.is_a?(WikiController) || controller.class.name == 'WikiController'
    end

    def plugin_enabled?
      settings = Setting.plugin_redmine_wiki_sidebar rescue {}
      settings['enabled'] != '0'
    end
  end
end
