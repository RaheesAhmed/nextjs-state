export function createLoggingMiddleware<T>() {
  return (state: T, nextState: T) => {
    console.log('Previous state:', state);
    console.log('Next state:', nextState);
    return nextState;
  };
}

export function createPersistenceMiddleware<T>(key: string) {
  return (state: T, nextState: T) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(nextState));
      } catch (error) {
        console.warn('Failed to persist state:', error);
      }
    }
    return nextState;
  };
}
