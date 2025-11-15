import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Loader2, CheckCircle2, Zap } from 'lucide-react';

// ====================================================================
// Interfaces for Type Safety
// ====================================================================

interface SupabaseUser {
  id: string;
  // Add other necessary user properties here if needed
  email?: string;
}

interface Session {
  user: SupabaseUser | null;
}

interface SupabaseAuthResponse {
  data: {
    session: Session | null;
    subscription?: { unsubscribe: () => void };
  };
}

interface ToastProps {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
}

// ====================================================================
// NOTE: These are PLACEHOLDERS for your external Supabase setup and utilities.
// In a production environment, replace these mocks with your actual imports.
// ====================================================================

// Mock Supabase Client Structure (Replace with your actual import)
const supabase = {
    auth: {
        // Mock function to simulate getting the current session
        getSession: (): Promise<SupabaseAuthResponse> => Promise.resolve({ 
            data: { 
                session: { user: { id: 'mock-user-id-1234', email: 'user@example.com' } } 
            } 
        }),
        // Mock function to simulate listening to auth state changes
        onAuthStateChange: (callback: (event: string | null, session: { user: SupabaseUser | null } | null) => void): SupabaseAuthResponse => {
             const mockUser: SupabaseUser = { id: 'mock-user-id-1234', email: 'user@example.com' };
             // Simulate immediate sign-in for canvas environment
             callback(null, { user: mockUser }); 
             
             // FIX: Ensuring the return object always has a 'data' property with a 'subscription' inside
             return { 
                data: { 
                    session: { user: mockUser },
                    subscription: { unsubscribe: () => console.log("Supabase Auth listener unsubscribed") } 
                } 
             };
        },
    },
    // Mock function to simulate database insertion
    from: (table: string) => ({ 
        insert: (data: any) => {
            console.log(`[Supabase Mock] Inserting into ${table}:`, data);
            return Promise.resolve({ data: data, error: null });
        } 
    }),
};

// Mock useNavigate hook (Replace with your actual import from 'react-router-dom')
const useNavigate = () => (path: string) => console.log('Navigate to:', path);

// Mock PDF Text Extractor (Replace with your actual utility)
const extractTextFromPDF = (file: File): Promise<string> => {
    console.log(`[PDF Parser Mock] Attempting to extract text from ${file.name}`);
    return Promise.resolve("This is mock content extracted from the PDF, ready for translation and analysis.");
};


// --- Single-File Utility Functions & Hooks (Mocks) ---

// 1. Toaster/Toast Hook (Simplified Mock)
const useToast = () => {
  const toast = ({ title, description, variant }: ToastProps) => {
    console.log(`[Toast ${variant ? '(' + variant + ')' : ''}] ${title}: ${description}`);
  };
  return { toast };
};

// 2. Base64 Conversion
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result!.toString().split(',')[1]); // Only data part
  reader.onerror = error => reject(error);
});

// 3. Simple UI Components (Tailwind based on Shadcn style)
const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="p-4 border-b border-gray-200 dark:border-gray-700">{children}</div>;
const CardTitle: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>;
const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{children}</p>;
const CardContent: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => <div className={`p-4 ${className}`}>{children}</div>;

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    type={props.type || 'text'}
    className={`w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${props.className || ''}`}
    {...props}
  />
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y ${props.className || ''}`}
    {...props}
  />
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center px-4 py-2 font-medium rounded-lg transition-colors 
      ${disabled
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg dark:bg-indigo-500 dark:hover:bg-indigo-600'
      } ${className}`}
  >
    {children}
  </button>
);


