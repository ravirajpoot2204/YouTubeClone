"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the Google token to your backend
      const res = await api.post("/auth/google", {
        token: credentialResponse.credential,
      });

      const { token, user } = res.data;

      // Save user and token in Zustand (and localStorage)
      setAuth(user, token);

      // Redirect to home page
      router.push("/");
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2">Sign In</h1>
        <p className="text-gray-500 mb-6">to continue to StreamApp</p>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert("Google login failed")}
            size="large"
            shape="pill"
            text="signin_with"
            theme="outline"
          />
        </div>

        <p className="text-xs text-gray-400 mt-6">
          By signing in, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}