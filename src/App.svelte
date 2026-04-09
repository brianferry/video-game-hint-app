<script>
  import { saveTheme } from './lib/progress.js';
  import Home from './views/Home.svelte';
  import Game from './views/Game.svelte';
  import Area from './views/Area.svelte';
  import Situation from './views/Situation.svelte';
  import AddGuide from './views/AddGuide.svelte';

  let currentView = $state('home');
  let routeParams = $state({ game: null, area: null, situation: null });
  let theme = $state(document.documentElement.dataset.theme ?? 'light');

  function parseRoute(params) {
    if (params.get('view') === 'import') {
      return { view: 'import', params: { game: null, area: null, situation: null } };
    }
    const game = params.get('game');
    const area = params.get('area');
    const situation = params.get('situation');
    if (game && area && situation) return { view: 'situation', params: { game, area, situation } };
    if (game && area) return { view: 'area', params: { game, area, situation: null } };
    if (game) return { view: 'game', params: { game, area: null, situation: null } };
    return { view: 'home', params: { game: null, area: null, situation: null } };
  }

  function navigate(view, params = {}) {
    currentView = view;
    routeParams = { game: null, area: null, situation: null, ...params };

    const url = new URL(window.location);
    url.search = '';
    if (view === 'import') {
      url.searchParams.set('view', 'import');
    } else {
      if (params.game) url.searchParams.set('game', params.game);
      if (params.area) url.searchParams.set('area', params.area);
      if (params.situation) url.searchParams.set('situation', params.situation);
    }
    window.history.pushState({}, '', url);

    window.scrollTo(0, 0);
  }

  function goHome() {
    navigate('home');
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    theme = next;
    document.documentElement.dataset.theme = next;
    saveTheme(next);
  }

  // Restore route from URL on initial load (no history push)
  $effect(() => {
    const route = parseRoute(new URLSearchParams(window.location.search));
    currentView = route.view;
    routeParams = route.params;
  });

  // Handle browser back/forward
  function handlePopState() {
    const route = parseRoute(new URLSearchParams(window.location.search));
    currentView = route.view;
    routeParams = route.params;
  }

  $effect(() => {
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  });
</script>

<div class="app-header">
  <div class="header-inner">
    <button class="app-name" onclick={goHome} aria-label="Retro Game Hints — go to home">
      Retro Game Hints
    </button>

    <nav class="header-nav" aria-label="App navigation">
      <button
        class="theme-toggle"
        type="button"
        aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} mode"
        onclick={toggleTheme}
      >
        <svg class="icon-sun" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg class="icon-moon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
    </nav>
  </div>
</div>

<main id="main-content" aria-label="Game hints">
  {#if currentView === 'home'}
    <Home onNavigate={navigate} />
  {:else if currentView === 'import'}
    <AddGuide onNavigate={navigate} />
  {:else if currentView === 'game'}
    <Game gameSlug={routeParams.game} onNavigate={navigate} />
  {:else if currentView === 'area'}
    <Area gameSlug={routeParams.game} areaId={routeParams.area} onNavigate={navigate} />
  {:else if currentView === 'situation'}
    <Situation
      gameSlug={routeParams.game}
      areaId={routeParams.area}
      situationId={routeParams.situation}
      onNavigate={navigate}
    />
  {/if}
</main>

<footer class="site-footer">
  <div class="footer-inner">
    <span class="footer-text">Best viewed with any browser &bull; No AI at runtime &bull; Made with &#9829;</span>
  </div>
</footer>
