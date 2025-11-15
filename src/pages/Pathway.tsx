import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, BookOpen, Save, CheckCircle, History } from 'lucide-react';

// --- Configuration and Utility Functions ---

// Since we are mocking Supabase, we define the storage key here.
const ROADMAP_STORAGE_KEY = 'mock_supabase_roadmaps';

// Function to handle the actual API call to Gemini
const generateContentWithGemini = async (prompt: string, systemInstruction: string) => {
    const apiKey = "AIzaSyBC1dzC3cc1E9jp95doyblgHqgo5cwvmPE"; // API key is handled by the Canvas environment when empty
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        // Using Google Search grounding for up-to-date exam details and scholarship info
        tools: [{ "google_search": {} }], 
    };

    let response;
    // Simple retry mechanism for robustness
    for (let i = 0; i < 3; i++) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: Could not generate content.';
                return text;
            }
        } catch (error) {
            // console.error(`Attempt ${i + 1} failed...`);
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000)); // Exponential backoff
    }
    throw new Error("Failed to generate content after multiple retries.");
};

// --- Mock Supabase Client using localStorage ---

// Data structure for the mock client
interface MockDatabaseRow {
    id: string;
    goal: string;
    roadmapContent: string;
    user_id: string;
    createdAt: string; // Stored as ISO string
}

const mockSupabase = {
    // This is the collection/table abstraction
    from: (tableName: string) => ({
        // Simulate a SELECT * query
        select: (columns: string) => ({
            // Simulate .eq('user_id', userId)
            eq: (column: string, value: string) => ({
                // Simulate .order('createdAt', { ascending: false })
                order: (orderColumn: string, options: { ascending: boolean }) => ({
                    // Final execution function
                    async execute(): Promise<{ data: MockDatabaseRow[], error: null }> {
                        try {
                            const storedData = localStorage.getItem(ROADMAP_STORAGE_KEY);
                            const allRoadmaps: MockDatabaseRow[] = storedData ? JSON.parse(storedData) : [];

                            // 1. Filter by user_id
                            const filteredData = allRoadmaps.filter(row => row[column as keyof MockDatabaseRow] === value);

                            // 2. Sort by createdAt (descending for false ascending)
                            filteredData.sort((a, b) => {
                                const dateA = new Date(a.createdAt).getTime();
                                const dateB = new Date(b.createdAt).getTime();
                                return options.ascending ? dateA - dateB : dateB - dateA;
                            });

                            return { data: filteredData, error: null };
                        } catch (e) {
                            console.error("Mock Supabase Read Error:", e);
                            return { data: [], error: null };
                        }
                    }
                })
            })
        }),
        
        // Simulate an INSERT query
        insert: (rows: { goal: string, roadmapContent: string, user_id: string }[]): { error: null } => {
            try {
                const storedData = localStorage.getItem(ROADMAP_STORAGE_KEY);
                const allRoadmaps: MockDatabaseRow[] = storedData ? JSON.parse(storedData) : [];
                
                rows.forEach(row => {
                    allRoadmaps.push({
                        ...row,
                        id: crypto.randomUUID(), // Assign mock ID
                        createdAt: new Date().toISOString()
                    } as MockDatabaseRow); // Explicit cast to satisfy interface
                });
                
                localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(allRoadmaps));
                
                return { error: null };
            } catch (e) {
                console.error("Mock Supabase Write Error:", e);
                return { error: null };
            }
        }
    }),
    
    // Minimal mock for the client itself
    auth: {
        getSession: () => ({ data: { session: { user: { id: 'mock-user-id' } } } })
    }
};

// --- Main App Component ---

interface RoadmapEntry {
    id: string;
    goal: string;
    roadmapContent: string;
    createdAt: Date;
}

