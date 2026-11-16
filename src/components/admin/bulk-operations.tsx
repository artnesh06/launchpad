'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Upload01Icon, 
  Download01Icon, 
  Play01Icon, 
  Pause01Icon, 
  Square01Icon, 
  CheckmarkCircle01Icon, 
  CancelCircleIcon, 
  Alert01Icon,
  FileTextIcon,
  FlashIcon
} from '@hugeicons/core-free-icons';

interface BulkOperation {
  id: string;
  type: 'fee_update' | 'treasury_update' | 'bulk_create';
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  total: number;
  processed: number;
  errors: string[];
  startTime?: Date;
  endTime?: Date;
}

interface BulkOperationsProps {
  onExecute: (operation: any) => Promise<void>;
  chainId?: number;
  userAddress?: string;
}

export function BulkOperations({ onExecute, chainId, userAddress }: BulkOperationsProps) {
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [bulkCreateData, setBulkCreateData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
    
    if (files && files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setBulkCreateData(content);
      };
      reader.readAsText(files[0]);
    }
  };

  const downloadTemplate = () => {
    const defaultTreasury = userAddress || 'YOUR_TREASURY_ADDRESS';
    const defaultRoyalty = userAddress || 'YOUR_ROYALTY_ADDRESS';
    
    const template = `name,symbol,description,baseURI,totalSupply,treasury,royaltyRecipient,royaltyPercentage
Example NFT Collection,EXAMPLE,Description of your NFT collection,https://your-api.com/metadata/,10000,${defaultTreasury},${defaultRoyalty},500
My Art Collection,MYART,Digital art collection,https://your-api.com/metadata2/,5000,${defaultTreasury},${defaultRoyalty},250`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-launchpad-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseBulkData = (csvData: string) => {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const item: any = {};
      headers.forEach((header, index) => {
        item[header.trim()] = values[index]?.trim() || '';
      });
      data.push(item);
    }

    return data;
  };

  const startBulkCreate = async () => {
    if (!bulkCreateData) return;

    try {
      const data = parseBulkData(bulkCreateData);
      const operationId = Date.now().toString();
      
      const newOperation: BulkOperation = {
        id: operationId,
        type: 'bulk_create',
        name: `Bulk Create ${data.length} Launchpads`,
        status: 'running',
        progress: 0,
        total: data.length,
        processed: 0,
        errors: [],
        startTime: new Date()
      };

      setOperations(prev => [...prev, newOperation]);
      setIsProcessing(true);

      // Simulate bulk processing
      for (let i = 0; i < data.length; i++) {
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Update progress
          setOperations(prev => prev.map(op => 
            op.id === operationId 
              ? { 
                  ...op, 
                  processed: i + 1, 
                  progress: Math.round(((i + 1) / data.length) * 100)
                }
              : op
          ));
          
          console.log(`Processing item ${i + 1}:`, data[i]);
          
        } catch (error) {
          setOperations(prev => prev.map(op => 
            op.id === operationId 
              ? { 
                  ...op, 
                  errors: [...op.errors, `Error processing item ${i + 1}: ${error}`]
                }
              : op
          ));
        }
      }

      // Mark as completed
      setOperations(prev => prev.map(op => 
        op.id === operationId 
          ? { 
              ...op, 
              status: 'completed',
              endTime: new Date()
            }
          : op
      ));
      
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Bulk create error:', error);
      setIsProcessing(false);
    }
  };

  const pauseOperation = (operationId: string) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, status: 'paused' }
        : op
    ));
  };

  const resumeOperation = (operationId: string) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, status: 'running' }
        : op
    ));
  };

  const stopOperation = (operationId: string) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { ...op, status: 'failed', endTime: new Date() }
        : op
    ));
  };

  const getStatusIcon = (status: BulkOperation['status']) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'running':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BulkOperation['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'running':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold">Bulk Operations</h4>
          <Badge className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Batch Processing
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Upload CSV File</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag & drop your CSV file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            </div>
            
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Preview</label>
              <div className="border rounded-lg p-4 bg-muted/50 h-32 overflow-auto">
                {bulkCreateData ? (
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {bulkCreateData.slice(0, 500)}
                    {bulkCreateData.length > 500 && '...'}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">No data loaded</p>
                )}
              </div>
            </div>
            
            <Button 
              onClick={startBulkCreate} 
              disabled={!bulkCreateData || isProcessing}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Start Bulk Create'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Operations Queue */}
      {operations.length > 0 && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Operations Queue</h4>
          
          <div className="space-y-4">
            {operations.map((operation) => (
              <div key={operation.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(operation.status)}
                    <div>
                      <h5 className="font-medium">{operation.name}</h5>
                      <p className="text-xs text-muted-foreground">
                        {operation.processed} / {operation.total} items processed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(operation.status)}>
                      {operation.status}
                    </Badge>
                    
                    {operation.status === 'running' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => pauseOperation(operation.id)}>
                          <Pause className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => stopOperation(operation.id)}>
                          <Square className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    
                    {operation.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => resumeOperation(operation.id)}>
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Progress value={operation.progress} className="w-full" />
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{operation.progress}% complete</span>
                    <span>
                      {operation.startTime && `Started: ${operation.startTime.toLocaleTimeString()}`}
                      {operation.endTime && ` • Finished: ${operation.endTime.toLocaleTimeString()}`}
                    </span>
                  </div>
                  
                  {operation.errors.length > 0 && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{operation.errors.length} Error(s) Occurred</AlertTitle>
                      <AlertDescription>
                        <details className="mt-2">
                          <summary className="cursor-pointer">View Errors</summary>
                          <div className="mt-2 text-xs">
                            {operation.errors.map((error, index) => (
                              <div key={index} className="py-1">
                                {error}
                              </div>
                            ))}
                          </div>
                        </details>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bulk Templates */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Available Templates</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <h5 className="font-medium">Launchpad Creation</h5>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Template for creating multiple launchpads with basic information
            </p>
            <Button size="sm" variant="outline" className="w-full" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-500" />
              <h5 className="font-medium">Fee Updates</h5>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Template for bulk updating platform and creation fees
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Download Template
            </Button>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <h5 className="font-medium">Treasury Updates</h5>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Template for updating treasury addresses across multiple contracts
            </p>
            <Button size="sm" variant="outline" className="w-full">
              Download Template
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}