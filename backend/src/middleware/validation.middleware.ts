import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body } from 'express-validator';

// Standardized validation error handler
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors strictly
    const extractedErrors: any[] = [];
    errors.array().map((err) => extractedErrors.push({ [err.type]: err.msg }));

    res.status(400).json({
      message: 'Invalid input data',
      errors: extractedErrors,
    });
  };
};

// --- Specific Validation Chains ---

export const registerValidation = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required').trim().escape(),
  body('lastName').notEmpty().withMessage('Last name is required').trim().escape(),
  body('role').optional().isIn(['TENANT', 'LANDLORD', 'ADMIN']).withMessage('Invalid role'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const createPropertyValidation = [
  body('title').notEmpty().withMessage('Title is required').trim().escape(),
  body('type').notEmpty().withMessage('Property type is required').trim().escape(),
  body('targetAudience').optional().isString().trim().escape(),
  body('furnishing').optional().isString().trim().escape(),
  body('description').notEmpty().withMessage('Description is required').trim().escape(),
  body('location').notEmpty().withMessage('Location is required').trim().escape(),
  body('rooms').isArray({ min: 1 }).withMessage('At least one room configuration is required'),
  body('rooms.*.roomType').notEmpty().withMessage('Room type is required for all rooms'),
  body('rooms.*.numberOfRooms').isInt({ min: 1 }).withMessage('Number of rooms must be at least 1'),
  body('rooms.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('images').optional().isArray().withMessage('Images must be an array'),
];

export const updatePropertyValidation = [
  body('title').optional().notEmpty().withMessage('Title is required').trim().escape(),
  body('type').optional().notEmpty().withMessage('Property type is required').trim().escape(),
  body('targetAudience').optional().isString().trim().escape(),
  body('furnishing').optional().isString().trim().escape(),
  body('description').optional().notEmpty().withMessage('Description is required').trim().escape(),
  body('location').optional().notEmpty().withMessage('Location is required').trim().escape(),
  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('images').optional().isArray().withMessage('Images must be an array'),
];
