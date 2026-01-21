import express from 'express';
import { ReadmeProject } from '../models/index.js';
import { aiGenerateReadme } from '../services/openRouterService.js';

const router = express.Router();

// Get all README projects
router.get('/', async (req, res) => {
  try {
    const projects = await ReadmeProject.findAll();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get count
router.get('/count', async (req, res) => {
  try {
    const count = await ReadmeProject.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single README project
router.get('/:id', async (req, res) => {
  try {
    const project = await ReadmeProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'README project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new README project
router.post('/', async (req, res) => {
  try {
    const { title, description, project_structure, tech_stack } = req.body;
    const project = await ReadmeProject.create({
      title,
      description,
      project_structure,
      tech_stack,
      status: 'pending'
    });
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate AI README
router.post('/:id/generate', async (req, res) => {
  try {
    const project = await ReadmeProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'README project not found' });
    }

    const result = await aiGenerateReadme(
      project.project_structure,
      project.tech_stack,
      project.description
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    const updated = await ReadmeProject.update(req.params.id, {
      generated_readme: result.content,
      status: 'completed'
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update README project
router.put('/:id', async (req, res) => {
  try {
    const updated = await ReadmeProject.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'README project not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete README project
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ReadmeProject.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'README project not found' });
    }
    res.json({ message: 'README project deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