// --- Main Application Component ---
const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(""); // User's input in the textarea
  const [extractedText, setExtractedText] = useState<string>(""); // OCR/Translated text result
  const [analysis, setAnalysis] = useState<string>(""); // AI analysis result
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [user, setUser] = useState<SupabaseUser | null>(null); // Supabase User object
  const { toast } = useToast();
  const navigate = useNavigate();

  // 1. Supabase Auth Setup
  useEffect(() => {
    // Check session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    // Destructuring safely relies on the fixed mock return structure
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
         toast({
            title: "Authentication Alert",
            description: "Please sign in to save and analyze documents.",
            variant: "default",
         });
      }
    });

    return () => subscription!.unsubscribe(); // Use non-null assertion as it's guaranteed by the mock structure
  }, []);

  // 2. Gemini API Call for OCR/Extraction/Translation
  const ocrAndTranslate = async (fileOrText: string, fileType: string, base64Data: string | null = null): Promise<string> => {
    let prompt: string;
    let parts: any[] = [];

    if (base64Data) { // Image/PDF with Base64
      prompt = "Extract all readable text from this document/image. The output must be purely the extracted text. If the detected language is not English, translate the *entire* extracted text into English before outputting. If no meaningful text is found, output: 'No text found in the document/image.'";
      
      const mimeType = fileType.includes('pdf') ? 'application/pdf' : fileType;

      parts.push({ text: prompt });
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    } else { // Plain text input
      prompt = `Translate the following text into English and output only the translated text. If the text is already English or if translation is not possible, output the original text: "${fileOrText}"`;
      parts.push({ text: prompt });
    }

    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: "user", parts: parts }],
    };

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        const result = await response.json();
        const text: string = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: Could not extract/translate text.';
        return text;

      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        } else {
          throw new Error('Failed to communicate with the AI model after multiple retries.');
        }
      }
    }
    // Should be unreachable if maxRetries > 0, but added for TypeScript safety
    return 'Error: Failed to process request.'; 
  };

  // 3. File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysis("");
    setExtractedText("");
    setIsProcessing(true);

    try {
      const isPdfOrImage = file.type.includes("pdf") || file.type.includes("image");
      let content: string = "";

      if (file.type.includes("pdf")) {
         // Use the mock or real PDF parser first
         content = await extractTextFromPDF(file);
      } else if (isPdfOrImage) {
        // Use Gemini for robust OCR extraction/translation from image or PDF 
        const base64Data = await toBase64(file);
        content = await ocrAndTranslate("", file.type, base64Data); // Pass empty text since base64 is used
      } else {
        // For plain text files, read as text
        const reader = new FileReader();
        const rawText: string = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsText(file);
        });
        content = rawText;
      }
      
      // Send the content (whether from PDF parser, OCR, or text file) for final translation check
      const translatedContent = await ocrAndTranslate(content, 'text');

      // Update states
      setInputText(translatedContent.length > 500 ? translatedContent.substring(0, 500) + "..." : translatedContent);
      setExtractedText(translatedContent);
      
      toast({
        title: "Text Extraction Complete",
        description: "The document text has been extracted and translated to English.",
      });

    } catch (error) {
      console.error("File processing error:", error);
      setExtractedText("Failed to process document or image. Please check the console for details.");
      toast({
        title: "Error",
        description: "Failed to extract and translate text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. AI Analysis Function (Supabase save integrated)
  const analyzeDocument = async (): Promise<void> => {
    // We prioritize extractedText (from file upload) over inputText (from manual paste)
    const contentToAnalyze: string = extractedText || inputText;

    if (!contentToAnalyze.trim() || contentToAnalyze.includes("No text found")) {
      toast({
        title: "No content",
        description: "Please upload a file or paste text with content first.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to analyze documents.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsProcessing(true);
    setAnalysis("");

    // The user query ensures the AI provides analysis based on the extracted/translated content
    const userQuery: string = `Provide a detailed, step-by-step AI analysis, guidance, and key insights based on the following document text, assuming the audience needs clear instructions:\n\n---\n${contentToAnalyze}`;

    const apiKey: string = "AIzaSyDPf9KZd64asa0Dr25fLbJw-CJ8tgXIWIs"; 
    const apiUrl: string = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: userQuery }] }],
      systemInstruction: {
        parts: [{ text: "You are a specialized document analyst providing clear, actionable, and comprehensive guidance in English." }]
      },
      tools: [{ "google_search": {} }], 
    };

    let attempt: number = 0;
    const maxRetries: number = 3;
    let analysisResult: string = '';

    while (attempt < maxRetries) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to process document');
        }

        const result = await response.json();
        analysisResult = result?.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: Analysis failed to generate content.';
        break; 

      } catch (error) {
        console.error(`Analysis Attempt ${attempt + 1} failed:`, error);
        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // Exponential backoff
        } else {
          analysisResult = 'Failed to get AI analysis after multiple attempts.';
          break;
        }
      }
    }

    setAnalysis(analysisResult);

    try {
      // Supabase Save Operation
      const { error } = await supabase.from('documents').insert({
          title: contentToAnalyze.substring(0, 50) + "...",
          content: contentToAnalyze, // Saving the extracted/translated content
          ai_analysis: analysisResult,
          user_id: user.id,
          processed: true
      });

      if (error) throw error;
      
    } catch (e) {
      console.error("Supabase Save Error:", e);
      toast({
        title: "Database Save Error",
        description: "Could not save analysis history to Supabase.",
        variant: "destructive",
      });
    }
    
    toast({
      title: "Analysis complete",
      description: "Your document has been analyzed successfully and saved.",
    });
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <div className="container mx-auto px-4 py-10">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-2">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
              Document Analyst Pro
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Upload any document or image for automated OCR, translation, and AI-powered guidance.
          </p>
          {user?.id && (
             <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
               **User ID (Supabase):** {user.id}
             </div>
          )}
        </header>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          
          {/* Input Section (Always full width on mobile) */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <FileText className="h-5 w-5" />
                Input Document or Text
              </CardTitle>
              <CardDescription>
                Supported: PDF, Images (JPG, PNG), Text. Non-English content will be auto-translated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-700 hover:border-indigo-500 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                <Input
                  type="file"
                  accept=".txt, .pdf, image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Click to upload a document or image
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">Or Paste Text</span>
                </div>
              </div>

              {/* Text Area */}
              <Textarea
                placeholder="Paste your document text here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[200px]"
              />

              <Button
                onClick={analyzeDocument}
                disabled={isProcessing || (!inputText.trim() && !extractedText.trim())}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Analyze Document
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output Section (Split into 2) */}
          <div className="lg:col-span-1 space-y-8">
            {/* Extracted Text Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="h-5 w-5" />
                  Extracted Document Text (Translated)
                </CardTitle>
                <CardDescription>
                  The exact text found in the document/image, translated to English via OCR.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg min-h-[150px] overflow-auto border border-gray-200 dark:border-gray-600">
                  {extractedText ? (
                    <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                      {extractedText}
                    </p>
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <p>Upload a file or click 'Analyze' to see the extracted text here.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
                  <CheckCircle2 className="h-5 w-5" />
                  AI Analysis & Guidance
                </CardTitle>
                <CardDescription>
                  Step-by-step guidance and key information from the AI model.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg min-h-[150px]">
                  {analysis ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                        {analysis}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                      <p>The AI analysis will appear here after processing.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;