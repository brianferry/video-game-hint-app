<script>
  import { getGame } from '../lib/data-loader.js';

  let { gameSlug, areaId, onNavigate } = $props();

  const gameData = $derived(getGame(gameSlug));
  const area = $derived(gameData?.areas?.find(a => a.id === areaId) ?? null);

  function goToSituation(situationId) {
    onNavigate('situation', { game: gameSlug, area: areaId, situation: situationId });
  }
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  <button onclick={() => onNavigate('home')}>Home</button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <button onclick={() => onNavigate('game', { game: gameSlug })}>
    {gameData?.title ?? 'Game'}
  </button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <span class="breadcrumb-current">{area?.name ?? 'Unknown Area'}</span>
</nav>

{#if !area}
  <p class="placeholder">Area not found.</p>
{:else}
  <h1 class="view-title">{area.name}</h1>
  <p class="view-subtitle">{area.situations.length} {area.situations.length === 1 ? 'situation' : 'situations'}</p>

  <div class="item-list" aria-label="Situations in {area.name}">
    {#each area.situations as situation}
      <button
        class="item-card"
        onclick={() => goToSituation(situation.id)}
      >
        <div class="item-card-title">{situation.title}</div>
        {#if situation.context}
          <div class="item-card-context">{situation.context}</div>
        {/if}
        {#if situation.tags?.length > 0}
          <div class="tag-list">
            {#each situation.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}
      </button>
    {/each}
  </div>
{/if}
