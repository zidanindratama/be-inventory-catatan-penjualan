import 'express';

declare module 'express' {
  interface Request {
    user?: {
      id?: string;
      sub?: string;
      email?: string;
      role?: string;
      [key: string]: any;
    };
  }
}
