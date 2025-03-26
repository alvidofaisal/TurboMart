import { getUser } from "@/lib/queries";
import { LoginForm, SignInSignUp, SignOut } from "./auth.client";

// Detect if we're in a build environment
const isBuild = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build';

export async function AuthServer() {
  // During build time, return a placeholder
  if (isBuild) {
    return <SignInSignUp />;
  }
  
  const user = await getUser();
  // TODO: Could dynamic load the sign-in/sign-up and sign-out components as they're not used on initial render
  if (!user) {
    return <SignInSignUp />;
  }
  return <SignOut username={user.username} />;
}

export async function PlaceOrderAuth() {
  // During build time, return null
  if (isBuild) {
    return null;
  }
  
  const user = await getUser();
  if (user) {
    return null;
  }
  return (
    <>
      <p className="font-semibold text-accent1">Log in to place an order</p>
      <LoginForm />
    </>
  );
}
