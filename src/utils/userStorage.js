// src/utils/userStorage.js
/**
 * A utility for managing user-specific localStorage
 * This ensures each user's data is kept separate
 */

/**
 * Gets an item from localStorage with user-specific namespace
 * @param {string} userId - The user's ID
 * @param {string} key - The storage key
 * @returns {any} - The parsed value or null if not found
 */
export const getUserItem = (userId, key) => {
    if (!userId) return null;
    
    const namespacedKey = `user_${userId}_${key}`;
    const item = localStorage.getItem(namespacedKey);
    
    return item ? JSON.parse(item) : null;
  };
  
  /**
   * Sets an item in localStorage with user-specific namespace
   * @param {string} userId - The user's ID
   * @param {string} key - The storage key
   * @param {any} value - The value to store
   */
  export const setUserItem = (userId, key, value) => {
    if (!userId) return;
    
    const namespacedKey = `user_${userId}_${key}`;
    localStorage.setItem(namespacedKey, JSON.stringify(value));
  };
  
  /**
   * Removes an item from localStorage with user-specific namespace
   * @param {string} userId - The user's ID
   * @param {string} key - The storage key
   */
  export const removeUserItem = (userId, key) => {
    if (!userId) return;
    
    const namespacedKey = `user_${userId}_${key}`;
    localStorage.removeItem(namespacedKey);
  };
  
  /**
   * Clears all items for a specific user
   * @param {string} userId - The user's ID
   */
  export const clearUserStorage = (userId) => {
    if (!userId) return;
    
    const userPrefix = `user_${userId}_`;
    
    // Find all keys for this user
    const userKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(userPrefix)) {
        userKeys.push(key);
      }
    }
    
    // Remove all user keys
    userKeys.forEach(key => localStorage.removeItem(key));
  };