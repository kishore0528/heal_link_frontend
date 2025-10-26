"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { authApi } from "@/utils/api";

export default function Login() {
  const router = useRouter();
  const googleClientId = (
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
  ).trim();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempUserId, setTempUserId] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const requestBody = {
        email: formData.email,
        password: formData.password,
      };

      // If 2FA is required, include the code
      if (requiresTwoFactor && twoFactorCode) {
        requestBody.twoFactorCode = twoFactorCode;
      }

      const data = await authApi.login(requestBody);

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTempUserId(data.tempUserId);
        setError(""); // Clear any previous errors
        return;
      }

      // Successful login
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      console.log("Login successful - Role:", data.role);

      if (data.role === "admin") {
        router.push("/admin");
      } else if (data.role === "doctor") {
        router.push("/doctor");
      } else if (data.role === "patient") {
        router.push("/patient/dashboard");
      } else if (data.role === "nurse") {
        router.push("/nurse");
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackTo2FA = () => {
    setRequiresTwoFactor(false);
    setTwoFactorCode("");
    setTempUserId(null);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-50 to-blue-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Logo and Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 mb-4"
          >
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Heal Link</h1>
          </Link>
          <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-blue-100">Sign in to your account to continue</p>
        </div>

        <div className="px-8 py-8">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="relative">
              <div className="relative border-2 border-gray-300 rounded-lg focus-within:border-blue-500 transition-colors">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full px-4 pt-6 pb-2 text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 peer"
                  placeholder=" "
                />
                <label
                  htmlFor="email"
                  className="absolute left-4 top-4 text-gray-500 text-sm transition-all duration-200 origin-left peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue-600"
                >
                  Email Address
                </label>
              </div>
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="relative border-2 border-gray-300 rounded-lg focus-within:border-blue-500 transition-colors">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full px-4 pt-6 pb-2 pr-12 text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 peer"
                  placeholder=" "
                />
                <label
                  htmlFor="password"
                  className="absolute left-4 top-4 text-gray-500 text-sm transition-all duration-200 origin-left peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue-600"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5 text-gray-500 cursor-pointer"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5 text-gray-500 cursor-pointer"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Two Factor Authentication Code */}
            {requiresTwoFactor && (
              <div className="relative">
                <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Two-Factor Authentication Required</span>
                  </div>
                  <p className="mt-2 text-sm">
                    Please open your Microsoft Authenticator app and enter the 6-digit code.
                  </p>
                </div>
                <div className="relative border-2 border-gray-300 rounded-lg focus-within:border-blue-500 transition-colors">
                  <input
                    id="twoFactorCode"
                    name="twoFactorCode"
                    type="text"
                    maxLength="6"
                    autoComplete="one-time-code"
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    className="block w-full px-4 pt-6 pb-2 text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 peer text-center text-2xl tracking-widest font-mono"
                    placeholder=" "
                  />
                  <label
                    htmlFor="twoFactorCode"
                    className="absolute left-4 top-4 text-gray-500 text-sm transition-all duration-200 origin-left peer-focus:-translate-y-2 peer-focus:scale-75 peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:-translate-y-2 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-blue-600"
                  >
                    6-Digit Authentication Code
                  </label>
                </div>
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={handleBackTo2FA}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    ← Back to login form
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me + Forgot Password */}
            {!requiresTwoFactor && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </a>
                </div>
              </div>
            )}

            {/* Sign In Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || (requiresTwoFactor && twoFactorCode.length !== 6)}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
              >
                {isLoading 
                  ? (requiresTwoFactor ? "Verifying..." : "Signing in...") 
                  : (requiresTwoFactor ? "Verify Code" : "Sign in")
                }
              </button>
            </div>



            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login */}
            <div className="mt-6 flex justify-center">
              {googleClientId ? (
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setError("");
                      const tokenId = credentialResponse?.credential;
                      if (!tokenId) {
                        setError("Google sign-in failed: missing credential");
                        return;
                      }

                      const data = await authApi.googleLogin(tokenId);

                      localStorage.setItem("token", data.token);
                      localStorage.setItem("role", "patient");
                      // Automatically redirect to patient dashboard for Google sign-in
                      router.push("/patient/dashboard");
                    } catch (e) {
                      setError(e.message || "Google sign-in error");
                    }
                  }}
                  onError={() => setError("Google sign-in failed")}
                />
              ) : (
                <button
                  type="button"
                  className="inline-flex justify-center py-3 px-6 border border-gray-300 rounded-xl bg-gray-100 text-sm font-medium text-gray-500 cursor-not-allowed"
                  title="Google Client ID not configured"
                  onClick={() =>
                    setError(
                      "Google Client ID is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local and restart the server."
                    )
                  }
                >
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up now
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
