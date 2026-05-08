"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    try {
        const levels = await prisma_1.prisma.level.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(levels);
    }
    catch (err) {
        console.error('GET /levels error', err);
        res.status(500).json({ error: 'Failed to load levels' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const level = await prisma_1.prisma.level.findUnique({
            where: { id: Number(req.params.id) },
        });
        if (!level) {
            res.status(404).json({ error: 'Level not found' });
            return;
        }
        res.json(level);
    }
    catch (err) {
        console.error('GET /levels/:id error', err);
        res.status(500).json({ error: 'Failed to load level' });
    }
});
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, difficulty, data } = req.body;
        const level = await prisma_1.prisma.level.create({
            data: { title, difficulty, data },
        });
        res.status(201).json(level);
    }
    catch {
        res.status(400).json({ error: 'Invalid data' });
    }
});
router.patch('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        const { title, difficulty, data } = req.body;
        const level = await prisma_1.prisma.level.update({
            where: { id: Number(req.params.id) },
            data: {
                ...(title !== undefined && { title }),
                ...(difficulty !== undefined && { difficulty }),
                ...(data !== undefined && { data }),
            },
        });
        res.json(level);
    }
    catch {
        res.status(404).json({ error: 'Level not found' });
    }
});
router.delete('/:id', auth_1.requireAuth, async (req, res) => {
    try {
        await prisma_1.prisma.level.delete({ where: { id: Number(req.params.id) } });
        res.json({ message: 'Level deleted' });
    }
    catch {
        res.status(404).json({ error: 'Level not found' });
    }
});
exports.default = router;
