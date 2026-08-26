import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { inputClasses, labelClasses, buttonPrimaryClasses, cardClasses, errorTextClasses } from "../lib/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  async function handleSubmit(e) { e.preventDefault(); setError(""); setSubmitting(true); try { await login(email, password); } catch (err) { setError(err.message || "Login failed"); } finally { setSubmitting(false); } }
  return <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4 py-8 sm:py-12">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#e4e8ee] bg-white shadow-[0_24px_70px_rgba(23,32,43,.10)] lg:grid-cols-[1fr_420px]">
      <section className="hidden bg-[#17202b] p-10 text-white lg:flex lg:flex-col lg:justify-between"><div><p className="eyebrow mb-6">ADC inventory</p><h1 className="max-w-md text-5xl font-semibold leading-tight tracking-[-.04em]">Know what your business owns.</h1><p className="mt-6 max-w-sm text-base leading-7 text-white/65">A clear, composed workspace for assets, products, people, and locations.</p></div><p className="text-sm text-white/45">Albanian Development Company</p></section>
      <section className={`${cardClasses} rounded-none border-0 p-6 sm:p-10`}><img src="/adc-logo.png" alt="ADC — Albanian Development Company" className="mb-10 h-9 w-auto" /><p className="eyebrow mb-3">Welcome back</p><h2 className="mb-2 text-3xl font-semibold tracking-tight text-[#17202b]">Inventory sign in</h2><p className="mb-8 text-sm leading-6 text-[#7a8795]">Use your company account to continue.</p>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5"><div><label htmlFor="email" className={labelClasses}>Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} /></div><div><label htmlFor="password" className={labelClasses}>Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClasses} /></div>{error && <p role="alert" className={errorTextClasses}>{error}</p>}<button type="submit" disabled={submitting} className={`${buttonPrimaryClasses} mt-2 w-full`}>{submitting ? "Signing in…" : "Sign in"}</button></form>
      </section>
    </div>
  </main>;
}
