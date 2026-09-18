import dotenv from 'dotenv';
import app from './src/server/app';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Auditor Headless API running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Evaluate: POST http://localhost:${PORT}/api/audit/evaluate`);
  console.log(`   Batch: POST http://localhost:${PORT}/api/audit/evaluate/batch`);
  console.log(`   Extract: POST http://localhost:${PORT}/api/cases/extract`);
  console.log(`   Transcribe: POST http://localhost:${PORT}/api/cases/transcribe`);
  console.log(`   Evaluate from draft: POST http://localhost:${PORT}/api/cases/evaluate-from-draft`);
});

export default app;