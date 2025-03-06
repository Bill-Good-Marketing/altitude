// types/html-to-text.d.ts
declare module 'html-to-text' {
    export interface HtmlToTextOptions {
      wordwrap?: number | false | null;
      preserveNewlines?: boolean;
      selectors?: Array<{
        selector: string;
        format?: string;
        options?: Record<string, unknown>;
      }>;
      formatters?: Record<
        string,
        (
          elem?: unknown,
          walk?: unknown,
          builder?: unknown,
          formatOptions?: HtmlToTextOptions
        ) => string
      >;
    }
  
    export function convert(html: string, options?: HtmlToTextOptions): string;
  }
  