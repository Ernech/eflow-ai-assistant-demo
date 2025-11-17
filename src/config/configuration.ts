export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
    },
    openAI: {
        apiKey: process.env.OPENAI_API_KEY,
        url: process.env.AZURE_OPEN_AI_URL
    },
    geminiAI: {
        apiKey: process.env.GEMINI_API_KEY
    },
    prompts: {
        promptsFolderPath: process.env.PROMPTS_PATH
    },
    users: {
        usersJsonPath: process.env.USERS_PATH
    },
    manuales: {
        manualesJsonPath: process.env.MANUALES_PATH
    },
    rag: {
        ragServerParg: process.env.RAG_SERVER_PATH
    }
});