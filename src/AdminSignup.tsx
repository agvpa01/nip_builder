import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { SignOutButton } from "./SignOutButton";

export function AdminSignup() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const createFirstAdmin = useMutation(api.admin.createFirstAdmin);

  const handleCreateAdmin = async () => {
    try {
      await createFirstAdmin();
      toast.success("Admin account created successfully!");
    } catch (error) {
      toast.error("Failed to create admin account");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Admin Setup</h1>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-20 px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Admin Account</h2>
            <p className="text-gray-600 mb-6">
              No admin exists yet. Create the first admin account to manage users.
            </p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Current User:</strong> {loggedInUser?.email}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  This account will become the admin account.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateAdmin}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Admin Account
          </button>
        </div>
      </main>
    </div>
  );
}
