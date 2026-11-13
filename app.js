
(() => {
  'use strict';

  const body = document.body;
  const currentCategory = (body.dataset.category || 'all').toLowerCase();
  const apiUrl = String(window.TRENDLINE_API_URL || '').trim();

  /* MOBILE NAVIGATION */

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');

      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? 'CLOSE ✕' : 'MENU ☰';
    });

    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.textContent = 'MENU ☰';
      });
    });
  }

  /* ACTIVE NAVIGATION */

  const filename = location.pathname.split('/').pop() || 'index.html';

  document.querySelectorAll('.main-nav a').forEach(link => {
    if (link.getAttribute('href') === filename) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  /* AUTOMATIC DATE AND YEAR */

  const now = new Date();

  document.querySelectorAll('[data-year]').forEach(element => {
    element.textContent = now.getFullYear();
  });

  document.querySelectorAll('[data-date]').forEach(element => {
    element.textContent = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(now).toUpperCase();
  });

  /* SCROLL REVEAL ANIMATIONS */

  const revealElements = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(element => {
      revealObserver.observe(element);
    });
  } else {
    revealElements.forEach(element => {
      element.classList.add('is-visible');
    });
  }

  /* EDITORIAL FEED */

  const articleGrid = document.querySelector('[data-article-grid]');
  const detailRoot = document.querySelector('[data-article-detail]');
  const status = document.querySelector('[data-feed-status]');
  const search = document.querySelector('[data-search]');

  let articles = [];

  const normalise = value =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);

  const excerpt = value => {
    const clean = String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return clean.length > 165
      ? clean.slice(0, 162) + '…'
      : clean;
  };

  /* CATEGORY MATCHING */

  function matchesCategory(article) {
    if (
      currentCategory === 'all' ||
      currentCategory === 'article'
    ) {
      return true;
    }

    const articleCategories = [
      article.category,
      article.audience,
      article.section,
      article.tags
    ];

    const values = articleCategories
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(normalise)
      .filter(Boolean);

    const wanted = normalise(currentCategory);

    if (values.includes(wanted)) return true;

    if (wanted === 'sustainablefashion') {
      return values.some(value => value.includes('sustain'));
    }

    if (wanted === 'teenfashion') {
      return values.some(value =>
        value.includes('teen') || value.includes('youth')
      );
    }

    return false;
  }

  /* ARTICLE CARDS */

  function cardImage(article) {
    const url = String(article.imageUrl || '').trim();

    if (!/^https:\/\//i.test(url)) return '';

    return `<img src="${escapeHTML(url)}"
      alt="${escapeHTML(article.title || 'TRENDLINE article')}"
      loading="lazy">`;
  }

  function renderCards(query = '') {
    if (!articleGrid) return;

    const keyword = query.toLowerCase().trim();

    const filtered = articles.filter(article => {
      const categoryMatch = matchesCategory(article);

      const searchableText = [
        article.title,
        article.category,
        article.audience,
        article.section,
        article.article,
        article.tags
      ].flat().join(' ').toLowerCase();

      return categoryMatch &&
        (!keyword || searchableText.includes(keyword));
    });

    if (!filtered.length) {
      articleGrid.innerHTML = `
        <div class="empty-state">
          No approved TRENDLINE stories are available for
          this section yet. New stories will appear here
          once they are approved in your editorial feed.
        </div>
      `;
      return;
    }

    articleGrid.innerHTML = filtered.map(article => {
      const title = escapeHTML(article.title || 'Untitled story');
      const category = escapeHTML(article.category || 'TRENDLINE');
      const date = escapeHTML(article.publishedDate || 'Latest');

      return `
        <article class="article-card">
          ${cardImage(article)}

          <div class="meta">
            <span>${category}</span>
            <span>${date}</span>
          </div>

          <h3>${title}</h3>

          <p>${escapeHTML(
            excerpt(article.article || 'An original TRENDLINE editorial story.')
          )}</p>

          <a href="article.html?title=${encodeURIComponent(article.title || '')}">
            READ THE STORY ↗
          </a>
        </article>
      `;
    }).join('');
  }

  if (search) {
    search.addEventListener('input', event => {
      renderCards(event.target.value);
    });
  }

  /* INDIVIDUAL ARTICLE PAGE */

  function renderDetail() {
    if (!detailRoot) return;

    const wanted = new URLSearchParams(location.search).get('title') || '';

    const found = articles.find(article =>
      String(article.title || '') === wanted
    );

    if (!found) {
      detailRoot.innerHTML = `
        <div class="kicker">TRENDLINE / ORIGINAL STORY</div>
        <h1>Story not found.</h1>
        <p>This story may have been updated or is not approved for publication.</p>
        <a class="btn" href="index.html#magazine">
          BACK TO THE JOURNAL ↗
        </a>
      `;
      return;
    }

    const title = escapeHTML(found.title || 'TRENDLINE story');

    const paragraphs = String(found.article || '')
      .split(/\n{2,}/)
      .map(paragraph =>
        `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`
      )
      .join('');

    const imageUrl = String(found.imageUrl || '').trim();

    const image = /^https:\/\//i.test(imageUrl)
      ? `<img src="${escapeHTML(imageUrl)}" alt="${title}">`
      : '';

    detailRoot.innerHTML = `
      <div class="kicker">
        ${escapeHTML(found.category || 'TRENDLINE')}
        / ${escapeHTML(found.publishedDate || 'LATEST')}
      </div>

      <h1>${title}</h1>

      ${image}

      <div class="photo-credit">
        ${escapeHTML(found.imageCredit || '')}
        ${escapeHTML(found.imageLicence || '')}
      </div>

      <div class="article-body">
        ${paragraphs}
      </div>

      <a class="editorial-link" href="index.html#magazine">
        BACK TO THE JOURNAL ↗
      </a>
    `;
  }

  /* LOAD GOOGLE SHEETS EDITORIAL FEED */

  function loadFeed() {
    if (!articleGrid && !detailRoot) return;

    if (!apiUrl) {
      if (status) {
        status.textContent = 'EDITORIAL FEED NOT CONNECTED';
      }
      return;
    }

    if (!/^https:\/\//i.test(apiUrl)) {
      if (status) {
        status.textContent = 'CHECK THE EDITORIAL FEED URL';
      }
      return;
    }

    const callback = 'trendline_' +
      Date.now() + '_' +
      Math.floor(Math.random() * 9999);

    const script = document.createElement('script');
    let finished = false;

    const timeout = setTimeout(() => finish(false), 15000);

    function finish(success) {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);
      script.remove();

      try {
        delete window[callback];
      } catch (_) {
        window[callback] = undefined;
      }

      if (!success && status) {
        status.textContent = 'FEED UNAVAILABLE · TRY AGAIN LATER';
      }
    }

    window[callback] = payload => {
      const data = Array.isArray(payload)
        ? payload
        : (payload && Array.isArray(payload.articles)
          ? payload.articles
          : []);

      articles = data;

      if (status) {
        status.textContent =
          `LIVE EDITORIAL FEED · ${articles.length} APPROVED STORIES`;
      }

      renderCards(search ? search.value : '');
      renderDetail();
      finish(true);
    };

    script.onerror = () => finish(false);

    script.src =
      `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}callback=${callback}`;

    document.head.appendChild(script);
  }

  loadFeed();

})();
