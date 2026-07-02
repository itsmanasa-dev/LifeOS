# LifeOS

LifeOS has been fully migrated from Flutter/Dart to a modern React 19 web application.

## Project Structure

The project is structured inside the `web/` folder:
- **`web/src/components/`**: Shared components (e.g. Auth guards, Layout frames).
- **`web/src/pages/`**: Page views (Dashboard, Daily Planner, College Hub, Focus Timer, Settings).
- **`web/src/store/`**: Zustand global state management.
- **`web/src/services/`**: Firebase Authentication, Firestore databases, and Google Gemini AI integrations.
- **`web/src/types/`**: TypeScript type definitions.

---

## Getting Started

To run the application locally:

1. **Navigate to the web workspace:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file inside `web/` using `web/.env.example` as a template, and fill in your Firebase configuration keys:
   ```env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173/`.

5. **Generate Production Bundle:**
   ```bash
   npm run build
   ```
