"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePropertyValidation = exports.createPropertyValidation = exports.loginValidation = exports.registerValidation = exports.validate = void 0;
const express_validator_1 = require("express-validator");
// Standardized validation error handler
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        // Format errors strictly
        const extractedErrors = [];
        errors.array().map((err) => extractedErrors.push({ [err.type]: err.msg }));
        res.status(400).json({
            message: 'Invalid input data',
            errors: extractedErrors,
        });
    };
};
exports.validate = validate;
// --- Specific Validation Chains ---
exports.registerValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('firstName').notEmpty().withMessage('First name is required').trim().escape(),
    (0, express_validator_1.body)('lastName').notEmpty().withMessage('Last name is required').trim().escape(),
    (0, express_validator_1.body)('role').optional().isIn(['TENANT', 'LANDLORD', 'ADMIN']).withMessage('Invalid role'),
];
exports.loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
exports.createPropertyValidation = [
    (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required').trim().escape(),
    (0, express_validator_1.body)('type').notEmpty().withMessage('Property type is required').trim().escape(),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Description is required').trim().escape(),
    (0, express_validator_1.body)('location').notEmpty().withMessage('Location is required').trim().escape(),
    (0, express_validator_1.body)('rooms').isArray({ min: 1 }).withMessage('At least one room configuration is required'),
    (0, express_validator_1.body)('rooms.*.roomType').notEmpty().withMessage('Room type is required for all rooms'),
    (0, express_validator_1.body)('rooms.*.numberOfRooms').isInt({ min: 1 }).withMessage('Number of rooms must be at least 1'),
    (0, express_validator_1.body)('rooms.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    (0, express_validator_1.body)('amenities').optional().isArray().withMessage('Amenities must be an array'),
    (0, express_validator_1.body)('images').optional().isArray().withMessage('Images must be an array'),
];
exports.updatePropertyValidation = [
    (0, express_validator_1.body)('title').optional().notEmpty().withMessage('Title is required').trim().escape(),
    (0, express_validator_1.body)('type').optional().notEmpty().withMessage('Property type is required').trim().escape(),
    (0, express_validator_1.body)('description').optional().notEmpty().withMessage('Description is required').trim().escape(),
    (0, express_validator_1.body)('location').optional().notEmpty().withMessage('Location is required').trim().escape(),
    (0, express_validator_1.body)('amenities').optional().isArray().withMessage('Amenities must be an array'),
    (0, express_validator_1.body)('images').optional().isArray().withMessage('Images must be an array'),
];
//# sourceMappingURL=validation.middleware.js.map