"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMatches = exports.getProfile = exports.createOrUpdateProfile = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createOrUpdateProfile = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'TENANT') {
            res.status(403).json({ message: 'Only tenants can create roommate profiles' });
            return;
        }
        const { budget, cleanliness, sleepHabits, studyHabits, bio, isActive } = req.body;
        if (!budget || !cleanliness || !sleepHabits || !studyHabits) {
            res.status(400).json({ message: 'Budget, cleanliness, sleepHabits, and studyHabits are required' });
            return;
        }
        const profile = await prisma_1.default.roommateProfile.upsert({
            where: { userId: req.user.id },
            update: {
                budget,
                cleanliness,
                sleepHabits,
                studyHabits,
                bio,
                isActive: isActive !== undefined ? isActive : true,
            },
            create: {
                userId: req.user.id,
                budget,
                cleanliness,
                sleepHabits,
                studyHabits,
                bio,
                isActive: isActive !== undefined ? isActive : true,
            }
        });
        res.status(200).json({ message: 'Profile updated successfully', profile });
    }
    catch (error) {
        console.error('Error creating/updating roommate profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createOrUpdateProfile = createOrUpdateProfile;
const getProfile = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'TENANT') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        const profile = await prisma_1.default.roommateProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!profile) {
            res.status(404).json({ message: 'Profile not found' });
            return;
        }
        res.status(200).json({ profile });
    }
    catch (error) {
        console.error('Error fetching roommate profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const findMatches = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'TENANT') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        // Get the current user to get their gender and campus
        const currentUser = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            include: { roommateProfile: true }
        });
        if (!currentUser || !currentUser.roommateProfile || !currentUser.roommateProfile.isActive) {
            res.status(400).json({ message: 'You must create an active roommate profile to find matches' });
            return;
        }
        if (!currentUser.gender || !currentUser.campus) {
            res.status(400).json({ message: 'Please update your main profile with your Gender and Campus to find matches.' });
            return;
        }
        // Query for matches: Same gender, same campus, active profile, exclude self
        const matches = await prisma_1.default.roommateProfile.findMany({
            where: {
                isActive: true,
                userId: { not: req.user.id },
                user: {
                    gender: currentUser.gender,
                    campus: currentUser.campus
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                        // Exclude email and phoneNumber for privacy
                    }
                }
            }
        });
        // Sort by match percentage using weighted scoring
        const scoredMatches = matches.map(match => {
            // 1. Budget proximity (Weight: 40%) - continuous formula
            const budgetDiff = Math.abs(match.budget - currentUser.roommateProfile.budget);
            const budgetScore = Math.max(0, 1 - (budgetDiff / 1000)) * 40;
            // 2. Cleanliness (Weight: 30%)
            const cleanScale = { 'MESSY': 1, 'AVERAGE': 2, 'NEAT': 3 };
            const myClean = cleanScale[currentUser.roommateProfile.cleanliness] || 2;
            const theirClean = cleanScale[match.cleanliness] || 2;
            let cleanScore = 0;
            if (myClean === theirClean)
                cleanScore = 30;
            else if (Math.abs(myClean - theirClean) === 1)
                cleanScore = 15;
            // 3. Sleep Habits (Weight: 15%)
            const sleepScore = match.sleepHabits === currentUser.roommateProfile.sleepHabits ? 15 : 0;
            // 4. Study Habits (Weight: 15%)
            const studyScore = match.studyHabits === currentUser.roommateProfile.studyHabits ? 15 : 0;
            const matchPercentage = Math.round(budgetScore + cleanScore + sleepScore + studyScore);
            return { ...match, matchPercentage };
        })
            .filter(match => match.matchPercentage > 50) // Quality threshold
            .sort((a, b) => b.matchPercentage - a.matchPercentage);
        res.status(200).json({ matches: scoredMatches });
    }
    catch (error) {
        console.error('Error finding roommate matches:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.findMatches = findMatches;
//# sourceMappingURL=roommate.controller.js.map