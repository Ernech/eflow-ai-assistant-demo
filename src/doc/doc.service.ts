import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
@Injectable()
export class DocService {

    async extractTextFromDocFile(docPath: string) {
        try {
            const result = await mammoth.extractRawText({ path: docPath });
            return result.value; // The extracted raw text
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            throw new Error('Failed to extract text from DOCX file.');
        }
    }

}
