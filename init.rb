Redmine::Plugin.register :redmine_wiki_sidebar do
  name 'Redmine Wiki Sidebar'
  author 'Web Solutions Ltd (ws.agency)'
  description 'Adds a docs-style hierarchical sidebar to wiki pages with tree navigation, search, and collapsible sections.'
  version '1.1.0'
  url 'https://github.com/wsagency/ws-redmine-wiki-sidebar'
  author_url 'https://ws.agency'

  requires_redmine version_or_higher: '6.0'

  settings default: { 'enabled' => '1', 'default_width' => '280' },
           partial: 'settings/wiki_sidebar_settings'
end

Rails.configuration.to_prepare do
  require_dependency File.expand_path('../lib/redmine_wiki_sidebar/hooks', __FILE__)
end
