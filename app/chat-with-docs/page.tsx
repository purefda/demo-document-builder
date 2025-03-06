import { ChatWithDocs } from '@/components/chat-with-docs';

export const metadata = {
  title: 'Chat with Docs',
  description: 'Chat with your documents using AI',
};

export default function ChatWithDocsPage() {
  return (
    <div className="flex-1 ml-56">
      <ChatWithDocs />
    </div>
  );
} 