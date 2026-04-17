import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

let _dirname: string;
let _filename: string;

try {
  _filename = fileURLToPath(import.meta.url);
  const isProd = process.env.NODE_ENV === 'production';
  _dirname = isProd ? path.resolve(path.dirname(_filename), '..') : path.dirname(_filename);
} catch (e) {
  // Fallback for CommonJS when compiled
  _filename = typeof __filename !== 'undefined' ? __filename : process.argv[1];
  const isProd = process.env.NODE_ENV === 'production';
  _dirname = isProd ? path.resolve(typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename), '..') : (typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename));
}

// Helper to get SHA-256 hash of a file
function getFileHash(filePath: string): string {
  const fd = fs.openSync(filePath, 'r');
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.alloc(8192);
  let bytesRead;
  try {
    while ((bytesRead = fs.readSync(fd, buffer, 0, 8192, null)) !== 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Base directory for operations
  let BASE_DIR = process.env.PHOTOS_BASE_DIR 
    ? path.resolve(process.env.PHOTOS_BASE_DIR) 
    : path.join(_dirname, "photos_workspace");

  console.log(`Working directory set to: ${BASE_DIR}`);

  // Update BASE_DIR
  app.post("/api/update-path", (req, res) => {
    const { newPath } = req.body;
    if (!newPath) return res.status(400).json({ error: "Path is required" });
    try {
      const resolvedPath = path.resolve(newPath);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(400).json({ error: "Path does not exist" });
      }
      BASE_DIR = resolvedPath;
      res.json({ message: "Path updated successfully", currentPath: BASE_DIR });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to ensure workspace exists
  const ensureWorkspace = () => {
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR);
    }
  };

  // 0. Setup Test Environment
  app.post("/api/setup-test", (req, res) => {
    try {
      if (fs.existsSync(BASE_DIR)) {
        fs.rmSync(BASE_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(BASE_DIR);
      
      const folderA = path.join(BASE_DIR, "FolderA");
      const folderB = path.join(BASE_DIR, "FolderB");
      
      fs.mkdirSync(folderA);
      fs.mkdirSync(folderB);
      
      // Create subfolders in A for testing continuous numbering
      const subA1 = path.join(folderA, "202406_a");
      const subA2 = path.join(folderA, "202406_b");
      const subA3 = path.join(folderA, "202407_trip");
      fs.mkdirSync(subA1);
      fs.mkdirSync(subA2);
      fs.mkdirSync(subA3);

      const subdirs = [subA1, subA2, subA3];
      const videoExts = [".mp4", ".mov", ".avi"];
      const imgExts = [".jpg", ".jpeg", ".heic"];

      // Generate 300 random samples
      for (let i = 1; i <= 300; i++) {
        const targetSubdir = subdirs[Math.floor(Math.random() * subdirs.length)];
        const typeRoll = Math.random();
        
        if (typeRoll < 0.1) {
          // 10% chance: Video
          const ext = videoExts[Math.floor(Math.random() * videoExts.length)];
          fs.writeFileSync(path.join(targetSubdir, `VIDEO_${i}${ext}`), "video content");
        } else if (typeRoll < 0.2) {
          // 10% chance: AAE file
          fs.writeFileSync(path.join(targetSubdir, `IMG_${i}.AAE`), "aae content");
        } else if (typeRoll < 0.4) {
          // 20% chance: Duplicate (exists in both A and B)
          const fileName = `DUP_${i}.JPG`;
          fs.writeFileSync(path.join(targetSubdir, fileName), "duplicate content");
          fs.writeFileSync(path.join(folderB, fileName), "duplicate content");
        } else if (typeRoll < 0.5) {
          // 10% chance: Edited photo
          const ext = imgExts[Math.floor(Math.random() * imgExts.length)];
          const paddedNum = String(i).padStart(4, '0');
          fs.writeFileSync(path.join(targetSubdir, `IMG_E${paddedNum}${ext}`), "edited image content");
        } else {
          // 50% chance: Regular image
          const ext = imgExts[Math.floor(Math.random() * imgExts.length)];
          fs.writeFileSync(path.join(targetSubdir, `IMG_${i}${ext}`), "image content");
        }
      }

      res.json({ message: "Test environment created with 300 samples", path: BASE_DIR });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 1. Deduplication (Dry Run and Actual)
  app.post("/api/deduplicate-scan", (req, res) => {
    try {
      const { folderA: nameA, folderB: nameB, method } = req.body;
      const folderA = path.join(BASE_DIR, nameA || "FolderA");
      const folderB = path.join(BASE_DIR, nameB || "FolderB");
      
      if (!fs.existsSync(folderA)) return res.status(400).json({ error: `去重目录 "${nameA || "FolderA"}" 不存在` });
      if (!fs.existsSync(folderB)) return res.status(400).json({ error: `保留目录 "${nameB || "FolderB"}" 不存在` });

      const duplicates: string[] = [];
      
      if (method === 'hash') {
        const hashSet = new Set<string>();
        const bItems = fs.readdirSync(folderB);
        for (const item of bItems) {
          const fullPath = path.join(folderB, item);
          if (!fs.statSync(fullPath).isDirectory()) {
            hashSet.add(getFileHash(fullPath));
          }
        }

        const processDir = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              processDir(fullPath);
            } else {
              const hash = getFileHash(fullPath);
              if (hashSet.has(hash)) {
                duplicates.push(item);
              }
            }
          }
        };
        processDir(folderA);
      } else {
        const filesInB = new Set(fs.readdirSync(folderB));
        const processDir = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              processDir(fullPath);
            } else {
              if (filesInB.has(item)) {
                duplicates.push(item);
              }
            }
          }
        };
        processDir(folderA);
      }

      res.json({ count: duplicates.length, files: duplicates });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/deduplicate", (req, res) => {
    try {
      const { folderA: nameA, folderB: nameB, method } = req.body;
      const folderA = path.join(BASE_DIR, nameA || "FolderA");
      const folderB = path.join(BASE_DIR, nameB || "FolderB");
      
      if (!fs.existsSync(folderA)) return res.status(400).json({ error: `去重目录 "${nameA || "FolderA"}" 不存在` });
      if (!fs.existsSync(folderB)) return res.status(400).json({ error: `保留目录 "${nameB || "FolderB"}" 不存在` });

      const deletedFiles: string[] = [];

      if (method === 'hash') {
        const hashSet = new Set<string>();
        const bItems = fs.readdirSync(folderB);
        for (const item of bItems) {
          const fullPath = path.join(folderB, item);
          if (!fs.statSync(fullPath).isDirectory()) {
            hashSet.add(getFileHash(fullPath));
          }
        }

        const processDir = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              processDir(fullPath);
            } else {
              const hash = getFileHash(fullPath);
              if (hashSet.has(hash)) {
                fs.unlinkSync(fullPath);
                deletedFiles.push(item);
              }
            }
          }
        };
        processDir(folderA);
      } else {
        const filesInB = new Set(fs.readdirSync(folderB));
        const processDir = (dir: string) => {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            if (fs.statSync(fullPath).isDirectory()) {
              processDir(fullPath);
            } else {
              if (filesInB.has(item)) {
                fs.unlinkSync(fullPath);
                deletedFiles.push(item);
              }
            }
          }
        };
        processDir(folderA);
      }

      res.json({ 
        message: `Deleted ${deletedFiles.length} duplicate files from Folder A`,
        count: deletedFiles.length,
        files: deletedFiles
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Video Extraction
  app.post("/api/extract-videos", (req, res) => {
    try {
      const { sourceFolders, outputName, extensions } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      const videoDirName = outputName || "Video";
      const videoDir = path.join(BASE_DIR, videoDirName);
      
      if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir);

      // Parse extensions from user input or use defaults
      let targetExts = [".mp4", ".mov", ".avi", ".m4v"];
      if (extensions && typeof extensions === 'string' && extensions.trim()) {
        targetExts = extensions.split(',').map(e => e.trim().toLowerCase()).filter(e => e.startsWith('.'));
        if (targetExts.length === 0) {
          // If user didn't provide dots, add them
          targetExts = extensions.split(',').map(e => {
            const trimmed = e.trim().toLowerCase();
            return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
          });
        }
      }

      let movedCount = 0;

      const processDir = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            if (fullPath !== videoDir) processDir(fullPath);
          } else {
            const ext = path.extname(item).toLowerCase();
            if (targetExts.includes(ext)) {
              const destPath = path.join(videoDir, item);
              // Handle name collisions in flat folder
              let finalDest = destPath;
              let counter = 1;
              while (fs.existsSync(finalDest)) {
                const name = path.parse(item).name;
                finalDest = path.join(videoDir, `${name}_${counter}${ext}`);
                counter++;
              }
              fs.renameSync(fullPath, finalDest);
              movedCount++;
            }
          }
        }
      };

      for (const name of folders) {
        const folderPath = path.join(BASE_DIR, name);
        if (fs.existsSync(folderPath)) {
          processDir(folderPath);
        }
      }

      res.json({ message: `Moved ${movedCount} videos to ${videoDirName} folder` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Delete AAE files
  app.post("/api/cleanup-aae", (req, res) => {
    try {
      const { sourceFolders } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];

      const deletedFiles: string[] = [];
      const processDir = (dir: string) => {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
          } else if (item.toLowerCase().endsWith(".aae")) {
            fs.unlinkSync(fullPath);
            deletedFiles.push(item);
          }
        }
      };

      for (const name of folders) {
        const folderPath = path.join(BASE_DIR, name);
        if (fs.existsSync(folderPath)) {
          processDir(folderPath);
        }
      }

      res.json({ 
        message: `Deleted ${deletedFiles.length} .AAE files`,
        count: deletedFiles.length,
        files: deletedFiles
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Rename and Consolidate (Scan and Actual)
  app.post("/api/rename-scan", (req, res) => {
    try {
      const { sourceFolders, ruleA = 'year_month', ruleB = 'custom' } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      
      const affectedFolders: string[] = [];
      let totalFiles = 0;

      for (const name of folders) {
        const folderPath = path.join(BASE_DIR, name);
        if (!fs.existsSync(folderPath)) continue;

        const nameMatch = name.match(/^(\d{6})_/);
        if (nameMatch) {
          const files = fs.readdirSync(folderPath).filter(f => 
            !fs.statSync(path.join(folderPath, f)).isDirectory()
          );
          if (files.length > 0) {
            affectedFolders.push(name);
            totalFiles += files.length;
          }
        } else {
          const subdirs = fs.readdirSync(folderPath).filter(item => 
            fs.statSync(path.join(folderPath, item)).isDirectory()
          );

          for (const subdir of subdirs) {
            const match = subdir.match(/^(\d{6})_/);
            if (match) {
              const subdirPath = path.join(folderPath, subdir);
              const files = fs.readdirSync(subdirPath).filter(f => 
                !fs.statSync(path.join(subdirPath, f)).isDirectory()
              );
              if (files.length > 0) {
                affectedFolders.push(`${name}/${subdir}`);
                totalFiles += files.length;
              }
            }
          }
          
          // Also check files directly in the selected folder just in case
          const directFiles = fs.readdirSync(folderPath).filter(f => 
            !fs.statSync(path.join(folderPath, f)).isDirectory()
          );
          if (directFiles.length > 0) {
            affectedFolders.push(name);
            totalFiles += directFiles.length;
          }
        }
      }

      res.json({ folderCount: affectedFolders.length, fileCount: totalFiles, folders: affectedFolders });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/rename-only", (req, res) => {
    try {
      const { 
        sourceFolders, 
        ruleA = 'year_month', 
        ruleB = 'sequence', 
        separator = '_', 
        customTextA = '', 
        customTextB = '', 
        sortOrder = 'name',
        startNumber = 1,
        padding = 3
      } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      let renamedCount = 0;

      const targetDirs: { path: string, yearMonthMatch: string | null }[] = [];

      for (const name of folders) {
        const folderPath = path.join(BASE_DIR, name);
        if (!fs.existsSync(folderPath)) continue;

        const nameMatch = name.match(/^(\d{6})_/);
        if (nameMatch) {
          targetDirs.push({ path: folderPath, yearMonthMatch: nameMatch[1] });
        } else {
          const subdirs = fs.readdirSync(folderPath).filter(item => 
            fs.statSync(path.join(folderPath, item)).isDirectory()
          );
          for (const subdir of subdirs) {
            const match = subdir.match(/^(\d{6})_/);
            if (match) {
              targetDirs.push({ path: path.join(folderPath, subdir), yearMonthMatch: match[1] });
            }
          }
          
          // Also add the parent folder itself to process any direct files
          targetDirs.push({ path: folderPath, yearMonthMatch: null });
        }
      }

      for (const dir of targetDirs) {
        const files = fs.readdirSync(dir.path).filter(f => 
          !fs.statSync(path.join(dir.path, f)).isDirectory()
        );

        if (sortOrder === 'date') {
          files.sort((a, b) => {
            const statA = fs.statSync(path.join(dir.path, a));
            const statB = fs.statSync(path.join(dir.path, b));
            return statA.mtimeMs - statB.mtimeMs;
          });
        } else {
          files.sort();
        }

        const sequenceCounters: { [prefix: string]: number } = {};

        files.forEach((file) => {
          const filePath = path.join(dir.path, file);
          const stat = fs.statSync(filePath);
          const mtime = new Date(stat.mtimeMs);
          const yyyymmdd = `${mtime.getFullYear()}${String(mtime.getMonth() + 1).padStart(2, '0')}${String(mtime.getDate()).padStart(2, '0')}`;

          const getPart = (rule: string, customText: string) => {
            if (rule === 'year_month') return dir.yearMonthMatch || '';
            if (rule === 'year_month_day') return yyyymmdd;
            if (rule === 'custom') return customText;
            return '';
          };

          const partA = getPart(ruleA, customTextA);
          const partB = getPart(ruleB, customTextB);

          const prefixParts = [];
          if (ruleA !== 'sequence' && partA) prefixParts.push(partA);
          if (ruleB !== 'sequence' && partB) prefixParts.push(partB);
          const prefix = prefixParts.join(separator);

          let seqNum = 0;
          if (!sequenceCounters[prefix]) sequenceCounters[prefix] = startNumber;
          seqNum = sequenceCounters[prefix];
          sequenceCounters[prefix] += 1;

          const seqStr = String(seqNum).padStart(padding, '0');

          const finalParts = [];
          if (ruleA === 'sequence') finalParts.push(seqStr);
          else if (partA) finalParts.push(partA);

          if (ruleB === 'sequence') finalParts.push(seqStr);
          else if (partB) finalParts.push(partB);

          const newName = finalParts.join(separator) + path.extname(file);
          const newPath = path.join(dir.path, newName);

          if (filePath !== newPath) {
            let finalPath = newPath;
            let collisionCounter = 1;
            while (fs.existsSync(finalPath) && finalPath !== filePath) {
              finalPath = path.join(dir.path, `${finalParts.join(separator)}_${collisionCounter}${path.extname(file)}`);
              collisionCounter++;
            }
            fs.renameSync(filePath, finalPath);
            renamedCount++;
          }
        });
      }

      res.json({ message: `成功重命名了 ${renamedCount} 个文件`, count: renamedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/consolidate-only", (req, res) => {
    try {
      const { sourceFolders, outputName } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      const consolidatedDirName = outputName || "AllInOne";
      const consolidatedDir = path.join(BASE_DIR, consolidatedDirName);
      if (!fs.existsSync(consolidatedDir)) fs.mkdirSync(consolidatedDir);

      let movedCount = 0;

      for (const name of folders) {
        const folderPath = path.join(BASE_DIR, name);
        if (!fs.existsSync(folderPath)) continue;

        const targetDirs: string[] = [];
        const nameMatch = name.match(/^(\d{6})_/);
        if (nameMatch) {
          targetDirs.push(folderPath);
        } else {
          const subdirs = fs.readdirSync(folderPath).filter(item => 
            fs.statSync(path.join(folderPath, item)).isDirectory()
          );
          for (const subdir of subdirs) {
            if (subdir.match(/^\d{6}_/)) {
              targetDirs.push(path.join(folderPath, subdir));
            }
          }
        }

        for (const subdirPath of targetDirs) {
          const files = fs.readdirSync(subdirPath).filter(f => 
            !fs.statSync(path.join(subdirPath, f)).isDirectory()
          );

          for (const file of files) {
            const oldPath = path.join(subdirPath, file);
            const newPath = path.join(consolidatedDir, file);

            let finalPath = newPath;
            let collisionCounter = 1;
            const ext = path.extname(file);
            const base = path.basename(file, ext);
            
            while (fs.existsSync(finalPath)) {
              finalPath = path.join(consolidatedDir, `${base}_${collisionCounter}${ext}`);
              collisionCounter++;
            }

            fs.renameSync(oldPath, finalPath);
            movedCount++;
          }
        }
      }

      res.json({ message: `成功将 ${movedCount} 个文件整合到 ${consolidatedDirName} 目录`, count: movedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Extra Features: Extract Edited Photos
  app.post("/api/scan-edited-photos", (req, res) => {
    try {
      const { sourceFolders } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      const matchedFiles: { name: string, path: string }[] = [];

      const processDir = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
          } else {
            if (/^IMG_E\d{4}/i.test(item)) {
              matchedFiles.push({ name: item, path: fullPath });
            }
          }
        }
      };

      for (const name of folders) {
        processDir(path.join(BASE_DIR, name));
      }

      res.json({ count: matchedFiles.length, files: matchedFiles.map(f => f.name) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/move-edited-photos", (req, res) => {
    try {
      const { sourceFolders } = req.body;
      const folders = Array.isArray(sourceFolders) ? sourceFolders : [sourceFolders || "FolderA"];
      const editedDir = path.join(BASE_DIR, "Edited");
      if (!fs.existsSync(editedDir)) fs.mkdirSync(editedDir);

      let movedCount = 0;

      const processDir = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
          } else {
            if (/^IMG_E\d{4}/i.test(item)) {
              const ext = path.extname(item);
              const base = path.basename(item, ext);
              let finalPath = path.join(editedDir, item);
              let collisionCounter = 1;
              
              while (fs.existsSync(finalPath)) {
                finalPath = path.join(editedDir, `${base}_${collisionCounter}${ext}`);
                collisionCounter++;
              }

              fs.renameSync(fullPath, finalPath);
              movedCount++;
            }
          }
        }
      };

      for (const name of folders) {
        processDir(path.join(BASE_DIR, name));
      }

      res.json({ message: `成功将 ${movedCount} 个编辑过的照片移动到 Edited 目录`, count: movedCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get current status/file tree and stats
  app.get("/api/list-dirs", (req, res) => {
    try {
      ensureWorkspace();
      const items = fs.readdirSync(BASE_DIR);
      const dirs = items.filter(item => {
        try {
          return fs.statSync(path.join(BASE_DIR, item)).isDirectory();
        } catch {
          return false;
        }
      });
      res.json({ dirs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/status", (req, res) => {
    try {
      ensureWorkspace();
      
      const stats = {
        images: 0,
        videos: 0,
        others: 0,
        totalSize: 0
      };

      const imageExts = [".jpg", ".jpeg", ".png", ".heic", ".tiff", ".webp"];
      const videoExts = [".mp4", ".mov", ".avi", ".m4v"];

      const getTree = (dir: string): any => {
        const fileStats = fs.statSync(dir);
        const info: any = {
          name: path.basename(dir),
          path: path.relative(BASE_DIR, dir),
        };

        if (fileStats.isDirectory()) {
          info.type = "directory";
          info.children = fs.readdirSync(dir).map(child => getTree(path.join(dir, child)));
        } else {
          info.type = "file";
          const ext = path.extname(dir).toLowerCase();
          if (imageExts.includes(ext)) stats.images++;
          else if (videoExts.includes(ext)) stats.videos++;
          else stats.others++;
          stats.totalSize += fileStats.size;
        }
        return info;
      };

      const tree = fs.existsSync(BASE_DIR) ? getTree(BASE_DIR) : null;
      res.json({ tree, stats, currentPath: BASE_DIR });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(_dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(_dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
