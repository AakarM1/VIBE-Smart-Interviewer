
'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute, useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Header from '@/components/header';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { apiService, type User } from '@/lib/api-service';

const UserManagementPage = () => {
    const { isSuperAdmin, isAdmin } = useAuth();
    const { toast } = useToast();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [candidateName, setCandidateName] = useState('');
    const [candidateId, setCandidateId] = useState('');
    const [clientName, setClientName] = useState('');
    const [role, setRole] = useState('');
    const [userType, setUserType] = useState<'candidate' | 'admin' | 'superadmin'>('candidate');

    const fetchUsers = async () => {
        try {
            const result = await apiService.getUsers();
            const userList = result.data?.users || [];
            console.log('👥 Fetched users for admin page:', userList);
            setUsers(userList);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to fetch users.',
            });
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setCandidateName('');
        setCandidateId('');
        setClientName('');
        setRole('');
        setUserType('candidate');
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const result = await apiService.createUser({
                email,
                candidate_name: candidateName,
                candidate_id: candidateId,
                client_name: clientName,
                role: userType,
                // backend expects password in body for creation via admin path
                // our apiService.createUser sends arbitrary fields; backend should accept password
                password,
            } as any);

            if (result.data) {
                toast({
                    title: 'User Added Successfully',
                    description: `Account for ${candidateName} has been created.`,
                });
                await fetchUsers(); // Refresh the user list
                resetForm();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Registration Failed',
                    description: 'An account with this email already exists.',
                });
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast({
                variant: 'destructive',
                title: 'Registration Error',
                description: 'An error occurred during registration. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteUser = async (userId: string) => {
        try {
            await apiService.deleteUser(userId);
            toast({
                title: 'User Deleted',
                description: 'The user account has been removed.',
            });
            await fetchUsers(); // Refresh the list
        } catch (error) {
            console.error('Delete user error:', error);
            toast({
                variant: 'destructive',
                title: 'Delete Error',
                description: 'Failed to delete user. Please try again.',
            });
        }
    };
    
    return (
        <>
            <Header />
            <div className="container mx-auto px-4 sm:px-8 py-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-headline text-primary flex items-center gap-4">
                            <Users className="h-10 w-10" />
                            User Management
                        </h1>
                        <p className="text-muted-foreground">Add, view, or remove user accounts.</p>
                    </div>
                     <Link href="/admin" passHref>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </header>
                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <Card className="bg-card/60 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><UserPlus /> Add New User</CardTitle>
                                <CardDescription>Create a new candidate, admin, or superadmin account.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleAddUser}>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="candidateName">Full Name</Label>
                                        <Input id="candidateName" placeholder="e.g., Jane Doe" required value={candidateName} onChange={e => setCandidateName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" placeholder="e.g., user@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="candidateId">Candidate ID</Label>
                                        <Input id="candidateId" placeholder="e.g., EMP123" required value={candidateId} onChange={e => setCandidateId(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="clientName">Company / Client Name</Label>
                                        <Input id="clientName" placeholder="e.g., TechCorp" required value={clientName} onChange={e => setClientName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="userType">User Type</Label>
                                                                                <Select value={userType} onValueChange={(value: 'candidate' | 'admin' | 'superadmin') => setUserType(value)}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select user type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="candidate">Candidate</SelectItem>
                                            <SelectItem value="admin">Administrator</SelectItem>
                                                                                        {isSuperAdmin && (
                                              <SelectItem value="superadmin">Super Administrator</SelectItem>
                                            )}
                                          </SelectContent>
                                        </Select>
                                    </div>
                                    {userType === 'candidate' && (
                                      <div className="space-y-2">
                                          <Label htmlFor="role">Test Name / Role</Label>
                                          <Input id="role" placeholder="e.g., Software Engineer" required value={role} onChange={e => setRole(e.target.value)} />
                                      </div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                        Create User
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>

                    <div className="lg:col-span-2">
                         <Card className="bg-card/60 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle>Existing Users</CardTitle>
                                <CardDescription>A list of all users currently in the system.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length > 0 ? (
                                                                                        users.map((u) => (
                                                                                                <TableRow key={u.id}>
                                                                                                        <TableCell className="font-medium">{u.candidate_name}</TableCell>
                                                                                                        <TableCell>{u.email}</TableCell>
                                                    <TableCell>
                                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                                                                u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                                                                                                                u.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                      }`}>
                                                                                                                {u.role === 'superadmin' ? '👑 Super Admin' :
                                                                                                                 u.role === 'admin' ? '🔑 Admin' :
                                                                                                                 u.role}
                                                      </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {/* Superadmin can delete anyone except themselves, regular admin can delete non-admin users */}
                                                        {(
                                                                                                                    (isSuperAdmin && u.email !== 'superadmin@gmail.com') ||
                                                                                                                    (isAdmin && !isSuperAdmin && u.role !== 'admin' && u.role !== 'superadmin' && u.email !== 'admin@gmail.com')
                                                        ) && (
                                                            <AlertDialog>
                                                              <AlertDialogTrigger asChild>
                                                                 <Button variant="ghost" size="icon">
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                              </AlertDialogTrigger>
                                                              <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                  <AlertDialogDescription>
                                                                                                                                        This action cannot be undone. This will permanently delete the user account for {u.candidate_name}.
                                                                  </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                                                                    <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive hover:bg-destructive/90">
                                                                    Delete User
                                                                  </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                              </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                    No users found.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>
        </>
    );
};

const ProtectedUserManagementPage = () => (
    <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
        <UserManagementPage />
    </ProtectedRoute>
);

export default ProtectedUserManagementPage;
