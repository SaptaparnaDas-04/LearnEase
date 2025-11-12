import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import DocumentUpload from "@/components/DocumentUpload";
import SmartFAQ from "@/components/SmartFAQ";
import Impact from "@/components/Impact";
import Footer from "@/components/Footer";
import Chatbot from "@/components/Chatbot";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <DocumentUpload />
        <SmartFAQ />
        <HowItWorks />
        <Impact />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
};

export default Index;
