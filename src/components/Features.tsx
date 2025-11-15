import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageSquare, 
  FileText, 
  Route, 
  HelpCircle, 
  Bell, 
  Accessibility, 
  Languages,
  Volume2,
  BarChart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import chatbotImage from "@/assets/feature-chatbot.jpg";
import ocrImage from "@/assets/feature-ocr.jpg";
import pathwayImage from "@/assets/feature-pathway.jpg";
import accessibilityImage from "@/assets/feature-accessibility.jpg";

const features = [
  {
    icon: Languages,
    title: "Plain Language Translator",
    description: "Converts complex scholarship regulations and exam guidelines into easy-to-understand conversational language.",
    color: "primary",
    image: chatbotImage,
    path: "/translator",
  },
  {
    icon: MessageSquare,
    title: "Multilingual Chatbot",
    description: "AI-powered support in multiple Indian languages, providing instant answers to student questions 24/7.",
    color: "secondary",
    image: chatbotImage,
    path: "/chat",
  },
  {
    icon: FileText,
    title: "OCR Document Reader",
    description: "Upload forms or official documents and receive step-by-step instructions in your preferred language.",
    color: "accent",
    image: ocrImage,
    path: "/document-reader",
  },
  {
    icon: Route,
    title: "Guided Pathways",
    description: "Interactive, personalized roadmaps for scholarships and exams with deadlines and document checklists.",
    color: "primary",
    image: pathwayImage,
    path: "/pathway",
  },
  {
    icon: Volume2,
    title: "Text to Speech",
    description: "Convert text to natural-sounding speech in multiple languages for better accessibility and learning.",
    color: "secondary",
    image: accessibilityImage,
    path: "/text-to-speech",
  },
  {
    icon: Bell,
    title: "Reminder & Notifications",
    description: "Smart reminders for deadlines, exam dates, and important tasks with customizable notifications.",
    color: "accent",
    image: pathwayImage,
    path: "/reminders",
  },
  {
    icon: HelpCircle,
    title: "Smart FAQs",
    description: "AI-powered instant answers to your questions about scholarships, exams, and educational guidance.",
    color: "primary",
    image: accessibilityImage,
    path: "/#faq",
  },
];

const Features = () => {
  const navigate = useNavigate();

  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Powerful AI Features for <span className="gradient-text">Every Student</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Comprehensive suite of intelligent tools to simplify your educational journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="card-hover border-none shadow-lg overflow-hidden group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => {
                if (feature.path.startsWith('/#')) {
                  const element = document.querySelector(feature.path.substring(1));
                  element?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  navigate(feature.path);
                }
              }}
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className={`absolute inset-0 bg-${feature.color}/20 mix-blend-multiply`} />
              </div>
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
