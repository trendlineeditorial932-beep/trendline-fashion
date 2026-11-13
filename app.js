(() => {
  const body = document.body;
  const currentCategory = (body.dataset.category || 'all').toLowerCase();
  const apiUrl = String(window.TRENDLINE_API_URL || '').trim();
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  const filename = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    if (a.getAttribute('href') === filename) a.classList.add('active');
  });
  const now = new Date();
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = now.getFullYear());
  document.querySelectorAll('[data-date]').forEach(el => {
    el.textContent = new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(now).toUpperCase();
  });
  const articleGrid = document.querySelector('[data-article-grid]');
  const detailRoot = document.querySelector('[data-article-detail]');
  const status = document.querySelector('[data-feed-status]');
  const search = document.querySelector('[data-search]');
  let articles = [];
  const norm = value => String(value || '').toLowerCase().replace(/[^a-z]/g,'');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const excerpt = value => {
    const clean = String(value || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    return clean.length > 165 ? clean.slice(0,162)+'…' : clean;
  };
  function cardImage(article) {
    const url = String(article.imageUrl || '').trim();
    if (!/^https:\/\//i.test(url)) return '';
    const title = esc(article.title || 'TRENDLINE article');
    return `<img src="${esc(url)}" alt="${title}" loading="lazy" onerror="this.remove()">`;
  }
  function renderCards(query='') {
    if (!articleGrid) return;
    const q = query.toLowerCase().trim();
    const filtered = articles.filter(a => {
      const c = norm(a.category || '');
      const catOk = currentCategory === 'all' || currentCategory === 'article' || c === norm(currentCategory) || (currentCategory === 'sustainable' && c.includes('sustain')) || (currentCategory === 'casualwear' && c.includes('casual'));
      const text = `${a.title || ''} ${a.category || ''} ${a.article || ''}`.toLowerCase();
      return catOk && (!q || text.includes(q));
    });
    if (!filtered.length) {
      articleGrid.innerHTML = `<div class="empty-state">No approved ${currentCategory === 'all' ? 'TRENDLINE' : esc(currentCategory)} articles are available yet. New research leads stay private until they are checked and turned into original TRENDLINE stories.</div>`;
      return;
    }
    articleGrid.innerHTML = filtered.map(a => {
      const title = esc(a.title || 'Untitled story');
      const category = esc(a.category || 'TRENDLINE');
      const date = esc(a.publishedDate || 'Latest');
      return `<article class="article-card">${cardImage(a)}<div class="meta"><span>${category}</span><span>${date}</span></div><h3>${title}</h3><p>${esc(excerpt(a.article || 'An original TRENDLINE editorial update.'))}</p><a href="article.html?title=${encodeURIComponent(a.title || '')}">Read the story ↗</a></article>`;
    }).join('');
  }
  if (search) search.addEventListener('input', e => renderCards(e.target.value));
  function renderDetail() {
    if (!detailRoot) return;
    const wanted = new URLSearchParams(location.search).get('title') || '';
    const found = articles.find(a => String(a.title || '') === wanted);
    if (!found) {
      detailRoot.innerHTML = `<div class="kicker">TRENDLINE / ORIGINAL STORY</div><h1>Story not found.</h1><p>This story may have been updated or is not approved for publication.</p><a class="btn" href="index.html#radar">Back to the latest edit ↗</a>`;
      return;
    }
    const title = esc(found.title || 'TRENDLINE story');
    const paragraphs = String(found.article || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
    const image = /^https:\/\//i.test(String(found.imageUrl || '')) ? `<img src="${esc(found.imageUrl)}" alt="${title}">` : '';
    detailRoot.innerHTML = `<div class="kicker">${esc(found.category || 'TRENDLINE')} / ${esc(found.publishedDate || 'LATEST')}</div><h1>${title}</h1>${image}<div class="photo-credit">${esc(found.imageCredit || '')} ${esc(found.imageLicence || '')}</div><div class="article-body">${paragraphs}</div><a class="btn" href="index.html#radar">Back to the latest edit ↗</a>`;
  }
  function loadFeed() {
    if (!articleGrid && !detailRoot) return;
    if (!apiUrl) {
      if (status) status.textContent = 'EDITORIAL FEED NOT CONNECTED';
      return;
    }
    if (!/^https:\/\//i.test(apiUrl)) {
      if (status) status.textContent = 'CHECK THE EDITORIAL FEED URL';
      return;
    }
    const callback = 'trendline_' + Date.now() + '_' + Math.floor(Math.random()*9999);
    const script = document.createElement('script');
    let finished = false;
    const timeout = setTimeout(() => finish(false), 15000);
    function finish(ok) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      script.remove();
      try { delete window[callback]; } catch (_) { window[callback] = undefined; }
      if (!ok && status) status.textContent = 'FEED UNAVAILABLE · TRY AGAIN LATER';
    }
    window[callback] = payload => {
      articles = Array.isArray(payload) ? payload : (Array.isArray(payload.articles) ? payload.articles : []);
      if (status) status.textContent = `LIVE EDITORIAL FEED · ${articles.length} APPROVED STORIES`;
      renderCards(search ? search.value : '');
      renderDetail();
      finish(true);
    };
    script.onerror = () => finish(false);
    script.src = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}callback=${callback}`;
    document.head.appendChild(script);
  }
  loadFeed();
})();
