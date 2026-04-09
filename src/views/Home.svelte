<script>
  import { getGameIndex } from '../lib/data-loader.js';
  import { search } from '../lib/search.js';
  import { USER_GAMES_CHANGED } from '../lib/user-games.js';

  let { onNavigate } = $props();

  let userGamesTick = $state(0);
  $effect(() => {
    function bump() {
      userGamesTick += 1;
    }
    window.addEventListener(USER_GAMES_CHANGED, bump);
    return () => window.removeEventListener(USER_GAMES_CHANGED, bump);
  });

  const gameIndex = $derived.by(() => {
    userGamesTick;
    return getGameIndex();
  });

  let query = $state('');
  let searchResults = $state([]);
  let debounceTimer = null;

  function handleSearch(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (query.length >= 2) {
        searchResults = search(query);
      } else {
        searchResults = [];
      }
    }, 300);
  }

  function goToGame(slug) {
    onNavigate('game', { game: slug });
  }

  function goToResult(result) {
    onNavigate('situation', {
      game: result.gameSlug,
      area: result.areaId,
      situation: result.situationId,
    });
  }
</script>

<h1 class="view-title">Retro Game Hints</h1>
<p class="view-subtitle">Progressive hints for classic games — no spoilers unless you ask.</p>

<p class="home-add-guide">
  <button type="button" class="home-add-guide-btn" onclick={() => onNavigate('import')} data-test="add-guide-link">
    + Add your own guide
  </button>
</p>

<div class="search-bar">
  <svg class="search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
  <input
    class="search-input"
    type="search"
    placeholder="Search all games..."
    aria-label="Search all games for hints"
    value={query}
    oninput={handleSearch}
    data-test="search"
  />
</div>

{#if query.length >= 2 && searchResults.length > 0}
  <ul class="search-results" role="list" aria-label="Search results">
    {#each searchResults as result}
      <li>
        <button
          class="search-result-item"
          onclick={() => goToResult(result)}
          data-test="search-result"
        >
          <span class="search-result-breadcrumb">
            {result.gameTitle} › {result.areaName}
          </span>
          {result.title}
        </button>
      </li>
    {/each}
  </ul>
{:else if query.length >= 2 && searchResults.length === 0}
  <p class="placeholder">No results found for "{query}"</p>
{/if}

{#if searchResults.length === 0}
  <div class="game-list" data-test="game-list" aria-label="Available games">
    {#each gameIndex as game}
      <button
        class="game-card"
        onclick={() => goToGame(game.slug)}
        data-test="game-card-{game.slug}"
      >
        <div class="game-card-title">
          {game.title}
          {#if game.isLocal}
            <span class="game-card-local-badge" title="Stored on this device only">Local</span>
          {/if}
        </div>
        <div class="game-card-meta">
          {game.year} · {game.areaCount} {game.areaCount === 1 ? 'area' : 'areas'} · {game.situationCount} {game.situationCount === 1 ? 'hint' : 'hints'}
        </div>
        <div class="game-card-bottom">
          {#if game.quality}
            <span class="star-rating" aria-label="{game.quality.stars} out of 5 stars">
              {#each Array(5) as _, i}
                <span class="star" class:star-filled={i < game.quality.stars} aria-hidden="true">{i < game.quality.stars ? '\u2605' : '\u2606'}</span>
              {/each}
            </span>
          {/if}
          {#if game.coverage !== null}
            <div class="coverage-bar" aria-label="{game.coverage}% of game mapped">
              <div class="coverage-fill" style="width: {game.coverage}%"></div>
              <span class="coverage-label">{game.coverage}% mapped</span>
            </div>
          {/if}
        </div>
      </button>
    {/each}
  </div>
{/if}
