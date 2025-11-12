-- Create chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Anyone can view conversations"
  ON public.chat_conversations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view documents"
  ON public.documents FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create documents"
  ON public.documents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view FAQs"
  ON public.faqs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update FAQ views"
  ON public.faqs FOR UPDATE
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_faqs_category ON public.faqs(category);

-- Insert some sample FAQs
INSERT INTO public.faqs (question, answer, category) VALUES
('How do I apply for scholarships?', 'To apply for scholarships, first check your eligibility criteria, gather required documents (marksheets, ID proof, income certificate), and submit your application before the deadline through the official portal.', 'Scholarships'),
('What documents are needed for exam registration?', 'Typically you need: Valid ID proof (Aadhar/PAN), recent photograph, educational certificates, caste certificate (if applicable), and fee payment receipt.', 'Exams'),
('How can I check my application status?', 'Visit the official portal, log in with your credentials, and navigate to "My Applications" or "Application Status" section to track your submission.', 'General'),
('What languages are supported?', 'We support 15+ Indian languages including Hindi, English, Tamil, Telugu, Malayalam, Kannada, Bengali, Marathi, Gujarati, and more.', 'Platform'),
('Is this service free?', 'Yes, our basic AI assistance services are completely free for all students to help them navigate educational opportunities.', 'Platform');