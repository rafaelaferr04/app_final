import React from 'react';
import { motion } from 'framer-motion';
import { Home, Wallet, Target, BookOpen, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const navItems = [
  { icon: Home, label: 'Início', page: 'Dashboard' },
  { icon: Wallet, label: 'Carteira', page: 'Transactions' },
  { icon: Target, label: 'Metas', page: 'Goals' },
  { icon: BookOpen, label: 'Aprender', page: 'Courses' },
  { icon: MessageCircle, label: 'Chat', page: 'Chat' },
];

export default function BottomNav({ currentPage }) {
  const location = useLocation();
  
  // Get current page from URL
  const getCurrentPage = () => {
    const path = location.pathname.replace('/', '');
    return path || 'Dashboard';
  };
  
  const activePage = currentPage || getCurrentPage();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-t border-slate-200 px-2 pb-safe"
    >
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activePage === item.page;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className="relative flex flex-col items-center gap-1 py-3 px-4"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600"
                />
              )}
              <motion.div
                animate={{ 
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0
                }}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200' 
                    : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className={`text-xs font-medium ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}