import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ThemeProvider } from "next-themes"

const DEV_SW_CLEANUP_KEY = '__dev_sw_cleanup_done__';

async function maybeCleanupDevServiceWorkerAndReload() {
  if (import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  if (sessionStorage.getItem(DEV_SW_CLEANUP_KEY)) return;

  // If a SW is controlling the page (or any registrations exist), we unregister
  // and reload ONCE to guarantee a clean module graph (prevents "Invalid hook call").
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const hasAny = regs.length > 0;
    const isControlled = !!navigator.serviceWorker.controller;

    if (!hasAny && !isControlled) return;

    sessionStorage.setItem(DEV_SW_CLEANUP_KEY, '1');

    await Promise.all(regs.map((r) => r.unregister()));

    // Best-effort: clear caches to avoid stale Vite chunks.
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    window.location.reload();
  } catch {
    // ignore
  }
}

async function bootstrap() {
  await maybeCleanupDevServiceWorkerAndReload();

  createRoot(document.getElementById("root")!).render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <App />
    </ThemeProvider>
  );

  // Prod: register Service Worker
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');

        // Ensure newest SW takes control quickly
        const trySkipWaiting = () => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        };

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              trySkipWaiting();
            }
          });
        });

        trySkipWaiting();

        // When SW controller changes, reload once to be on fresh cache
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });

        // Best-effort update
        reg.update().catch(() => {});
      } catch (err) {
        console.error('SW registration failed:', err);
      }
    });
  }
}

bootstrap();

