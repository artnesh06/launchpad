import { Card } from '@/components/ui/card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

export default function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
    return (
        <Card className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}
                        </p>
                    )}
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                </div>
            </div>
        </Card>
    );
}
