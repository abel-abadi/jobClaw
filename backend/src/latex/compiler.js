import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Compile a .tex file to PDF using tectonic.
 * @param {string} texPath - Absolute path to the .tex file
 * @param {string} outDir - Directory to write the PDF into
 */
export async function compilePdf(texPath, outDir) {
  // Check tectonic is available
  try {
    await execAsync('which tectonic');
  } catch {
    throw new Error(
      'tectonic not found. Install it with: brew install tectonic'
    );
  }

  const cmd = `tectonic --outdir "${outDir}" "${texPath}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
    if (stdout) console.log('[tectonic]', stdout);
    if (stderr) console.warn('[tectonic stderr]', stderr);
  } catch (err) {
    throw new Error(`LaTeX compilation failed: ${err.message}`);
  }

  // Verify PDF was created
  const pdfPath = join(outDir, 'resume.pdf');
  if (!existsSync(pdfPath)) {
    throw new Error('PDF not generated — tectonic may have encountered errors');
  }

  return pdfPath;
}
