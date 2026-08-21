import { Request, Response, NextFunction } from 'express';
import sanitizeHtml from 'sanitize-html';

/**
 * Recursively sanitizes strings, arrays, and objects to strip malicious HTML.
 */
const cleanData = (data: any): any => {
  if (typeof data === 'string') {
    return sanitizeHtml(data, {
      allowedTags: [], // Strip all tags by default
      allowedAttributes: {}, // Strip all attributes
    });
  }

  if (Array.isArray(data)) {
    return data.map((item) => cleanData(item));
  }

  if (data !== null && typeof data === 'object') {
    const cleanedObject: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        cleanedObject[key] = cleanData(data[key]);
      }
    }
    return cleanedObject;
  }

  return data;
};

/**
 * Express middleware to sanitize incoming request data globally.
 */
export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = cleanData(req.body);
  }
  if (req.query) {
    Object.defineProperty(req, 'query', { 
      value: cleanData(req.query), 
      configurable: true, 
      enumerable: true, 
      writable: true 
    });
  }
  if (req.params) {
    Object.defineProperty(req, 'params', { 
      value: cleanData(req.params), 
      configurable: true, 
      enumerable: true, 
      writable: true 
    });
  }
  next();
};
