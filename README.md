RAG Chat Assistant — README
An intelligent Retrieval-Augmented Generation (RAG) chat application built with React + Vite, Supabase, and Google Gemini API. This app allows users to upload documents, store them in Supabase, and chat with an AI that retrieves relevant context before generating smart responses.

🚀 Features
•	✅ User Authentication — Secure sign-in using Supabase Auth.
•	✅ File Uploading — Upload .txt or .pdf files to Supabase Storage.
•	✅ Vector Storage — Embeddings stored in Supabase for semantic retrieval.
•	✅ RAG-Powered Chat — Combines document context + Gemini responses.
•	✅ Chat History — View, manage, and revisit previous chats.
•	✅ Responsive UI — Clean, simple interface optimized for desktop & mobile.

🧩 Tech Stack
•	Frontend: React + Vite
•	Backend: Supabase (Auth + Database + Storage)
•	AI: Google Gemini API
•	Styling: Tailwind CSS
•	Deployment: Netlify / Vercel
•	Database: PostgreSQL (via Supabase)

⚙️ Environment Variables
Create a .env file in the project root and add the following:
•	VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
•	VITE_SUPABASE_KEY=<your-anon-key>
•	VITE_GEMINI_API_KEY=<your-gemini-api-key>


🧠 How It Works
1.	1️⃣ User Uploads File → The document is stored in Supabase Storage.
2.	2️⃣ Text Extraction → Text is processed and split into chunks.
3.	3️⃣ Embedding Generation → Gemini API converts text chunks to vectors.
4.	4️⃣ Vector Storage → Embeddings are stored in Supabase for retrieval.
5.	5️⃣ Chat Query → When the user asks a question, similar chunks are fetched using cosine similarity.
6.	6️⃣ Response Generation → Gemini API uses retrieved chunks + query context to generate a response.


🌐 Deployment (Netlify)
•	Build Command: npm run build
•	Publish Directory: dist
•	Add the same environment variables used in .env file to Netlify.
💡 Future Improvements
•	Add PDF and DOCX support
•	Implement semantic search with hybrid retrieval
•	Integrate chat history persistence
•	Add model selection (Gemini 1.5 Pro, Claude, etc.)
•	UI/UX improvements and dark mode
❤️ Credits
Built with 💻, ⚡, and ☕ by Dishank Aswal. Powered by Supabase & Google Gemini AI.
# DocChat
