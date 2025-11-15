import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Translator from "./pages/Translator";
import Chat from "./pages/Chat";
import DocumentReader from "./pages/DocumentReader";
import Pathway from "./pages/Pathway";
import TextToSpeech from "./pages/TextToSpeech";
import Reminders from "./pages/Reminders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/translator" element={<Translator />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/document-reader" element={<DocumentReader />} />
          <Route path="/pathway" element={<Pathway />} />
          <Route path="/text-to-speech" element={<TextToSpeech />} />
          <Route path="/reminders" element={<Reminders />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
