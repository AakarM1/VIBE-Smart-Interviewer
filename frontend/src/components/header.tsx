
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, UserPlus, Shield, Home } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/hooks/use-translation';
import { LanguageSelector } from '@/components/language-selector';
import { apiService } from '@/lib/api-service';

const ADMIN_EMAIL = 'admin@gmail.com';

export default function Header() {
    const { user, logout, loading } = useAuth();
    const { currentLanguage, isRTL, isMultilingualEnabled } = useLanguage();
    const { ts } = useTranslation(); // Use sync translation for immediate display
    const [tenantLogo, setTenantLogo] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            if (user?.tenant_id) {
                const res = await apiService.getTenant(user.tenant_id);
                if (res.data?.logo_url) setTenantLogo(res.data.logo_url);
                else setTenantLogo(null);
            } else {
                setTenantLogo(null);
            }
        })();
    }, [user?.tenant_id]);
    
    // For better UX, we'll use sync translations with reasonable fallbacks
    const texts = {
        hello: ts('header.hello', 'Hello'),
        home: ts('header.home', 'Home'),
        admin: ts('header.admin', 'Admin'),
        logout: ts('header.logout', 'Logout'),
        login: ts('header.login', 'Login'),
        register: ts('header.register', 'Register'),
        superAdmin: ts('header.superadmin', 'Super Admin')
    };

    if (loading) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card">
            <div className="container flex h-16 max-w-screen-2xl items-center">
                <div className="flex-none">
                    <Link href="/" className="flex items-center space-x-2">
                        <Image src="/logo.jpg" alt="Trajectorie Logo" width={140} height={30} priority />
                    </Link>
                </div>

                <div className="flex-grow"></div>
                
             <div className="flex flex-none items-center justify-end space-x-4">
                 <Image src={tenantLogo || 'https://placehold.co/100x30.png'} alt="Client Logo" width={100} height={30} data-ai-hint="logo" />
                     <span className="text-sm text-muted-foreground hidden sm:inline">|</span>
                     
                     {/* Language Selector - Header shows ALL languages, independent of admin config */}
                     {isMultilingualEnabled && <LanguageSelector useAllLanguages />}
                     
                    {user ? (
                        <>
                            <span className="text-sm font-semibold hidden sm:inline">{texts.hello} {(user.candidate_name || user.email || '').toString().toUpperCase()}</span>
                             <Link href={(user.role === 'superadmin') ? '/superadmin' : (user.role === 'admin' || user.email === ADMIN_EMAIL) ? '/admin' : '/'} passHref>
                                <Button variant="ghost" size="sm">
                                    <Home className="mr-2 h-4 w-4" />
                                    {texts.home}
                                </Button>
                            </Link>
                            {(user.role === 'admin' || user.email === ADMIN_EMAIL) && (
                                <Link href="/admin" passHref>
                                    <Button variant="ghost" size="sm">
                                        <Shield className="mr-2 h-4 w-4" />
                                        {texts.admin}
                                    </Button>
                                </Link>
                            )}
                            {user.role === 'superadmin' && (
                                <Link href="/superadmin" passHref>
                                    <Button variant="ghost" size="sm">
                                        <Shield className="mr-2 h-4 w-4" />
                                        {texts.superAdmin}
                                    </Button>
                                </Link>
                            )}
                            <Button onClick={logout} variant="outline" size="sm">
                                <LogOut className="mr-2 h-4 w-4" />
                                {texts.logout}
                            </Button>
                        </>
                    ) : (
                         <>
                            <Link href="/login" passHref>
                                <Button variant="ghost">
                                    <LogIn className="mr-2 h-4 w-4" />
                                    {texts.login}
                                </Button>
                            </Link>
                            <Link href="/register" passHref>
                                <Button>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    {texts.register}
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
