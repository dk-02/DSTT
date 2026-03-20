import { useState } from 'react';
import { Upload01, File06, X, Recording01 } from '@untitledui/icons';
import { useCaseStore } from '../../store/useCaseStore';
import { Modal } from '../UI/Modal';
import { FilePreview } from './FilePreview';

export const Media = () => {
  const { caseData, updateCaseData } = useCaseStore();
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const handleOpenPreview = async (file: File) => {
    if (file.type === 'text/plain') {
      const text = await file.text();
      setTextContent(text);
    } else {
      setTextContent(null);
    }
    setPreviewFile(file);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
    setTextContent(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      updateCaseData({ media: [...caseData.media, ...Array.from(e.target.files)] });
    }
  };

  const removeFile = (indexToRemove: number) => {
    updateCaseData({
      media: caseData.media.filter((_, index) => index !== indexToRemove)
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center transition">
        <input type="file" multiple className="hidden" id="file-upload" onChange={handleFileChange} />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
          <Upload01 className="w-12 h-12 text-gray-400 mb-2" />
          <span className="font-medium">Prenesi datoteke (Slike, Audio, Video, PDF)</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {caseData.media.map((file, i) => (
          <div 
            key={`${file.name}-${i}`} 
            className="group flex items-center gap-3 p-3 bg-gray-200 border rounded-lg shadow-sm hover:border-orange-200 transition-colors"
          >
            <div className="p-2 bg-white rounded-md">
              <FilePreview file={file}></FilePreview>
            </div>

            <div onClick={() => handleOpenPreview(file)} className="h-full flex flex-col flex-1 min-w-0">
              <span className="hover:cursor-pointer hover:underline truncate text-sm font-semibold text-gray-700">{file.name}</span>
              <span className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
            </div>

            <button 
              onClick={() => removeFile(i)}
              className="p-1.5 rounded-full hover:bg-white hover:cursor-pointer text-gray-400 hover:text-red-500 transition-colors"
              title="Ukloni datoteku"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      
      {caseData.media.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Ukupno datoteka: {caseData.media.length}
        </p>
      )}

      <Modal 
        isOpen={!!previewFile} 
        onClose={handleClosePreview} 
        title={previewFile?.name || 'Preview'}
      >
        {previewFile && (
          <div className="w-full h-full flex items-center justify-center">
            {previewFile.type.startsWith('image/') ? (
              <img 
                src={URL.createObjectURL(previewFile)} 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md" 
              />
            ) : previewFile.type === 'text/plain' ? (
              <div className="w-full max-h-[70vh] bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">
                    Text Document Preview
                  </span>
                </div>
                <pre className="p-6 overflow-auto text-sm text-gray-700 font-mono leading-relaxed whitespace-pre-wrap bg-white">
                  {textContent}
                </pre>
              </div>
            ) : previewFile.type.startsWith('audio/') ? (
              <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                  <Recording01 className="w-10 h-10 text-orange-600" />
                </div>
                
                <div className="text-center mb-8">
                  <h4 className="text-gray-900 font-semibold mb-1 truncate max-w-xs">
                    {previewFile.name}
                  </h4>
                  <p className="text-sm text-gray-500">Audio datoteka • {(previewFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>

                <audio 
                  controls 
                  className="w-full h-10 custom-audio-player" 
                  autoPlay={false}
                >
                  <source src={URL.createObjectURL(previewFile)} type={previewFile.type} />
                  Vaš preglednik ne podržava audio element.
                </audio>
                
                <p className="mt-6 text-[11px] text-gray-400 italic text-center">
                  Pritisnite play za preslušavanje snimke slučaja
                </p>
              </div>
            ) : previewFile.type.startsWith('video/') ? (
              <video controls className="max-w-full max-h-full rounded-lg">
                <source src={URL.createObjectURL(previewFile)} type={previewFile.type} />
              </video>
            ) : previewFile.type === 'application/pdf' ? (
              <iframe 
                src={URL.createObjectURL(previewFile)} 
                className="w-full h-[75vh] rounded-lg border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <File06 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Preview nije dostupan za ovaj format.</p>
                <a 
                  href={URL.createObjectURL(previewFile)} 
                  download={previewFile.name}
                  className="mt-4 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg font-semibold hover:bg-orange-100 transition-colors inline-block"
                >
                  Preuzmi datoteku
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};