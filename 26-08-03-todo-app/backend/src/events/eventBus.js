/**
 * eventBus.js — a small in-process, asynchronous event bus.
 *
 *  - publish() NEVER blocks the caller: the event is pushed onto a queue and
 *    handled later (setImmediate), so an HTTP request returns without waiting
 *    for reminders/analytics work.
 *  - Each subscriber runs independently; one failing handler cannot break
 *    another or the request that produced the event.
 *  - Failed handlers are retried with exponential backoff, then moved to a
 *    dead-letter list (visible via stats()).
 *  - Concurrency is capped so a burst of events can't flood MongoDB.
 *
 * To scale beyond one process, keep the same publish/subscribe API and back
 * it with Redis Streams / BullMQ / RabbitMQ instead of this in-memory queue.
 */
const { randomUUID } = require('crypto');

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 200;
const CONCURRENCY = 4;
const DEAD_LETTER_LIMIT = 50;

class EventBus {
  constructor() {
    this.handlers = new Map(); // eventType -> [{ name, fn }]
    this.queue = [];
    this.active = 0;
    this.scheduled = false;
    this.deadLetters = [];
    this.metrics = { published: 0, processed: 0, retried: 0, failed: 0 };
  }

  subscribe(eventType, name, fn) {
    const list = this.handlers.get(eventType) || [];
    list.push({ name, fn });
    this.handlers.set(eventType, list);
  }

  /** Fire-and-forget. Returns the event id immediately. */
  publish(type, payload = {}) {
    const event = { id: randomUUID(), type, payload, at: new Date().toISOString() };
    this.metrics.published += 1;

    const subs = this.handlers.get(type) || [];
    for (const sub of subs) {
      this.queue.push({ event, sub, attempt: 1 });
    }
    this._schedule();
    return event.id;
  }

  _schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    setImmediate(() => {
      this.scheduled = false;
      this._drain();
    });
  }

  _drain() {
    while (this.active < CONCURRENCY && this.queue.length > 0) {
      const job = this.queue.shift();
      this.active += 1;
      this._run(job).finally(() => {
        this.active -= 1;
        if (this.queue.length > 0) this._schedule();
      });
    }
  }

  async _run(job) {
    const { event, sub, attempt } = job;
    try {
      await sub.fn(event);
      this.metrics.processed += 1;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        this.metrics.retried += 1;
        const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        setTimeout(() => {
          this.queue.push({ event, sub, attempt: attempt + 1 });
          this._schedule();
        }, delay).unref?.();
      } else {
        this.metrics.failed += 1;
        console.error(`[eventBus] ${sub.name} failed for ${event.type} after ${attempt} attempts:`, err.message);
        this.deadLetters.unshift({
          eventId: event.id,
          type: event.type,
          handler: sub.name,
          error: err.message,
          at: new Date().toISOString(),
        });
        this.deadLetters.length = Math.min(this.deadLetters.length, DEAD_LETTER_LIMIT);
      }
    }
  }

  stats() {
    return {
      ...this.metrics,
      queued: this.queue.length,
      inFlight: this.active,
      deadLetters: this.deadLetters.slice(0, 10),
    };
  }
}

module.exports = new EventBus();
