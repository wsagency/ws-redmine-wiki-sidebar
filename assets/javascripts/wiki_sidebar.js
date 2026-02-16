(function() {
  'use strict';

  var STORAGE_PREFIX = 'wiki_sidebar_';

  // --- Storage helpers ---

  function storageKey(projectId, key) {
    return STORAGE_PREFIX + projectId + '_' + key;
  }

  function loadJSON(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      // localStorage full or unavailable
    }
  }

  // --- DOM helpers ---

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        if (k === 'className') {
          node.className = attrs[k];
        } else if (k === 'textContent') {
          node.textContent = attrs[k];
        } else if (k.indexOf('on') === 0) {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else {
          node.setAttribute(k, attrs[k]);
        }
      });
    }
    if (children) {
      children.forEach(function(child) {
        if (child) node.appendChild(child);
      });
    }
    return node;
  }

  // --- Main WikiSidebar ---

  window.WikiSidebar = {
    config: null,
    expandedNodes: {},
    sidebarVisible: true,
    sidebarWidth: 280,
    filterText: '',

    init: function(config) {
      this.config = config;

      // Load persisted state
      this.expandedNodes = loadJSON(storageKey(config.projectId, 'expanded'), {});
      this.sidebarVisible = loadJSON(storageKey(config.projectId, 'visible'), true);
      this.sidebarWidth = loadJSON(storageKey(config.projectId, 'width'), 280);

      // On mobile, default hidden
      if (window.innerWidth < 768) {
        this.sidebarVisible = false;
      }

      this.fetchTree();
    },

    fetchTree: function() {
      var self = this;
      var url = this.config.sidebarUrl;
      if (this.config.currentPage) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + 'page=' + encodeURIComponent(this.config.currentPage);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      // Include CSRF token
      var csrfMeta = document.querySelector('meta[name="csrf-token"]');
      if (csrfMeta) {
        xhr.setRequestHeader('X-CSRF-Token', csrfMeta.getAttribute('content'));
      }

      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var data = JSON.parse(xhr.responseText);
            self.render(data);
          } catch (e) {
            console.error('WikiSidebar: Failed to parse response', e);
          }
        } else {
          // Silently fail — don't break the page
          console.warn('WikiSidebar: HTTP ' + xhr.status);
        }
      };
      xhr.onerror = function() {
        console.error('WikiSidebar: Failed to fetch tree');
      };
      xhr.send();
    },

    render: function(data) {
      var self = this;
      var contentDiv = document.getElementById('content');
      if (!contentDiv) return;

      // Auto-expand path to current page
      this.autoExpandPath(data.pages, data.current_page);

      // Build sidebar DOM
      var sidebar = el('div', { className: 'wiki-sidebar', id: 'wiki-sidebar' });
      sidebar.style.width = this.sidebarWidth + 'px';

      // Header with toggle, search, expand/collapse buttons
      var header = this.buildHeader();
      sidebar.appendChild(header);

      // Tree container
      var treeContainer = el('div', { className: 'wiki-sidebar__tree', id: 'wiki-sidebar-tree' });
      this.buildTree(treeContainer, data.pages, data.current_page, 0);
      sidebar.appendChild(treeContainer);

      // Resize handle
      var handle = el('div', { className: 'wiki-sidebar__resize-handle' });
      this.setupResize(handle, sidebar);
      sidebar.appendChild(handle);

      // === Layout approach: keep #content in place, add flex inside ===
      // Move all existing children of #content into a wrapper div
      var contentInner = el('div', { className: 'wiki-sidebar__content-inner' });
      while (contentDiv.firstChild) {
        contentInner.appendChild(contentDiv.firstChild);
      }

      // Add sidebar + content wrapper to #content
      contentDiv.appendChild(sidebar);
      contentDiv.appendChild(contentInner);

      // Make #content a flex container
      contentDiv.classList.add('wiki-has-sidebar');

      // Toggle button in contextual area
      this.addToggleButton(sidebar, contentDiv);

      // Apply initial visibility
      if (!this.sidebarVisible) {
        sidebar.classList.add('wiki-sidebar--hidden');
        contentDiv.classList.add('wiki-sidebar--collapsed');
      }
    },

    buildHeader: function() {
      var self = this;
      var header = el('div', { className: 'wiki-sidebar__header' });

      // Title row with collapse/expand buttons
      var titleRow = el('div', { className: 'wiki-sidebar__title-row' });

      var title = el('span', { className: 'wiki-sidebar__title', textContent: 'Pages' });
      titleRow.appendChild(title);

      var btnGroup = el('div', { className: 'wiki-sidebar__btn-group' });

      var expandAllBtn = el('button', {
        className: 'wiki-sidebar__btn',
        title: 'Expand all',
        textContent: '\u25BC',
        onClick: function() { self.expandAll(); }
      });
      btnGroup.appendChild(expandAllBtn);

      var collapseAllBtn = el('button', {
        className: 'wiki-sidebar__btn',
        title: 'Collapse all',
        textContent: '\u25B6',
        onClick: function() { self.collapseAll(); }
      });
      btnGroup.appendChild(collapseAllBtn);

      titleRow.appendChild(btnGroup);
      header.appendChild(titleRow);

      // Search input
      var searchWrap = el('div', { className: 'wiki-sidebar__search-wrap' });
      var searchInput = el('input', {
        className: 'wiki-sidebar__search',
        type: 'text',
        placeholder: 'Filter pages...',
        id: 'wiki-sidebar-search'
      });
      searchInput.addEventListener('input', function() {
        self.filterText = this.value.toLowerCase();
        self.applyFilter();
      });
      searchWrap.appendChild(searchInput);
      header.appendChild(searchWrap);

      return header;
    },

    buildTree: function(container, pages, currentPage, depth) {
      var self = this;

      pages.forEach(function(page) {
        var hasChildren = page.children && page.children.length > 0;
        var isExpanded = !!self.expandedNodes[page.slug];
        var isCurrent = page.slug === currentPage;

        var item = el('div', {
          className: 'wiki-sidebar__item',
          'data-slug': page.slug,
          'data-depth': depth
        });

        var row = el('div', {
          className: 'wiki-sidebar__row' + (isCurrent ? ' wiki-sidebar__row--active' : '')
        });
        row.style.paddingLeft = (12 + depth * 16) + 'px';

        // Toggle arrow (for items with children)
        if (hasChildren) {
          var toggle = el('span', {
            className: 'wiki-sidebar__toggle' + (isExpanded ? ' wiki-sidebar__toggle--expanded' : ''),
            textContent: '\u25B6',
            onClick: function(e) {
              e.preventDefault();
              e.stopPropagation();
              self.toggleNode(page.slug);
            }
          });
          row.appendChild(toggle);
        } else {
          var spacer = el('span', { className: 'wiki-sidebar__toggle-spacer' });
          row.appendChild(spacer);
        }

        // Icon
        var icon = el('span', { className: 'wiki-sidebar__icon' });
        if (!hasChildren) {
          icon.textContent = '\uD83D\uDCC4'; // 📄
        } else if (isExpanded) {
          icon.textContent = '\uD83D\uDCC2'; // 📂
        } else {
          icon.textContent = '\uD83D\uDCC1'; // 📁
        }
        row.appendChild(icon);

        // Link
        var link = el('a', {
          className: 'wiki-sidebar__link',
          href: page.url,
          textContent: page.title
        });
        row.appendChild(link);

        item.appendChild(row);

        // Children container
        if (hasChildren) {
          var childContainer = el('div', {
            className: 'wiki-sidebar__children' + (isExpanded ? '' : ' wiki-sidebar__children--collapsed')
          });

          self.buildTree(childContainer, page.children, currentPage, depth + 1);
          item.appendChild(childContainer);
        }

        container.appendChild(item);
      });
    },

    toggleNode: function(slug) {
      this.expandedNodes[slug] = !this.expandedNodes[slug];
      this.saveExpandedState();
      this.refreshNode(slug);
    },

    refreshNode: function(slug) {
      var item = document.querySelector('.wiki-sidebar__item[data-slug="' + CSS.escape(slug) + '"]');
      if (!item) return;

      var isExpanded = !!this.expandedNodes[slug];
      var toggle = item.querySelector(':scope > .wiki-sidebar__row > .wiki-sidebar__toggle');
      var icon = item.querySelector(':scope > .wiki-sidebar__row > .wiki-sidebar__icon');
      var children = item.querySelector(':scope > .wiki-sidebar__children');

      if (toggle) {
        toggle.classList.toggle('wiki-sidebar__toggle--expanded', isExpanded);
      }

      if (icon && children) {
        icon.textContent = isExpanded ? '\uD83D\uDCC2' : '\uD83D\uDCC1';
      }

      if (children) {
        children.classList.toggle('wiki-sidebar__children--collapsed', !isExpanded);
      }
    },

    expandAll: function() {
      var self = this;
      document.querySelectorAll('.wiki-sidebar__item[data-slug]').forEach(function(item) {
        var slug = item.getAttribute('data-slug');
        var children = item.querySelector(':scope > .wiki-sidebar__children');
        if (children) {
          self.expandedNodes[slug] = true;
          self.refreshNode(slug);
        }
      });
      this.saveExpandedState();
    },

    collapseAll: function() {
      var self = this;
      this.expandedNodes = {};
      document.querySelectorAll('.wiki-sidebar__item[data-slug]').forEach(function(item) {
        var slug = item.getAttribute('data-slug');
        self.refreshNode(slug);
      });
      this.saveExpandedState();
    },

    autoExpandPath: function(pages, currentSlug) {
      if (!currentSlug) return;

      // Build slug-to-parent map
      var parentMap = {};
      var buildMap = function(nodes, parentSlug) {
        nodes.forEach(function(node) {
          if (parentSlug) parentMap[node.slug] = parentSlug;
          if (node.children) buildMap(node.children, node.slug);
        });
      };
      buildMap(pages, null);

      // Walk up from current page and expand all ancestors
      var slug = currentSlug;
      while (slug) {
        this.expandedNodes[slug] = true;
        slug = parentMap[slug];
      }
      this.saveExpandedState();
    },

    applyFilter: function() {
      var self = this;
      var filterText = this.filterText;
      var items = document.querySelectorAll('.wiki-sidebar__item');

      if (!filterText) {
        // Show all, restore expand/collapse state
        items.forEach(function(item) {
          item.style.display = '';
          var slug = item.getAttribute('data-slug');
          self.refreshNode(slug);
        });
        return;
      }

      // For filtering: show matching items and their ancestors
      var matchingSlugs = {};

      // First pass: find matching items
      items.forEach(function(item) {
        var link = item.querySelector('.wiki-sidebar__link');
        if (link && link.textContent.toLowerCase().indexOf(filterText) !== -1) {
          matchingSlugs[item.getAttribute('data-slug')] = true;
        }
      });

      // Second pass: show/hide items, expand parents of matches
      items.forEach(function(item) {
        var slug = item.getAttribute('data-slug');
        var hasMatchingDescendant = Array.prototype.some.call(
          item.querySelectorAll('.wiki-sidebar__item[data-slug]'),
          function(child) { return matchingSlugs[child.getAttribute('data-slug')]; }
        );

        if (matchingSlugs[slug] || hasMatchingDescendant) {
          item.style.display = '';
          if (hasMatchingDescendant) {
            var children = item.querySelector(':scope > .wiki-sidebar__children');
            if (children) children.classList.remove('wiki-sidebar__children--collapsed');
            var toggle = item.querySelector(':scope > .wiki-sidebar__row > .wiki-sidebar__toggle');
            if (toggle) toggle.classList.add('wiki-sidebar__toggle--expanded');
          }
        } else {
          item.style.display = 'none';
        }
      });
    },

    addToggleButton: function(sidebar, contentDiv) {
      var self = this;

      // Find the contextual area (inside the content inner wrapper now)
      var toolbar = contentDiv.querySelector('.wiki-sidebar__content-inner .contextual');
      if (!toolbar) return;

      var btn = el('a', {
        className: 'wiki-sidebar__toggle-btn icon',
        href: '#',
        title: 'Toggle sidebar',
        textContent: '\u2630', // ☰ hamburger menu character
        onClick: function(e) {
          e.preventDefault();
          self.sidebarVisible = !self.sidebarVisible;
          saveJSON(storageKey(self.config.projectId, 'visible'), self.sidebarVisible);
          sidebar.classList.toggle('wiki-sidebar--hidden', !self.sidebarVisible);
          contentDiv.classList.toggle('wiki-sidebar--collapsed', !self.sidebarVisible);
        }
      });

      if (toolbar.firstChild) {
        toolbar.insertBefore(btn, toolbar.firstChild);
      } else {
        toolbar.appendChild(btn);
      }
    },

    setupResize: function(handle, sidebar) {
      var self = this;
      var startX, startWidth;

      handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;

        var onMouseMove = function(e) {
          var newWidth = startWidth + (e.clientX - startX);
          if (newWidth >= 200 && newWidth <= 500) {
            sidebar.style.width = newWidth + 'px';
            self.sidebarWidth = newWidth;
          }
        };

        var onMouseUp = function() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          saveJSON(storageKey(self.config.projectId, 'width'), self.sidebarWidth);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    },

    saveExpandedState: function() {
      saveJSON(storageKey(this.config.projectId, 'expanded'), this.expandedNodes);
    }
  };

})();
