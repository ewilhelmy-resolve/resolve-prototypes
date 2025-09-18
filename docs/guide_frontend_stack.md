Complete Guide: Building a Modern React App with Vite, TypeScript, Tailwind CSS, shadcn/ui, and React RouterThis guide provides a comprehensive, step-by-step walkthrough for setting up a modern, scalable, and efficient React application. We will be using a curated stack of powerful tools:Vite: A blazing-fast build tool and development server.1React & TypeScript: For building a type-safe and robust user interface.1Tailwind CSS: A utility-first CSS framework for rapid and customizable styling.1shadcn/ui: A unique approach to UI components that you own and control.1React Router: The standard for client-side routing in React applications.1By the end of this guide, you will have a solid project foundation, complete with code formatting and best practices, ready for you to build upon.PrerequisitesBefore you begin, ensure you have the following installed:Node.js: Version 20.19+ or 22.12+.2A code editor: Visual Studio Code is recommended.3Basic knowledge: Familiarity with JavaScript, React, and the command line.3Step 1: Project Initialization with ViteFirst, we'll create a new React project using Vite, which provides an interactive setup for selecting a TypeScript template.Create the Vite ProjectOpen your terminal, navigate to the directory where you want to create your project, and run the following command. Using . for the project name will create the project in the current directory.4Bashnpm create vite@latest.
Follow the PromptsVite will ask you to select a framework and a variant. Choose React and then TypeScript (or Typescript + SWC).3Install Dependencies and RunOnce the project files are created, install the necessary packages and start the development server.5Bash# Install dependencies
npm install

# Start the development server
npm run dev
Your new React application will be running at http://localhost:5173.Step 2: Integrating Tailwind CSSNext, we'll add Tailwind CSS for styling. The recommended method is to use the first-party Vite plugin, which simplifies the setup process.6Install Tailwind CSS via Vite PluginInstall tailwindcss and the dedicated @tailwindcss/vite plugin as development dependencies.7Bashnpm install -D tailwindcss @tailwindcss/vite
Update Vite ConfigurationModify your vite.config.ts file to include the Tailwind CSS plugin.7TypeScript// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
Configure Template PathsWhile the Vite plugin often handles this, it's good practice to create a tailwind.config.js file to specify which files Tailwind should scan for utility classes.Bashnpx tailwindcss init
Now, update the content array in the generated tailwind.config.js:JavaScript/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins:,
}
Add Tailwind DirectivesReplace the entire content of your src/index.css file with the following @tailwind directives. These are the entry points for Tailwind's styles.5CSS/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
Verify the SetupTo confirm that Tailwind is working, replace the content of src/App.tsx with a styled element.TypeScript// src/App.tsx
export default function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold text-blue-500 underline">
        Hello World!
      </h1>
    </div>
  )
}
When you save the file, your browser should display the styled "Hello World!" text.Step 3: Setting Up shadcn/uishadcn/ui is not a component library; it's a collection of reusable components that you copy into your own project, giving you complete control. The setup requires configuring TypeScript path aliases, which is a critical step.9Configure TypeScript Path AliasesThis allows you to use non-relative imports like @/components/....Edit tsconfig.json: Add the baseUrl and paths properties to the compilerOptions section.9JSON// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  //... other options
}
Edit tsconfig.app.json: The Vite setup often uses a separate tsconfig.app.json. You must add the same baseUrl and paths configuration here as well. This is a common point of failure if missed.9JSON// tsconfig.app.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  //... other options
}
Install Node.js Types: The Vite config file needs Node.js types to resolve paths.9Bashnpm install -D @types/node
Update vite.config.ts: Finally, make Vite aware of the path alias.9TypeScript// vite.config.ts
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
Initialize shadcn/uiRun the init command to set up shadcn/ui in your project. It will ask a few questions to configure a components.json file.9Bashnpx shadcn-ui@latest init
You can accept the defaults or choose your preferred style (e.g., New York) and base color (e.g., Neutral).4Add and Use a ComponentNow you can add components from the library directly into your source code.Bashnpx shadcn-ui@latest add button
This command creates a src/components/ui/button.tsx file. You can now import and use it in your application.9TypeScript// src/App.tsx
import { Button } from "@/components/ui/button"

