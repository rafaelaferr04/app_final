import React from 'react';
import TopNav from '@/components/common/TopNav';
import BottomTabBar from '@/components/common/BottomTabBar';
import ChatBubble from '@/components/chat/ChatBubble';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 min-[800px]:pb-8">
        {children}
      </main>
      <BottomTabBar />
      <ChatBubble />
    </div>
  );
}
