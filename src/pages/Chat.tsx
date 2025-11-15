import Navigation from "@/components/Navigation";
import Chatbot from "@/components/Chatbot";
import { MessageSquare } from "lucide-react";

const Chat = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 mb-4">
              <MessageSquare className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Multilingual Chatbot</h1>
            <p className="text-xl text-muted-foreground">
              Get instant answers to your questions in multiple languages, 24/7
            </p>
          </div>
          <Chatbot />
        </div>
      </div>
    </div>
  );
};

export default Chat;
