'use client';
import { useEffect, useState } from 'react';
import { getLiveConditions, type LiveConditions } from '@/lib/api';

/**
 * How often a browser asks our own API. The backend caches upstream for five
 * minutes, so almost every one of these is a cache hit; the point is to pick a
 * new reading up within seconds of the server's TTL expiring instead of waiting
 * out a slow poll.
 */
export const LIVE_POLL_MS = 15_000;

export type LiveSnapshot = {
  live: LiveConditions | null;
  /** When this browser received the payload now on screen. */
  receivedAt: number | null;
  /** True only for the first load; later polls never blank the band. */
  isLoading: boolean;
  /** A poll is in flight right now. */
  isPolling: boolean;
};

const EMPTY: LiveSnapshot = { live: null, receivedAt: null, isLoading: true, isPolling: false };

/**
 * One poller per city, shared by every component that needs it.
 *
 * The band and the timeline both want this feed; as separate hooks they each
 * ran their own timer and their own request. One store keeps the two readouts
 * from disagreeing about how fresh the reading is, and keeps the polling
 * cadence tied to the tab rather than to how many panels happen to be mounted.
 */
type Store = {
  city: string;
  snapshot: LiveSnapshot;
  listeners: Set<(snapshot: LiveSnapshot) => void>;
  timer: number | null;
  onVisibility: (() => void) | null;
};

const stores = new Map<string, Store>();

function getStore(city: string): Store {
  let store = stores.get(city);
  if (!store) {
    store = { city, snapshot: EMPTY, listeners: new Set(), timer: null, onVisibility: null };
    stores.set(city, store);
  }
  return store;
}

function publish(store: Store, patch: Partial<LiveSnapshot>) {
  store.snapshot = { ...store.snapshot, ...patch };
  store.listeners.forEach((listener) => listener(store.snapshot));
}

async function poll(store: Store) {
  if (store.snapshot.isPolling) return;
  publish(store, { isPolling: true });
  const data = await getLiveConditions(store.city);
  // A failed poll keeps the reading on screen: the payload already carries
  // `stale`, and a blank band is worse than a number that is a minute old.
  publish(store, {
    ...(data ? { live: data, receivedAt: Date.now() } : null),
    isLoading: false,
    isPolling: false,
  });
}

function start(store: Store) {
  if (store.timer !== null) return;
  poll(store);
  store.timer = window.setInterval(() => {
    if (!document.hidden) poll(store);
  }, LIVE_POLL_MS);

  // A dashboard left open overnight should not keep a free API awake, so
  // polling pauses while the tab is hidden and refreshes once on return.
  const onVisibility = () => {
    if (!document.hidden && store.timer !== null) poll(store);
  };
  store.onVisibility = onVisibility;
  document.addEventListener('visibilitychange', onVisibility);
}

function stop(store: Store) {
  if (store.listeners.size > 0 || store.timer === null) return;
  window.clearInterval(store.timer);
  store.timer = null;
  const onVisibility = store.onVisibility;
  if (onVisibility) {
    document.removeEventListener('visibilitychange', onVisibility);
    store.onVisibility = null;
  }
}

export function useLiveConditions(city: string): LiveSnapshot {
  const store = getStore(city);
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(store.snapshot);

  useEffect(() => {
    setSnapshot(store.snapshot);
    store.listeners.add(setSnapshot);
    start(store);
    return () => {
      store.listeners.delete(setSnapshot);
      stop(store);
    };
  }, [store]);

  return snapshot;
}
