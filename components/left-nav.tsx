'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export function LeftNav() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <div className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 z-20 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Image 
            src="/pure_global_logo.jpeg" 
            alt="Pure Global Logo" 
            width={40} 
            height={40} 
          />
          <h1 className="text-lg font-bold text-deep-purple">Pure Global Document AI</h1>
        </div>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          <li>
            <Link 
              href="/files" 
              className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/files') 
                  ? 'bg-purple text-white' 
                  : 'text-gray-700 hover:bg-light-white'
              }`}
            >
              Files Page
            </Link>
          </li>
          <li>
            <Link 
              href="/document-builder" 
              className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/document-builder') 
                  ? 'bg-purple text-white' 
                  : 'text-gray-700 hover:bg-light-white'
              }`}
            >
              Document Builder
            </Link>
          </li>
          <li>
            <Link 
              href="/field-prompt-manager" 
              className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/field-prompt-manager') 
                  ? 'bg-purple text-white' 
                  : 'text-gray-700 hover:bg-light-white'
              }`}
            >
              Field-Prompt Manager
            </Link>
          </li>
          <li>
            <Link 
              href="/chat-with-docs" 
              className={`block px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/chat-with-docs') 
                  ? 'bg-purple text-white' 
                  : 'text-gray-700 hover:bg-light-white'
              }`}
            >
              Chat with Docs
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
} 