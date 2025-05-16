/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { unstable_useId as useId } from '@mui/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import {
  useActiveWhiteboardInstance,
  WhiteboardDocumentExport,
} from '../../state';
import { ElementExport } from '../../state/export/whiteboardDocumentExport';
import { importWhiteboard } from '../../state/import';
import { useImageUpload } from '../ImageUpload';
import { infiniteCanvasMode } from '../Whiteboard';
import { readNWB, readPDF } from './fileHandlers';

export { positionImageElements } from './fileHandlers';

// Define the type for the import mode selection
type ImportMode = 'replace' | 'append';

// Define the processed data type
type ProcessedData = WhiteboardDocumentExport | null;

// Define steps for the import dialog
type ImportStep =
  | 'select'
  | 'process'
  | 'confirm'
  | 'importing'
  | 'success'
  | 'error';

// Update the import operation result type
type ImportOperationResult = {
  success: boolean;
  errors?: Map<string, Error>;
};

// Define props for the ImportDialog component
interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

// Component for file selection step
function FileSelection({
  onFileSelected,
}: {
  onFileSelected: (file: File) => void;
}) {
  const { t } = useTranslation('neoboard');
  const theme = useTheme();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/octet-stream': ['.nwb'],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <Box
      {...getRootProps()}
      sx={{
        border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
        borderRadius: 1,
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
        transition: 'all 0.2s',
      }}
    >
      <input {...getInputProps()} data-testid="import-file-picker" />
      <UploadFileIcon fontSize="large" color="primary" />
      <Typography variant="body1" mt={2}>
        {isDragActive
          ? t('importDialog.dragActive', 'Drop the file here...')
          : t(
              'importDialog.dragInactive',
              'Drag and drop a file here, or click to select a file',
            )}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={1}>
        {t('importDialog.supportedFormats', 'Supported formats: PDF, NWB')}
      </Typography>
    </Box>
  );
}

// Import confirmation component
function ImportConfirmation({
  fileName,
  importMode,
  onImportModeChange,
  onChangeFile,
}: {
  fileName: string;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  onChangeFile: () => void;
}) {
  const { t } = useTranslation('neoboard');

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>
          {t('importDialog.fileSelected', 'File Selected')}
        </AlertTitle>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2">
            {t('importDialog.selectedFile', 'You have selected: {{fileName}}', {
              fileName,
            })}
          </Typography>
          <Button
            size="small"
            color="primary"
            onClick={onChangeFile}
            sx={{ ml: 2, whiteSpace: 'nowrap' }}
          >
            {t('importDialog.changeFile', 'Change File')}
          </Button>
        </Box>
      </Alert>

      <Typography variant="subtitle1" gutterBottom>
        {t('importDialog.importOptions', 'Import Options')}
      </Typography>

      <FormControl component="fieldset">
        <RadioGroup
          value={importMode}
          onChange={(e) => onImportModeChange(e.target.value as ImportMode)}
        >
          <FormControlLabel
            value="replace"
            control={<Radio />}
            label={t('importDialog.replaceContent', 'Replace current content')}
          />
          <FormControlLabel
            value="append"
            control={<Radio />}
            label={t('importDialog.appendContent', 'Append to current content')}
          />
        </RadioGroup>
      </FormControl>
    </Box>
  );
}

