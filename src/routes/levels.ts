import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const levels = await prisma.level.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(levels)
  } catch (err) {
    console.error('GET /levels error', err)
    res.status(500).json({ error: 'Failed to load levels' })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const level = await prisma.level.findUnique({
      where: { id: Number(req.params.id) },
    })
    if (!level) {
      res.status(404).json({ error: 'Level not found' })
      return
    }
    res.json(level)
  } catch (err) {
    console.error('GET /levels/:id error', err)
    res.status(500).json({ error: 'Failed to load level' })
  }
})

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, difficulty, data } = req.body
    const level = await prisma.level.create({
      data: { title, difficulty, data },
    })
    res.status(201).json(level)
  } catch {
    res.status(400).json({ error: 'Invalid data' })
  }
})

router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, difficulty, data } = req.body
    const level = await prisma.level.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(title !== undefined && { title }),
        ...(difficulty !== undefined && { difficulty }),
        ...(data !== undefined && { data }),
      },
    })
    res.json(level)
  } catch {
    res.status(404).json({ error: 'Level not found' })
  }
})

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.level.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Level deleted' })
  } catch {
    res.status(404).json({ error: 'Level not found' })
  }
})

export default router
