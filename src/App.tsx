import React, { useState, useEffect } from 'react';
import { 
  FolderSync, 
  Video, 
  Trash2, 
  Type, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Apple,
  FileOutput,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const APPLE_EXTENSIONS = [
  { label: 'HEIC (照片)', value: '.heic' },
  { label: 'HEIF (照片)', value: '.heif' },
  { label: 'MOV (视频)', value: '.mov' },
  { label: 'MP4 (视频)', value: '.mp4' },
  { label: 'M4V (视频)', value: '.m4v' },
  { label: 'QT (视频)', value: '.qt' },
  { label: 'JPG (照片)', value: '.jpg' },
  { label: 'JPEG (照片)', value: '.jpeg' },
  { label: 'PNG (照片)', value: '.png' },
  { label: 'GIF (动图)', value: '.gif' },
  { label: 'TIFF (照片)', value: '.tiff' },
  { label: 'M4A (音频)', value: '.m4a' },
  { label: 'MP3 (音频)', value: '.mp3' },
  { label: 'WAV (音频)', value: '.wav' },
  { label: 'AIFF (音频)', value: '.aiff' },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [availableDirs, setAvailableDirs] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [newPathInput, setNewPathInput] = useState<string>('');
  const [dedupFolder, setDedupFolder] = useState<string>('FolderA');
  const [retentionFolder, setRetentionFolder] = useState<string>('FolderB');
  const [videoOutputName, setVideoOutputName] = useState<string>('Video');
  const [consolidateOutputName, setConsolidateOutputName] = useState<string>('AllInOne');
  const [videoSourceFolder, setVideoSourceFolder] = useState<string>('FolderA');
  const [renameSourceFolder, setRenameSourceFolder] = useState<string>('FolderA');
  const [renameRuleA, setRenameRuleA] = useState<'none' | 'year_month' | 'year_month_day' | 'sequence' | 'custom'>('year_month_day');
  const [renameRuleB, setRenameRuleB] = useState<'none' | 'sequence' | 'custom'>('sequence');
  const [renameSeparator, setRenameSeparator] = useState<string>('_');
  const [renameStartNumber, setRenameStartNumber] = useState<number>(1);
  const [renamePadding, setRenamePadding] = useState<number>(3);
  const [extractExtensions, setExtractExtensions] = useState<string>('.mp4, .mov, .avi, .m4v');
  const [renameCustomTextA, setRenameCustomTextA] = useState<string>('');
  const [renameCustomTextB, setRenameCustomTextB] = useState<string>('Prefix');
  const [renameSortOrder, setRenameSortOrder] = useState<'name' | 'date'>('name');
  const [dedupMethod, setDedupMethod] = useState<'name' | 'hash'>('name');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [showDedupConfig, setShowDedupConfig] = useState(false);
  const [pickerTask, setPickerTask] = useState<'rename' | 'consolidate' | 'extract-videos' | 'cleanup-aae' | 'extract-edited' | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState<{ 
    show: boolean; 
    count?: number; 
    folderCount?: number;
    fileCount?: number;
    endpoint: string; 
    name: string;
    type: 'dedupe' | 'rename' | 'video-config' | 'consolidate-config' | 'extract-edited';
    sourceFolders?: string[];
    files?: string[];
  } | null>(null);

  const [resultModal, setResultModal] = useState<{
    name: string;
    count: number;
    files: string[];
  } | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data.tree);
      setStats(data.stats);
      setCurrentPath(data.currentPath);
      setNewPathInput(data.currentPath);

      // Fetch available directories for dropdowns
      const dirsRes = await fetch('/api/list-dirs');
      const dirsData = await dirsRes.json();
      setAvailableDirs(dirsData.dirs || []);
    } catch (err) {
      addLog('Failed to fetch status');
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (confirmModal?.show && confirmModal.endpoint === 'rename-only' && confirmModal.sourceFolders) {
      const scan = async () => {
        try {
          const res = await fetch('/api/rename-scan', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              sourceFolders: confirmModal.sourceFolders,
              ruleA: renameRuleA,
              ruleB: renameRuleB
            })
          });
          const data = await res.json();
          if (res.ok) {
            setConfirmModal(prev => prev ? { ...prev, folderCount: data.folderCount, fileCount: data.fileCount } : null);
          }
        } catch (e) {}
      };
      scan();
    }
  }, [renameRuleA, renameRuleB]);

  const updatePath = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/update-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: newPathInput })
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`Path updated to: ${data.currentPath}`);
        await fetchStatus();
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Failed to update path: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = async (task: any) => {
    // Refresh directory list whenever a task is clicked to ensure latest data
    await fetchStatus();
    
    if (task.id === 'deduplicate') {
      setShowDedupConfig(true);
    } else if (task.id === 'extract-videos') {
      setPickerTask('extract-videos');
      setShowFolderPicker(true);
    } else if (task.id === 'cleanup-aae') {
      setPickerTask('cleanup-aae');
      setShowFolderPicker(true);
    } else if (task.id === 'rename-only') {
      setPickerTask('rename');
      setShowFolderPicker(true);
    } else if (task.id === 'consolidate-only') {
      setPickerTask('consolidate');
      setShowFolderPicker(true);
    } else if (task.id === 'extract-edited') {
      setPickerTask('extract-edited');
      setShowFolderPicker(true);
    } else {
      runTask(task.id, task.name);
    }
  };

  const startDedupScan = async () => {
    setShowDedupConfig(false);
    setLoading(true);
    try {
      const res = await fetch('/api/deduplicate-scan', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderA: dedupFolder, folderB: retentionFolder, method: dedupMethod })
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmModal({ show: true, count: data.count, endpoint: 'deduplicate', name: '去重整理', type: 'dedupe' });
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = async (folderNames: string[]) => {
    if (pickerTask === 'rename') {
      startRenameScan(folderNames);
    } else if (pickerTask === 'consolidate') {
      startConsolidateScan(folderNames);
    } else if (pickerTask === 'extract-videos') {
      setConfirmModal({
        show: true,
        endpoint: 'extract-videos',
        name: '提取特定格式',
        type: 'video-config',
        sourceFolders: folderNames
      } as any);
    } else if (pickerTask === 'cleanup-aae') {
      runTask('cleanup-aae', '清理 AAE 文件', folderNames);
    } else if (pickerTask === 'extract-edited') {
      startExtractEditedScan(folderNames);
    }
    setShowFolderPicker(false);
    setSelectedFolders(new Set());
  };

  const startRenameScan = async (folderNames: string[]) => {
    setRenameSourceFolder(folderNames.join(', '));
    setLoading(true);
    try {
      const res = await fetch('/api/rename-scan', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceFolders: folderNames,
          ruleA: renameRuleA,
          ruleB: renameRuleB
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.folderCount === 0) {
          addLog(`所选目录中未发现符合条件的子目录或文件。`);
        } else {
          setConfirmModal({ 
            show: true, 
            folderCount: data.folderCount, 
            fileCount: data.fileCount, 
            endpoint: 'rename-only', 
            name: '4. 批量改名',
            type: 'rename',
            sourceFolders: folderNames
          });
        }
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startExtractEditedScan = async (folderNames: string[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan-edited-photos', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFolders: folderNames })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.count === 0) {
          addLog(`所选目录中未发现符合规则 (IMG_E*) 的照片。`);
        } else {
          setConfirmModal({ 
            show: true, 
            fileCount: data.count, 
            files: data.files,
            endpoint: 'move-edited-photos', 
            name: '子项去除',
            type: 'extract-edited',
            sourceFolders: folderNames
          });
        }
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startConsolidateScan = async (folderNames: string[]) => {
    setRenameSourceFolder(folderNames.join(', '));
    setLoading(true);
    try {
      const res = await fetch('/api/rename-scan', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceFolders: folderNames })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.folderCount === 0) {
          addLog(`所选目录中未发现符合命名规则 (YYYYMM_*) 的子目录。`);
        } else {
          setConfirmModal({ 
            show: true, 
            folderCount: data.folderCount, 
            fileCount: data.fileCount, 
            endpoint: 'consolidate-only', 
            name: '5. 整合到All in one',
            type: 'consolidate-config',
            sourceFolders: folderNames
          });
        }
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runTask = async (endpoint: string, name: string, directSourceFolders?: string[]) => {
    setLoading(true);
    addLog(`Starting task: ${name}...`);
    try {
      const body: any = {};
      if (endpoint === 'deduplicate') {
        body.folderA = dedupFolder;
        body.folderB = retentionFolder;
        body.method = dedupMethod;
      } else if (endpoint === 'extract-videos') {
        body.sourceFolders = confirmModal?.sourceFolders || directSourceFolders;
        body.outputName = videoOutputName;
        body.extensions = extractExtensions;
      } else if (endpoint === 'rename-only' || endpoint === 'consolidate-only') {
        body.sourceFolders = confirmModal?.sourceFolders || directSourceFolders;
        if (endpoint === 'rename-only') {
          body.ruleA = renameRuleA;
          body.ruleB = renameRuleB;
          body.separator = renameSeparator;
          body.startNumber = renameStartNumber;
          body.padding = renamePadding;
          body.customTextA = renameCustomTextA;
          body.customTextB = renameCustomTextB;
          body.sortOrder = renameSortOrder;
        } else if (endpoint === 'consolidate-only') {
          body.outputName = consolidateOutputName;
        }
      } else if (endpoint === 'cleanup-aae' || endpoint === 'move-edited-photos') {
        body.sourceFolders = directSourceFolders || confirmModal?.sourceFolders;
      } else {
        body.sourceFolder = dedupFolder;
      }
      const res = await fetch(`/api/${endpoint}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`Success: ${data.message}`);
        if (endpoint === 'setup-test') {
          setCompletedTasks(new Set());
        } else {
          setCompletedTasks(prev => new Set(prev).add(endpoint));
        }
        if (endpoint === 'deduplicate' || endpoint === 'cleanup-aae') {
          setResultModal({
            name: name,
            count: data.count || 0,
            files: data.files || []
          });
        }
        await fetchStatus();
      } else {
        addLog(`Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`Failed to execute ${name}: ${err.message}`);
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const FileTree = ({ node, depth = 0 }: { node: FileNode; depth?: number; key?: any }) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="select-none">
        <div 
          className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors ${darkMode ? 'hover:bg-white/5' : 'hover:bg-blue-50'} ${depth === 0 ? 'font-bold text-emerald-400' : darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
          onClick={() => node.type === 'directory' && toggleExpand(node.path)}
        >
          {node.type === 'directory' ? (
            <>
              {isExpanded ? <ChevronDown size={16} className="mr-1" /> : <ChevronRight size={16} className="mr-1" />}
              <FolderOpen size={18} className="mr-2 text-amber-400" />
            </>
          ) : (
            <File size={18} className="mr-2 ml-4 text-zinc-500" />
          )}
          <span className="text-base truncate">{node.name || 'Root'}</span>
        </div>
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {node.children!.map((child, i) => (
                <FileTree key={i} node={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const tasks = [
    { id: 'deduplicate', name: '1. 去重整理', icon: FolderSync, desc: `对比“去重目录”和“保留目录”，删除前者中已存在于后者的文件`, color: 'text-blue-400' },
    { id: 'cleanup-aae', name: '2. 清理AAE', icon: Trash2, desc: '删除所有无用的.AAE修改记录文件', color: 'text-red-400' },
    { id: 'extract-videos', name: '3. 提取特定格式', icon: FileOutput, desc: '将指定后缀的文件移动到指定文件夹，打平目录结构', color: 'text-purple-400' },
    { id: 'rename-only', name: '4. 批量改名', icon: Type, desc: '按年月前缀+序号重命名符合条件的文件夹内的文件', color: 'text-emerald-400' },
    { id: 'consolidate-only', name: '5. 整合到All in one', icon: FolderSync, desc: '将子文件夹下的所有内容整合成一个All in one文件夹', color: 'text-orange-400' },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0a0a0a] text-zinc-100' : 'bg-white text-zinc-900'} font-sans selection:bg-emerald-500/30 transition-colors duration-300 text-base`}>
      {/* Folder Picker Modal */}
      <AnimatePresence>
        {showFolderPicker && (
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFolderPicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-blue-200 shadow-xl'} border rounded-2xl p-8 transition-colors duration-300`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                    <FolderOpen size={24} />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>选择源文件夹</h3>
                    <p className="text-zinc-400 text-base mt-1">请选择要处理的文件夹（支持多选）</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const dirs = status?.children?.filter((c: any) => c.type === 'directory').map((d: any) => d.name) || [];
                    if (selectedFolders.size === dirs.length && dirs.length > 0) {
                      setSelectedFolders(new Set());
                    } else {
                      setSelectedFolders(new Set(dirs));
                    }
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors border ${darkMode ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-blue-50 hover:bg-blue-100 border-blue-100 text-zinc-600'}`}
                >
                  {status?.children?.filter((c: any) => c.type === 'directory').length > 0 && selectedFolders.size === status?.children?.filter((c: any) => c.type === 'directory').length ? '取消全选' : '全选'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar mb-8">
                {status?.children?.filter((c: any) => c.type === 'directory').map((dir: any) => {
                  const isSelected = selectedFolders.has(dir.name);
                  return (
                    <button
                      key={dir.path}
                      onClick={() => {
                        const next = new Set(selectedFolders);
                        if (next.has(dir.name)) next.delete(dir.name);
                        else next.add(dir.name);
                        setSelectedFolders(next);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all group text-left ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500/50' 
                          : darkMode ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-blue-50/10 border-blue-100 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : darkMode ? 'border-white/20' : 'border-blue-200'
                      }`}>
                        {isSelected && <CheckCircle2 size={12} className="text-black" />}
                      </div>
                      <FolderOpen size={18} className={`${isSelected ? 'text-emerald-400' : 'text-amber-400'} transition-colors`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : darkMode ? 'text-zinc-200' : 'text-zinc-700'}`}>{dir.name}</span>
                    </button>
                  );
                })}
                {(!status?.children || status.children.filter((c: any) => c.type === 'directory').length === 0) && (
                  <div className="text-center py-8 text-zinc-500 text-sm italic">未发现可用目录</div>
                )}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowFolderPicker(false);
                    setSelectedFolders(new Set());
                  }}
                  className={`flex-1 py-3 rounded-xl transition-colors text-sm font-medium ${darkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-blue-50 hover:bg-blue-100 text-zinc-600'}`}
                >
                  取消
                </button>
                <button 
                  disabled={selectedFolders.size === 0}
                  onClick={() => handleFolderSelect(Array.from(selectedFolders))}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black transition-colors text-sm font-bold"
                >
                  确认选择 ({selectedFolders.size})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedup Config Modal */}
      <AnimatePresence>
        {showDedupConfig && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDedupConfig(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-blue-200 shadow-xl'} border rounded-2xl p-8 transition-colors duration-300`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <FolderSync size={24} />
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>去重整理设置</h3>
                  <p className="text-zinc-400 text-sm mt-1">请选择根目录下的子文件夹</p>
                </div>
              </div>

              <div className="space-y-5 mb-8">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase font-semibold ml-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    去重目录 (A)
                  </label>
                  <div className="relative">
                    <select 
                      value={dedupFolder}
                      onChange={(e) => setDedupFolder(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-black/40 border-white/10 text-zinc-300' : 'bg-white border-blue-100 text-zinc-700'} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer`}
                    >
                      <option value="">请选择文件夹...</option>
                      {availableDirs.map(dir => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 ml-1">系统将扫描此目录，并删除在 B 目录中已存在的文件</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-500 uppercase font-semibold ml-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    保留目录 (B)
                  </label>
                  <div className="relative">
                    <select 
                      value={retentionFolder}
                      onChange={(e) => setRetentionFolder(e.target.value)}
                      className={`w-full ${darkMode ? 'bg-black/40 border-white/10 text-zinc-300' : 'bg-white border-blue-100 text-zinc-700'} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer`}
                    >
                      <option value="">请选择文件夹...</option>
                      {availableDirs.map(dir => (
                        <option key={dir} value={dir}>{dir}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 ml-1">此目录作为“标准库”，文件将保持完整</p>
                </div>

                <div className={`space-y-2 pt-2 border-t ${darkMode ? 'border-white/5' : 'border-blue-100'}`}>
                  <label className="text-xs text-zinc-500 uppercase font-semibold ml-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    比对方式
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDedupMethod('name')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors border ${
                        dedupMethod === 'name' 
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                          : darkMode ? 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5' : 'bg-white border-blue-100 text-zinc-500 hover:bg-blue-50/50'
                      }`}
                    >
                      文件名称比对
                    </button>
                    <button
                      onClick={() => setDedupMethod('hash')}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors border ${
                        dedupMethod === 'hash' 
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                          : darkMode ? 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5' : 'bg-white border-blue-100 text-zinc-500 hover:bg-blue-50/50'
                      }`}
                    >
                      文件内容比对 (SHA-256)
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic mt-2 ml-1">
                    {dedupMethod === 'name' 
                      ? '仅比对文件名，速度极快。' 
                      : '读取文件实际内容生成哈希值进行比对，能找出名称不同但内容完全一样的图片，速度较慢。'}
                  </p>
                </div>

                <button 
                  onClick={fetchStatus}
                  className="w-full py-2 text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2 transition-colors border border-dashed border-white/10 rounded-lg"
                >
                  <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                  找不到文件夹？点击刷新列表
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDedupConfig(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  disabled={!dedupFolder || !retentionFolder || loading}
                  onClick={startDedupScan}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white transition-colors font-semibold"
                >
                  开始扫描
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-md ${darkMode ? 'bg-zinc-900 border-white/10 shadow-black' : 'bg-white border-blue-200 shadow-xl'} border rounded-2xl p-8 shadow-2xl transition-colors duration-300`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${confirmModal.type === 'dedupe' ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {confirmModal.type === 'dedupe' ? <AlertCircle size={24} /> : <Type size={24} />}
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>
                    {confirmModal.type === 'rename' ? '如何执行批量改名？' : `确认执行${confirmModal.name}？`}
                  </h3>
                  <p className="text-zinc-400 text-sm mt-1">
                    {confirmModal.type === 'dedupe' ? '此操作将从去重目录中删除重复文件。' : 
                     confirmModal.type === 'rename' ? '此操作将按照您设定的规则修改照片名称。' :
                     confirmModal.endpoint === 'extract-videos' ? '此操作将提取指定后缀的文件移动到输出文件夹中' :
                     '此操作将重命名并移动符合年月格式的文件夹。'}
                  </p>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-xl p-4 mb-8 border border-white/5 space-y-3">
                {confirmModal.type === 'dedupe' ? (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">发现重复项数量</span>
                    <span className="text-2xl font-mono text-amber-400">{confirmModal.count}</span>
                  </div>
                ) : confirmModal.type === 'rename' ? (
                  <>
                    <div className="flex justify-between items-start pb-2 border-b border-white/5">
                      <span className="text-zinc-500 text-sm">源目录</span>
                      <div className="text-right max-w-[200px]">
                        {confirmModal.sourceFolders ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            {confirmModal.sourceFolders.map((f: string, i: number) => (
                              <span key={i} className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {f}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-emerald-400">{renameSourceFolder}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-base">符合条件的子文件夹</span>
                      <span className="text-2xl font-mono text-emerald-400">{confirmModal.folderCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-base">预计处理文件总数</span>
                      <span className="text-2xl font-mono text-emerald-400">{confirmModal.fileCount}</span>
                    </div>
                    {confirmModal.endpoint === 'rename-only' && (
                      <div className={`pt-4 border-t ${darkMode ? 'border-white/5' : 'border-blue-100'} space-y-4`}>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-2">
                            <label className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-1 block">规则 A</label>
                            <select 
                              value={renameRuleA} 
                              onChange={(e) => setRenameRuleA(e.target.value as any)}
                              className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white border-blue-100'} border rounded-lg px-3 py-2 text-base focus:outline-none focus:border-emerald-500 transition-colors text-zinc-300`}
                            >
                              <option value="none">无</option>
                              <option value="year_month">年月 (如: 202310)</option>
                              <option value="year_month_day">年月日 (读取照片信息)</option>
                              <option value="sequence">序号 (如: 001)</option>
                              <option value="custom">自定义文本</option>
                            </select>
                            {renameRuleA === 'custom' && (
                              <input 
                                type="text" 
                                value={renameCustomTextA}
                                onChange={(e) => setRenameCustomTextA(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors mt-2"
                                placeholder="输入自定义文本"
                              />
                            )}
                          </div>

                          <div className="w-16 space-y-2">
                            <label className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-1 block text-center">连接符</label>
                            <select 
                              value={renameSeparator} 
                              onChange={(e) => setRenameSeparator(e.target.value)}
                              className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white border-blue-100'} border rounded-lg px-2 py-2 text-base focus:outline-none focus:border-emerald-500 transition-colors text-zinc-300 text-center`}
                            >
                              <option value="_">_</option>
                              <option value="-">-</option>
                              <option value=" ">空格</option>
                              <option value=".">.</option>
                              <option value="">无</option>
                            </select>
                          </div>

                          <div className="flex-1 space-y-2">
                            <label className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-1 block">规则 B</label>
                            <select 
                              value={renameRuleB} 
                              onChange={(e) => setRenameRuleB(e.target.value as any)}
                              className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white border-blue-100'} border rounded-lg px-3 py-2 text-base focus:outline-none focus:border-emerald-500 transition-colors text-zinc-300`}
                            >
                              <option value="none">无</option>
                              <option value="sequence">序号 (如: 001)</option>
                              <option value="custom">自定义文本</option>
                            </select>
                            {renameRuleB === 'custom' && (
                              <input 
                                type="text" 
                                value={renameCustomTextB}
                                onChange={(e) => setRenameCustomTextB(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors mt-2"
                                placeholder="输入自定义文本"
                              />
                            )}
                          </div>
                        </div>

                        {(renameRuleA === 'sequence' || renameRuleB === 'sequence') && (
                          <div className={`grid grid-cols-2 gap-3 pt-2 border-t ${darkMode ? 'border-white/5' : 'border-blue-100'}`}>
                            <div className="space-y-1">
                              <label className="text-sm text-zinc-500 font-bold uppercase">起始编号</label>
                              <input 
                                type="number" 
                                value={renameStartNumber}
                                onChange={(e) => setRenameStartNumber(parseInt(e.target.value) || 0)}
                                className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white border-blue-100'} border rounded-lg px-3 py-1.5 text-base focus:outline-none focus:border-emerald-500`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm text-zinc-500 font-bold uppercase">编号位数</label>
                              <select 
                                value={renamePadding}
                                onChange={(e) => setRenamePadding(parseInt(e.target.value))}
                                className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-white border-blue-100'} border rounded-lg px-3 py-1.5 text-base focus:outline-none focus:border-emerald-500`}
                              >
                                <option value={2}>2位 (01)</option>
                                <option value={3}>3位 (001)</option>
                                <option value={4}>4位 (0001)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div className={`bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3`}>
                          <label className="text-sm text-emerald-500/70 font-bold uppercase tracking-wider mb-1 block">最终名字样本参考</label>
                          <div className="font-mono text-emerald-400 text-base">
                            {(() => {
                              const getPart = (rule: string, customText: string) => {
                                if (rule === 'year_month') return '202310';
                                if (rule === 'year_month_day') return '20231025';
                                if (rule === 'sequence') return String(renameStartNumber).padStart(renamePadding, '0');
                                if (rule === 'custom') return customText || '自定义';
                                return '';
                              };
                              const partA = getPart(renameRuleA, renameCustomTextA);
                              const partB = getPart(renameRuleB, renameCustomTextB);
                              
                              const parts = [];
                              if (partA) parts.push(partA);
                              if (partB) parts.push(partB);
                              
                              return parts.length > 0 ? `${parts.join(renameSeparator)}.jpg` : '未命名.jpg';
                            })()}
                          </div>
                        </div>

                        {((renameRuleA === 'year_month' && renameRuleB === 'none') || (renameRuleA === 'none' && renameRuleB === 'year_month')) && (
                          <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                            不可以只选年月，请配合自定义文本使用。
                          </p>
                        )}
                        {(renameRuleA === 'none' && renameRuleB === 'none') && (
                          <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                            请至少选择一个规则。
                          </p>
                        )}

                        <div className={`space-y-2 pt-2 border-t ${darkMode ? 'border-white/5' : 'border-blue-100'}`}>
                          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">排序方式</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRenameSortOrder('name')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors border ${
                                renameSortOrder === 'name' 
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                  : darkMode ? 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5' : 'bg-white border-blue-100 text-zinc-500 hover:bg-blue-50/50'
                              }`}
                            >
                              名称顺序
                            </button>
                            <button
                              onClick={() => setRenameSortOrder('date')}
                              className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors border ${
                                renameSortOrder === 'date' 
                                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                                  : darkMode ? 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5' : 'bg-white border-blue-100 text-zinc-500 hover:bg-blue-50/50'
                              }`}
                            >
                              拍摄日期顺序
                            </button>
                          </div>
                          <p className="text-[10px] text-zinc-500 italic mt-2">
                            {renameSortOrder === 'name' 
                              ? '按照文件原名称的字母顺序进行排序和编号。' 
                              : '按照文件的修改时间（通常为拍摄时间）进行排序和编号。'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : confirmModal.type === 'video-config' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b border-white/5">
                      <span className="text-zinc-500 text-sm">源目录</span>
                      <div className="text-right max-w-[200px]">
                        <div className="flex flex-wrap justify-end gap-1">
                          {confirmModal.sourceFolders?.map((f: string, i: number) => (
                            <span key={i} className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">输出文件夹名称</label>
                      <input 
                        type="text" 
                        value={videoOutputName}
                        onChange={(e) => setVideoOutputName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="例如: Extracted"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">提取后缀格式</label>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {APPLE_EXTENSIONS.map((ext) => {
                          const isSelected = extractExtensions.split(',').map(e => e.trim().toLowerCase()).includes(ext.value);
                          return (
                            <button
                              key={ext.value}
                              onClick={() => {
                                const current = extractExtensions.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
                                let next;
                                if (isSelected) {
                                  next = current.filter(e => e !== ext.value);
                                } else {
                                  next = [...current, ext.value];
                                }
                                setExtractExtensions(next.join(', '));
                              }}
                              className={`text-[10px] px-2 py-1.5 rounded border transition-all text-left flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' 
                                  : 'bg-black/20 border-white/5 text-zinc-500 hover:border-white/20'
                              }`}
                            >
                              <span>{ext.label}</span>
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => setExtractExtensions(APPLE_EXTENSIONS.map(e => e.value).join(', '))}
                          className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          全选
                        </button>
                        <button 
                          onClick={() => setExtractExtensions('')}
                          className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                          清空
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={extractExtensions}
                        onChange={(e) => setExtractExtensions(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors mt-2"
                        placeholder="手动输入后缀 (如: .mp4, .jpg)"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 italic">指定格式的文件将从选中的文件夹中提取并移动到根目录下的此文件夹中。</p>
                  </div>
                ) : confirmModal.type === 'consolidate-config' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b border-white/5">
                      <span className="text-zinc-500 text-sm">源目录</span>
                      <div className="text-right max-w-[200px]">
                        <div className="flex flex-wrap justify-end gap-1">
                          {confirmModal.sourceFolders?.map((f: string, i: number) => (
                            <span key={i} className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-sm">符合条件的子文件夹</span>
                      <span className="text-xl font-mono text-orange-400">{confirmModal.folderCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-sm">预计处理文件总数</span>
                      <span className="text-xl font-mono text-orange-400">{confirmModal.fileCount}</span>
                    </div>
                    <div className={`space-y-2 pt-4 border-t ${darkMode ? 'border-white/5' : 'border-blue-100'}`}>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">输出文件夹名称</label>
                      <input 
                        type="text" 
                        value={consolidateOutputName}
                        onChange={(e) => setConsolidateOutputName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="例如: AllInOne"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 italic">所有文件将被移动到根目录下的此文件夹中，并处理重名冲突。</p>
                  </div>
                ) : confirmModal.type === 'extract-edited' ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b border-white/5">
                      <span className="text-zinc-500 text-sm">源目录</span>
                      <div className="text-right max-w-[200px]">
                        <div className="flex flex-wrap justify-end gap-1">
                          {confirmModal.sourceFolders?.map((f: string, i: number) => (
                            <span key={i} className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-sm">发现符合条件的文件</span>
                      <span className="text-xl font-mono text-indigo-400">{confirmModal.fileCount}</span>
                    </div>
                    <div className="bg-black/40 rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar border border-white/5">
                      <ul className="text-xs text-zinc-400 space-y-1">
                        {confirmModal.files?.slice(0, 100).map((f: string, i: number) => (
                          <li key={i} className="truncate">{f}</li>
                        ))}
                        {(confirmModal.files?.length || 0) > 100 && (
                          <li className="text-indigo-500/70 italic pt-1">...以及其他 {(confirmModal.files?.length || 0) - 100} 个文件</li>
                        )}
                      </ul>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic">这些文件将被移动到根目录下的 Edited 文件夹中。</p>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors font-medium"
                >
                  取消
                </button>
                <button 
                  onClick={() => runTask(confirmModal.endpoint, confirmModal.name)}
                  disabled={confirmModal.type === 'rename' && (
                    (renameRuleA === 'none' && renameRuleB === 'none') ||
                    (renameRuleA === 'year_month' && renameRuleB === 'none') ||
                    (renameRuleA === 'none' && renameRuleB === 'year_month') ||
                    (renameRuleA === 'custom' && !renameCustomTextA.trim()) ||
                    (renameRuleB === 'custom' && !renameCustomTextB.trim())
                  )}
                  className={`flex-1 px-4 py-3 rounded-xl text-black transition-colors font-semibold ${
                    (confirmModal.type === 'rename' && (
                      (renameRuleA === 'none' && renameRuleB === 'none') ||
                      (renameRuleA === 'year_month' && renameRuleB === 'none') ||
                      (renameRuleA === 'none' && renameRuleB === 'year_month') ||
                      (renameRuleA === 'custom' && !renameCustomTextA.trim()) ||
                      (renameRuleB === 'custom' && !renameCustomTextB.trim())
                    )) ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed' :
                    confirmModal.type === 'dedupe' ? 'bg-amber-500 hover:bg-amber-400' : 
                    confirmModal.type === 'rename' ? 'bg-emerald-500 hover:bg-emerald-400' :
                    confirmModal.type === 'extract-edited' ? 'bg-indigo-500 hover:bg-indigo-400 text-white' :
                    'bg-purple-500 hover:bg-purple-400'
                  }`}
                >
                  确认执行
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <AnimatePresence>
        {resultModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResultModal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`relative w-full max-w-lg ${darkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-blue-200 shadow-xl'} border rounded-2xl p-8 shadow-2xl transition-colors duration-300`}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{resultModal.name} 已完成</h3>
                  <p className="text-zinc-500 text-base mt-1">
                    成功删除了 {resultModal.count} 个文件。
                  </p>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-black/40' : 'bg-zinc-50'} rounded-xl p-4 mb-8 border ${darkMode ? 'border-white/5' : 'border-blue-100'}`}>
                <div className="text-sm text-zinc-500 font-bold uppercase tracking-wider mb-3">删除文件列表</div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {resultModal.files.length > 0 ? (
                    resultModal.files.map((file, i) => (
                      <div key={i} className="text-base font-mono text-zinc-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                        {file}
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-500 italic text-base">无文件被删除</div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => setResultModal(null)}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-colors"
              >
                知道了
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`border-b ${darkMode ? 'border-white/5 bg-black/40' : 'border-blue-200 bg-white/95'} backdrop-blur-md sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${darkMode ? 'bg-white' : 'bg-zinc-900'} rounded-lg flex items-center justify-center shadow-lg ${darkMode ? 'shadow-white/10' : 'shadow-black/10'}`}>
              <Apple size={18} className={darkMode ? 'text-black' : 'text-white'} />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">iOS Photo Migration Classification System</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-white/5 text-zinc-400 hover:bg-white/10' : 'bg-black/5 text-zinc-600 hover:bg-black/10'}`}
              title={darkMode ? "切换到日间模式" : "切换到夜间模式"}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => runTask('setup-test', '初始化测试环境')}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${darkMode ? 'border-white/10 hover:bg-white/5 text-zinc-300' : 'border-black/10 hover:bg-black/5 text-zinc-700'}`}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              重置测试环境
            </button>
          </div>
        </div>
      </header>

      {/* Horizontal Workflow Cards */}
      <div className={`${darkMode ? 'bg-black/20 border-white/5' : 'bg-blue-50/30 border-blue-200'} border-b backdrop-blur-sm transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-5 gap-4">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex flex-col items-center gap-3 group/step">
                {/* Status Indicator */}
                <div className="relative w-full flex justify-center">
                  {index < tasks.length - 1 && (
                    <div className={`absolute left-1/2 w-[calc(100%+1rem)] top-1/2 -translate-y-1/2 h-[1px] transition-colors duration-500 ${
                      completedTasks.has(task.id) && completedTasks.has(tasks[index+1].id) 
                        ? 'bg-emerald-500/50' 
                        : darkMode ? 'bg-white/10' : 'bg-black/10'
                    }`} />
                  )}
                  <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 relative z-10 ${
                    completedTasks.has(task.id) 
                      ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' 
                      : darkMode ? 'border-white/20 bg-zinc-900' : 'border-black/20 bg-white'
                  }`}>
                    {completedTasks.has(task.id) && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"
                      />
                    )}
                  </div>
                </div>

                <button
                  disabled={loading}
                  onClick={() => handleTaskClick(task)}
                  className={`w-full flex-1 flex flex-col gap-2 p-3 rounded-xl border transition-all text-left min-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed group/card ${darkMode ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10' : 'border-blue-100 bg-blue-50/10 hover:bg-blue-50/20 hover:border-blue-200'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${darkMode ? 'bg-black/40' : 'bg-white/80'} ${task.color} group-hover/card:scale-110 transition-transform shadow-sm`}>
                      <task.icon size={14} />
                    </div>
                    <div className={`font-semibold text-sm transition-colors truncate ${darkMode ? 'text-zinc-200 group-hover/step:text-white' : 'text-zinc-900 group-hover/step:text-blue-600'}`}>{task.name}</div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs leading-tight line-clamp-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-800'}`}>{task.desc}</div>
                    
                    {task.id === 'deduplicate' && (
                      <div className="mt-1.5">
                        <div className={`text-xs italic ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          对比 A/B 目录并删除 A 中重复文件
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">点击执行</span>
                    <Play size={10} className="text-zinc-600 group-hover/card:text-emerald-400 transition-colors" />
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Path & Stats */}
        <div className="lg:col-span-4 space-y-6">
          {/* Path Selection */}
          <section className={`${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.05)]'} border rounded-2xl p-6 transition-colors duration-300`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-base font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-blue-600'}`}>工作目录设置</h2>
              <div className="group relative">
                <AlertCircle size={14} className="text-zinc-600 cursor-help" />
                <div className="absolute right-0 bottom-full mb-2 w-48 p-2 bg-zinc-800 border border-white/10 rounded-lg text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
                  请从 Windows 资源管理器复制文件夹路径并粘贴到下方。
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-500 uppercase font-bold ml-1">根目录 (Root Path)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={newPathInput}
                    onChange={(e) => setNewPathInput(e.target.value)}
                    placeholder="例如: D:\Photos\Export"
                    className={`w-full ${darkMode ? 'bg-black/40 border-white/10' : 'bg-blue-50/30 border-blue-100'} border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors pr-10`}
                  />
                  <FolderOpen size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                </div>
                <p className="text-[9px] text-zinc-600 ml-1 italic">提示：在文件夹地址栏右键“复制地址”</p>
              </div>

              <button 
                onClick={updatePath}
                disabled={loading || newPathInput === currentPath}
                className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-50 rounded-xl text-sm font-medium transition-all border border-emerald-500/20"
              >
                {loading ? '正在更新...' : '更新路径'}
              </button>
            </div>
          </section>

          {/* Stats Window */}
          <section className={`${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.05)]'} border rounded-2xl p-6 transition-colors duration-300`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-6 ${darkMode ? 'text-zinc-500' : 'text-blue-600'}`}>数据统计</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className={`${darkMode ? 'bg-black/40 border-white/5' : 'bg-blue-50/10 border-blue-100'} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <File size={14} className="text-blue-500" />
                  <span className="text-sm uppercase font-bold">图片数量</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{stats?.images || 0}</div>
              </div>
              <div className={`${darkMode ? 'bg-black/40 border-white/5' : 'bg-blue-50/10 border-blue-100'} border rounded-xl p-4`}>
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Video size={14} className="text-purple-500" />
                  <span className="text-sm uppercase font-bold">视频数量</span>
                </div>
                <div className={`text-2xl font-bold font-mono ${darkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{stats?.videos || 0}</div>
              </div>
              <div className={`col-span-2 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-blue-50/10 border-blue-100'} border rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <RefreshCw size={14} className="text-zinc-500" />
                    <span className="text-sm uppercase font-bold">总占用空间</span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${darkMode ? 'text-emerald-400' : 'text-blue-600'}`}>
                    {stats ? (stats.totalSize / (1024 * 1024)).toFixed(2) : 0} MB
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Extra Features */}
          <section className={`${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.05)]'} border rounded-2xl p-6 transition-colors duration-300`}>
            <div className="flex items-center gap-3 mb-6">
              <h2 className={`text-base font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-blue-600'}`}>额外功能</h2>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleTaskClick({ id: 'extract-edited', name: '子项去除' })}
                className={`w-full ${darkMode ? 'bg-black/40 hover:bg-white/5 border-white/5' : 'bg-blue-50/30 hover:bg-blue-50/50 border-blue-100'} border rounded-xl p-4 flex items-center justify-between group transition-all`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                    <File size={20} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold text-base transition-colors ${darkMode ? 'text-zinc-200 group-hover:text-indigo-400' : 'text-zinc-900 group-hover:text-indigo-600'}`}>子项去除</div>
                    <div className={`text-sm mt-0.5 font-medium ${darkMode ? 'text-zinc-500' : 'text-zinc-800'}`}>提取 IMG_E 开头的已编辑照片</div>
                  </div>
                </div>
                <ChevronRight size={18} className={`transition-colors ${darkMode ? 'text-zinc-600 group-hover:text-indigo-500' : 'text-zinc-400 group-hover:text-indigo-600'}`} />
              </button>
            </div>
          </section>

          {/* Logs */}
          <section className={`${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.05)]'} border rounded-2xl p-6 flex flex-col h-[300px] transition-colors duration-300`}>
            <h2 className={`text-base font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-zinc-500' : 'text-blue-600'}`}>操作日志</h2>
            <div className={`flex-1 overflow-y-auto font-mono text-sm space-y-2 pr-2 scrollbar-thin ${darkMode ? 'scrollbar-thumb-white/10' : 'scrollbar-thumb-blue-100'}`}>
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">等待操作...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="border-l-2 border-emerald-500/30 pl-3 py-1 font-medium text-zinc-400 break-words dark:text-zinc-400 text-zinc-800">
                    {log}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: File Explorer */}
        <div className="lg:col-span-8">
          <section className={`${darkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.05)]'} border rounded-2xl p-6 h-full min-h-[600px] flex flex-col transition-colors duration-300`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-base font-bold uppercase tracking-wider ${darkMode ? 'text-zinc-500' : 'text-blue-600'}`}>文件预览</h2>
              <button 
                onClick={fetchStatus}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400"
                title="刷新目录"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            
            <div className={`flex-1 ${darkMode ? 'bg-black/40 border-white/5' : 'bg-white border-blue-100'} rounded-xl border p-4 overflow-auto`}>
              {status ? (
                <FileTree node={status} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                  <FolderOpen size={48} strokeWidth={1} />
                  <p className="text-sm">尚未连接到有效目录</p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-white/[0.02] border-white/5' : 'bg-blue-50/10 border-blue-100'} border`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-zinc-500 uppercase font-bold">当前路径</div>
                  <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                </div>
                <div className={`text-sm font-bold font-mono text-blue-600 break-all ${darkMode ? 'bg-black/40 border-white/5 !text-emerald-400' : 'bg-blue-50/50 border-blue-200'} p-3 rounded-lg border`}>
                  {currentPath || '未设置'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