const App: React.FC = () => {
    // UI State
    const [goal, setGoal] = useState('');
    const [roadmap, setRoadmap] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Mock Supabase State
    const [isMockReady, setIsMockReady] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [userRoadmaps, setUserRoadmaps] = useState<RoadmapEntry[]>([]);

    // Helper function to fetch roadmaps
    const fetchRoadmaps = async (currentUserId: string) => {
        const { data, error: fetchError } = await mockSupabase
            .from('roadmaps') 
            .select('*')
            .eq('user_id', currentUserId)
            .order('createdAt', { ascending: false })
            .execute();

        if (fetchError) {
            console.error("Error fetching roadmaps:", fetchError);
            setError(`Mock Supabase Error: Failed to load history.`);
            return;
        }
        
        // Convert ISO date strings back to Date objects
        const formattedRoadmaps: RoadmapEntry[] = (data || []).map((rm: MockDatabaseRow) => ({
            id: rm.id,
            goal: rm.goal || 'Untitled Goal',
            roadmapContent: rm.roadmapContent || 'No Content',
            createdAt: new Date(rm.createdAt), 
        }));
        setUserRoadmaps(formattedRoadmaps);
        setError(null); 
    };

    // 1. Initial Setup: Set Mock User ID and Ready State
    useEffect(() => {
        // Simulate a persistent anonymous session ID using sessionStorage.
        let currentUserId = sessionStorage.getItem('mock_supabase_user_id');
        if (!currentUserId) {
            currentUserId = crypto.randomUUID();
            sessionStorage.setItem('mock_supabase_user_id', currentUserId); 
        }
        setUserId(currentUserId);
        setIsMockReady(true);
    }, []);

    // 2. Load User Roadmaps (Polling)
    useEffect(() => {
        if (!userId || !isMockReady) {
            return;
        }
        
        // Initial fetch
        fetchRoadmaps(userId);

        // Periodically re-fetch data to simulate real-time updates (since localStorage isn't real-time)
        const refetchInterval = setInterval(() => {
            fetchRoadmaps(userId);
        }, 3000); 

        return () => {
            clearInterval(refetchInterval);
        };
    }, [userId, isMockReady]); 


    // --- Core Logic Functions ---

    const handleGeneratePathway = async () => {
        if (!goal) {
            setError('Please enter your goal (e.g., "Prepare for JEE Main")');
            return;
        }

        setIsLoading(true);
        setError(null); 
        setRoadmap(null);
        setSaveSuccess(false);

        const systemInstruction = `You are EduAI, an expert educational assistant specializing in generating comprehensive, step-by-step study and preparation roadmaps for exams and scholarships worldwide. Your response must be in detailed, structured **Markdown format** and be actionable.

**Instructions:**
1. **Analyze the Goal:** Identify the exam or scholarship requested.
2. **Determine Scope:** Create a realistic timeline (e.g., 6 months, 1 year).
3. **Structure:** Use markdown headings (## and ###) and bullet points.
4. **Content:** Include sections for Phase Breakdown, Key Subjects, Recommended Resources (Official Websites, practice platforms), and Assessment Strategy.
5. **Tone:** Be encouraging, professional, and clear.`;

        try {
            const prompt = `Generate a detailed, comprehensive, step-by-step roadmap for the following educational goal: "${goal}".`;
            const generatedText = await generateContentWithGemini(prompt, systemInstruction);
            setRoadmap(generatedText);
        } catch (e: any) {
            console.error("Roadmap generation failed:", e);
            setError(`Roadmap generation failed. Please try again. The service may be temporarily unavailable.`);
        } finally {
            setIsLoading(false);
        }
    };

    const saveRoadmap = async () => {
        if (!userId || !roadmap || isSaving || !isMockReady) return;

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            // Prepare the data needed for the insert function
            const newRow = {
                goal: goal,
                roadmapContent: roadmap,
                user_id: userId,
            };
            
            const { error: saveError } = mockSupabase
                .from('roadmaps')
                .insert([newRow]);

            if (saveError) throw new Error(saveError as any); // Throwing the mock error

            // Manual re-fetch after save for immediate update
            fetchRoadmaps(userId!); 

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000); // Hide success message after 3 seconds
        } catch (e: any) {
            console.error("Failed to save roadmap:", e);
            setError(`Save Failed: ${e.message || 'Unknown mock storage error.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper to render Markdown (simplified for demonstration)
    const renderMarkdown = (text: string) => {
        if (!text) return null;
        // Basic conversion for display
        let html = text.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-4 mb-2 text-indigo-700">$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 text-indigo-900 border-b pb-1">$1</h2>');
        
        // Convert Markdown list items to <ul><li>
        const lines = html.split('\n');
        let inList = false;
        let processedLines: string[] = [];

        lines.forEach(line => {
            const listItemMatch = line.match(/^(\*|-)\s+(.*)/);
            if (listItemMatch) {
                if (!inList) {
                    processedLines.push('<ul class="list-disc ml-6 text-gray-700 leading-relaxed mb-3">');
                    inList = true;
                }
                processedLines.push(`<li>${listItemMatch[2]}</li>`);
            } else {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                }
                // Wrap non-heading, non-list, non-empty lines in paragraph tags
                if (line.trim() !== '' && !line.startsWith('<h') && !line.startsWith('<ul') && !line.startsWith('</ul')) {
                    processedLines.push(`<p class="mb-3 text-gray-700 leading-relaxed">${line}</p>`);
                } else {
                    processedLines.push(line);
                }
            }
        });

        if (inList) processedLines.push('</ul>');
        html = processedLines.join('\n');

        return (
            <div 
                className="prose max-w-none p-4 bg-white rounded-lg shadow-inner mt-4 border border-gray-200"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };

    // Helper to load a past roadmap into the current view
    const loadPastRoadmap = (rm: RoadmapEntry) => {
        setGoal(rm.goal);
        setRoadmap(rm.roadmapContent);
        // Scroll to the roadmap section
        document.getElementById('roadmap-display')?.scrollIntoView({ behavior: 'smooth' });
    }

    // Determine if the UI is globally ready to interact with the mock DB
    const isReady = isMockReady && userId;

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; }
                /* Custom styles to ensure markdown list rendering is clean */
                .prose li {
                    margin-left: 0.5rem; /* Indent list items */
                }
                .prose h2, .prose h3 {
                    margin-top: 1.5rem;
                    margin-bottom: 0.75rem;
                }
                `}
            </style>

            <header className="text-center mb-12">
                <div className="flex justify-center items-center mb-4">
                    <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                    Guided Pathways (Mock Supabase)
                </h1>
                <p className="text-xl text-gray-500">
                    Get personalized roadmaps for scholarships and exams
                </p>
            </header>

            <main className="max-w-4xl mx-auto">
                {/* Pathway Creation Card */}
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-indigo-100 mb-10">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create Your Pathway</h2>
                    
                    {/* Loading/Ready Indicator */}
                    {!isReady && (
                        <div className="p-4 mb-4 bg-yellow-100 text-yellow-700 rounded-lg flex items-center">
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Initializing mock client and user session...
                        </div>
                    )}
                    
                    <p className="text-gray-600 mb-5">
                        Tell us your goal and we'll create a personalized step-by-step plan.
                    </p>
                    
                    <label htmlFor="goal-input" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Goal
                    </label>
                    <input
                        id="goal-input"
                        type="text"
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Apply for National Merit Scholarship, Prepare for JEE Main..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out shadow-sm"
                        disabled={isLoading || !isReady}
                    />

                    {error && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleGeneratePathway}
                        disabled={isLoading || !goal || !isReady}
                        className={`w-full mt-6 py-3 px-4 flex items-center justify-center rounded-lg font-bold text-white transition duration-200 shadow-lg ${
                            isLoading || !goal || !isReady
                                ? 'bg-indigo-300 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Generating Pathway...
                            </>
                        ) : (
                            <>
                                <BookOpen className="w-5 h-5 mr-2" />
                                Generate Pathway
                            </>
                        )}
                    </button>
                    {userId && (
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            Simulated User ID: {userId} (Data stored locally)
                        </p>
                    )}
                </div>

                {/* Generated Roadmap Display */}
                {roadmap && (
                    <div id="roadmap-display" className="mt-10 bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-green-100">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h2 className="text-3xl font-bold text-indigo-700">
                                Your Personalized Roadmap
                            </h2>
                            <button
                                onClick={saveRoadmap}
                                disabled={isSaving || !isReady}
                                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition duration-200 shadow-md ${
                                    isSaving || !isReady
                                        ? 'bg-gray-400 text-white cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : saveSuccess ? (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                {saveSuccess ? 'Saved!' : 'Save to History'}
                            </button>
                        </div>
                        
                        {renderMarkdown(roadmap)}
                    </div>
                )}
                
                {/* History Section */}
                <div className="mt-10">
                    <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b pb-2 flex items-center">
                        <History className="w-6 h-6 mr-2 text-indigo-600" />
                        Past Roadmaps ({userRoadmaps.length})
                    </h2>
                    
                    {userRoadmaps.length === 0 ? (
                        <p className="text-gray-500 p-4 bg-white rounded-lg shadow-md">
                            No saved roadmaps yet. Generate and save one to see it here!
                        </p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {userRoadmaps.map((rm) => (
                                <div 
                                    key={rm.id} 
                                    className="bg-white p-4 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition cursor-pointer"
                                    onClick={() => loadPastRoadmap(rm)}
                                >
                                    <p className="font-semibold text-indigo-600 line-clamp-2 mb-1">
                                        {rm.goal}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Generated: {rm.createdAt.toLocaleDateString()}
                                    </p>
                                    <button 
                                        className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium underline"
                                        onClick={(e) => { e.stopPropagation(); loadPastRoadmap(rm); }}
                                    >
                                        View Roadmap
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;