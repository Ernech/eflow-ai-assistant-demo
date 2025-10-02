import { Content } from "@google/generative-ai";

// Tipado de un archivo subido
export interface UploadedFile {
    uri: string;
    mimeType: string;
    displayName?: string;
}

/**
 * Construye el arreglo de contents para Gemini
 * @param instructions Texto de instrucciones para el asistente
 * @param userQuestion Pregunta o mensaje del usuario
 * @param files Archivos ya subidos a Gemini
 * @returns Content[] listo para pasar a generateContent
 */
export function buildContent(
    instructions: string,
    userQuestion: string,
    files: UploadedFile[] = []
): Content[] {
    // Cada parte debe ser ContentPart (text o fileData)
    const parts: Content["parts"] = [];

    // Instrucciones iniciales
    if (instructions) {
        parts.push({ text: instructions });
    }

    // Agregamos los archivos
    for (const file of files) {
        parts.push({
            fileData: {
                fileUri: file.uri,
                mimeType: file.mimeType,
            },
        });
    }

    // Pregunta del usuario
    if (userQuestion) {
        parts.push({ text: userQuestion });
    }

    // Retornamos un Content[] con role "user"
    return [
        {
            role: "user",
            parts,
        },
    ];
}
