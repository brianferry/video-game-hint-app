<script>
  import { getGame } from '../lib/data-loader.js';
  import { getProgress, saveProgress, trackView } from '../lib/progress.js';
  import { renderHint } from '../lib/markdown.js';

  let { gameSlug, areaId, situationId, onNavigate } = $props();

  const gameData = $derived(getGame(gameSlug));
  const area = $derived(gameData?.areas?.find(a => a.id === areaId) ?? null);
  const situation = $derived(area?.situations?.find(s => s.id === situationId) ?? null);

  // Restore progress from localStorage
  let revealedCount = $state(0);

  $effect(() => {
    const saved = getProgress(gameSlug, areaId, situationId);
    revealedCount = saved.revealedCount;
  });

  // Track view for analytics
  $effect(() => {
    if (situation) {
      trackView(gameSlug, areaId, situationId);
    }
  });

  function revealHint(index) {
    if (index === revealedCount) {
      revealedCount = index + 1;
      saveProgress(gameSlug, areaId, situationId, revealedCount);
    }
  }
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  <button onclick={() => onNavigate('home')}>Home</button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <button onclick={() => onNavigate('game', { game: gameSlug })}>
    {gameData?.title ?? 'Game'}
  </button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <button onclick={() => onNavigate('area', { game: gameSlug, area: areaId })}>
    {area?.name ?? 'Area'}
  </button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <span class="breadcrumb-current">{situation?.title ?? 'Situation'}</span>
</nav>

{#if !situation}
  <p class="placeholder">Situation not found.</p>
{:else if !situation.hints || situation.hints.length === 0}
  <h1 class="view-title">{situation.title}</h1>
  <p class="placeholder">Hints coming soon</p>
{:else}
  <h1 class="view-title">{situation.title}</h1>

  {#if situation.context}
    <p class="situation-context">{situation.context}</p>
  {/if}

  {#if situation.tags?.length > 0}
    <div class="tag-list" style="margin-bottom: 1.25rem;">
      {#each situation.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}

  <div class="hint-list" aria-label="Hints for {situation.title}">
    {#each situation.hints as hint, i}
      <div class="hint-card">
        {#if i < revealedCount}
          <div class="hint-content">
            {@html renderHint(hint)}
          </div>
        {:else}
          <button
            class="hint-reveal-btn"
            disabled={i > revealedCount}
            onclick={() => revealHint(i)}
            aria-label="Show hint {i + 1} of {situation.hints.length}"
          >
            {#if i === revealedCount}
              &#9654; Show hint {i + 1}
            {:else}
              Show hint {i + 1}
            {/if}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if situation.sourceRefs?.length > 0 && gameData?.sources}
    <div class="source-refs">
      <span class="source-refs-label">Sources:</span>
      {#each situation.sourceRefs as ref}
        {@const source = gameData.sources.find(s => s.id === ref.sourceId)}
        {#if source}
          {@const fragmentText = ref.textFragment || ref.section}
          {@const sourceUrl = source.url && fragmentText && fragmentText !== 'Hand-written'
            ? `${source.url}#:~:text=${encodeURIComponent(fragmentText)}`
            : source.url}
          <span class="source-ref">
            {#if sourceUrl}
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{source.name}</a>
            {:else}
              {source.name}
            {/if}
            {#if ref.section && ref.section !== 'Hand-written'}
              — {ref.section}
            {/if}
          </span>
        {/if}
      {/each}
    </div>
  {/if}
{/if}
