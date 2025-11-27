import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Database Functions', () => {
  describe('Search History', () => {
    it('should add search history', async () => {
      const result = await db.addSearchHistory({
        userId: 1,
        symbol: 'AAPL',
        shortName: 'Apple Inc.',
        companyName: 'Apple Inc.',
      });
      
      expect(result).toBe(true);
    });
    
    it('should get search history', async () => {
      const results = await db.getSearchHistory(1, 10);
      expect(Array.isArray(results)).toBe(true);
    });
  });
  
  describe('Watchlist', () => {
    it('should add to watchlist', async () => {
      const result = await db.addToWatchlist({
        userId: 1,
        symbol: 'TSLA',
        name: 'Tesla Inc.',
      });
      
      expect(result).toBe(true);
    });
    
    it('should get watchlist', async () => {
      const results = await db.getWatchlist(1);
      expect(Array.isArray(results)).toBe(true);
    });
    
    it('should remove from watchlist', async () => {
      const result = await db.removeFromWatchlist(1, 'TSLA');
      expect(result).toBe(true);
    });
  });
  
  describe('User Interactions', () => {
    it('should track interaction', async () => {
      const result = await db.trackInteraction({
        userId: 1,
        symbol: 'GOOGL',
        interactionType: 'click',
        context: 'recommendation_card',
      });
      
      expect(result).toBe(true);
    });
  });
  
  describe('Recommendations', () => {
    it('should get recommendations', async () => {
      const results = await db.getRecommendations(1, 'US', 6);
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
