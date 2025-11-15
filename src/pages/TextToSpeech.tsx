import React, { useState, useRef, useEffect, FC, ReactNode } from "react";
import { Volume2, Play, Pause, Loader2, Download } from 'lucide-react';

// API Configuration
const API_KEY = "AIzaSyCDgUN0jrVPcbXeV19L9KeURViU6cwmr-Q"; // Leave as empty string for Canvas environment
const TTS_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;
const MAX_RETRIES = 3;

// --- UTILITY FUNCTIONS FOR AUDIO CONVERSION ---

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param base64 Base64 encoded data string.
 * @returns ArrayBuffer containing the decoded binary data.
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

/**
 * Converts signed 16-bit PCM audio data into a WAV file format Blob.
 * @param pcm16 Int16Array of PCM audio data.
 * @param sampleRate The sample rate of the audio (e.g., 24000).
 * @returns A Blob representing the WAV audio file.
 */
const pcmToWav = (pcm16: Int16Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const pcmLength = pcm16.length * bytesPerSample;
    const totalLength = pcmLength + 36; // Data length + WAV header length (36 bytes)

    const buffer = new ArrayBuffer(totalLength + 8); // Add space for RIFF and size
    const view = new DataView(buffer);

    let offset = 0;

    // RIFF chunk descriptor
    view.setUint32(offset, 0x52494646, false); // "RIFF"
    offset += 4;
    view.setUint32(offset, totalLength, true); // Size of the rest of the file
    offset += 4;
    view.setUint32(offset, 0x57415645, false); // "WAVE"
    offset += 4;

    // FMT chunk
    view.setUint32(offset, 0x666d7420, false); // "fmt "
    offset += 4;
    view.setUint32(offset, 16, true); // Sub-chunk size (16 for PCM)
    offset += 4;
    view.setUint16(offset, 1, true); // Audio format (1 for PCM)
    offset += 2;
    view.setUint16(offset, numChannels, true); // Number of channels
    offset += 2;
    view.setUint32(offset, sampleRate, true); // Sample rate
    offset += 4;
    view.setUint32(offset, byteRate, true); // Byte rate
    offset += 4;
    view.setUint16(offset, blockAlign, true); // Block align
    offset += 2;
    view.setUint16(offset, 16, true); // Bits per sample (16)
    offset += 2;

    // DATA chunk
    view.setUint32(offset, 0x64617461, false); // "data"
    offset += 4;
    view.setUint32(offset, pcmLength, true); // Data size
    offset += 4;

    // Write PCM data
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
};


// --- MOCK COMPONENTS AND HOOKS (To make the file self-contained) ---

// Mock Toast Hook for user feedback
type ToastProps = { title: string; description: string; variant?: string; };
const useToast = () => {
  const toast = ({ title, description, variant }: ToastProps) => {
    console.log(`[TOAST - ${variant || 'default'}]: ${title} - ${description}`);
    // A simple visible toast implementation for the mock environment
    const toastElement = document.createElement('div');
    toastElement.className = 'fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-xl z-50 transition-opacity duration-300';
    toastElement.innerHTML = `<strong>${title}</strong>: ${description}`;
    document.body.appendChild(toastElement);
    setTimeout(() => {
      toastElement.remove();
    }, 4000);
  };
  return { toast };
};

// Mock Button Component
type ButtonProps = { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; variant?: 'default' | 'destructive' };
const Button: FC<ButtonProps> = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${className} ${
      disabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
    }`}
  >
    {children}
  </button>
);

// Mock Card Components
const Card: FC<{ children: ReactNode }> = ({ children }) => <div className="bg-white rounded-xl shadow-lg border">{children}</div>;
const CardHeader: FC<{ children: ReactNode }> = ({ children }) => <div className="p-6 border-b">{children}</div>;
const CardTitle: FC<{ children: ReactNode }> = ({ children }) => <h2 className="text-2xl font-semibold text-gray-800">{children}</h2>;
const CardContent: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>;

// Mock Textarea Component
type TextareaProps = { placeholder: string; className?: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; };
const Textarea: FC<TextareaProps> = (props) => (
  <textarea
    {...props}
    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow ${props.className}`}
  />
);

