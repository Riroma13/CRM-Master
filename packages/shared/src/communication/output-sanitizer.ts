export interface ChannelOutputSanitizer {
  sanitize(channel: string, content: string): string;
  validate(channel: string, content: string): boolean;
}
