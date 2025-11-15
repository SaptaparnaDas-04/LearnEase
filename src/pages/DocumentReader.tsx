import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, FileText, Zap, Volume2 } from 'lucide-react';

// --- Typescript Interfaces ---
interface AnalysisResponse {
    extractedText: string;
    aiAnalysis: string;
}

interface ModalState {
    title: string;
    message: string;
}

// --- Constants ---
const MOCK_USER_ID = 'Supabase user ID: mock-user-1234';
const MAX_FILE_SIZE_MB = 4;
const API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`;
const API_KEY = "AIzaSyDUbwhSvXmRypQidzYChJSM7Oeq4_0GBaI"; // Placeholder for Canvas environment
const TTS_API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`;
const VOICE_NAME = "Kore"; // Informative and clear voice

// --- Utility Functions for TTS (PCM to WAV conversion) ---

// Converts Base64 string to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

// Creates WAV blob from PCM data
const pcmToWav = (pcm16: Int16Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    const buffer = new ArrayBuffer(44 + pcm16.length * 2);
    const view = new DataView(buffer);
    let offset = 0;

    const writeString = (str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset++, str.charCodeAt(i));
        }
    };

    // RIFF chunk
    writeString('RIFF');
    view.setUint32(offset, 36 + pcm16.length * 2, true); offset += 4;
    writeString('WAVE');

    // fmt chunk
    writeString('fmt ');
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2; // Audio format 1 (PCM)
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitsPerSample, true); offset += 2;

    // data chunk
    writeString('data');
    view.setUint32(offset, pcm16.length * 2, true); offset += 4;
    
    // Write PCM data
    for (let i = 0; i < pcm16.length; i++) {
        view.setInt16(offset, pcm16[i], true); offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
};


// --- Core API Functions ---

/**
 * Converts a File object to a Base64 encoded string.
 */
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Extract only the Base64 data part (remove the 'data:mime/type;base64,' prefix)
            const base64Data = (reader.result as string).split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = error => reject(error);
    });
};

/**
 * Handles exponential backoff and API fetching.
 */
