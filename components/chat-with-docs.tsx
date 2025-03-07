'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileIcon } from './icons';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface FileItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date | string;
}

export function ChatWithDocs() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isDocumentSelectorOpen, setIsDocumentSelectorOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get secure access URL for a file
  const getSecureFileUrl = (pathname: string) => {
    return `/api/files/get?pathname=${encodeURIComponent(pathname)}`;
  };

  // Fetch files from API
  const fetchFiles = async () => {
    setIsLoadingDocs(true);
    setError(null);
    
    try {
      const response = await fetch('/api/files/list');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }

      const data = await response.json();
      
      // Sort by uploadedAt (most recent first)
      const sortedFiles = data.sort((a: FileItem, b: FileItem) => {
        const dateA = new Date(a.uploadedAt).getTime();
        const dateB = new Date(b.uploadedAt).getTime();
        return dateB - dateA;
      });
      
      setFiles(sortedFiles);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      setError('Failed to load documents. Please try again later.');
      toast.error('Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Fetch files on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Fetch file content when selected
  useEffect(() => {
    const fetchFileContent = async (filePathname: string) => {
      // Skip if we already have the content
      if (fileContents[filePathname]) return;
      
      try {
        // Use pathname parameter instead of url parameter for clarity and consistency
        const response = await fetch(`/api/files/content?pathname=${encodeURIComponent(filePathname)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document content: ${response.status}`);
        }
        
        const data = await response.json();
        setFileContents(prev => ({
          ...prev,
          [filePathname]: data.content
        }));
      } catch (error) {
        console.error(`Error fetching content for document ${filePathname}:`, error);
        // Set empty content to avoid repeated failing requests
        setFileContents(prev => ({
          ...prev,
          [filePathname]: ''
        }));
        toast.error(`Failed to load document: ${filePathname}`);
      }
    };

    // If files are selected, get their content
    if (selectedFileIds.length > 0) {
      selectedFileIds.forEach(fileId => {
        fetchFileContent(fileId);
      });
    }
  }, [selectedFileIds, fileContents]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || selectedFileIds.length === 0) return;
    
    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Get selected documents content
      const selectedFiles = selectedFileIds
        .map(fileId => {
          const file = files.find(f => f.pathname === fileId);
          return file ? {
            ...file,
            content: fileContents[fileId] || "Content not available"
          } : null;
        })
        .filter(Boolean) as (FileItem & { content: string })[];
      
      const filesContent = selectedFiles
        .map(file => `${file.pathname}:\n${file.content}`)
        .join('\n\n');
      
      // Get last 10 messages for context
      const recentMessages = messages.slice(-10);
      
      // Prepare system prompt
      const systemPrompt = `You are an assistant that helps answer questions about the following documents:
${selectedFiles.map(file => file.pathname).join(', ')}

The content of these documents is as follows:
${filesContent}

Answer questions based only on the information in these documents. If the information isn't present, say you don't know.`;
      
      // Prepare user prompt with chat history context
      const historyContext = recentMessages.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n');
      
      const userPrompt = `${historyContext ? historyContext + '\n\n' : ''}${inputValue}`;
      
      // Call API
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
          model: 'google/gemini-2.0-flash-001',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get a response. Please try again.');
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileSelection = (filePathname: string) => {
    setSelectedFileIds(prev => 
      prev.includes(filePathname)
        ? prev.filter(id => id !== filePathname)
        : [...prev, filePathname]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };
  
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-deep-purple">Chat with Documents</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm">{selectedFileIds.length} documents selected</span>
          <button
            onClick={() => setIsDocumentSelectorOpen(!isDocumentSelectorOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-purple text-white hover:bg-opacity-90"
            aria-label={isDocumentSelectorOpen ? "Hide document selector" : "Show document selector"}
          >
            <FileIcon />
          </button>
        </div>
      </div>
      
      {/* Document selector - Always visible by default */}
      <div className="mb-4 border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
        <h3 className="text-md font-semibold mb-3 text-deep-purple">Select Documents to Chat With</h3>
        <div className="max-h-48 overflow-y-auto">
          {isLoadingDocs ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500">{error}</p>
              <button 
                onClick={fetchFiles} 
                className="mt-2 text-sm text-purple underline"
              >
                Retry
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">No documents available.</p>
              <a 
                href="/files" 
                className="mt-2 text-sm text-purple underline block"
              >
                Go to Files page to upload documents
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.pathname} className="flex items-center p-2 border border-gray-100 rounded hover:bg-light-white">
                  <input
                    type="checkbox"
                    id={`file-${file.pathname}`}
                    checked={selectedFileIds.includes(file.pathname)}
                    onChange={() => toggleFileSelection(file.pathname)}
                    className="mr-3 h-4 w-4 accent-purple"
                  />
                  <label htmlFor={`file-${file.pathname}`} className="text-sm cursor-pointer flex-grow truncate">
                    {file.pathname}
                  </label>
                  <span className="text-xs text-gray-400 ml-2">
                    {formatFileSize(file.size)}
                  </span>
                  {selectedFileIds.includes(file.pathname) && !fileContents[file.pathname] && (
                    <span className="text-xs text-gray-400 ml-2">Loading content...</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {selectedFileIds.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <p>{selectedFileIds.length} document(s) selected for chat</p>
          </div>
        )}
      </div>
      
      {/* Chat messages - Improved UI */}
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto bg-light-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple bg-opacity-10 mb-3">
              <FileIcon />
            </div>
            <p className="mt-2 font-medium text-deep-purple">Select documents and start chatting</p>
            {selectedFileIds.length === 0 && (
              <p className="mt-1 text-sm text-purple">Please select at least one document above</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div 
                  className={`relative max-w-[80%] rounded-2xl shadow-sm px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple text-white mr-4'
                      : 'bg-white border border-gray-100 ml-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-xs font-semibold">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    {message.timestamp && (
                      <span className="text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  
                  {/* Message tail */}
                  <div 
                    className={`absolute top-4 w-2 h-2 transform rotate-45 ${
                      message.role === 'user'
                        ? 'right-[-4px] bg-purple'
                        : 'left-[-4px] bg-white border-l border-t border-gray-100'
                    }`}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Input area - Improved UI */}
      <form 
        onSubmit={handleSendMessage} 
        className="flex items-center rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden pl-4 pr-2 py-1"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading || selectedFileIds.length === 0}
          placeholder={selectedFileIds.length === 0 ? "Select documents first" : "Type your message..."}
          className="flex-grow bg-transparent border-none focus:outline-none text-sm"
        />
        <button
          type="submit" 
          disabled={isLoading || !inputValue.trim() || selectedFileIds.length === 0}
          className={`rounded-full p-2 ${
            isLoading || !inputValue.trim() || selectedFileIds.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-purple text-white hover:bg-opacity-90'
          } transition-colors ml-2 h-10 w-10 flex items-center justify-center`}
          aria-label="Send message"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
} 