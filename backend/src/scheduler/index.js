import cron from 'node-cron';
import { getDb } from '../db/schema.js';
import { runScan } from './scanner.js';

let scheduledTask = null;

export function startScheduler() {
  const db = getDb();
  const schedule = db.prepare('SELECT value FROM settings WHERE key = ?').get('scan_schedule')?.value || '0 7 * * *';

  if (scheduledTask) {
    scheduledTask.stop();
  }

  if (!cron.validate(schedule)) {
    console.warn(`[scheduler] Invalid cron expression: "${schedule}", defaulting to 7AM daily`);
    scheduleTask('0 7 * * *');
  } else {
    scheduleTask(schedule);
  }
}

function scheduleTask(schedule) {
  scheduledTask = cron.schedule(schedule, async () => {
    console.log(`⏰ Scheduled scan triggered at ${new Date().toISOString()}`);
    try {
      const result = await runScan();
      console.log(`✅ Scheduled scan done: ${result.added} new jobs`);
    } catch (err) {
      console.error('❌ Scheduled scan failed:', err.message);
    }
  });

  console.log(`📅 Job scanner scheduled: ${schedule}`);
}

export function restartScheduler() {
  startScheduler();
}
