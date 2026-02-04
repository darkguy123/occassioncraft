
'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { setDocumentNonBlocking } from './non-blocking-updates';


/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  signInWithEmailAndPassword(authInstance, email, password)
    .catch((error) => {
        let errorMessage = 'An unknown error occurred.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errorMessage = 'Invalid email or password. Please try again.';
        } else {
            errorMessage = error.message;
        }
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: errorMessage,
        });
    });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Handle Google Sign-In and check if the user is new. */
export async function handleGoogleSignIn(auth: Auth, firestore: Firestore): Promise<{ isNewUser: boolean }> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document already exists
    const userRef = doc(firestore, "users", user.uid);
    const userSnap = await getDoc(userRef);

    return { isNewUser: !userSnap.exists() };

  } catch (error: any) {
    // Handle specific Google sign-in errors
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in process was cancelled.');
    }
    if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with the same email address but different sign-in credentials.');
    }
    throw error; // Re-throw other errors to be caught by the caller
  }
}
