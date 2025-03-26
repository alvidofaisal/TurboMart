"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth.client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
  });
  const { login, register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.username);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4">
        <div className="mt-1">
          <Input
            id="email"
            name="email"
            aria-label="Email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="relative block w-full appearance-none rounded-[1px] border px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
            placeholder="Email"
          />
        </div>

        {!isLogin && (
          <div className="mt-1">
            <Input
              id="username"
              name="username"
              aria-label="Username"
              type="text"
              autoCapitalize="off"
              autoComplete="username"
              spellCheck={false}
              required
              maxLength={50}
              value={formData.username}
              onChange={handleChange}
              className="relative block w-full appearance-none rounded-[1px] border px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
              placeholder="Username"
            />
          </div>
        )}

        <div>
          <div className="mt-1">
            <Input
              id="password"
              name="password"
              aria-label="Password"
              type="password"
              required
              maxLength={100}
              value={formData.password}
              onChange={handleChange}
              className="relative block w-full appearance-none rounded-[1px] border px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
              placeholder="Password"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="rounded-[1px] bg-accent1 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accent1 focus:outline-none focus:ring-2 focus:ring-accent1 focus:ring-offset-2"
          disabled={loading}
        >
          {isLogin ? "Log in" : "Sign up"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="text-xs text-accent1"
          onClick={() => setIsLogin(!isLogin)}
          disabled={loading}
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </Button>
      </div>
    </form>
  );
} 