'use client';

import { useState } from 'react';
import { FileIcon, LoaderIcon } from '../icons';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

export interface FileMetadata {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date | string;
}

interface DocumentBuildingSectionProps {
  userFiles: FileMetadata[];
  extractedInfo: { [key: string]: { value: string; reviewed: boolean } };
}

export function DocumentBuildingSection({ userFiles, extractedInfo }: DocumentBuildingSectionProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [building, setBuilding] = useState(false);

  // Filter only docx files for templates
  const docxFiles = userFiles.filter(file => 
    file.pathname.toLowerCase().endsWith('.docx') || 
    file.pathname.toLowerCase().endsWith('.doc')
  );

  const handleBuildDocument = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template document');
      return;
    }

    // Check if we have extracted information
    const hasExtractedInfo = Object.keys(extractedInfo).length > 0;
    if (!hasExtractedInfo) {
      toast.error('No extracted information available. Please extract information first.');
      return;
    }

    setBuilding(true);

    try {
      // Create request data
      const requestData = {
        templatePath: selectedTemplate,
        extractedData: extractedInfo,
      };

      // Make the API request with blob response type
      const response = await fetch('/api/fill-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        // Handle error cases
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to build document');
        } else {
          throw new Error(`HTTP error: ${response.status}`);
        }
      }

      // Get filename from content-disposition header or use a default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'filled_document.docx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      saveAs(blob, filename);

      toast.success('Document built successfully!');
      console.log('Document built with template:', selectedTemplate);
    } catch (error: any) {
      console.error('Error building document:', error);
      toast.error(error.message || 'Failed to build document');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <section className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 transition-all hover:shadow-md">
      <h2 className="text-xl font-semibold text-deep-purple mb-4">Document Building</h2>
      
      <div className="grid grid-cols-1 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Select Template Document</h3>
          
          {docxFiles.length === 0 ? (
            <div className="bg-light-white p-4 rounded-md text-center">
              <p className="text-gray-500 text-sm mb-2">No DOCX template files available.</p>
              <p className="text-gray-500 text-sm">Please upload a DOCX template file in the Files page.</p>
            </div>
          ) : (
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {docxFiles.map((file) => (
                <div 
                  key={file.pathname}
                  className={`flex items-center p-3 rounded-md cursor-pointer border transition-colors ${
                    selectedTemplate === file.pathname 
                      ? 'border-purple bg-light-white' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTemplate(file.pathname)}
                >
                  <div className="flex-shrink-0 text-blue-500">
                    <FileIcon size={20} />
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-900">{file.pathname}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex flex-col space-y-4">
          <div className="bg-light-white p-4 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Template Replacement</h3>
            <p className="text-sm text-gray-500">
              The selected template should contain placeholders in <code>&#123;&#123;key&#125;&#125;</code> format.
              These will be replaced with the extracted information values.
            </p>
            <div className="mt-3 p-3 bg-gray-100 rounded-md text-xs font-mono overflow-auto">
              <span className="font-semibold">Example:</span> The device is manufactured by <span className="text-purple">&#123;&#123;MANUFACTURER_NAME&#125;&#125;</span>
            </div>
          </div>
          
          <div className="bg-light-white p-4 rounded-md border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Available Information</h3>
            <p className="text-sm text-gray-500 mb-2">
              {Object.keys(extractedInfo).length === 0 
                ? 'No information has been extracted yet.' 
                : 'The following information will be used to fill the template:'}
            </p>
            
            {Object.keys(extractedInfo).length > 0 && (
              <div className="overflow-hidden overflow-x-auto rounded-md border border-gray-300">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewed</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-300">
                    {Object.entries(extractedInfo).map(([key, info]) => (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs font-mono whitespace-nowrap">{key}</td>
                        <td className="py-2 px-3 text-xs">
                          {info.value.length > 50 
                            ? `${info.value.substring(0, 50)}...` 
                            : info.value}
                        </td>
                        <td className="py-2 px-3 text-xs text-center">
                          {info.reviewed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              !
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleBuildDocument}
            disabled={building || !selectedTemplate || Object.keys(extractedInfo).length === 0}
            className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors ${
              building || !selectedTemplate || Object.keys(extractedInfo).length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple text-white hover:bg-deep-purple'
            }`}
          >
            {building ? (
              <>
                <LoaderIcon size={16} />
                <span className="ml-2">Building Document...</span>
              </>
            ) : (
              'Build Document'
            )}
          </button>
        </div>
      </div>
    </section>
  );
} 