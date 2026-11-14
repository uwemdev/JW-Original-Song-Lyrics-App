import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  FolderPlus,
  FileUp,
  FileDown,
  Layers,
} from 'lucide-react';

/**
 * Robust RFC 4180 compliant CSV parser
 * Handles quoted fields, multiline cells, escaped quotes (""), and varied line endings.
 */
function parseRFC4180CSV(text) {
  const result = [];
  let row = [''];
  let inQuotes = false;
  let i = 0;
  // Strip BOM if present
  const clean = text.replace(/^\uFEFF/, '');
  const len = clean.length;

  while (i < len) {
    const c = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        row[row.length - 1] += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      row[row.length - 1] += c;
      i++;
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ',') {
        row.push('');
        i++;
        continue;
      }
      if (c === '\r' && next === '\n') {
        result.push(row);
        row = [''];
        i += 2;
        continue;
      }
      if (c === '\n' || c === '\r') {
        result.push(row);
        row = [''];
        i++;
        continue;
      }
      row[row.length - 1] += c;
      i++;
    }
  }

  if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
    result.push(row);
  }

  return result;
}

/**
 * Escapes a field for CSV generation
 */
function escapeCSVField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function SongImportExportModal({
  isOpen,
  onClose,
  categories = [],
  existingSongs = [],
  onImportComplete,
}) {
  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'export' | 'templates'

  // ── Import State ──
  const [importFile, setImportFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [duplicateMode, setDuplicateMode] = useState('update'); // 'update' | 'skip' | 'add'
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);
  const [fallbackCategoryId, setFallbackCategoryId] = useState(categories[0]?.id || '');
  const [selectedRowIndexes, setSelectedRowIndexes] = useState(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null); // { current, total, statusText }
  const [importResults, setImportResults] = useState(null); // { created, updated, skipped, failed, errors }

  // ── Export State ──
  const [exportFormat, setExportFormat] = useState('csv'); // 'csv' | 'json'
  const [exportFilter, setExportFilter] = useState('all'); // 'all' | 'published' | 'draft'
  const [exportCategoryId, setExportCategoryId] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef(null);

  // ── Category map lookup ──
  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat.name.trim().toLowerCase(), cat);
      if (cat.slug) map.set(cat.slug.trim().toLowerCase(), cat);
    });
    return map;
  }, [categories]);

  // ── Existing songs lookup by title (case-insensitive) ──
  const existingSongsMap = useMemo(() => {
    const map = new Map();
    existingSongs.forEach((song) => {
      if (song.title) {
        map.set(song.title.trim().toLowerCase(), song);
      }
    });
    return map;
  }, [existingSongs]);

  if (!isOpen) return null;

  // ── File Selection & Parsing ──
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setParseError('');
    setImportResults(null);
    setImportProgress(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || '';
      setFileContent(text);
      parseFile(file.name, text);
    };
    reader.onerror = () => {
      setParseError('Failed to read file. Please verify file permissions.');
    };
    reader.readAsText(file);
  };

  const parseFile = (fileName, content) => {
    try {
      const lowerName = fileName.toLowerCase();
      let rows = [];

      if (lowerName.endsWith('.json')) {
        const jsonData = JSON.parse(content);
        if (!Array.isArray(jsonData)) {
          throw new Error('JSON file must contain an array of song objects.');
        }
        rows = jsonData.map((item) => normalizeSongObject(item));
      } else {
        // Parse CSV
        const rawTable = parseRFC4180CSV(content);
        if (rawTable.length < 2) {
          throw new Error('CSV file must contain a header row and at least one song record.');
        }
        const headers = rawTable[0].map((h) => h.trim().toLowerCase());
        const dataRows = rawTable.slice(1);

        rows = dataRows
          .filter((r) => r.some((cell) => cell.trim().length > 0))
          .map((r) => {
            const rowObj = {};
            headers.forEach((h, idx) => {
              rowObj[h] = r[idx] !== undefined ? r[idx].trim() : '';
            });
            return normalizeSongObject(rowObj);
          });
      }

      if (rows.length === 0) {
        throw new Error('No valid song records found in this file.');
      }

      // Check validation and matches
      const enrichedRows = rows.map((row, index) => {
        const rawCat = row.category || row.category_name || '';
        const matchedCat = rawCat ? categoryMap.get(rawCat.toLowerCase()) : null;
        const matchedExistingSong = row.title ? existingSongsMap.get(row.title.toLowerCase()) : null;

        const warnings = [];
        if (!row.title) warnings.push('Missing song title');
        if (!row.lyrics) warnings.push('Missing lyrics text');
        if (!matchedCat && rawCat) warnings.push(`Category "${rawCat}" is new`);
        if (!matchedCat && !rawCat) warnings.push('No category assigned');
        if (!row.mp3_url) warnings.push('No audio URL');

        return {
          ...row,
          rowIndex: index,
          rawCategory: rawCat,
          matchedCategory: matchedCat,
          existingSong: matchedExistingSong,
          isUpdate: Boolean(matchedExistingSong),
          isValid: Boolean(row.title && row.lyrics),
          warnings,
        };
      });

      setParsedRows(enrichedRows);
      // Select all valid rows by default
      const validIndexes = new Set(
        enrichedRows.filter((r) => r.isValid).map((r) => r.rowIndex)
      );
      setSelectedRowIndexes(validIndexes);
    } catch (err) {
      setParseError(err.message || 'Failed to parse file.');
      setParsedRows([]);
    }
  };

  const normalizeSongObject = (item) => {
    // Flexible key mapping
    const title = item.title || item.song_title || item.name || '';
    const lyrics = item.lyrics || item.text || item.words || item.content || '';
    const category = item.category || item.category_name || item.genre || '';
    const writeup = item.writeup || item.description || item.notes || item.scriptures || '';
    const mp3_url = item.mp3_url || item.audio_url || item.audio || item.mp3 || '';
    const feature_image_url = item.feature_image_url || item.image_url || item.image || item.cover || '';
    const sort_order = parseInt(item.sort_order || item.order || item.song_number || 0, 10) || 0;
    
    let is_published = true;
    if (item.is_published !== undefined && item.is_published !== null && item.is_published !== '') {
      const pubStr = String(item.is_published).toLowerCase().trim();
      is_published = pubStr === 'true' || pubStr === '1' || pubStr === 'yes';
    }

    return {
      title,
      lyrics,
      category,
      writeup,
      mp3_url,
      feature_image_url,
      sort_order,
      is_published,
    };
  };

  // ── Toggle Select Row ──
  const toggleRow = (index) => {
    const next = new Set(selectedRowIndexes);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedRowIndexes(next);
  };

  const toggleAllRows = () => {
    if (selectedRowIndexes.size === parsedRows.length) {
      setSelectedRowIndexes(new Set());
    } else {
      setSelectedRowIndexes(new Set(parsedRows.map((r) => r.rowIndex)));
    }
  };

  // ── Execute Bulk Import ──
  const handleExecuteImport = async () => {
    if (selectedRowIndexes.size === 0) return;
    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedRowIndexes.size, statusText: 'Preparing categories...' });
    setImportResults(null);

    const rowsToImport = parsedRows.filter((r) => selectedRowIndexes.has(r.rowIndex));
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const errors = [];

    try {
      // 1. Identify and auto-create missing categories if enabled
      const newCategoryNames = new Set();
      rowsToImport.forEach((r) => {
        if (!r.matchedCategory && r.rawCategory && r.rawCategory.trim()) {
          newCategoryNames.add(r.rawCategory.trim());
        }
      });

      const updatedCategoryMap = new Map(categoryMap);

      if (autoCreateCategories && newCategoryNames.size > 0) {
        setImportProgress({
          current: 0,
          total: rowsToImport.length,
          statusText: `Creating ${newCategoryNames.size} new categories...`,
        });

        for (const catName of newCategoryNames) {
          try {
            const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const { data: insertedCat, error: catErr } = await supabase
              .from('categories')
              .insert([{ name: catName, slug: slug || 'cat-' + Date.now(), sort_order: categories.length + 1 }])
              .select()
              .single();

            if (!catErr && insertedCat) {
              updatedCategoryMap.set(catName.toLowerCase(), insertedCat);
              if (insertedCat.slug) updatedCategoryMap.set(insertedCat.slug.toLowerCase(), insertedCat);
            }
          } catch (err) {
            console.warn('Failed to auto-create category:', catName, err);
          }
        }
      }

      // 2. Process Songs in batches
      for (let i = 0; i < rowsToImport.length; i++) {
        const item = rowsToImport[i];
        setImportProgress({
          current: i + 1,
          total: rowsToImport.length,
          statusText: `Processing "${item.title}" (${i + 1} of ${rowsToImport.length})...`,
        });

        // Determine category_id
        let targetCategoryId = null;
        if (item.rawCategory) {
          const matched = updatedCategoryMap.get(item.rawCategory.toLowerCase());
          if (matched) targetCategoryId = matched.id;
        }
        if (!targetCategoryId) {
          targetCategoryId = fallbackCategoryId || (categories[0] ? categories[0].id : null);
        }

        const songPayload = {
          title: item.title,
          lyrics: item.lyrics,
          writeup: item.writeup || '',
          mp3_url: item.mp3_url || '',
          feature_image_url: item.feature_image_url || '',
          sort_order: item.sort_order || 0,
          is_published: item.is_published !== false,
          category_id: targetCategoryId,
          updated_at: new Date().toISOString(),
        };

        const isExisting = Boolean(item.existingSong);

        if (isExisting && duplicateMode === 'skip') {
          skippedCount++;
          continue;
        }

        if (isExisting && duplicateMode === 'update') {
          const { error: updateErr } = await supabase
            .from('songs')
            .update(songPayload)
            .eq('id', item.existingSong.id);

          if (updateErr) {
            failedCount++;
            errors.push(`"${item.title}": ${updateErr.message}`);
          } else {
            updatedCount++;
          }
        } else {
          // Insert new (either no duplicate, or duplicateMode === 'add')
          const { error: insertErr } = await supabase
            .from('songs')
            .insert([songPayload]);

          if (insertErr) {
            failedCount++;
            errors.push(`"${item.title}": ${insertErr.message}`);
          } else {
            createdCount++;
          }
        }
      }

      setImportResults({
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors,
      });

      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      setImportResults({
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount || 1,
        errors: [...errors, err.message || 'Import process encountered an error.'],
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  // ── Execute Export ──
  const handleExport = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from('songs')
        .select('*, categories(name, slug)')
        .order('sort_order', { ascending: true })
        .order('title', { ascending: true });

      if (exportFilter === 'published') {
        query = query.eq('is_published', true);
      } else if (exportFilter === 'draft') {
        query = query.eq('is_published', false);
      }

      if (exportCategoryId !== 'all') {
        query = query.eq('category_id', exportCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const songsToExport = data || [];
      const timestamp = new Date().toISOString().split('T')[0];

      if (exportFormat === 'json') {
        const jsonContent = JSON.stringify(
          songsToExport.map((s) => ({
            title: s.title,
            category: s.categories?.name || '',
            lyrics: s.lyrics,
            writeup: s.writeup || '',
            mp3_url: s.mp3_url || '',
            feature_image_url: s.feature_image_url || '',
            sort_order: s.sort_order || 0,
            is_published: s.is_published,
            id: s.id,
            created_at: s.created_at,
          })),
          null,
          2
        );

        triggerDownload(jsonContent, `jw_songs_export_${timestamp}.json`, 'application/json');
      } else {
        // Export CSV
        const headers = [
          'title',
          'category',
          'lyrics',
          'writeup',
          'mp3_url',
          'feature_image_url',
          'sort_order',
          'is_published',
        ];

        const csvLines = [headers.join(',')];
        songsToExport.forEach((s) => {
          const row = [
            escapeCSVField(s.title),
            escapeCSVField(s.categories?.name || ''),
            escapeCSVField(s.lyrics || ''),
            escapeCSVField(s.writeup || ''),
            escapeCSVField(s.mp3_url || ''),
            escapeCSVField(s.feature_image_url || ''),
            escapeCSVField(s.sort_order || 0),
            escapeCSVField(s.is_published ? 'true' : 'false'),
          ];
          csvLines.push(row.join(','));
        });

        triggerDownload(csvLines.join('\r\n'), `jw_songs_export_${timestamp}.csv`, 'text/csv;charset=utf-8;');
      }
    } catch (err) {
      alert('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const triggerDownload = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Download Sample Templates ──
  const downloadSampleCSV = () => {
    const sampleHeaders = 'title,category,lyrics,writeup,mp3_url,feature_image_url,sort_order,is_published';
    const sampleRow1 = [
      escapeCSVField('The Best Life Ever'),
      escapeCSVField('Original Songs'),
      escapeCSVField(
        'Verse 1\nThere is no better way to spend our days\nThan walking in Jehovah\'s ways.\n\nChorus\nThis is the best life ever!\nWalking with our God together.'
      ),
      escapeCSVField('Based on Psalm 84:10. Song of gratitude and wholehearted service.'),
      escapeCSVField('https://example.com/audio/best-life-ever.mp3'),
      escapeCSVField('https://example.com/images/best-life.jpg'),
      '1',
      'true',
    ].join(',');

    const sampleRow2 = [
      escapeCSVField('Forgive One Another'),
      escapeCSVField('Family'),
      escapeCSVField(
        'Verse 1\nWhen harsh words are spoken\nAnd hearts may feel broken,\nRemember the patience\nThat God shows each day.'
      ),
      escapeCSVField('Based on Colossians 3:13. Cultivating a forgiving spirit in the family.'),
      escapeCSVField('https://example.com/audio/forgive-one-another.mp3'),
      escapeCSVField('https://example.com/images/forgive.jpg'),
      '2',
      'true',
    ].join(',');

    const csvData = [sampleHeaders, sampleRow1, sampleRow2].join('\r\n');
    triggerDownload(csvData, 'jw_songs_template.csv', 'text/csv;charset=utf-8;');
  };

  const downloadSampleJSON = () => {
    const sampleJSON = [
      {
        title: 'The Best Life Ever',
        category: 'Original Songs',
        lyrics: 'Verse 1\nThere is no better way to spend our days\nThan walking in Jehovah\'s ways.\n\nChorus\nThis is the best life ever!',
        writeup: 'Based on Psalm 84:10',
        mp3_url: 'https://example.com/audio/best-life-ever.mp3',
        feature_image_url: 'https://example.com/images/best-life.jpg',
        sort_order: 1,
        is_published: true,
      },
      {
        title: 'Forgive One Another',
        category: 'Family',
        lyrics: 'Verse 1\nWhen harsh words are spoken\nAnd hearts may feel broken,\nRemember the patience\nThat God shows each day.',
        writeup: 'Based on Colossians 3:13',
        mp3_url: 'https://example.com/audio/forgive-one-another.mp3',
        feature_image_url: 'https://example.com/images/forgive.jpg',
        sort_order: 2,
        is_published: true,
      },
    ];

    triggerDownload(JSON.stringify(sampleJSON, null, 2), 'jw_songs_template.json', 'application/json');
  };

  return (
    <div className="health-modal-backdrop" onClick={onClose}>
      <div
        className="health-modal-card"
        style={{ maxWidth: '920px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="health-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#fff', margin: 0 }}>
                Bulk Song Importer & Exporter
              </h2>
              <p style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0 0' }}>
                Batch import songs from CSV/JSON or backup your complete library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon-admin"
            title="Close modal"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 22px',
            background: '#09090b',
            borderBottom: '1px solid #27272a',
          }}
        >
          <button
            onClick={() => setActiveTab('import')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'import' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === 'import' ? '#c4b5fd' : '#71717a',
            }}
          >
            <FileUp size={14} />
            <span>Import Songs</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'export' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === 'export' ? '#c4b5fd' : '#71717a',
            }}
          >
            <FileDown size={14} />
            <span>Export Catalog</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'templates' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: activeTab === 'templates' ? '#c4b5fd' : '#71717a',
            }}
          >
            <HelpCircle size={14} />
            <span>Templates & Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="health-modal-body" style={{ padding: '20px 22px' }}>
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 1: IMPORT SONGS */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'import' && (
            <div>
              {/* File Upload Zone */}
              {!parsedRows.length && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #3f3f46',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8b5cf6')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#3f3f46')}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(139, 92, 246, 0.15)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a78bfa',
                      marginBottom: '12px',
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fff', margin: '0 0 6px 0' }}>
                    Select a CSV or JSON file to import
                  </h3>
                  <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 16px 0' }}>
                    Supports files exported from spreadsheets (Excel, Google Sheets) or raw JSON arrays
                  </p>
                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    <span className="btn-admin-secondary" style={{ fontSize: '12px', padding: '6px 14px' }}>
                      Browse Files
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSampleCSV();
                      }}
                      className="btn-admin-ghost"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      <Download size={13} />
                      <span>Download Sample CSV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Parse Error Alert */}
              {parseError && (
                <div className="admin-alert error" style={{ marginTop: '14px' }}>
                  <AlertCircle size={15} />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Preview Table & Configuration */}
              {parsedRows.length > 0 && (
                <div>
                  {/* File status bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#09090b',
                      borderRadius: '8px',
                      border: '1px solid #27272a',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileSpreadsheet size={16} color="#a78bfa" />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                        {importFile?.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#71717a' }}>
                        ({(importFile?.size ? importFile.size / 1024 : 0).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setParsedRows([]);
                        setImportFile(null);
                        setImportResults(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="btn-admin-ghost"
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Change File
                    </button>
                  </div>

                  {/* Summary Metric Pills */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '10px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        padding: '10px',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>
                        Detected Rows
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                        {parsedRows.length}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>
                        Selected
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#a78bfa' }}>
                        {selectedRowIndexes.size}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>
                        New Songs
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>
                        {parsedRows.filter((r) => !r.isUpdate).length}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px',
                        background: '#09090b',
                        border: '1px solid #27272a',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>
                        Existing (Updates)
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#eab308' }}>
                        {parsedRows.filter((r) => r.isUpdate).length}
                      </div>
                    </div>
                  </div>

                  {/* Options Card */}
                  <div
                    style={{
                      background: '#09090b',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      padding: '14px',
                      marginBottom: '16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {/* Duplicate handling */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                        Duplicate Song Handling:
                      </label>
                      <select
                        value={duplicateMode}
                        onChange={(e) => setDuplicateMode(e.target.value)}
                        className="admin-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        <option value="update">Update existing songs (matched by title)</option>
                        <option value="skip">Skip existing songs (leave untouched)</option>
                        <option value="add">Add as new copy anyway</option>
                      </select>
                    </div>

                    {/* Category handling */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                        Missing Categories:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <input
                          type="checkbox"
                          id="autoCatCheck"
                          checked={autoCreateCategories}
                          onChange={(e) => setAutoCreateCategories(e.target.checked)}
                          style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                        />
                        <label htmlFor="autoCatCheck" style={{ fontSize: '12px', color: '#a1a1aa', cursor: 'pointer' }}>
                          Auto-create missing categories
                        </label>
                      </div>
                    </div>

                    {/* Fallback category */}
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                        Fallback Category:
                      </label>
                      <select
                        value={fallbackCategoryId}
                        onChange={(e) => setFallbackCategoryId(e.target.value)}
                        className="admin-input"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview Table Header Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedRowIndexes.size === parsedRows.length && parsedRows.length > 0}
                        onChange={toggleAllRows}
                        style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
                        Select / Deselect All ({selectedRowIndexes.size} of {parsedRows.length})
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Preview Table */}
                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      border: '1px solid #27272a',
                      borderRadius: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#09090b', borderBottom: '1px solid #27272a', color: '#71717a' }}>
                          <th style={{ padding: '8px 10px', width: '32px' }}></th>
                          <th style={{ padding: '8px 10px' }}>Status</th>
                          <th style={{ padding: '8px 10px' }}>Title</th>
                          <th style={{ padding: '8px 10px' }}>Category</th>
                          <th style={{ padding: '8px 10px' }}>Audio URL</th>
                          <th style={{ padding: '8px 10px' }}>Lyrics Length</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((row) => {
                          const isSelected = selectedRowIndexes.has(row.rowIndex);
                          return (
                            <tr
                              key={row.rowIndex}
                              onClick={() => toggleRow(row.rowIndex)}
                              style={{
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                background: isSelected ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                                cursor: 'pointer',
                              }}
                            >
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRow(row.rowIndex)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                {row.isUpdate ? (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(234, 179, 8, 0.15)',
                                      color: '#facc15',
                                      fontWeight: '600',
                                    }}
                                  >
                                    UPDATE
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'rgba(34, 197, 94, 0.15)',
                                      color: '#4ade80',
                                      fontWeight: '600',
                                    }}
                                  >
                                    NEW
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#fff', fontWeight: '500' }}>
                                {row.title || <span style={{ color: '#ef4444' }}>(Missing Title)</span>}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#a1a1aa' }}>
                                {row.matchedCategory ? (
                                  <span style={{ color: '#c4b5fd' }}>{row.matchedCategory.name}</span>
                                ) : row.rawCategory ? (
                                  <span style={{ color: '#eab308' }}>
                                    {row.rawCategory} (Will create)
                                  </span>
                                ) : (
                                  <span style={{ color: '#71717a' }}>Fallback</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#71717a' }}>
                                {row.mp3_url ? (
                                  <span style={{ color: '#22c55e' }}>Yes</span>
                                ) : (
                                  <span style={{ color: '#71717a' }}>None</span>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#71717a' }}>
                                {row.lyrics ? `${row.lyrics.length} chars` : <span style={{ color: '#ef4444' }}>Empty</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Progress Indicator */}
                  {isImporting && importProgress && (
                    <div style={{ marginBottom: '14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: '#a1a1aa',
                          marginBottom: '6px',
                        }}
                      >
                        <span>{importProgress.statusText}</span>
                        <span>
                          {importProgress.current} / {importProgress.total}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#27272a', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
                            width: `${(importProgress.current / importProgress.total) * 100}%`,
                            transition: 'width 0.2s',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Results Banner */}
                  {importResults && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: importResults.failed > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                        border: importResults.failed > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(34, 197, 94, 0.25)',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {importResults.failed > 0 ? (
                          <AlertCircle size={16} color="#ef4444" />
                        ) : (
                          <CheckCircle2 size={16} color="#22c55e" />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>
                          Import Completed
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                        Created: <strong style={{ color: '#22c55e' }}>{importResults.created}</strong> | Updated:{' '}
                        <strong style={{ color: '#eab308' }}>{importResults.updated}</strong> | Skipped:{' '}
                        <strong style={{ color: '#71717a' }}>{importResults.skipped}</strong> | Failed:{' '}
                        <strong style={{ color: '#ef4444' }}>{importResults.failed}</strong>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedRows([]);
                        setImportFile(null);
                        setImportResults(null);
                      }}
                      className="btn-admin-secondary"
                      disabled={isImporting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteImport}
                      disabled={isImporting || selectedRowIndexes.size === 0}
                      className="btn-admin-primary"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={14} className="spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Import {selectedRowIndexes.size} Selected Songs</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 2: EXPORT SONGS */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'export' && (
            <div>
              <div
                style={{
                  padding: '16px',
                  background: '#09090b',
                  borderRadius: '12px',
                  border: '1px solid #27272a',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <FileDown size={20} color="#a78bfa" />
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fff', margin: 0 }}>
                      Export Song Catalog
                    </h3>
                    <p style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0 0' }}>
                      Download complete song lyrics, metadata, and audio links to your device
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    marginBottom: '18px',
                  }}
                >
                  {/* Format Selection */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                      Export Format:
                    </label>
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="admin-input"
                    >
                      <option value="csv">CSV (Excel, Google Sheets compatible)</option>
                      <option value="json">JSON (Full raw database backup)</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                      Publication Status:
                    </label>
                    <select
                      value={exportFilter}
                      onChange={(e) => setExportFilter(e.target.value)}
                      className="admin-input"
                    >
                      <option value="all">All Songs (Published & Drafts)</option>
                      <option value="published">Only Published Songs</option>
                      <option value="draft">Only Draft Songs</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#e4e4e7', display: 'block', marginBottom: '6px' }}>
                      Category:
                    </label>
                    <select
                      value={exportCategoryId}
                      onChange={(e) => setExportCategoryId(e.target.value)}
                      className="admin-input"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="btn-admin-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Generating Export...</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} />
                      <span>Download {exportFormat.toUpperCase()} Export</span>
                    </>
                  )}
                </button>
              </div>

              {/* Export Info Box */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '12px',
                  color: '#a1a1aa',
                  lineHeight: '18px',
                }}
              >
                <div style={{ fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                  Export Data Includes:
                </div>
                Title, Category Name, Multiline Lyrics, Writeup & Scripture notes, Audio streaming MP3 URLs, Feature Cover Image URLs, Sort Order numbers, and Published status flags.
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 3: TEMPLATES & GUIDE */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === 'templates' && (
            <div>
              <div
                style={{
                  padding: '16px',
                  background: '#09090b',
                  borderRadius: '12px',
                  border: '1px solid #27272a',
                  marginBottom: '16px',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#fff', margin: '0 0 6px 0' }}>
                  Download Starter Templates
                </h3>
                <p style={{ fontSize: '12px', color: '#71717a', margin: '0 0 14px 0' }}>
                  Use these ready-to-fill templates to prepare songs in your spreadsheet or code editor.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={downloadSampleCSV} className="btn-admin-secondary">
                    <Download size={14} color="#22c55e" />
                    <span>Download CSV Template (.csv)</span>
                  </button>
                  <button onClick={downloadSampleJSON} className="btn-admin-secondary">
                    <Download size={14} color="#8b5cf6" />
                    <span>Download JSON Template (.json)</span>
                  </button>
                </div>
              </div>

              {/* Supported Columns Guide Table */}
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', margin: '14px 0 8px 0' }}>
                Supported Column Headers:
              </h4>
              <div
                style={{
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#09090b', borderBottom: '1px solid #27272a', color: '#71717a' }}>
                      <th style={{ padding: '8px 12px', width: '140px' }}>Column Header</th>
                      <th style={{ padding: '8px 12px', width: '90px' }}>Required?</th>
                      <th style={{ padding: '8px 12px' }}>Description & Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>title</td>
                      <td style={{ padding: '8px 12px', color: '#ef4444' }}>Required</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Song title (e.g. "The Best Life Ever")</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>lyrics</td>
                      <td style={{ padding: '8px 12px', color: '#ef4444' }}>Required</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Full lyrics with verses, chorus, bridge. Multiline text is fully supported in quotes.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>category</td>
                      <td style={{ padding: '8px 12px', color: '#eab308' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Category name (e.g. "Original Songs", "Family"). If new, can be auto-created.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>writeup</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Scripture references, background note, or brief summary.</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>mp3_url</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Direct audio streaming URL (e.g. https://.../song.mp3)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>feature_image_url</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Public cover image URL (e.g. https://.../cover.jpg)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>sort_order</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>Integer ordering number (defaults to 0).</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: '600' }}>is_published</td>
                      <td style={{ padding: '8px 12px', color: '#71717a' }}>Optional</td>
                      <td style={{ padding: '8px 12px', color: '#d4d4d8' }}>true (published) or false (draft). Defaults to true.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
