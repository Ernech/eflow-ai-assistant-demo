import { Injectable } from '@nestjs/common';
import * as tesseract from 'node-tesseract-ocr';
import * as poppler from 'pdf-poppler';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Poppler } from 'node-poppler';
import { GoogleGenAI } from '@google/genai';
@Injectable()
export class PdfService {

    private readonly tesseractConfig = {
        lang: 'spa', // Specify language, e.g., 'eng' for English
        oem: 1,      // OCR Engine Mode
        psm: 3,      // Page Segmentation Mode
    };

    private readonly poppler: Poppler;

    constructor() {
        this.poppler = new Poppler();
    }

    async extractTextFromPdf(filePath: string): Promise<string> {
        try {
            const outputDir = path.join(__dirname, '../../temp_images'); // Temporary directory for images
            await fs.mkdir(outputDir, { recursive: true });

            const options = {
                format: 'png',
                out_dir: outputDir,
                out_prefix: 'page',
                page: null, // Process all pages
            };

            await poppler.convert(filePath, options);

            let extractedText = '';
            const files = await fs.readdir(outputDir);
            for (const file of files) {
                if (file.startsWith('page') && file.endsWith('.png')) {
                    const imagePath = path.join(outputDir, file);
                    const text = await tesseract.recognize(imagePath, this.tesseractConfig);
                    extractedText += text + '\n';
                    await fs.unlink(imagePath); // Clean up temporary image
                }
            }
            await fs.rmdir(outputDir); // Clean up temporary directory

            return extractedText;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Failed to extract text from PDF.');
        }
    }

    async extractTextFromPdfNodePoppler(pdfPath: string): Promise<string> {
        return this.poppler.pdfToText(pdfPath);
    }

    async uploadLocalPDF(genAI: GoogleGenAI, filePath: string, displayName: string) {
        try {
            // Verify that the file exists
            await fs.access(filePath);

            // Read the PDF file from the local filesystem
            const pdfBuffer = await fs.readFile(filePath);
            const blobParts: BlobPart[] = [pdfBuffer as unknown as ArrayBuffer];
            // Create a Blob from the buffer
            const fileBlob = new Blob(blobParts, { type: 'application/pdf' });

            // Upload the file to Gemini API
            const file = await genAI.files.upload({
                file: fileBlob,
                config: {
                    displayName: displayName,
                },
            });

            // Wait for the file to be processed
            let getFile = await genAI.files.get({ name: file.name! });
            while (getFile.state === 'PROCESSING') {
                getFile = await genAI.files.get({ name: file.name! });
                console.log(`Current file status: ${getFile.state}`);
                console.log('File is still processing, retrying in 5 seconds');

            }

            if (getFile.state === 'FAILED') {
                throw new Error(`File processing failed for ${filePath}`);
            }

            return file;
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            throw new Error(`Failed to process PDF: ${error.message}`);
        }
    }
}
