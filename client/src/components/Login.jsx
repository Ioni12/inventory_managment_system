import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  inputClasses,
  labelClasses,
  buttonPrimaryClasses,
  cardClasses,
  errorTextClasses,
} from "../lib/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-page px-4">
      <div className={`${cardClasses} w-full max-w-sm`}>
        <img
          src="/adc-logo.png"
          alt="ADC — Albanian Development Company"
          className="h-9 w-auto mb-6"
        />
        <h1 className="text-title text-gray-900 mb-6">Inventory sign in</h1>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="email" className={labelClasses}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className={labelClasses}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          {error && (
            <p role="alert" className={errorTextClasses}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${buttonPrimaryClasses} w-full mt-2`}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
