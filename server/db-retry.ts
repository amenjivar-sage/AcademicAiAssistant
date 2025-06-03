// Database retry utility for deployment environments
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry certain errors
      if (error?.code === '23505' || // Unique constraint violation
          error?.code === '23503' || // Foreign key violation
          error?.code === '23514') { // Check constraint violation
        throw error;
      }
      
      // Retry on connection issues, timeouts, or endpoint disabled
      if (attempt < maxRetries && (
          error?.code === 'XX000' || // General error (endpoint disabled)
          error?.message?.includes('timeout') ||
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('ENOTFOUND') ||
          error?.message?.includes('endpoint is disabled')
      )) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}