// Success message component
function SuccessMessage({ fileName }: { fileName: string }) {
  const { t } = useTranslation('neoboard');

  return (
    <Box sx={{ textAlign: 'center', py: 3 }}>
      <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        {t('importDialog.importSuccess', 'Import Successful')}
      </Typography>
      <Typography variant="body1">
        {t(
          'importDialog.fileImported',
          'The file "{{fileName}}" has been successfully imported.',
          {
            fileName,
          },
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" mt={2}>
        {t(
          'importDialog.closeToView',
          'You can close this dialog to view your imported content.',
        )}
      </Typography>
    </Box>
  );
}

// Main import dialog component
export default function ImportDialog({ open, onClose }: ImportDialogProps) {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { handleDrop } = useImageUpload();

  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState<ImportStep>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData>(null);
  const [importMode, setImportMode] = useState<ImportMode>('replace');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep track of pending import operation
  const importOperationRef = useRef<Promise<ImportOperationResult> | null>(
    null,
  );
  const isMountedRef = useRef(true);

  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  // Reset dialog state when opened
  useEffect(() => {
    if (open) {
      setStep('select');
      setSelectedFile(null);
      setProcessedData(null);
      setErrorMessage(null);
      setImportMode('replace');
      setIsImporting(false);
      importOperationRef.current = null;
    }
  }, [open]);

  // Handle component unmounting
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Process the selected file
  useEffect(() => {
    let processingTimer: NodeJS.Timeout | null = null;

    if (selectedFile && step === 'process') {
      // Ensure processing state stays visible for at least 500ms
      // This is to prevent flickering and perception of loading
      processingTimer = setTimeout(() => {
        // This empty timer ensures the loading state is visible
      }, 500);

      // Process based on file type
      const processFile = async (): Promise<void> => {
        try {
          // Add a small delay to ensure the loading state is visible
          // This is to prevent flickering and perception of loading
          await new Promise((resolve) => setTimeout(resolve, 300));

          if (!isMountedRef.current) return;

          if (selectedFile.type === 'application/pdf') {
            const result = await readPDF(selectedFile);
            if (isMountedRef.current) {
              setProcessedData(result);
              setStep('confirm');
            }
          } else if (
            selectedFile.type === 'application/octet-stream' ||
            selectedFile.name.endsWith('.nwb')
          ) {
            const result = await readNWB(selectedFile);
            if (isMountedRef.current) {
              if (result.isError) {
                setErrorMessage('Error parsing NWB file');
                setStep('error');
              } else {
                setProcessedData(result.data || null);
                setStep('confirm');
              }
            }
          } else {
            if (isMountedRef.current) {
              setErrorMessage('Unsupported file type');
              setStep('error');
            }
          }
        } catch (error: unknown) {
          if (isMountedRef.current) {
            console.error('Error processing file:', error);
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Unknown error processing file',
            );
            setStep('error');
          }
        }
      };

      processFile();
    }

    return () => {
      if (processingTimer) {
        clearTimeout(processingTimer);
      }
    };
  }, [selectedFile, step]);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setStep('process');
  }, []);

  const handleChangeFile = useCallback(() => {
    setStep('select');
    setSelectedFile(null);
    setProcessedData(null);
  }, []);

  const handleImport = useCallback(() => {
    if (!processedData || !selectedFile || !whiteboardInstance) return;

    // Mark the UI as pending
    setStep('importing');
    setIsImporting(true);

    // Define the async function
    const performImport = async (): Promise<ImportOperationResult> => {
      try {
        let importData = processedData;

        // Special handling for infinite canvas mode when appending
        if (infiniteCanvasMode && importMode === 'append') {
          try {
            // In infinite canvas mode with append, we need to manually merge the content
            // First, get the current whiteboard content
            const currentSlideId =
              whiteboardInstance.getActiveSlideId() ||
              whiteboardInstance.getSlideIds()[0];

            if (currentSlideId) {
              const currentSlide = whiteboardInstance.getSlide(currentSlideId);
              const currentElements = currentSlide
                .getElementIds()
                .map((id) => currentSlide.getElement(id))
                .filter(Boolean);

              // Prepare a merged document - start with the current processedData
              const mergedDocument: WhiteboardDocumentExport = {
                ...processedData,
                whiteboard: {
                  ...processedData.whiteboard,
                  slides: [
                    {
                      ...processedData.whiteboard.slides[0],
                      elements: [
                        // Add existing elements first
                        ...currentElements.filter(
                          (element): element is ElementExport => !!element,
                        ),
                        // Then add elements from the imported file - assuming elements is an array
                        ...(processedData.whiteboard.slides[0]?.elements || []),
                      ],
                    },
                    //Add the rest of the slides
                    ...(processedData.whiteboard.slides.slice(1) || []),
                  ],
                },
              };

              importData = mergedDocument;
              console.log(
                'Merged document for infinite canvas:',
                mergedDocument,
              );
            }
          } catch (error) {
            console.error('Error merging content for infinite canvas:', error);
            // Fall back to normal import in case of error
          }
        }

        // For non-infinite canvas or replace mode, use standard slide index logic
        const atSlideIndex = infiniteCanvasMode
          ? undefined // Always use slide 0 for infinite canvas
          : importMode === 'append'
            ? undefined
            : 0; // Use undefined for append (adds to end) or 0 for replace

        const errors = await importWhiteboard(
          whiteboardInstance,
          importData,
          handleDrop,
          atSlideIndex,
          selectedFile.type === 'application/pdf'
            ? selectedFile.name
            : undefined,
        );

        if (!isMountedRef.current) {
          return { success: false };
        }

        if (errors && errors.size > 0) {
          console.error('Error while importing whiteboard', errors);
          setErrorMessage('Failed to import the document');
          setStep('error');
          return { success: false, errors };
        }

        // Show success step instead of immediately closing
        setStep('success');
        return { success: true };
      } catch (error: unknown) {
        if (!isMountedRef.current) {
          return { success: false };
        }

        console.error('Error during import:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unknown error during import',
        );
        setStep('error');

        // Create a Map instead of a Set for errors
        const errorMap = new Map<string, Error>();
        errorMap.set(
          'import',
          error instanceof Error ? error : new Error(String(error)),
        );

        return {
          success: false,
          errors: errorMap,
        };
      } finally {
        // Clean up the operation reference when done
        if (isMountedRef.current) {
          setIsImporting(false);
        }
      }
    };

    // Create the operation and store it in the ref in one step
    const operation = performImport();
    importOperationRef.current = operation;

    // Clean up the reference when the operation completes
    return operation.finally(() => {
      if (importOperationRef.current === operation) {
        importOperationRef.current = null;
      }
    });
  }, [processedData, selectedFile, importMode, whiteboardInstance, handleDrop]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setProcessedData(null);
    setErrorMessage(null);
    setStep('select');
  }, []);

  // Ensure we wait for any pending import to complete before closing
  const handleCloseDialog = useCallback(async () => {
    // If there's a pending import operation, wait for it to complete
    if (importOperationRef.current) {
      try {
        await importOperationRef.current;
      } catch (error) {
        // If there's an error, log it but still close
        console.error('Error while waiting for import to complete:', error);
      }
    }

    onClose();
  }, [onClose]);

  const renderContent = () => {
    switch (step) {
      case 'select':
        return <FileSelection onFileSelected={handleFileSelected} />;

      case 'process':
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t('importDialog.processing', 'Processing your file...')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          </Box>
        );

      case 'importing':
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" gutterBottom>
              {t('importDialog.importing', 'Importing your file...')}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          </Box>
        );

      case 'confirm':
        return (
          selectedFile && (
            <ImportConfirmation
              fileName={selectedFile.name}
              importMode={importMode}
              onImportModeChange={setImportMode}
              onChangeFile={handleChangeFile}
            />
          )
        );

      case 'success':
        return selectedFile && <SuccessMessage fileName={selectedFile.name} />;

      case 'error':
        return (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>{t('importDialog.errorTitle', 'Error')}</AlertTitle>
            <Typography variant="body2">
              {errorMessage ||
                t(
                  'importDialog.errorMessage',
                  'There was an error processing your file. Please try again with a different file.',
                )}
            </Typography>
          </Alert>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDialog}
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogDescriptionId}
      fullWidth
      maxWidth="sm"
    >
      <Stack alignItems="baseline" direction="row">
        <DialogTitle component="h3" id={dialogTitleId} sx={{ flex: 1 }}>
          {step === 'success'
            ? t('importDialog.importCompleted', 'Import Completed')
            : t('importDialog.title', 'Import Document')}
        </DialogTitle>
        <Tooltip title={t('importDialog.close', 'Close')}>
          <IconButton
            onClick={handleCloseDialog}
            sx={{ mr: 3 }}
            disabled={isImporting} // Prevent closing during active import
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent id={dialogDescriptionId}>{renderContent()}</DialogContent>

      <DialogActions>
        {step === 'error' ? (
          <>
            <Button onClick={handleCloseDialog} variant="outlined">
              {t('importDialog.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleReset} variant="contained">
              {t('importDialog.tryAgain', 'Try Again')}
            </Button>
          </>
        ) : step === 'success' ? (
          <Button
            onClick={handleCloseDialog}
            variant="contained"
            color="primary"
            autoFocus
          >
            {t('importDialog.done', 'Done')}
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCloseDialog}
              variant="outlined"
              disabled={isImporting} // Prevent closing during active import
            >
              {t('importDialog.cancel', 'Cancel')}
            </Button>
            {step === 'confirm' && (
              <Button
                onClick={handleImport}
                variant="contained"
                disabled={isImporting}
              >
                {t('importDialog.import', 'Import')}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
