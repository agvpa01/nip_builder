import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { AdminDashboard } from "./AdminDashboard";
import { AdminSignup } from "./AdminSignup";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Toaster />
      <Content />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.admin.isCurrentUserAdmin);
  const canSignupAdmin = useQuery(api.admin.canSignupAdmin);

  if (loggedInUser === undefined || isAdmin === undefined || canSignupAdmin === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Authenticated>
        {isAdmin ? (
          <AdminDashboard />
        ) : canSignupAdmin ? (
          <AdminSignup />
        ) : (
          <RegularUserView />
        )}
      </Authenticated>
      
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Admin Portal</h1>
              <p className="text-xl text-gray-600">Sign in to continue</p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function RegularUserView() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  return (
    <div className="min-h-screen">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">User Portal</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {loggedInUser?.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to User Portal</h2>
              <p className="text-gray-600">You are logged in as a regular user.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
