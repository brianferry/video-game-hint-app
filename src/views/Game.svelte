<script>
  import { getGame } from '../lib/data-loader.js';
  import { search } from '../lib/search.js';

  let { gameSlug, onNavigate } = $props();

  const gameData = $derived(getGame(gameSlug));

  let query = $state('');
  let searchResults = $state([]);
  let debounceTimer = null;

  function handleSearch(e) {
    query = e.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (query.length >= 2 && gameData) {
        searchResults = search(query, gameData);
      } else {
        searchResults = [];
      }
    }, 300);
  }

  function goToArea(areaId) {
    onNavigate('area', { game: gameSlug, area: areaId });
  }

  function goToResult(result) {
    onNavigate('situation', {
      game: result.gameSlug,
      area: result.areaId,
      situation: result.situationId,
    });
  }
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  <button onclick={() => onNavigate('home')}>Home</button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <span class="breadcrumb-current">{gameData?.title ?? 'Unknown Game'}</span>
</nav>

{#if !gameData}
  <p class="placeholder">Game not found.</p>
{:else}
  <h1 class="view-title">{gameData.title}</h1>
  <p class="view-subtitle">
    {gameData.year} · {gameData.areas.length} {gameData.areas.length === 1 ? 'area' : 'areas'}
    {#if gameData.quality}
      <span class="star-rating star-rating-inline" aria-label="{gameData.quality.stars} out of 5 stars">
        {#each Array(5) as _, i}
          <span class="star" class:star-filled={i < gameData.quality.stars} aria-hidden="true">{i < gameData.quality.stars ? '\u2605' : '\u2606'}</span>
        {/each}
      </span>
    {/if}
  </p>
  {#if gameData.quality?.summary}
    <p class="quality-summary">{gameData.quality.summary}</p>
  {/if}

  {#if gameData.totalEstimatedSituations > 0}
    {@const situationCount = gameData.areas.reduce((s, a) => s + a.situations.length, 0)}
    {@const coverage = Math.round((situationCount / gameData.totalEstimatedSituations) * 100)}
    <div class="coverage-bar coverage-bar-lg" aria-label="{coverage}% of game mapped with hints">
      <div class="coverage-fill" style="width: {coverage}%"></div>
      <span class="coverage-label">{coverage}% mapped ({situationCount} of ~{gameData.totalEstimatedSituations} situations)</span>
    </div>
  {/if}

  <div class="search-bar">
    <svg class="search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      class="search-input"
      type="search"
      placeholder="Search this game..."
      aria-label="Search {gameData.title} for hints"
      value={query}
      oninput={handleSearch}
    />
  </div>

  {#if query.length >= 2 && searchResults.length > 0}
    <ul class="search-results" role="list" aria-label="Search results">
      {#each searchResults as result}
        <li>
          <button class="search-result-item" onclick={() => goToResult(result)}>
            <span class="search-result-breadcrumb">{result.areaName}</span>
            {result.title}
          </button>
        </li>
      {/each}
    </ul>
  {:else if query.length >= 2 && searchResults.length === 0}
    <p class="placeholder">No results found for "{query}"</p>
  {/if}

  {#if searchResults.length === 0}
    <div class="item-list" aria-label="Areas in {gameData.title}">
      {#each gameData.areas as area}
        <button
          class="item-card"
          onclick={() => goToArea(area.id)}
        >
          <div class="item-card-title">{area.name}</div>
          <div class="item-card-sub">
            {area.situations.length} {area.situations.length === 1 ? 'situation' : 'situations'}
          </div>
        </button>
      {/each}
    </div>
  {/if}

  {#if gameData.sources?.length > 0}
    <div class="sources-list">
      <h2 class="sources-title">Sources</h2>
      <ul>
        {#each gameData.sources as source}
          <li>
            {#if source.url}
              <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
            {:else}
              {source.name}
            {/if}
            {#if source.author}
              <span class="source-author">by {source.author}</span>
            {/if}
            {#if source.platform && source.platform !== 'hand-written'}
              <span class="source-platform">({source.platform})</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if gameData.importedAt}
    <div class="import-meta">
      Hints last updated: {new Date(gameData.importedAt).toLocaleDateString()}
    </div>
  {/if}
{/if}
