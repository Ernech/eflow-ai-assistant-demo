export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
    },
    openAI: {
        apiKey: process.env.OPENAI_API_KEY
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
    }
});