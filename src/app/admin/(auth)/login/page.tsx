'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import { Rocket01Icon, Loading01Icon } from '@hugeicons/core-free-icons';
export default function AdminLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (res.ok) {
                toast.success('Login successful!');
                router.push('/admin');
                router.refresh();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Invalid credentials');
            }
        } catch (error) {
            toast.error('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="rounded-full bg-primary p-3">
                            <HugeiconsIcon icon={Rocket01Icon} size={24} className="text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Admin Panel</CardTitle>
                    <CardDescription>
                        Enter your credentials to access the admin dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                required
                                value={credentials.username}
                                onChange={(e) =>
                                    setCredentials({ ...credentials, username: e.target.value })
                                }
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                required
                                value={credentials.password}
                                onChange={(e) =>
                                    setCredentials({ ...credentials, password: e.target.value })
                                }
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <HugeiconsIcon icon={Loading01Icon} size={16} className="mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
