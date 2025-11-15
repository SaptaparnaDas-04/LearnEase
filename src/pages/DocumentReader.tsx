import Navigation from "@/components/Navigation";
import DocumentUpload from "@/components/DocumentUpload";
import { FileText } from "lucide-react";

const DocumentReader = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
              <FileText className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl font-bold mb-4">OCR Document Reader</h1>
            <p className="text-xl text-muted-foreground">
              Upload documents and receive step-by-step instructions in your language
            </p>
          </div>
          <DocumentUpload />
        </div>
      </div>
    </div>
  );
};

export default DocumentReader;