function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Button>Click Me</Button>
    </div>
  )
}

export default App
Step 4: Implementing React RouterNow, let's add client-side routing to create a multi-page application.Install React RouterBashnpm install react-router-dom
Create Project Structure for RoutingIt's good practice to organize your pages and routing logic into separate folders.Create a src/pages directory.Create a src/routes directory.Create a Page ComponentCreate a home page component in src/pages/Home.tsx.TypeScript// src/pages/Home.tsx
import { Button } from "@/components/ui/button";

const Home = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl mb-4">Welcome Home</h1>
      <Button>I'm a shadcn Button!</Button>
    </div>
  );
};

export default Home;
Create the Router ConfigurationCreate a file at src/routes/AppRouter.tsx to define your application's routes.4TypeScript// src/routes/AppRouter.tsx
import { Route, Routes } from 'react-router-dom';
import Home from '@/pages/Home';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Add other routes here */}
    </Routes>
  );
};

export default AppRouter;
Integrate the RouterUpdate App.tsx to render your AppRouter.4TypeScript// src/App.tsx
import AppRouter from './routes/AppRouter';

const App = () => {
  return <AppRouter />;
};

export default App;
Finally, wrap your <App /> component with <BrowserRouter> in src/main.tsx to enable routing.4TypeScript// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
Step 5: Code Formatting with Prettier (Recommended)To maintain consistent code style, it's highly recommended to add Prettier.Install Prettier and ESLint IntegrationBashnpm install -D prettier eslint-config-prettier
Create Configuration FilesCreate a .prettierrc file in your project root 4:JSON{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
Create a .prettierignore file to exclude certain files from formatting 4:dist
node_modules
Add Scripts to package.jsonAdd scripts for checking and applying formatting.4JSON"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "lint": "eslint. --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview",
  "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\""
},
Update ESLint ConfigurationUpdate your eslint.config.js to include eslint-config-prettier. This disables ESLint rules that would conflict with Prettier.4Note: ESLint configuration can vary. The following is a common example.JavaScript// eslint.config.js (example for flat config)
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import prettierConfig from "eslint-config-prettier";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
 ...tseslint.configs.recommended,
  pluginReactConfig,
  prettierConfig, // Add this last
];
Step 6: Environment VariablesFor handling secret keys or environment-specific configurations:Create a .env file in the project root.4Add the .env file to your .gitignore to keep it out of version control.Define your variables, prefixing them with VITE_.4VITE_API_URL=http://localhost:8080
Access them in your application code using import.meta.env.VITE_VARIABLE_NAME.4Step 7: Recommended Project StructureFor scalability, organizing your project by feature is a great practice. Here is a recommended structure to start with 10:src/
├── api/          # API call definitions
├── assets/       # Static assets like images, fonts
├── components/
│   ├── shared/   # Generic, reusable components (e.g., Layout, Header)
│   └── ui/       # Components from shadcn/ui (e.g., button.tsx)
├── features/     # Feature-specific modules (e.g., auth, products)
├── hooks/        # Reusable custom hooks
├── lib/          # Utility functions, constants
├── pages/        # Top-level page components
├── providers/    # React Context providers
├── routes/       # Routing configuration
├── styles/       # Global styles (if any)
├── types/        # Global TypeScript types and interfaces
├── App.tsx       # Main app component
├── main.tsx      # Application entry point
└── index.css     # Main CSS file for Tailwind
Conclusion and Next StepsYou now have a robust, modern React application foundation. This setup provides an excellent developer experience and is built for performance and scalability.From here, you can explore:State Management: Integrate a library like Zustand or Redux for complex state.1Data Fetching: Use a library like TanStack Query (React Query) for efficient API requests.1Testing: Set up Vitest and React Testing Library for unit and integration tests.1Deployment: Deploy your application to platforms like Vercel or Netlify.12Happy coding!