import { Injectable } from '@nestjs/common';
import { ApiException } from '../../shared/api/api-exception';
import { BusinessErrorCode } from '../../shared/business-error-code';

export interface CvLine {
  text: string;
  fontSize: number;
  bold: boolean;
}

export interface DetectedCvSection {
  type: 'EXPERIENCE' | 'EDUCATION' | 'PROJECTS' | 'SKILLS';
  header: string;
  content: string;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  fontName: string;
  hasEOL: boolean;
}

interface PdfPage {
  getTextContent(): Promise<unknown>;
  cleanup(): void;
}

interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
}

interface PdfLoadingTask {
  promise: Promise<PdfDocument>;
  destroy(): Promise<void>;
}

type PdfGetDocument = (options: {
  data: Uint8Array;
  useSystemFonts: boolean;
}) => PdfLoadingTask;

const SECTION_HEADERS: Record<DetectedCvSection['type'], string[]> = {
  EXPERIENCE: ['work experience', 'experience', 'professional experience'],
  EDUCATION: ['education', 'academic background'],
  PROJECTS: ['projects', 'personal projects'],
  SKILLS: ['skills', 'technical skills'],
};

@Injectable()
export class CvPdfService {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const pdfModule: unknown =
        await import('pdfjs-dist/legacy/build/pdf.mjs');
      const getDocument = this.getDocumentFunction(pdfModule);
      const loadingTask: PdfLoadingTask = getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
      });
      try {
        const document = await loadingTask.promise;
        const lines: CvLine[] = [];

        for (
          let pageNumber = 1;
          pageNumber <= document.numPages;
          pageNumber++
        ) {
          const page = await document.getPage(pageNumber);
          let current: CvLine | undefined;
          let currentY = 0;
          const contentRecord = this.asRecord(
            await page.getTextContent(),
            'PDF text content',
          );
          const contentItems = contentRecord.items;
          if (!Array.isArray(contentItems)) {
            throw new Error('PDF.js returned invalid text content.');
          }
          const styles = contentRecord.styles;

          const flush = () => {
            if (current?.text.trim()) {
              lines.push({ ...current, text: current.text.trim() });
            }
            current = undefined;
          };

          for (const rawItem of contentItems as unknown[]) {
            if (!this.isPdfTextItem(rawItem) || !rawItem.str.trim()) continue;
            const item = rawItem;
            const y = item.transform[5];
            const fontSize = Math.hypot(item.transform[2], item.transform[3]);
            const fontFamily = this.fontFamily(styles, item.fontName);
            const bold = /bold|black|heavy/i.test(fontFamily);

            if (current && Math.abs(y - currentY) > 2) flush();
            if (!current) {
              current = { text: item.str, fontSize, bold };
              currentY = y;
            } else {
              current.text += ` ${item.str}`;
              current.fontSize = Math.max(current.fontSize, fontSize);
              current.bold ||= bold;
            }
            if (item.hasEOL) flush();
          }
          flush();
          page.cleanup();
        }
        if (lines.length === 0) {
          throw new Error('PDF contains no extractable text.');
        }
        return this.detectSections(lines);
      } finally {
        await loadingTask.destroy();
      }
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException(
        BusinessErrorCode.INTERNAL_SERVER_ERROR,
        500,
        'Terjadi kesalahan saat membaca file PDF.',
      );
    }
  }

  private getDocumentFunction(module: unknown): PdfGetDocument {
    const candidate = this.asRecord(module, 'PDF.js module').getDocument;
    if (typeof candidate !== 'function') {
      throw new Error('PDF.js module does not export getDocument.');
    }
    return candidate as PdfGetDocument;
  }

  private isPdfTextItem(value: unknown): value is PdfTextItem {
    if (typeof value !== 'object' || value === null) return false;
    const item = value as Record<string, unknown>;
    const transform = item.transform;
    return (
      typeof item.str === 'string' &&
      Array.isArray(transform) &&
      transform.length >= 6 &&
      transform.every((part: unknown) => typeof part === 'number') &&
      typeof item.fontName === 'string' &&
      typeof item.hasEOL === 'boolean'
    );
  }

  private fontFamily(styles: unknown, fontName: string): string {
    if (typeof styles !== 'object' || styles === null) return '';
    const style = (styles as Record<string, unknown>)[fontName];
    if (typeof style !== 'object' || style === null) return '';
    const family = (style as Record<string, unknown>).fontFamily;
    return typeof family === 'string' ? family : '';
  }

  private asRecord(value: unknown, field: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`${field} must be an object.`);
    }
    return value as Record<string, unknown>;
  }

  private detectSections(lines: CvLine[]): string {
    const averageFontSize =
      lines.reduce((sum, line) => sum + line.fontSize, 0) / lines.length;
    const sections: Array<{
      index: number;
      type: DetectedCvSection['type'];
      header: string;
    }> = [];

    lines.forEach((line, index) => {
      const normalized = this.normalize(line.text);
      if (!normalized || normalized.split(' ').length > 5) return;
      for (const [type, aliases] of Object.entries(SECTION_HEADERS) as Array<
        [DetectedCvSection['type'], string[]]
      >) {
        const match = aliases.some((alias) => {
          const normalizedAlias = this.normalize(alias);
          return (
            normalized === normalizedAlias ||
            this.distance(normalized, normalizedAlias) <= 2
          );
        });
        if (!match) continue;

        const confidence =
          0.5 +
          (line.bold ? 0.2 : 0) +
          (line.fontSize > averageFontSize * 1.1 ? 0.2 : 0) +
          (line.text === line.text.toUpperCase() ? 0.1 : 0);
        if (confidence >= 0.5)
          sections.push({ index, type, header: line.text });
        break;
      }
    });

    return sections
      .map((section, index) => {
        const nextIndex = sections[index + 1]?.index ?? lines.length;
        const content = lines
          .slice(section.index + 1, nextIndex)
          .map((line) => line.text)
          .join('\n');
        return `## ${section.header}\n${content}`;
      })
      .join('\n\n');
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private distance(left: string, right: string): number {
    const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
    for (let row = 1; row <= left.length; row++) {
      let diagonal = previous[0];
      previous[0] = row;
      for (let column = 1; column <= right.length; column++) {
        const above = previous[column];
        previous[column] = Math.min(
          previous[column] + 1,
          previous[column - 1] + 1,
          diagonal + (left[row - 1] === right[column - 1] ? 0 : 1),
        );
        diagonal = above;
      }
    }
    return previous[right.length];
  }
}
