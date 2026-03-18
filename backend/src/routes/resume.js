import { Router } from 'express';
import { getDb } from '../db/schema.js';
import multer from 'multer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { tailorResume } from '../ai/tailor.js';
import { compilePdf } from '../latex/compiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RESUMES_DIR = join(__dirname, '..', '..', 'resumes');
const BASE_TEX_PATH = join(RESUMES_DIR, 'base.tex');
const GENERATED_DIR = join(RESUMES_DIR, 'generated');

mkdirSync(RESUMES_DIR, { recursive: true });
mkdirSync(GENERATED_DIR, { recursive: true });

const upload = multer({ dest: '/tmp/jobclaw-uploads/' });

const router = Router();

// GET /api/resume/base — get base LaTeX template
router.get('/base', (req, res) => {
  try {
    if (!existsSync(BASE_TEX_PATH)) {
      return res.json({ content: '' });
    }
    const content = readFileSync(BASE_TEX_PATH, 'utf-8');
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/resume/base — save base LaTeX template (inline edit)
router.put('/base', (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    writeFileSync(BASE_TEX_PATH, content, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resume/base/upload — upload a .tex file
router.post('/base/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = readFileSync(req.file.path, 'utf-8');
    writeFileSync(BASE_TEX_PATH, content, 'utf-8');
    res.json({ success: true, size: content.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resume/:jobId — get resume for a job
router.get('/:jobId', (req, res) => {
  try {
    const db = getDb();
    const resume = db.prepare('SELECT * FROM resumes WHERE job_id = ? ORDER BY generated_at DESC LIMIT 1')
      .get(req.params.jobId);
    if (!resume) return res.json({ resume: null });
    res.json({ resume });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/resume/:jobId — save edited LaTeX content
router.put('/:jobId', (req, res) => {
  try {
    const db = getDb();
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const resume = db.prepare('SELECT * FROM resumes WHERE job_id = ? ORDER BY generated_at DESC LIMIT 1')
      .get(req.params.jobId);

    if (!resume) return res.status(404).json({ error: 'No resume for this job' });

    // Save updated .tex
    const jobDir = join(GENERATED_DIR, req.params.jobId);
    mkdirSync(jobDir, { recursive: true });
    const texPath = join(jobDir, 'resume.tex');
    writeFileSync(texPath, content, 'utf-8');

    db.prepare(`UPDATE resumes SET tex_content = ?, status = 'edited' WHERE id = ?`)
      .run(content, resume.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resume/:jobId/tailor — trigger AI tailoring
router.post('/:jobId/tailor', async (req, res) => {
  try {
    const db = getDb();
    const { jobId } = req.params;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (!existsSync(BASE_TEX_PATH)) {
      return res.status(400).json({ error: 'No base LaTeX template found. Please upload one in Profile.' });
    }

    const baseTex = readFileSync(BASE_TEX_PATH, 'utf-8');
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();

    // Mark pending
    db.prepare(`UPDATE jobs SET resume_status = 'generating', updated_at = datetime('now') WHERE id = ?`).run(jobId);

    // Tailor in the background (don't await response)
    tailorResume({ job, profile, baseTex })
      .then(async (tailoredTex) => {
        const jobDir = join(GENERATED_DIR, jobId);
        mkdirSync(jobDir, { recursive: true });

        const texPath = join(jobDir, 'resume.tex');
        writeFileSync(texPath, tailoredTex, 'utf-8');

        // Compile PDF
        const pdfPath = join(jobDir, 'resume.pdf');
        await compilePdf(texPath, jobDir);

        // Save to DB
        const existing = db.prepare('SELECT id FROM resumes WHERE job_id = ?').get(jobId);
        if (existing) {
          db.prepare(`UPDATE resumes SET tex_content = ?, pdf_path = ?, status = 'ready', generated_at = datetime('now') WHERE job_id = ?`)
            .run(tailoredTex, pdfPath, jobId);
        } else {
          db.prepare(`INSERT INTO resumes (id, job_id, tex_content, pdf_path, status) VALUES (?, ?, ?, ?, 'ready')`)
            .run(uuidv4(), jobId, tailoredTex, pdfPath);
        }

        db.prepare(`UPDATE jobs SET resume_status = 'ready', updated_at = datetime('now') WHERE id = ?`).run(jobId);
      })
      .catch((err) => {
        console.error('Resume tailoring failed:', err.message);
        db.prepare(`UPDATE jobs SET resume_status = 'failed', updated_at = datetime('now') WHERE id = ?`).run(jobId);
      });

    res.json({ success: true, message: 'Tailoring started' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resume/:jobId/compile — recompile PDF from current .tex
router.post('/:jobId/compile', async (req, res) => {
  try {
    const db = getDb();
    const { jobId } = req.params;

    const resume = db.prepare('SELECT * FROM resumes WHERE job_id = ? ORDER BY generated_at DESC LIMIT 1').get(jobId);
    if (!resume) return res.status(404).json({ error: 'No resume found' });

    const jobDir = join(GENERATED_DIR, jobId);
    const texPath = join(jobDir, 'resume.tex');

    if (!existsSync(texPath)) {
      writeFileSync(texPath, resume.tex_content || '', 'utf-8');
    }

    await compilePdf(texPath, jobDir);
    const pdfPath = join(jobDir, 'resume.pdf');

    db.prepare(`UPDATE resumes SET pdf_path = ?, status = 'ready' WHERE id = ?`).run(pdfPath, resume.id);

    res.json({ success: true, pdf_url: `/resumes/${jobId}/resume.pdf` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
