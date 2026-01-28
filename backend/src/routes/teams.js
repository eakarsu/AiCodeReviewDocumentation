import express from 'express';
import { Team, TeamMember } from '../models/index.js';
import { query } from '../config/database.js';

const router = express.Router();

// Get all teams with member count
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT t.*, COUNT(tm.id) as member_count
      FROM teams t
      LEFT JOIN team_members tm ON t.id = tm.team_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get team count
router.get('/count', async (req, res) => {
  try {
    const count = await Team.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single team with members
router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await query(
      'SELECT * FROM team_members WHERE team_id = $1 ORDER BY name',
      [req.params.id]
    );

    res.json({ ...team, members: members.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create team
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await Team.create({ name, description });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update team
router.put('/:id', async (req, res) => {
  try {
    const updated = await Team.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete team
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Team.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ message: 'Team deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to team
router.post('/:id/members', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const member = await TeamMember.create({
      team_id: parseInt(req.params.id),
      email,
      name: name || email.split('@')[0],
      role: role || 'member'
    });

    res.status(201).json(member);
  } catch (error) {
    if (error.message.includes('unique')) {
      return res.status(400).json({ error: 'Member already exists in this team' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove member from team
router.delete('/:teamId/members/:memberId', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM team_members WHERE id = $1 AND team_id = $2 RETURNING *',
      [req.params.memberId, req.params.teamId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update member role
router.patch('/:teamId/members/:memberId', async (req, res) => {
  try {
    const { role } = req.body;
    const result = await query(
      'UPDATE team_members SET role = $1 WHERE id = $2 AND team_id = $3 RETURNING *',
      [role, req.params.memberId, req.params.teamId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
