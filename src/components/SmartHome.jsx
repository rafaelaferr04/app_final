import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SmartHome() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/Dashboard', { replace: true });
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-700 rounded-full animate-spin" />
    </div>
  );
}
