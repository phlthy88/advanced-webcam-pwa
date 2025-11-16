# Project Overview

This is an advanced Webcam Controls Progressive Web App (PWA) built with React and TypeScript. The application provides comprehensive camera control features including hardware-level camera settings adjustment, face tracking with PTZ (Pan-Tilt-Zoom) functionality, AI-powered background generation, and various video effects and filters.

The application leverages the Web Media Capture API to interact with camera hardware, allowing users to adjust settings like brightness, contrast, saturation, exposure, white balance, and focus mode directly from the browser. It includes advanced features like AI background generation using Google's GenAI, face detection for automatic tracking, and presets for camera settings.

## Technologies Used

- **React 19**: UI library for building the component-based interface
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and development server
- **@google/genai**: Google's GenAI SDK for AI background generation
- **Tailwind CSS**: Utility-first CSS framework (inferred from class names)

## Building and Running

### Prerequisites
- Node.js

### Setup and Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API key:**
   - Create a `.env.local` file in the root of the project.
   - Add your Gemini API key to the file:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000.

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build locally:**
   ```bash
   npm run preview
   ```

## Development Conventions

- **Type Safety**: Extensive use of TypeScript interfaces in `types.ts`.
- **Component Architecture**: Organized in a modular component structure under `src/components`.
- **Custom Hooks**: Complex logic is abstracted into custom hooks (e.g., `useWebcam`).
- **Context API**: Global state management using React Context (e.g., `ToastContext`).
- **Styling**: Utility-first CSS with Tailwind CSS.
- **Environment Variables**: API keys and other secrets are managed via `.env` files and exposed to the application through Vite's `define` configuration.

## Project Structure

```
/
├── .env.local                 # Environment variables (API keys)
├── App.tsx                   # Main app component with ToastProvider
├── components/               # React UI components
├── constants.ts              # Default settings and UI constants
├── contexts/                 # React Context providers
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
├── services/                 # External service integrations
├── index.html                # HTML entry point
├── index.tsx                 # React DOM rendering entry point
├── package.json              # Dependencies and scripts
├── README.md                 # Project documentation
├── tsconfig.json             # TypeScript configuration
├── types.ts                  # TypeScript type definitions
└── vite.config.ts            # Vite build configuration
```
