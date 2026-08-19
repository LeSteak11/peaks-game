import './ui/styles.css';

// Step 1 placeholder. The real app shell (daily flow, board, HUD) lands in Steps 4–5.
const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main class="placeholder">
      <h1>Peaks <span aria-hidden="true">⛰️</span></h1>
      <p>The Daily Summit is under construction.</p>
    </main>
  `;
}
