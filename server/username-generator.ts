import type { IStorage } from "./storage";

export class UsernameGenerator {
  constructor(private storage: IStorage) {}

  /**
   * Generates a unique username using multiple fallback strategies:
   * 1. Email prefix (before @) - if unique
   * 2. firstname.lastname - if unique
   * 3. firstname.lastname + year (from email domain or current year)
   * 4. firstname.lastname + incrementing number
   * 5. lastname.firstname as final fallback
   */
  async generateUniqueUsername(
    email: string, 
    firstName: string, 
    lastName: string,
    role: string
  ): Promise<string> {
    const cleanFirst = this.cleanName(firstName);
    const cleanLast = this.cleanName(lastName);
    const emailPrefix = email.split('@')[0].toLowerCase();
    
    // Strategy 1: Use email prefix if it's clean and unique
    if (await this.isUsernameAvailable(emailPrefix)) {
      return emailPrefix;
    }

    // Strategy 2: firstname.lastname
    const basicUsername = `${cleanFirst}.${cleanLast}`;
    if (await this.isUsernameAvailable(basicUsername)) {
      return basicUsername;
    }

    // Strategy 3: Add year from email domain or current year
    const year = this.extractYearFromEmail(email) || new Date().getFullYear().toString().slice(-2);
    const usernameWithYear = `${cleanFirst}.${cleanLast}${year}`;
    if (await this.isUsernameAvailable(usernameWithYear)) {
      return usernameWithYear;
    }

    // Strategy 4: Add role prefix for teachers
    if (role === 'teacher') {
      const teacherUsername = `${cleanFirst}.${cleanLast}.teacher`;
      if (await this.isUsernameAvailable(teacherUsername)) {
        return teacherUsername;
      }
    }

    // Strategy 5: Incremental numbers
    for (let i = 2; i <= 99; i++) {
      const numberedUsername = `${cleanFirst}.${cleanLast}${i}`;
      if (await this.isUsernameAvailable(numberedUsername)) {
        return numberedUsername;
      }
    }

    // Strategy 6: Reverse order as last resort
    const reversedUsername = `${cleanLast}.${cleanFirst}`;
    if (await this.isUsernameAvailable(reversedUsername)) {
      return reversedUsername;
    }

    // Final fallback with timestamp
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanFirst}.${cleanLast}.${timestamp}`;
  }

  /**
   * Clean names by removing special characters and converting to lowercase
   */
  private cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .substring(0, 15); // Limit length
  }

  /**
   * Extract graduation year or identifying numbers from email
   * Works with Gmail, Outlook, Yahoo, and school domains
   * Examples: john.smith25@gmail.com -> 25, jane.doe2024@outlook.com -> 24
   */
  private extractYearFromEmail(email: string): string | null {
    const emailPart = email.split('@')[0];
    
    // Look for 2-4 digit years at the end of email prefix
    const yearMatch = emailPart.match(/(\d{2,4})$/);
    if (yearMatch) {
      const year = yearMatch[1];
      if (year.length === 4) {
        return year.slice(-2); // Convert 2024 to 24
      }
      return year;
    }

    // Look for numbers in the middle of email (like john.smith.25@gmail.com)
    const middleNumberMatch = emailPart.match(/\.(\d{2,4})(?:\.|$)/);
    if (middleNumberMatch) {
      const year = middleNumberMatch[1];
      if (year.length === 4) {
        return year.slice(-2);
      }
      return year;
    }

    return null;
  }

  /**
   * Check if username is available
   */
  private async isUsernameAvailable(username: string): Promise<boolean> {
    try {
      const existingUser = await this.storage.getUserByUsername(username);
      return !existingUser;
    } catch (error) {
      // If there's an error checking, assume it's available
      return true;
    }
  }

  /**
   * Generate suggestions for admin review
   */
  async generateUsernameSuggestions(
    email: string, 
    firstName: string, 
    lastName: string,
    role: string
  ): Promise<string[]> {
    const cleanFirst = this.cleanName(firstName);
    const cleanLast = this.cleanName(lastName);
    const emailPrefix = email.split('@')[0].toLowerCase();
    const year = this.extractYearFromEmail(email) || new Date().getFullYear().toString().slice(-2);

    const suggestions: string[] = [];

    // Add various options for admin to choose from
    const options = [
      emailPrefix,
      `${cleanFirst}.${cleanLast}`,
      `${cleanFirst}.${cleanLast}${year}`,
      `${cleanFirst}${cleanLast}`,
      `${cleanFirst}_${cleanLast}`,
      role === 'teacher' ? `${cleanFirst}.${cleanLast}.teacher` : `${cleanFirst}.${cleanLast}.student`,
      `${cleanLast}.${cleanFirst}`,
    ];

    // Check availability for each option
    for (const option of options) {
      if (await this.isUsernameAvailable(option)) {
        suggestions.push(option);
      }
    }

    // If we have less than 3 suggestions, add numbered variants
    if (suggestions.length < 3) {
      for (let i = 2; i <= 10; i++) {
        const numberedOption = `${cleanFirst}.${cleanLast}${i}`;
        if (await this.isUsernameAvailable(numberedOption)) {
          suggestions.push(numberedOption);
          if (suggestions.length >= 5) break;
        }
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}

// Helper function for easy import
export async function generateUsernameFromEmail(email: string, storage: IStorage): Promise<string> {
  const generator = new UsernameGenerator(storage);
  
  // Extract basic info from email for fallback
  const emailPrefix = email.split('@')[0];
  const nameParts = emailPrefix.split(/[._-]/);
  const firstName = nameParts[0] || 'user';
  const lastName = nameParts[1] || 'student';
  
  return generator.generateUniqueUsername(email, firstName, lastName, 'student');
}