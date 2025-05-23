import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';

import { auth, app as firebaseApp } from '../firebaseConfig';

export const signUp = async (email: string, password: string) => {
  try {
    if (!email.includes('@')) throw new Error("Invalid email address.");

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User signed up:", user);

    // You may store user data in Firestore here...

    return { user, success: true };
  } catch (error: any) {
    console.error("Error signing up:", error.code, error.message);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("User signed in:", user);
    return { user, success: true };
  } catch (error: any) {
    console.error("Error signing in:", error.code, error.message);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Error signing out:", error.code, error.message);
    throw error;
  }
};

// Export firebase instances
export { auth, firebaseApp };
