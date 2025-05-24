import { signUp, signIn, signOutUser } from '@/utils/firebaseAuth';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, Auth } from 'firebase/auth';

// Mock the firebase/auth module
jest.mock('firebase/auth');

// Cast the mocked functions for better typing in tests
const mockCreateUserWithEmailAndPassword = createUserWithEmailAndPassword as jest.Mock;
const mockSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockAuth = { currentUser: null } as unknown as Auth; // Mock auth object

describe('Authentication Utility Functions', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockCreateUserWithEmailAndPassword.mockClear();
    mockSignInWithEmailAndPassword.mockClear();
    mockSignOut.mockClear();
  });

  describe('signUp', () => {
    it('should call createUserWithEmailAndPassword and return the user credential on success', async () => {
      const mockUserCredential = { user: { uid: 'test-uid', email: 'test@example.com' } };
      mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const email = 'test@example.com';
      const password = 'password123';
      const result = await signUp(email, password);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, email, password);
      expect(result).toBe(mockUserCredential);
    });

    it('should throw an error if createUserWithEmailAndPassword fails', async () => {
      const mockError = new Error('Signup failed');
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const email = 'test@example.com';
      const password = 'password123';

      await expect(signUp(email, password)).rejects.toThrow('Signup failed');
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, email, password);
    });
  });

  describe('signIn', () => {
    it('should call signInWithEmailAndPassword and return the user credential on success', async () => {
      const mockUserCredential = { user: { uid: 'test-uid', email: 'test@example.com' } };
      mockSignInWithEmailAndPassword.mockResolvedValue(mockUserCredential);

      const email = 'test@example.com';
      const password = 'password123';
      const result = await signIn(email, password);

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, email, password);
      expect(result).toBe(mockUserCredential);
    });

    it('should throw an error if signInWithEmailAndPassword fails', async () => {
      const mockError = new Error('Sign in failed');
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const email = 'test@example.com';
      const password = 'password123';

      await expect(signIn(email, password)).rejects.toThrow('Sign in failed');
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, email, password);
    });
  });

  describe('signOutUser', () => {
    it('should call signOut on success', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await signOutUser();

      expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    });

    it('should throw an error if signOut fails', async () => {
      const mockError = new Error('Sign out failed');
      mockSignOut.mockRejectedValue(mockError);

      await expect(signOutUser()).rejects.toThrow('Sign out failed');
      expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    });
  });
});