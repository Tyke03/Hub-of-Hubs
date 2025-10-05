import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function createBackup() {
  const zip = new JSZip();
  
  // Add all project files to the zip
  // In a real implementation, this would scan the project directory
  const files = {
    'src/App.tsx': document.querySelector('[data-file="App.tsx"]')?.textContent || '',
    'src/index.css': document.querySelector('[data-file="index.css"]')?.textContent || '',
    // Add more files as needed
  };

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  saveAs(blob, `project-backup-${timestamp}.zip`);
  return `project-backup-${timestamp}.zip`;
}

export async function writeFile(path: string, content: string): Promise<void> {
  // In a real implementation, this would write to the actual file system
  const fileElement = document.querySelector(`[data-file="${path}"]`);
  if (fileElement) {
    fileElement.textContent = content;
  }
}