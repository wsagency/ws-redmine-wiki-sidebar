RedmineApp::Application.routes.draw do
  get 'projects/:project_id/wiki_sidebar', to: 'wiki_sidebar#index', as: 'wiki_sidebar'
end
