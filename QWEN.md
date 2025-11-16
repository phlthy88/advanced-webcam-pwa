# Advanced Webcam Controls PWA

## Project Overview

This is an advanced Webcam Controls Progressive Web App (PWA) built with React and TypeScript. The application provides comprehensive camera control features including hardware-level camera settings adjustment, face tracking with PTZ (Pan-Tilt-Zoom) functionality, AI-powered background generation, and various video effects and filters.

The application leverages the Web Media Capture API to interact with camera hardware, allowing users to adjust settings like brightness, contrast, saturation, exposure, white balance, and focus mode directly from the browser. It includes advanced features like AI background generation using Google's GenAI, face detection for automatic tracking, and presets for camera settings.

## Key Features

- **Hardware Camera Controls**: Adjust brightness, contrast, saturation, sharpness, exposure, white balance, ISO, zoom, pan, tilt, and focus mode
- **Video Effects**: Apply filters (grayscale, sepia, invert, etc.), rotation, mirroring, blur, face smoothing, and portrait lighting
- **Face Tracking**: Automatic pan/tilt/zoom to center on detected faces
- **AI Background Generation**: Generate custom AI backgrounds using text prompts (currently using placeholder implementation)
- **Settings Presets**: Save and recall camera settings configurations
- **PTZ Presets**: Save and recall pan/tilt/zoom positions
- **Dark/Light Theme**: Toggle between light and dark UI themes
- **Responsive Design**: Works on various screen sizes and devices
- **Toasts**: User feedback system for notifications and errors
- **Keyboard Shortcuts**: Quick access to features with keyboard shortcuts

## Project Structure

```
advanced-webcam-pwa/
├── .env.local                 # Environment variables (API keys)
├── App.tsx                   # Main app component with ToastProvider
├── constants.ts              # Default settings and UI constants
├── index.html                # HTML entry point
├── index.tsx                 # React DOM rendering entry point
├── metadata.json             # PWA metadata
├── package.json              # Dependencies and scripts
├── README.md                 # Project documentation
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
├── types.ts                  # TypeScript type definitions
├── components/               # React UI components
│   ├── ControlSection.tsx
│   ├── ControlsPanel.tsx
│   ├── Header.tsx
│   ├── Joystick.tsx
│   ├── PermissionScreen.tsx
│   ├── ShortcutsModal.tsx
│   ├── StatusBar.tsx
│   ├── Toast.tsx
│   ├── VideoPanel.tsx
│   └── WebcamApp.tsx         # Main application component
├── contexts/                 # React Context providers
│   └── ToastContext.tsx
├── hooks/                    # Custom React hooks
│   └── useWebcam.ts          # Webcam camera and settings management
├── public/                   # Static assets
└── services/                 # External service integrations
    ├── faceDetectorService.ts
    └── segmentationService.ts
```

## Technologies Used

- **React 19**: UI library for building the component-based interface
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and development server
- **@google/genai**: Google's GenAI SDK for AI background generation
- **MediaPipe**: For face detection (currently commented out in initialization)
- **Tailwind CSS**: Utility-first CSS framework (assumed based on class names)

## Building and Running

### Prerequisites
- Node.js

### Setup and Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up API key:**
   - Copy the example environment file and add your Gemini API key:
   ```bash
   # Set your GEMINI_API_KEY in .env.local file
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000 (or the next available port)

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build locally:**
   ```bash
   npm run preview
   ```

## Development Conventions

- **Type Safety**: Extensive use of TypeScript interfaces in `types.ts`
- **Component Architecture**: Organized in a modular component structure
- **Custom Hooks**: Complex logic is abstracted into custom hooks (e.g., `useWebcam`)
- **Context API**: Global state management using React Context (e.g., `ToastContext`)
- **Responsive Design**: Tailwind CSS classes for responsive UI
- **Error Handling**: Comprehensive error handling with user feedback via toasts

## Key Architecture Patterns

- **Camera Settings State Management**: Settings are stored per-camera device ID using a Map in WebcamApp component
- **Hardware vs Software Controls**: The app differentiates between hardware-supported and software-applied controls
- **AI Integration**: Uses Google's GenAI for background generation with real-time UI feedback
- **MediaPipe Integration**: Face detection capabilities (currently not initialized in the main app)
- **Animation Loop**: Uses requestAnimationFrame for smooth face tracking with PTZ adjustments

## Environment Variables

- `GEMINI_API_KEY`: Required for AI background generation features

## API Integration

The application integrates with:
- Google GenAI API for AI capabilities (placeholder implementation for image generation)
- Web Media Capture API for camera access and control
- Web MediaStream API for video processing
- MediaPipe face detection (currently not active)
- Web MediaTrackCapabilities API for camera hardware feature detection

## Component Breakdown

- **WebcamApp**: Main application component coordinating all features
- **VideoPanel**: Renders the camera stream with applied effects
- **ControlsPanel**: Contains all camera settings controls
- **Header**: App header with theme toggle and shortcuts
- **StatusBar**: Displays camera status information
- **useWebcam**: Custom hook for camera management and settings
- **ToastContext**: Global toast notification system
- **PermissionScreen**: Handles camera permission flow
- **Video Effects**: Real-time video processing pipeline