const makeApiCall = async (url: string, payload: any, retryCount = 0): Promise<any> => {
    const MAX_RETRIES = 5;
    const BACKOFF_TIME = 1000; // 1 second base

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.status === 429 && retryCount < MAX_RETRIES) {
            const delay = BACKOFF_TIME * Math.pow(2, retryCount) + (Math.random() * BACKOFF_TIME);
            console.warn(`Rate limit exceeded. Retrying in ${Math.round(delay / 1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeApiCall(url, payload, retryCount + 1);
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API call failed with status: ${response.status}. Body: ${errorBody}`);
        }

        return await response.json();

    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const delay = BACKOFF_TIME * Math.pow(2, retryCount) + (Math.random() * BACKOFF_TIME);
            console.error(`Fetch error. Retrying in ${Math.round(delay / 1000)}s...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            return makeApiCall(url, payload, retryCount + 1);
        }
        throw new Error("Failed to connect to the analysis service after multiple retries.");
    }
};

/**
 * Calls the Gemini TTS API to get audio data.
 */
const synthesizeSpeech = async (text: string): Promise<string> => {
    const url = `${TTS_API_URL_BASE}?key=${API_KEY}`;
    
    const payload = {
        contents: [{
            parts: [{ text: text }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: VOICE_NAME }
                }
            }
        }
    };

    const result = await makeApiCall(url, payload);

    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;

    if (!audioData || !mimeType || !mimeType.startsWith("audio/")) {
        throw new Error("Could not retrieve audio data from the TTS model.");
    }

    // The API returns raw signed PCM 16 bit audio data.
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;

    const pcmData = base64ToArrayBuffer(audioData);
    const pcm16 = new Int16Array(pcmData);
    const wavBlob = pcmToWav(pcm16, sampleRate);
    
    // Create a local URL for the blob and return it
    return URL.createObjectURL(wavBlob);
};

// --- Main App Component ---

const App: React.FC = () => {
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [textInput, setTextInput] = useState('');
    const [extractedText, setExtractedText] = useState('The exact text found in the document/image via OCR will appear here.');
    const [aiAnalysis, setAiAnalysis] = useState('The AI analysis, guidance, and key information will appear here after processing.');
    const [isLoading, setIsLoading] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [modal, setModal] = useState<ModalState | null>(null);

    const showMessage = (title: string, message: string) => {
        setModal({ title, message });
    };

    // Handle file selection
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files ? e.target.files[0] : null;

        if (file) {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                showMessage("File Too Large", `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.`);
                e.target.value = ''; // Clear input
                setUploadedFile(null);
                return;
            }
            setUploadedFile(file);
            setTextInput(''); // Clear text input when a file is selected
        } else {
            setUploadedFile(null);
        }
    }, []);

    // Handle text input change
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextInput(e.target.value);
        if (e.target.value.trim() !== '') {
            setUploadedFile(null); // Clear file when text is entered
        }
    }, []);

    // Main analysis function
    const analyzeDocument = useCallback(async () => {
        const rawText = textInput.trim();

        if (!uploadedFile && rawText === '') {
            showMessage("Input Required", "Please upload a file or paste text into the input box.");
            return;
        }

        // UI State: Loading
        setIsLoading(true);
        setExtractedText('<span class="text-gray-400">Processing input...</span>');
        setAiAnalysis('<span class="text-gray-400">Awaiting AI Analysis...</span>');

        try {
            let parts: any[] = [];
            let fileMimeType: string | null = null;
            let base64Data: string | null = null;

            const systemPrompt = `You are a world-class Document Analyst. Your task is to process the input (which could be an image, a document, or plain text) and provide a structured JSON response. 
            
            FIRST STEP (Extraction): Extract the raw, complete, and original text from the input. **ABSOLUTELY CRUCIAL: If the text is in Bengali, Hindi, or any other non-English language, you MUST first translate the extracted text into English.** This extracted and translated English text must go into the 'extractedText' field. If the input is a PDF or Word document, use your advanced multimodal capabilities to extract the text and key structure. If an image has absolutely no readable text, return "No readable text detected in the image." for 'extractedText'.
            
            SECOND STEP (Analysis): Provide a detailed, paragraph-based AI analysis and guidance on the extracted English text. Identify the document's key themes, tone (e.g., formal, casual, urgent), primary purpose, and provide actionable, step-by-step guidance or suggestions for the user based on the content. **Crucially, highlight all detected deadlines in red and bold like this: <span style="color: red; font-weight: bold;">[DEADLINE TEXT]</span>. Also, highlight all identified important points in green and bold like this: <span style="color: green; font-weight: bold;">[IMPORTANT POINT TEXT]</span>.** This analysis must go into the 'aiAnalysis' field.
            
            The entire response must be a single, valid JSON object following the provided schema.`;

            // 1. Handle File Upload
            if (uploadedFile) {
                fileMimeType = uploadedFile.type;
                base64Data = await fileToBase64(uploadedFile);

                parts.push({ text: systemPrompt }); 
                parts.push({
                    inlineData: {
                        mimeType: fileMimeType,
                        data: base64Data
                    }
                });
            } 
            // 2. Handle Plain Text Input
            else {
                parts.push({ text: systemPrompt + "\n\n--- DOCUMENT TEXT TO ANALYZE ---\n" + rawText });
            }

            // API Payload Configuration
            const payload = {
                contents: [{ parts }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            "extractedText": { "type": "STRING", description: "The raw, complete text extracted from the document or image, translated to English." },
                            "aiAnalysis": { "type": "STRING", description: "The detailed, multi-paragraph AI analysis and guidance based on the extracted text." }
                        },
                        propertyOrdering: ["extractedText", "aiAnalysis"]
                    }
                },
                model: "gemini-2.5-flash-preview-09-2025" 
            };

            const result = await makeApiCall(`${API_URL_BASE}?key=${API_KEY}`, payload);
            
            const candidate = result?.candidates?.[0];
            const jsonString = candidate?.content?.parts?.[0]?.text;

            if (!jsonString) {
                throw new Error("Received an empty or malformed response from the AI model.");
            }
            
            const parsedJson: AnalysisResponse = JSON.parse(jsonString);

            setExtractedText(parsedJson.extractedText || "Extraction Failed.");
            setAiAnalysis(parsedJson.aiAnalysis || "Analysis Failed.");

        } catch (error: any) {
            console.error("Analysis Error:", error);
            setExtractedText('Failed to process document or image.');
            setAiAnalysis('An error occurred during AI processing. Please check the console for details.');
            showMessage("Analysis Failed", error.message);
        } finally {
            setIsLoading(false);
        }
    }, [uploadedFile, textInput]);

    // TTS playback handler
    const handleListen = useCallback(async () => {
        const textToSpeak = extractedText.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
        
        if (textToSpeak === 'The exact text found in the document/image via OCR will appear here.' || textToSpeak === 'Failed to process document or image.' || textToSpeak === 'No readable text detected in the image.' || extractedText.includes('Awaiting AI Analysis')) {
            showMessage("Audio Not Available", "Please analyze a document with text first.");
            return;
        }

        setIsSpeaking(true);
        try {
            const audioUrl = await synthesizeSpeech(textToSpeak);
            const audio = new Audio(audioUrl);
            audio.play();

            audio.onended = () => {
                setIsSpeaking(false);
                // Clean up the object URL after playback
                URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
                 setIsSpeaking(false);
                 showMessage("Audio Error", "Failed to play audio file.");
            };
        } catch (error: any) {
            console.error("TTS Error:", error);
            showMessage("Audio Error", `TTS Generation failed: ${error.message}`);
            setIsSpeaking(false);
        }
    }, [extractedText]);

    // Cleanup effect for initial state display
    useEffect(() => {
        setExtractedText('The exact text found in the document/image via OCR will appear here.');
        setAiAnalysis('The AI analysis, guidance, and key information will appear here after processing.');
    }, []);


    // --- Helper Components ---

    const Card: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode, iconColor: string, actions?: React.ReactNode }> = ({ title, icon, children, iconColor, actions }) => (
        <div className="bg-white p-6 rounded-3xl shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                    {React.cloneElement(icon as React.ReactElement, { className: `h-6 w-6 ${iconColor} mr-2` })}
                    {title}
                </h2>
                {actions}
            </div>
            {children}
        </div>
    );

    const ResultDisplay: React.FC<{ content: string }> = ({ content }) => (
        <div 
            className="min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 whitespace-pre-wrap text-sm leading-relaxed overflow-auto"
            dangerouslySetInnerHTML={{ __html: content }}
        />
    );

    // --- JSX Render ---

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50">
            {/* Header */}
            <header className="text-center mb-10 max-w-6xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold" style={{ backgroundImage: 'linear-gradient(45deg, #4F46E5, #9333EA)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                    Document Analyst Pro
                </h1>
                <p className="text-xl text-gray-600 mt-2">
                    Upload any document, image, or text for OCR, translation, and AI-powered guidance.
                </p>
                <p id="user-id" className="text-xs text-gray-400 mt-2">
                    {MOCK_USER_ID}
                </p>
            </header>

            {/* Main Grid Layout */}
            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Input Document or Text Card */}
                <Card 
                    title="Input Document or Text" 
                    icon={<FileText />} 
                    iconColor="text-indigo-500"
                >
                    <p className="text-sm text-gray-500 mb-4">
                        Supported: **PDF, DOC/DOCX**, Images (JPG, PNG), Text. (Binary file support is experimental.)
                    </p>

                    <div className="mb-6 flex-grow">
                        {/* File Upload Area */}
                        <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition duration-150 ${uploadedFile ? 'border-green-500 bg-green-50' : 'border-indigo-300 hover:bg-indigo-50'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <p className={`text-base font-medium ${uploadedFile ? 'text-green-700' : 'text-indigo-500'}`}>
                                {uploadedFile ? `File Selected: ${uploadedFile.name}` : 'Click to upload a document or image'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">(Max {MAX_FILE_SIZE_MB}MB file size)</p>
                            <input 
                                id="file-upload" 
                                type="file" 
                                accept="image/jpeg,image/png,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={isLoading}
                            />
                        </label>

                        {/* Text Area Input */}
                        <textarea 
                            id="text-input" 
                            placeholder="Paste your document text here..." 
                            rows={8}
                            value={textInput}
                            onChange={handleTextChange}
                            disabled={isLoading || !!uploadedFile}
                            className="w-full mt-4 p-3 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-sm resize-none"
                        />
                    </div>

                    {/* Analyze Button */}
                    <button 
                        id="analyze-button"
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 flex items-center justify-center"
                        onClick={analyzeDocument}
                        disabled={isLoading || isSpeaking || (!uploadedFile && textInput.trim() === '')}
                    >
                        {isLoading && <RefreshCw className="h-5 w-5 mr-2 animate-spin" />}
                        <span id="button-text">{isLoading ? 'Analyzing...' : 'Analyze Document'}</span>
                    </button>
                </Card>

                {/* 2. Results Column (Extracted Text and Analysis) */}
                <div className="col-span-1 lg:col-span-2 space-y-8">
                    {/* Extracted Text Card */}
                    <Card 
                        title="Extracted Document Text (Translated)" 
                        icon={<FileText />} 
                        iconColor="text-purple-500"
                        actions={
                            <button
                                onClick={handleListen}
                                disabled={isLoading || isSpeaking || extractedText.includes('The exact text found') || extractedText.includes('Failed to process') || extractedText.includes('No readable text detected')}
                                className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-200 transition disabled:opacity-50 flex items-center"
                            >
                                {isSpeaking ? (
                                    <>
                                        <Volume2 className="h-4 w-4 mr-1 animate-pulse" />
                                        <span>Speaking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="h-4 w-4 mr-1" />
                                        <span>Listen</span>
                                    </>
                                )}
                            </button>
                        }
                    >
                        <ResultDisplay content={extractedText} />
                    </Card>

                    {/* AI Analysis Card */}
                    <Card 
                        title="AI Analysis & Guidance" 
                        icon={<Zap />} 
                        iconColor="text-pink-500"
                    >
                        <ResultDisplay content={aiAnalysis} />
                    </Card>
                </div>
            </main>
            
            {/* Custom Modal for Errors/Messages */}
            {modal && (
                <div id="message-modal" className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">{modal.title}</h3>
                        <p className="text-sm text-gray-600 mb-4">{modal.message}</p>
                        <button 
                            onClick={() => setModal(null)} 
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;