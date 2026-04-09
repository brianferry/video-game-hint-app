import './styles.css';
import { initUserGames } from './lib/user-games.js';
/** Side effect: registers search index invalidation on user-games-changed */
import './lib/search.js';
import { mount } from 'svelte';
import App from './App.svelte';

await initUserGames();
mount(App, { target: document.getElementById('app') });
