import { useState, useEffect } from 'react';

export interface TemplateInfo {
    address: string;
    name?: string;
    version?: string;
    bytecodeHash: string;
    isApproved: boolean;
    chainId: number;
    chainName: string;
    deploymentCount?: number;
    createdAt?: Date;
}

export function useTemplateManagement(chainId?: number) {
    const [templates, setTemplates] = useState<TemplateInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const url = chainId 
                ? `/api/admin/templates?chainId=${chainId}`
                : '/api/admin/templates';
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch templates');
            }
            
            const data = await response.json();
            setTemplates(data.data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [chainId]);

    return {
        templates,
        isLoading,
        error,
        refetch: fetchTemplates
    };
}
