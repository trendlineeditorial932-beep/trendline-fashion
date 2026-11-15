
(() => {
  'use strict';

  const body = document.body;
  const currentCategory = (body.dataset.category || 'all').toLowerCase();
  const params = new URLSearchParams(location.search);
  const requestedAudience = (params.get('audience') || '').toLowerCase();
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
    const href = link.getAttribute('href') || '';

    if (href.split('?')[0].split('#')[0] === filename) {
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
  const isHome = currentCategory === 'all';

  let articles = [];

  const articleKey = article => article.slug || article.title || '';

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

  /* CATEGORY AND AUDIENCE MATCHING */

  const categoryAliases = {
    streetwear: ['streetwear', 'streetstyle'],
    luxury: ['luxury'],
    sportswear: ['sportswear', 'sportstyle'],
    casualwear: ['casualwear', 'casual'],
    formalwear: ['formalwear', 'formal'],
    sustainable: ['sustainable', 'sustainablefashion'],
    vintage: ['vintage'],
    accessories: ['accessories', 'accessory']
  };

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

    let categoryMatch = values.includes(wanted);

    /* Men and Women landing pages */

    if (wanted === 'men' || wanted === 'women') {
      categoryMatch = values.some(value =>
        wanted === 'men'
          ? ['men', 'mens', 'male', 'menswear'].includes(value)
          : ['women', 'womens', 'female', 'womenswear'].includes(value)
      );
    }

    /* Teen Fashion */

    if (wanted === 'teen' || wanted === 'teenfashion') {
      categoryMatch = values.some(value =>
        ['teen', 'teens', 'teenfashion', 'youth', 'youthfashion']
          .includes(value)
      );
    }

    /* Celebrity section */

    if (wanted === 'celebrities' || wanted === 'celebrity') {
      categoryMatch = values.some(value =>
        ['celebrity', 'celebrities', 'celebrityfashion']
          .includes(value)
      );
    }

    /* Shared category pages */

    if (categoryAliases[wanted]) {
      categoryMatch = values.some(value =>
        categoryAliases[wanted].includes(value)
      );
    }

    if (!categoryMatch) return false;

    /* Apply Men/Women filter when arriving from those pages */

    if (requestedAudience === 'men' || requestedAudience === 'women') {
      const audienceValues = [
        article.audience,
        article.section,
        article.tags
      ]
        .flatMap(value => Array.isArray(value) ? value : [value])
        .map(normalise);

      const audienceMatch = audienceValues.some(value =>
        requestedAudience === 'men'
          ? ['men', 'mens', 'male', 'menswear'].includes(value)
          : ['women', 'womens', 'female', 'womenswear'].includes(value)
      );

      if (!audienceMatch) return false;
    }

    return true;
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

    articleGrid.innerHTML = filtered.map((article, index) => {
      const title = escapeHTML(article.title || 'Untitled story');
      const category = escapeHTML(article.category || 'TRENDLINE');
      const date = escapeHTML(article.publishedDate || 'Latest');
      const lead = isHome && index === 0 && !keyword;
      const href = article.slug
        ? `article.html?slug=${encodeURIComponent(article.slug)}`
        : `article.html?title=${encodeURIComponent(article.title || '')}`;
      const summary = article.dek ||
        article.article || 'An original TRENDLINE editorial story.';

      return `
        <article class="article-card${lead ? ' article-lead' : ''}">
          ${cardImage(article)}

          <div class="article-card-copy">
            <div class="meta">
              <span>${lead ? 'THIS WEEK\'S FEATURE · ' : ''}${category}</span>
              <span>${date}</span>
            </div>

            <h3>${title}</h3>

            <p>${escapeHTML(excerpt(summary))}</p>

            <a href="${href}">READ THE STORY ↗</a>
          </div>
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

    const query = new URLSearchParams(location.search);
    const wantedSlug = query.get('slug') || '';
    const wanted = query.get('title') || '';

    const found = articles.find(article =>
      wantedSlug
        ? String(article.slug || '') === wantedSlug
        : String(article.title || '') === wanted
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
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .map(paragraph =>
        paragraph.startsWith('## ')
          ? `<h2>${escapeHTML(paragraph.slice(3))}</h2>`
          : `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`
      )
      .join('');

    document.title = `${found.title || 'Article'} | TRENDLINE`;

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

      ${found.dek ? `<p class="article-dek">${escapeHTML(found.dek)}</p>` : ''}
      ${found.author ? `<p class="article-byline">By ${escapeHTML(found.author)}</p>` : ''}

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

  function loadSheetFeed() {
    if (!articleGrid && !detailRoot) return;

    /* Optional extra source; the built-in feed is data/articles.json */
    if (!apiUrl) return;

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

      articles = mergeArticles(articles, data);

      setFeedStatus();
      renderCards(search ? search.value : '');
      renderDetail();
      finish(true);
    };

    script.onerror = () => finish(false);

    script.src =
      `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}callback=${callback}`;

    document.head.appendChild(script);
  }

  /* BUILT-IN FEED: data/articles.json (weekly, approved by pull request) */

  function mergeArticles(base, extra) {
    const seen = new Set(base.map(articleKey));
    return base.concat(extra.filter(article => !seen.has(articleKey(article))));
  }

  function setFeedStatus() {
    if (!status) return;

    status.textContent = articles.length
      ? `${articles.length} ORIGINAL ${articles.length === 1 ? 'STORY' : 'STORIES'} · NEW FEATURE EVERY WEEK`
      : 'THIS WEEK\'S FEATURE ARRIVES SOON';
  }

  async function loadLocalFeed() {
    if (!articleGrid && !detailRoot) return;

    try {
      const response = await fetch('data/articles.json', { cache: 'no-cache' });

      if (!response.ok) throw new Error(response.status);

      const payload = await response.json();
      articles = Array.isArray(payload.articles) ? payload.articles : [];
    } catch (_) {
      articles = [];

      if (status) status.textContent = 'FEED UNAVAILABLE · TRY AGAIN LATER';
    }

    if (articles.length || !status || !status.textContent.startsWith('FEED')) {
      setFeedStatus();
    }

    renderCards(search ? search.value : '');
    renderDetail();
  }

  /* DAILY TRENDS: data/trends.json (refreshed every day) */

  const timeAgo = iso => {
    const then = Date.parse(iso);

    if (!then) return '';

    const hours = Math.max(0, Math.round((Date.now() - then) / 36e5));

    if (hours < 1) return 'JUST NOW';
    if (hours < 24) return `${hours}H AGO`;

    return `${Math.round(hours / 24)}D AGO`;
  };

  async function loadTrends() {
    if (currentCategory === 'article') return;

    let data;

    try {
      const response = await fetch('data/trends.json', { cache: 'no-cache' });

      if (!response.ok) throw new Error(response.status);

      data = await response.json();
    } catch (_) {
      return;
    }

    const section = data.sections && data.sections[currentCategory];

    if (!section || !section.items || !section.items.length) return;

    const labels = {
      men: 'MENSWEAR',
      women: 'WOMENSWEAR',
      celebrities: 'CELEBRITY STYLE',
      teen: 'TEEN FASHION'
    };

    const label = isHome
      ? 'FASHION'
      : (labels[currentCategory] || currentCategory.toUpperCase());

    const updated = data.updated
      ? new Intl.DateTimeFormat('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric'
        }).format(new Date(data.updated)).toUpperCase()
      : '';

    const words = (section.words || []).map(word =>
      `<span class="trend-chip">${escapeHTML(word)}</span>`
    ).join('');

    const list = section.items.map((item, index) => `
      <li>
        <span class="trend-num">${String(index + 1).padStart(2, '0')}</span>
        <a href="${escapeHTML(item.link)}" target="_blank" rel="noopener noreferrer">
          ${escapeHTML(item.title)}
          <small>${escapeHTML(item.source)}${item.published ? ' · ' + timeAgo(item.published) : ''}</small>
        </a>
      </li>
    `).join('');

    const block = document.createElement('section');
    block.className = 'section trends-section';
    block.id = 'trending';
    block.innerHTML = `
      <div class="wrap">
        <div class="trends-head">
          <div>
            <span class="eyebrow">TRENDING NOW / UPDATED DAILY</span>
            <h2>WHAT'S TRENDING IN ${escapeHTML(label)}<span>.</span></h2>
          </div>
          <span class="trends-stamp">UPDATED ${escapeHTML(updated)}</span>
        </div>
        ${words ? `<div class="trend-chips">${words}</div>` : ''}
        <ol class="trend-list">${list}</ol>
        <p class="trends-note">
          Headlines link to their original publishers. TRENDLINE does not
          republish their stories.
        </p>
      </div>
    `;

    const anchor = isHome
      ? document.getElementById('magazine')
      : (articleGrid && articleGrid.closest('section'));

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(block, anchor);
    }
  }

  /* NEWSLETTER SIGNUP (Buttondown) — shows once a username is set in config.js */

  function addNewsletter() {
    const user = String(window.TRENDLINE_NEWSLETTER_USER || '')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '');

    const footer = document.querySelector('footer.footer, footer.site-footer');

    if (!user || !footer) return;

    const block = document.createElement('section');
    block.className = 'newsletter-section';
    block.innerHTML = `
      <div class="wrap newsletter-inner">
        <div>
          <span class="eyebrow">THE WEEKLY EDIT</span>
          <h2>Get the journal in your inbox<span>.</span></h2>
          <p>One original feature and the week's trending headlines, every week.</p>
        </div>
        <form
          action="https://buttondown.com/api/emails/embed-subscribe/${user}"
          method="post"
          target="popupwindow"
          class="newsletter-form"
        >
          <label class="sr-only" for="nl-email">Email address</label>
          <input id="nl-email" type="email" name="email" placeholder="you@example.com" required>
          <button type="submit">SUBSCRIBE ↗</button>
        </form>
      </div>
    `;

    block.querySelector('form').addEventListener('submit', () => {
      window.open(`https://buttondown.com/${user}`, 'popupwindow');
    });

    footer.parentNode.insertBefore(block, footer);
  }

  loadLocalFeed().then(loadSheetFeed);
  loadTrends();
  addNewsletter();

})();