// Mock Select Component (Native select wrapper)
type SelectProps = { value: string; onValueChange: (value: string) => void; children: ReactNode; className?: string };
const Select: FC<SelectProps> = ({ value, onValueChange, children, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className={`p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white pr-8 ${className}`}
  >
    {children}
  </select>
);

// Mock SelectItem Component (Native option wrapper)
type SelectItemProps = { value: string; children: ReactNode; disabled?: boolean };
const SelectItem: FC<SelectItemProps> = ({ value, children, disabled = false }) => (
  <option value={value} disabled={disabled}>{children}</option>
);

// Removed: SelectTrigger, SelectValue, SelectContent mocks as they were causing the error

// Mock Navigation Component
const Navigation: FC = () => (
  <nav className="fixed top-0 left-0 w-full bg-white shadow-md z-10">
    <div className="container mx-auto px-4 py-4 flex justify-between items-center">
      <div className="text-2xl font-bold text-blue-600">EduAI</div>
      <div className="space-x-4">
        <a href="#" className="text-gray-600 hover:text-blue-600">Home</a>
        <a href="#" className="text-gray-600 hover:text-blue-600">Translator</a>
      </div>
    </div>
  </nav>
);

// --- MAIN APPLICATION COMPONENT ---

const App: FC = () => {
  const [text, setText] = useState<string>("");
  // Using 'Kore' as a strong default voice
  const [voiceName, setVoiceName] = useState<string>("Kore"); 
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // FIX 1: Initializing audioRef with null instead of referencing itself
  const audioRef = useRef<HTMLAudioElement | null>(null); 

  const { toast } = useToast();
  // State for UI Language (unchanged, still needed for UI translation)
  const [uiLanguageCode, setUiLanguageCode] = useState<string>("en"); 
  
  // NEW: State for the desired SPEECH Language. Initialized to BCP-47 code.
  const [speechLanguageCode, setSpeechLanguageCode] = useState<string>("en-US");

  // --- Configuration Data ---

  // Voices available for TTS API (These affect tone, not language, as language is auto-detected/hinted)
  const ttsVoices = [
    { value: "Kore", label: "Kore (Default)" },
    { value: "Puck", label: "Puck (Upbeat)" },
    { value: "Zephyr", label: "Zephyr (Bright)" },
    { value: "Charon", label: "Charon (Informative)" },
    { value: "Fenrir", label: "Fenrir (Excitable)" },
    { value: "Leda", label: "Leda (Youthful)" },
  ];
  
  // NEW: Languages for the Speech Language Selector with BCP-47 codes for API
  // CRITICAL FIX: Simplified instruction to force "read aloud" action in the target language.
  const ttsLanguages = [
    { code: "en-US", label: "English", instruction: "clear, professional American English" },
    { code: "hi-IN", label: "Hindi (हिंदी)", instruction: "clear, formal Hindi" }, 
    { code: "bn-BD", label: "Bengali (বাংলা)", instruction: "clear, friendly Bengali" },
  ];


  // Translations for the UI text (i18n implementation)
  const translations: { [key: string]: { [key: string]: string } } = {
    en: {
      title: "Gemini Text to Speech",
      subtitle: "Convert any text to high-quality speech using the Gemini TTS API.",
      cardTitle: "Enter Your Text",
      placeholder: "Enter the text you want to convert to speech...",
      ttsSelectPlaceholder: "Select speech language", // Changed label
      uiSelectLabel: "UI Language",
      generateAndPlay: "Generate & Play",
      stop: "Stop",
      generating: "Generating...",
      features: "Features:",
      feature1: "High-quality, consistent voices (Gemini API)",
      feature2: "Reliable multilingual support (Explicit language selection)", // Updated feature description
      feature3: "Perfect for accessibility and clear audio",
      errorEmpty: "Please enter text to convert.",
      errorFail: "Failed to generate speech from API.",
      successPlay: "Playing audio...",
      uiLanguageLabel: "English",
      errorInvalidAudio: "Invalid audio format or missing audio data in API response. Please check the console.", // NEW error message
    },
    hi: {
      title: "जेमिनी टेक्स्ट टू स्पीच",
      subtitle: "जेमिनी टीटीएस एपीआई का उपयोग करके किसी भी टेक्स्ट को उच्च गुणवत्ता वाली स्पीच में बदलें।",
      cardTitle: "अपना टेक्स्ट दर्ज करें",
      placeholder: "वह टेक्स्ट दर्ज करें जिसे आप स्पीच में बदलना चाहते हैं...",
      ttsSelectPlaceholder: "स्पीच की भाषा चुनें", // Changed label
      uiSelectLabel: "यूआई भाषा",
      generateAndPlay: "जनरेट करें और चलाएं",
      stop: "रोकें",
      generating: "जनरेट हो रहा है...",
      features: "विशेषताएं:",
      feature1: "उच्च गुणवत्ता, सुसंगत आवाजें (जेमिनी एपीआई)",
      feature2: "विश्वसनीय बहुभाषी समर्थन (स्पष्ट भाषा चयन)", // Updated feature description
      feature3: "पहुँच और स्पष्ट ऑडियो के लिए उत्तम",
      errorEmpty: "कृपया कन्वर्ट करने के लिए टेक्स्ट दर्ज करें।",
      errorFail: "एपीआई से स्पीच जनरेट करने में विफल।",
      successPlay: "ऑडियो चल रहा है...",
      uiLanguageLabel: "हिन्दी",
      errorInvalidAudio: "एपीआई प्रतिक्रिया में अमान्य ऑडियो प्रारूप या ऑडियो डेटा गायब है। कृपया कंसोल देखें।", // NEW error message
    },
    bn: { // Bengali Translation Added
      title: "জেমিণি টেক্সট টু স্পিচ",
      subtitle: "জেমিণি টিটিএস এপিআই ব্যবহার করে যেকোনো লেখাকে উচ্চ মানের বক্তৃতায় রূপান্তর করুন।",
      cardTitle: "আপনার লেখা লিখুন",
      placeholder: "যে লেখাটিকে আপনি বক্তৃতায় রূপান্তর করতে চান তা লিখুন...",
      ttsSelectPlaceholder: "বক্তার ভাষা নির্বাচন করুন", // Changed label
      uiSelectLabel: "ইউআই ভাষা",
      generateAndPlay: "তৈরি করুন এবং চালান",
      stop: "বন্ধ করুন",
      generating: "তৈরি হচ্ছে...",
      features: "বৈশিষ্ট্য:",
      feature1: "উচ্চ মানের, সুসংগত ভয়েস (জেমিণি এপিআই)",
      feature2: "নির্ভরযোগ্য বহুভাষিক সমর্থন (সুস্পষ্ট ভাষা নির্বাচন)", // Updated feature description
      feature3: "অ্যাক্সেসিবিলিটি এবং স্পষ্ট অডিওর জন্য উপযুক্ত",
      errorEmpty: "রূপান্তর করার জন্য লেখা লিখুন।",
      errorFail: "এপিআই থেকে বক্তৃতা তৈরি করতে ব্যর্থ।",
      successPlay: "অডিও চলছে...",
      uiLanguageLabel: "বাংলা",
      errorInvalidAudio: "API প্রতিক্রিয়াতে অবৈধ অডিও বিন্যাস বা অডিও ডেটা অনুপস্থিত। দয়া করে কনসোল পরীক্ষা করুন।", // NEW error message
    },
    // Simplified French for demonstration
    fr: {
      title: "Gemini Texte à Parole",
      subtitle: "Convertissez n'importe quel texte en parole de haute qualité à l'aide de l'API Gemini TTS.",
      cardTitle: "Entrez votre Texte",
      placeholder: "Entrez le texte que vous souhaitez convertir en parole...",
      ttsSelectPlaceholder: "Sélectionner la langue de la parole",
      uiSelectLabel: "Langue de l'interface",
      generateAndPlay: "Générer et Jouer",
      stop: "Arrêter",
      generating: "Génération...",
      features: "Fonctionnalités:",
      feature1: "Voix cohérentes de haute qualité (API Gemini)",
      feature2: "Support multilingue fiable (Sélection de langue explicite)",
      feature3: "Parfait pour l'accessibilité et l'audio clair",
      errorEmpty: "Veuillez entrer du texte à convertir.",
      errorFail: "Échec de la génération de la parole par l'API.",
      successPlay: "Lecture audio...",
      uiLanguageLabel: "Français",
      errorInvalidAudio: "Format audio invalide ou données audio manquantes dans la réponse API. Veuillez vérifier la console.", // NEW error message
    }
  };

  // UI Languages for the selector (Updated with Bengali)
  const uiLanguages = [
    { value: "en", label: "English" },
    { value: "hi", label: "Hindi" },
    { value: "bn", label: "Bengali (বাংলা)" },
    { value: "fr", label: "Français" },
  ];

  // Get the current translation object
  const t = translations[uiLanguageCode] || translations.en;


  // Handle audio playback end
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl]);


  // --- TTS Logic using Gemini API ---

  const generateSpeech = async () => {
    if (!text.trim()) {
      toast({ title: "Error", description: t.errorEmpty, variant: "destructive" });
      return;
    }

    // Cancel existing audio if present
    if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
    }

    setIsGenerating(true);
    
    // 1. Get the selected language instruction and BCP-47 code
    const selectedLang = ttsLanguages.find(lang => lang.code === speechLanguageCode);
    // NEW: Use a direct instruction for reading aloud
    const languageInstruction = `Read the following text aloud in a ${selectedLang?.instruction || "clear, professional English"} tone and style:`;
    const languageCode = selectedLang?.code || "en-US";
    
    // 2. Construct the prompt: Add clear instruction for reading the text in the target language.
    // The prompt is structured to force the API to read the text in the specified language, acting as a dynamic pronunciation/translation layer.
    const prompt = `${languageInstruction} "${text}"`; 
    
    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                // IMPORTANT FIX: Explicitly set the language code here
                languageCode: languageCode,
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    let response;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            response = await fetch(TTS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                break; // Success, exit retry loop
            } else if (response.status === 429 && attempt < MAX_RETRIES - 1) {
                // Rate limit exceeded, apply exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`Rate limit hit, retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Other error or final failed attempt
                throw new Error(`API returned status ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error("Fetch attempt failed:", error);
            if (attempt === MAX_RETRIES - 1) {
                toast({ title: "Error", description: t.errorFail, variant: "destructive" });
                setIsGenerating(false);
                return;
            }
        }
    }

    // Handle API response
    try {
        const result = await response!.json();
        
        const candidate = result.candidates?.[0];
        
        // 1. Check for text response (model might have failed to generate audio and returned text instead)
        if (candidate?.content?.parts?.[0]?.text) {
             const textResponse = candidate.content.parts[0].text;
             console.error("API returned text instead of audio:", textResponse);
             toast({ 
                 title: "Generation Error", 
                 description: `API returned text response. Please try shorter text or check language settings.`, 
                 variant: "destructive" 
             });
             setIsGenerating(false);
             return;
        }

        // 2. Check for audio data structure
        const part = candidate?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/L16")) {
            // Audio data is present and in the expected L16 PCM format. Proceed with conversion.
            
            // Extract sample rate from mimeType (e.g., audio/L16;rate=24000)
            const match = mimeType.match(/rate=(\d+)/);
            if (!match || !match[1]) throw new Error("Could not determine sample rate from MIME type.");

            const sampleRate = parseInt(match[1], 10);
            
            // 1. Decode base64 to ArrayBuffer
            const pcmBuffer = base64ToArrayBuffer(audioData);
            
            // 2. Convert raw PCM 16-bit signed data to Int16Array
            const pcm16 = new Int16Array(pcmBuffer);
            
            // 3. Convert PCM to WAV Blob
            const wavBlob = pcmToWav(pcm16, sampleRate);
            
            // 4. Create playable URL
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl); // Clean up previous URL
            }
            const newAudioUrl = URL.createObjectURL(wavBlob);
            setAudioUrl(newAudioUrl);
            
            // 5. Play audio
            if (audioRef.current) {
                audioRef.current.src = newAudioUrl;
                await audioRef.current.play();
                setIsPlaying(true);
                toast({ title: "Success", description: t.successPlay });
            }

        } else {
            console.error("Invalid audio response structure or MIME type:", { result, mimeType });
            // Show the specific error message for invalid audio data
            toast({ title: "Error", description: t.errorInvalidAudio, variant: "destructive" });
        }
    } catch (error: any) {
        console.error("Audio Processing Failed:", error);
        toast({ title: "Error", description: error.message || t.errorFail, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const togglePlayPause = () => {
    if (!text.trim()) {
        toast({ title: "Error", description: t.errorEmpty, variant: "destructive" });
        return;
    }
    
    if (!audioUrl && !isPlaying) {
        // If nothing is generated yet, generate and play
        generateSpeech();
    } else if (isPlaying) {
      // If playing, pause it
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // If paused, play it
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };
  
  // --- Component Render (Uses translation object 't') ---

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Navigation />
      <div className="container mx-auto px-4 pt-28 pb-12">
        
        <div className="max-w-4xl mx-auto">
          {/* Hidden audio element for playback */}
          <audio ref={audioRef} style={{ display: 'none' }} />

          {/* UI Language Selector (Unchanged: Selects UI language) */}
          <div className="flex justify-end mb-6">
            <label className="text-sm font-medium mr-2 self-center">{t.uiSelectLabel}:</label>
            {/* FIX 2: Simplified Select usage */}
            <Select value={uiLanguageCode} onValueChange={setUiLanguageCode} className="w-[150px]">
              <SelectItem key="placeholder-ui" value="" disabled>
                {t.uiSelectLabel}
              </SelectItem>
              {uiLanguages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          {/* End UI Language Selector */}

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4 shadow-md">
              <Volume2 className="w-10 h-10 text-blue-600" />
            </div>
            {/* Translated Text */}
            <h1 className="text-5xl font-extrabold mb-3 text-gray-900">{t.title}</h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.cardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Textarea
                placeholder={t.placeholder}
                className="min-h-[250px] resize-none text-lg"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div className="flex flex-col sm:flex-row items-stretch gap-4">
                
                {/* Speech Language Selector (Controls the output language) */}
                <div className="flex-shrink-0 w-full sm:w-[250px]">
                   {/* FIX 2: Simplified Select usage */}
                  <Select value={speechLanguageCode} onValueChange={setSpeechLanguageCode} className="w-full">
                    <SelectItem key="placeholder-speech" value="" disabled>
                      {t.ttsSelectPlaceholder}
                    </SelectItem>
                    {ttsLanguages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                {/* End Speech Language Selector */}
                
                {/* Voice Selector (Kept for changing tone/style - hidden for simplicity) */}
                <div className="flex-shrink-0 w-full sm:w-[250px] hidden"> 
                  <Select value={voiceName} onValueChange={setVoiceName} className="w-full">
                    <SelectItem key="placeholder-voice" value="" disabled>
                      Select Voice
                    </SelectItem>
                    {ttsVoices.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                {/* End Voice Selector */}


                <Button
                  onClick={togglePlayPause}
                  disabled={isGenerating || !text.trim()}
                  className="flex-1 text-lg py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin inline-block" />
                      {t.generating}
                    </>
                  ) : isPlaying ? (
                    <>
                      <Pause className="mr-3 h-5 w-5 inline-block" />
                      {t.stop}
                    </>
                  ) : (
                    <>
                      <Play className="mr-3 h-5 w-5 inline-block" />
                      {t.generateAndPlay}
                    </>
                  )}
                </Button>
              </div>

              <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-3 text-lg">{t.features}</h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start gap-3">
                    <Volume2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{t.feature1}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Volume2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{t.feature2}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Volume2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{t.feature3}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default App;