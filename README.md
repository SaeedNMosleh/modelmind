# Model Mind

Model Mind is a web application designed to assist users in modeling systems through an interactive chatbox. The chatbox guides users by asking questions to help them define their system. Based on the user's responses, the AI agent generates a model in PlantUML format.

Users can manually modify the generated code, view a live preview of the diagram, and continue refining the model with AI assistance.

---

## Features

- **AI-Powered Chat Assistant**: Guides users in creating and modifying PlantUML diagrams.
- **Code Editor**: Allows users to manually edit the PlantUML script with syntax highlighting.
- **Live Preview**: Displays real-time updates of the PlantUML diagram as users make changes.
- **Command Support**: Use commands like `@clear` to reset the chat or `@reset` to clear the diagram.
- **Customizable Themes**: Dark mode and TailwindCSS-based styling for a modern UI. (in progress)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun (for package management)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/modelmind-v1.git
   cd modelmind-v1
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   ```

### Running the Development Server

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

---

## Usage

1. **Chat Assistant**: Use the chat interface to describe your system or request modifications to the diagram.
2. **Code Editor**: Edit the PlantUML script directly in the code editor.
3. **Live Preview**: View the updated diagram in the preview panel.

### Commands

- `@clear`: Clears the chat history.
- `@reset`: Resets the PlantUML diagram to an empty state.

---

## Project Structure

```
.
├── app/
│   ├── api/               # API routes for chat and OpenAI integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Main page component
├── components/
│   ├── chat-interface/    # Chat assistant components
│   ├── code-editor/       # Code editor components
│   ├── preview/           # Diagram preview components
│   └── ui/                # Reusable UI components
├── lib/
│   └── utils/             # Utility functions (e.g., PlantUML encoding)
├── public/                # Static assets
├── .env                   # Environment variables
├── package.json           # Project metadata and dependencies
└── README.md              # Project documentation
```

---

## Technologies Used

- **Frontend**: React, Next.js, TailwindCSS
- **Editor**: Monaco Editor
- **AI Integration**: OpenAI API
- **Diagram Generation**: PlantUML

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push the branch.
4. Submit a pull request.

---

## License

The project is licensed under the [MIT license](./LICENSE).

---

## Acknowledgments

- [OpenAI](https://openai.com/) for the GPT models.
- [PlantUML](https://plantuml.com/) for diagram generation.
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor.
- [TailwindCSS](https://tailwindcss.com/) for styling.
