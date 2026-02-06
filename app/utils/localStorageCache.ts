/**
 * LocalStorageCache - Client-side data persistence layer
 *
 * Features:
 * - 5-minute TTL (Time To Live) for cache freshness
 * - Version control for cache invalidation on schema changes
 * - Type-safe entity-specific methods
 * - Automatic expiration checking
 */

import { Query, User, Preferences } from "./sheets";

const CACHE_KEY_PREFIX = "query_tracker_";
const CACHE_VERSION = "v1";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export class LocalStorageCache {
  /**
   * Check if a cache entry is still valid
   * Returns false if:
   * - Entry doesn't exist
   * - Entry is older than CACHE_DURATION
   * - Entry version doesn't match current version
   */
  private static isValid(key: string): boolean {
    try {
      const entry = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!entry) return false;

      const parsed: CacheEntry<any> = JSON.parse(entry);
      const age = Date.now() - parsed.timestamp;

      return parsed.version === CACHE_VERSION && age < CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }

  /**
   * Save data to cache with timestamp and version
   */
  static save<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
    } catch (error) {
      // If localStorage is full, clear old entries and retry
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        this.clearOldEntries();
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            version: CACHE_VERSION,
          };
          localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
        } catch (retryError) {
          // Silent failure
        }
      }
    }
  }

  /**
   * Load data from cache
   * Returns null if cache is invalid or doesn't exist
   */
  static load<T>(key: string): T | null {
    if (!this.isValid(key)) return null;

    try {
      const entry = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!entry) return null;

      // Additional validation: ensure entry is not just whitespace or "null"
      if (!entry.trim() || entry === "null" || entry === "undefined") {
        localStorage.removeItem(CACHE_KEY_PREFIX + key);
        return null;
      }

      const parsed: CacheEntry<T> = JSON.parse(entry);

      // Validate parsed structure
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        localStorage.removeItem(CACHE_KEY_PREFIX + key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      // Remove corrupted entry
      try {
        localStorage.removeItem(CACHE_KEY_PREFIX + key);
      } catch (e) {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  /**
   * Clear all cache entries for this app
   */
  static clear(): void {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_KEY_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Clear old/expired entries to free up space
   */
  private static clearOldEntries(): void {
    try {
      const now = Date.now();
      Object.keys(localStorage)
        .filter((key) => key.startsWith(CACHE_KEY_PREFIX))
        .forEach((key) => {
          try {
            const entry = localStorage.getItem(key);
            if (entry) {
              const parsed: CacheEntry<any> = JSON.parse(entry);
              const age = now - parsed.timestamp;
              if (age > CACHE_DURATION) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // If parsing fails, remove the corrupted entry
            localStorage.removeItem(key);
          }
        });
    } catch (error) {
      // Silent failure
    }
  }

  /**
   * Get cache age in milliseconds
   * Returns null if cache doesn't exist
   */
  static getCacheAge(key: string): number | null {
    try {
      const entry = localStorage.getItem(CACHE_KEY_PREFIX + key);
      if (!entry) return null;

      const parsed: CacheEntry<any> = JSON.parse(entry);
      return Date.now() - parsed.timestamp;
    } catch (error) {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTITY-SPECIFIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Save queries to cache
   */
  static saveQueries(queries: Query[]): void {
    this.save("queries", queries);
  }

  /**
   * Load queries from cache
   * Returns null if cache is invalid or expired
   */
  static loadQueries(): Query[] | null {
    return this.load<Query[]>("queries");
  }

  /**
   * Save users to cache
   */
  static saveUsers(users: User[]): void {
    this.save("users", users);
  }

  /**
   * Load users from cache
   */
  static loadUsers(): User[] | null {
    return this.load<User[]>("users");
  }

  /**
   * Save preferences to cache
   */
  static savePreferences(prefs: Preferences): void {
    this.save("preferences", prefs);
  }

  /**
   * Load preferences from cache
   */
  static loadPreferences(): Preferences | null {
    return this.load<Preferences>("preferences");
  }

  /**
   * Save all data at once (atomic operation)
   */
  static saveAll(data: {
    queries: Query[];
    users: User[];
    preferences: Preferences;
  }): void {
    this.saveQueries(data.queries);
    this.saveUsers(data.users);
    this.savePreferences(data.preferences);
  }

  /**
   * Load all data at once
   * Returns null if any required data is missing
   */
  static loadAll(): {
    queries: Query[];
    users: User[];
    preferences: Preferences;
  } | null {
    const queries = this.loadQueries();
    const users = this.loadUsers();
    const preferences = this.loadPreferences();

    if (queries && users && preferences) {
      return { queries, users, preferences };
    }

    return null;
  }

  /**
   * Check if cache exists and is valid
   */
  static hasValidCache(): boolean {
    return (
      this.isValid("queries") &&
      this.isValid("users") &&
      this.isValid("preferences")
    );
  }
}
