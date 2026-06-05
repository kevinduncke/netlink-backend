export function encodeCursor(date: Date): string {
    return Buffer.from(date.toISOString()).toString('base64');
}

export function decodeCursor(cursor: string): Date {
    return new Date(Buffer.from(cursor, 'base64').toString());
}