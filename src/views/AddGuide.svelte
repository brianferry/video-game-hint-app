<script>
  import hintRules from '../../HINT_RULES.md?raw';
  import { slugifyTitle } from '../lib/slugify.js';
  import { validateGameJsonText } from '../lib/validate-game-json.js';
  import {
    saveUserGame,
    removeUserGame,
    getAllUserGames,
    USER_GAMES_CHANGED,
  } from '../lib/user-games.js';
  import {
    buildContributeIssueUrl,
    getNewIssueBaseUrl,
  } from '../lib/contribute-issue.js';

  let { onNavigate } = $props();

  let gameTitle = $state('');
  let pasteText = $state('');
  let validationErrors = $state([]);
  let validationWarnings = $state([]);
  /** Canonical JSON string after successful validation (avoids Proxy + IndexedDB clone errors). */
  let lastValidJsonText = $state('');
  let saveError = $state('');
  let copyStatus = $state('');
  let copyJsonStatus = $state('');

  let userGamesTick = $state(0);
  $effect(() => {
    function bump() {
      userGamesTick += 1;
    }
    window.addEventListener(USER_GAMES_CHANGED, bump);
    return () => window.removeEventListener(USER_GAMES_CHANGED, bump);
  });

  const localGuides = $derived.by(() => {
    userGamesTick;
    return getAllUserGames()
      .map((g) => ({ slug: g.slug, title: g.title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  });

  const suggestedSlug = $derived(slugifyTitle(gameTitle));

  /** GitHub new-issue URL is available from env or package.json repository. */
  const contributeIssueConfigured = $derived(getNewIssueBaseUrl() !== null);

  const pasteAriaDescribedBy = $derived.by(() => {
    const ids = ['slug-hint'];
    if (validationErrors.length > 0) ids.push('validation-errors');
    if (validationWarnings.length > 0) ids.push('validation-warnings');
    if (saveError) ids.push('save-error');
    return ids.join(' ');
  });

  const fullPrompt = $derived.by(() => {
    const title = gameTitle.trim() || 'Your Game Title';
    return `You are an expert at writing progressive video game hints. Your task is to produce a single JSON file for the game titled: "${title}".

Output requirements:
- Respond with ONLY valid JSON — no markdown code fences, no commentary before or after the JSON object.
- The JSON must follow the schema and authoring rules in the "Hint rules" section below.
- Cover the full game: include all major areas and hint-worthy situations in progression order.
- Use a unique "slug" (kebab-case). Suggested slug based on the title: "${slugifyTitle(gameTitle)}"
- Include realistic "year" and "era" (e.g. "1990s") for the game.
- Set "totalEstimatedSituations" to the approximate number of distinct hint-worthy moments in the full game.
- Include "sources" if you used external knowledge; otherwise use "hand-written" style attribution.

--- Hint rules (from HINT_RULES.md) ---

${hintRules}`;
  });

  function onPasteInput() {
    lastValidJsonText = '';
    validationErrors = [];
    validationWarnings = [];
    saveError = '';
  }

  function runValidate() {
    saveError = '';
    const result = validateGameJsonText(pasteText);
    validationErrors = result.errors;
    validationWarnings = result.warnings;
    if (result.ok && result.data) {
      lastValidJsonText = JSON.stringify(result.data, null, 2);
    } else {
      lastValidJsonText = '';
    }
  }

  async function handleSave() {
    if (!lastValidJsonText) return;
    saveError = '';
    try {
      const data = JSON.parse(lastValidJsonText);
      await saveUserGame(data);
      onNavigate('game', { game: data.slug });
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleCopyValidatedJson() {
    if (!lastValidJsonText) return;
    try {
      await navigator.clipboard.writeText(lastValidJsonText);
      copyJsonStatus = 'Copied!';
      setTimeout(() => {
        copyJsonStatus = '';
      }, 2000);
    } catch {
      copyJsonStatus = 'Copy failed';
    }
  }

  function handleOpenContributeIssue() {
    if (!lastValidJsonText) return;
    let slug;
    let title;
    try {
      const d = JSON.parse(lastValidJsonText);
      slug = d.slug;
      title = d.title;
    } catch {
      return;
    }
    if (typeof slug !== 'string' || typeof title !== 'string') return;
    const url = buildContributeIssueUrl({ slug, title });
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
      copyStatus = 'Copied!';
      setTimeout(() => {
        copyStatus = '';
      }, 2000);
    } catch {
      copyStatus = 'Copy failed';
    }
  }

  async function handleRemove(slug) {
    if (!confirm(`Remove "${slug}" from this device? This cannot be undone.`)) return;
    try {
      await removeUserGame(slug);
    } catch (e) {
      saveError = e instanceof Error ? e.message : String(e);
    }
  }
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  <button type="button" onclick={() => onNavigate('home')}>Home</button>
  <span class="breadcrumb-sep" aria-hidden="true">›</span>
  <span class="breadcrumb-current">Add your own guide</span>
</nav>

<h1 class="view-title">Add your own guide</h1>
<p class="view-subtitle">
  Enter a game title, copy the prompt into your favorite AI chat, then paste the JSON back here.
</p>

<section class="add-guide-section" aria-labelledby="step1-title">
  <h2 id="step1-title" class="add-guide-step-title">1. Game title</h2>
  <label class="add-guide-label" for="game-title-input">Display title for your game</label>
  <input
    id="game-title-input"
    class="form-input"
    type="text"
    autocomplete="off"
    placeholder="e.g. Super Metroid"
    bind:value={gameTitle}
    data-test="add-guide-title"
  />
  <p class="add-guide-hint" id="slug-hint">
    Suggested slug for your JSON: <code class="inline-code">{suggestedSlug}</code>
  </p>
</section>

<section class="add-guide-section" aria-labelledby="step2-title">
  <h2 id="step2-title" class="add-guide-step-title">2. Copy prompt for AI</h2>
  <p class="add-guide-hint">
    Paste this entire prompt into ChatGPT, Claude, or another model. The rules below match this app’s
    <code class="inline-code">HINT_RULES.md</code>.
  </p>
  <div class="prompt-toolbar">
    <button type="button" class="btn-primary" onclick={handleCopyPrompt} data-test="copy-prompt">
      {copyStatus || 'Copy prompt to clipboard'}
    </button>
  </div>
  <pre class="prompt-preview" aria-label="Generated prompt preview">{fullPrompt}</pre>
</section>

<section class="add-guide-section" aria-labelledby="step3-title">
  <h2 id="step3-title" class="add-guide-step-title">3. Paste JSON and save</h2>
  <p class="add-guide-hint">
    <strong>Validate</strong> checks required fields and structure (tags, hints, sources, etc.). It does not enforce every
    editorial rule in <code class="inline-code">HINT_RULES.md</code>; maintainers still review against that document.
  </p>
  <label class="add-guide-label" for="paste-json">Paste the JSON your AI generated</label>
  <textarea
    id="paste-json"
    class="form-textarea"
    rows="12"
    bind:value={pasteText}
    oninput={onPasteInput}
    aria-describedby={pasteAriaDescribedBy}
    data-test="paste-json"
  ></textarea>

  <div class="add-guide-actions">
    <button type="button" class="btn-secondary" onclick={runValidate} data-test="validate-json">
      Validate
    </button>
    <button
      type="button"
      class="btn-primary"
      onclick={handleSave}
      disabled={!lastValidJsonText}
      data-test="save-guide"
    >
      Save to this device
    </button>
  </div>

  {#if validationErrors.length > 0}
    <div class="validation-msg validation-msg-error" role="alert" id="validation-errors">
      <strong>Errors</strong>
      <ul>
        {#each validationErrors as err}
          <li>{err}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if validationWarnings.length > 0}
    <div class="validation-msg validation-msg-warn" role="status" id="validation-warnings">
      <strong>Warnings</strong>
      <ul>
        {#each validationWarnings as w}
          <li>{w}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if saveError}
    <p class="validation-msg validation-msg-error" role="alert" id="save-error">{saveError}</p>
  {/if}
</section>

<section class="add-guide-section" aria-labelledby="step4-title">
  <h2 id="step4-title" class="add-guide-step-title">4. Propose your guide for the official site</h2>
  <p class="add-guide-hint">
    After validation succeeds, copy your JSON and open a pre-filled GitHub issue on the project repo. Paste the
    JSON into the issue (or attach a <code class="inline-code">.json</code> file if it is very large).
  </p>
  <div class="add-guide-actions">
    <button
      type="button"
      class="btn-secondary"
      onclick={handleCopyValidatedJson}
      disabled={!lastValidJsonText}
      data-test="copy-validated-json"
    >
      {copyJsonStatus || 'Copy validated JSON'}
    </button>
    <button
      type="button"
      class="btn-primary"
      onclick={handleOpenContributeIssue}
      disabled={!lastValidJsonText || !contributeIssueConfigured}
      data-test="open-contribute-issue"
    >
      Open GitHub issue…
    </button>
  </div>
</section>

<section class="add-guide-section" aria-labelledby="local-list-title">
  <h2 id="local-list-title" class="add-guide-step-title">Guides on this device</h2>
  {#if localGuides.length === 0}
    <p class="placeholder">No local guides yet.</p>
  {:else}
    <ul class="local-guides-list" role="list">
      {#each localGuides as g}
        <li class="local-guides-row">
          <span class="local-guides-title">{g.title}</span>
          <code class="inline-code local-guides-slug">{g.slug}</code>
          <button
            type="button"
            class="btn-danger"
            onclick={() => handleRemove(g.slug)}
            data-test="remove-guide-{g.slug}"
          >
            Remove
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
