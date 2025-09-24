import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ConversationSidebar } from '../chat/ConversationSidebar';
import { cn } from '@/lib/utils.ts';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';

interface ChatLayoutProps {
  children: React.ReactNode;
}

// Create the knowledge panel as a separate component
function KnowledgePanel() {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col hidden lg:flex">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-2">Share Rita</h2>
        <p className="text-sm text-gray-600 mb-3">
          Invite your team members to use Rita for faster support resolution.
        </p>
        <Button variant="outline" size="sm" className="w-full bg-transparent border-blue-300 text-blue-700 hover:bg-blue-50">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share invite link
        </Button>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-6">
          <Link to="/files" className="block hover:bg-gray-50 rounded p-2 -mx-2 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-1">Knowledge base</h3>
            <p className="text-sm text-gray-600">23 Articles</p>
          </Link>
        </div>

        <div className="space-y-3">
          {[
            { title: "Password Reset Instructions", time: "2 minutes ago" },
            { title: "Network Connectivity Issues", time: "30 minutes ago" },
            { title: "Software Installation Guide", time: "1 hour ago" },
            { title: "Two-factor authentication setup", time: "1 hour ago" },
            { title: "Phishing awareness guide", time: "1 hour ago" },
          ].map((article, index) => (
            <Link key={index} to="/files" className="flex items-start gap-3 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
              <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                <p className="text-xs text-blue-600 mt-1">{article.time}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <Link to="/files">
          <Button variant="outline" size="sm" className="w-full bg-transparent border-blue-300 text-blue-700 hover:bg-blue-50">
            <Plus className="w-4 h-4 mr-2" />
            Add more
          </Button>
        </Link>
        <Link to="/files">
          <Button variant="outline" size="sm" className="w-full bg-transparent border-blue-300 text-blue-700 hover:bg-blue-50">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function ChatLayout({ children }: ChatLayoutProps) {
  const location = useLocation();
  const isFilesPage = location.pathname === '/files';

  // Split children into header and content
  const childrenArray = React.Children.toArray(children);
  const headerContent = childrenArray[0];
  const mainContent = childrenArray[1];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Global Header - spans full width */}
      <div className="bg-blue-600 text-white px-4 py-3 shadow-sm flex-shrink-0">
        {headerContent}
      </div>

      {/* Content area with sidebars below header */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <ConversationSidebar />

        {/* Main Content */}
        <div className={cn(
          "flex-1 flex flex-col bg-white",
          "transition-all duration-300 ease-in-out"
        )}>
          {mainContent}
        </div>

        {/* Right Sidebar - Knowledge Panel - Hidden on Files page */}
        {!isFilesPage && <KnowledgePanel />}
      </div>
    </div>
  );
}