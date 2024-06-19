import { v4 as uuidv4 } from 'uuid';
import { Router } from 'express';
import pool from '../utils/database.js';
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();
const router = Router();

router.post('/new', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    // If the user is not an EC, return
    if (req.user.role !== 'EC') {
      return res.status(403).json({success: false, message: 'Insufficient Permissions'});
    }

    const {name, description, budget, image, mimeType} = req.body;
    if (!name || !description || !budget || !image || !mimeType) {
      return res.status(400).json({success: false, message: 'Name, description, image, mimeType and budget are required'});
    }

    // Check that budget it more than 0
    if (budget <= 0) {
      return res.status(400).json({success: false, message: 'Budget must be greater than 0'});
    }

    const id = uuidv4();
    const fileExtension = mimeType.split('/')[1];
    await fs.promises.writeFile(`./public/images/${id}.${fileExtension}`, image, 'base64');

    const imageUrl = `${process.env.API_URL}/images/${id}.${fileExtension}`;

    await pool.query('INSERT INTO "public"."events" (id, name, description, budget, image, "createdAt", "createdBy", closed) '
      + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, name, description, budget, imageUrl, new Date(), req.user.id, false])

    res.status(201).json({
      success: true,
      message: 'Event created!',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({success: false, message: 'Internal Server Error'});
  }
});

router.post('/edit', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    if (req.user.role !== 'EC') {
      return res.status(403).json({success: false, message: 'Insufficient Permissions'});
    }

    const {id, name, description, date, budget} = req.body;
    if (!name || !description || !date || !budget) {
      return res.status(400).json({success: false, message: 'ID, name, description, date and budget are required'});
    }

    if (budget <= 0) {
      return res.status(400).json({success: false, message: 'Budget must be greater than 0'});
    }

    // update the table
    await pool.query('UPDATE "public"."events" SET name = $1, description = $2, date = $3, budget = $4 WHERE id = $5', [name, description, date, budget, id]);
    res.status(201).json({
      success: true,
      message: 'Event updated!',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({success: false, message: 'Internal Server Error'});
  }
});

router.post('/close', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    if (req.user.role !== 'EC') {
      return res.status(403).json({success: false, message: 'Insufficient Permissions'});
    }

    const { id, value } = req.body;

    if (!id) {
      return res.status(400).json({success: false, message: 'ID is required'});
    }

    if (value !== true || value !== false) {
      return res.status(400).json({success: false, message: 'Value must be true/false'});
    }

    await pool.query('UPDATE "public"."events" SET closed = $2 WHERE id = $1', [id, value]);
    res.status(201).json({
      success: true,
      message: 'Event closed!',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({success: false, message: 'Internal Server Error'});
  }
});

router.get('/list', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({success: false, message: 'Unauthorized'});
    }

    const search = req.query.search || '';

    const data = await pool.query('SELECT id, name, description, date, budget, image, "createdAt", closed FROM "public"."events" WHERE closed = false AND name ILIKE $1', [`%${search}%`]);
    res.status(200).json({
      success: true,
      data: data.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({success: false, message: 'Internal Server Error'});
  }
});

export default router;
