import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin!12345');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ identifier, password });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-slate-800/90 p-8 shadow-2xl border border-slate-700/60 backdrop-blur-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-600/30">
            B
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Yönetim Paneli Girişi
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            İçeriklerinizi yönetmek için oturum açın
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Kullanıcı Adı veya E-Posta"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="admin@example.com"
          />

          <Input
            label="Şifre"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
          >
            Giriş Yap
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Güvenli Çift Katmanlı JWT ve Argon2id Korumalı Giriş
        </div>
      </div>
    </div>
  );
};
