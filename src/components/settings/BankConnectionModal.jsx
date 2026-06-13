import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Check, Shield, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

const PROVIDERS = [
  { id: 'plaid', name: 'Plaid', logo: '🏦', description: 'EUA e Canadá' },
  { id: 'tink', name: 'Tink', logo: '🇪🇺', description: 'Europa' },
  { id: 'truelayer', name: 'TrueLayer', logo: '🇬🇧', description: 'Reino Unido e Europa' }
];

export default function BankConnectionModal({ isOpen, onClose, onConnect }) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedProvider(null);
      setCredentials({ username: '', password: '' });
    }
  }, [isOpen]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // In production, this would integrate with Plaid Link
      // For now, simulate API connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockAccessToken = `${selectedProvider.id}_access_${Date.now()}`;
      
      onConnect({
        ...selectedProvider,
        access_token: mockAccessToken
      });
      
      toast.success('Banco conectado com sucesso!');
      setStep(1);
      setSelectedProvider(null);
      setCredentials({ username: '', password: '' });
    } catch (error) {
      toast.error('Erro ao conectar. Tenta novamente.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Conectar Banco</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Security Notice */}
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-6">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 text-sm">100% Seguro</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Usamos encriptação de nível bancário. Nunca armazenamos as tuas credenciais.
                      </p>
                    </div>
                  </div>
                </div>

                <h3 className="font-semibold text-slate-800 mb-4">Escolhe o Provedor</h3>
                <div className="space-y-3">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider);
                        setStep(2);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                    >
                      <div className="text-3xl">{provider.logo}</div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-slate-800 group-hover:text-emerald-700">
                          {provider.name}
                        </p>
                        <p className="text-sm text-slate-500">{provider.description}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-slate-300 group-hover:border-emerald-500 group-hover:bg-emerald-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-6">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
                  >
                    ← Voltar
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-slate-50">
                  <div className="text-3xl">{selectedProvider?.logo}</div>
                  <div>
                    <p className="font-semibold text-slate-800">{selectedProvider?.name}</p>
                    <p className="text-sm text-slate-500">{selectedProvider?.description}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Esta é uma demonstração. Numa implementação real, serias redirecionado para o portal seguro do {selectedProvider?.name}.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="username" className="text-slate-700 mb-2 block">
                      Nome de utilizador
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                      placeholder="O teu username do banco"
                      className="h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="text-slate-700 mb-2 block">
                      Palavra-passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type="password"
                        value={credentials.password}
                        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                        placeholder="••••••••"
                        className="h-12 pl-11"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={!credentials.username || !credentials.password || isConnecting}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A conectar...
                    </>
                  ) : (
                    <>
                      <Building2 className="mr-2 h-4 w-4" />
                      Conectar Banco
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}