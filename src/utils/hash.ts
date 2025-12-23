import bcrypt from 'bcryptjs';

/**
 * Hashes a password using bcrypt algorithm with key from environment variables as salt
 * @param {string} password - The password to hash
 * @returns {string} - The bcrypt hashed password (synchronous & consistent)
 * @throws {Error} - If the salt key is not found in environment variables
 */
export const hashPassword = (password: string) => {
  // Get the salt key from environment variables
  const saltKey = import.meta.env.VITE_BCRYPT_SALT;
  
  if (!saltKey) {
    throw new Error('Salt key not found in environment variables. Please set VITE_BCRYPT_SALT in your .env file.');
  }
  
  return bcrypt.hashSync(password, saltKey);
};
