import {
    TextInput,
    PasswordInput,
    Button,
    Title,
    Text,
    Anchor,
    Stack,
    Box,
    Group,
    Badge,
    ThemeIcon,
} from '@mantine/core';
import { Mail, Lock, Check, X, Award, ShieldCheck, BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import axios from 'axios';

function loginErrorMessage(error: unknown): string {
    if (!axios.isAxiosError(error)) {
        return 'Login failed. Please try again.';
    }
    if (!error.response) {
        return 'Cannot reach the server (network error). Please check your connection.';
    }
    const status = error.response.status;
    if (status === 502 || status === 503 || status === 504) {
        return 'The login service is temporarily unavailable. Please try again shortly.';
    }
    const raw = error.response.data?.message ?? error.response.data?.error;
    if (Array.isArray(raw)) return raw.join(' ');
    if (typeof raw === 'string') return raw;
    return 'Invalid email or password. Please try again.';
}

export const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // First attempt admin login, fallback to staff automatically without showing role toggles
            let response: any;
            let userRole = 'admin';

            try {
                response = await axios.post('/api/v1/auth/login/admin', {
                    email: email.trim(),
                    password
                });
            } catch (adminErr: any) {
                // If not an admin credential (401), try staff login
                if (adminErr.response?.status === 401) {
                    response = await axios.post('/api/v1/auth/login/staff', {
                        email: email.trim(),
                        password
                    });
                    userRole = 'staff';
                } else {
                    throw adminErr;
                }
            }

            // Store token and user details
            localStorage.setItem('token', response.data.access_token);
            const serverRole = (response.data.user?.role || userRole).toLowerCase();
            localStorage.setItem('role', serverRole);
            localStorage.setItem('userName', response.data.user?.name || response.data.user?.fullName || '');
            localStorage.setItem('userId', response.data.user?.id || '');

            notifications.show({
                title: 'Welcome Back!',
                message: 'Successfully logged in.',
                color: 'teal',
                icon: <Check size={16} />,
            });

            navigate(serverRole === 'staff' ? '/dashboard/me' : '/dashboard');
        } catch (error: unknown) {
            console.error('Login failed:', error);
            notifications.show({
                title: 'Login Failed',
                message: loginErrorMessage(error),
                color: 'red',
                icon: <X size={16} />,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                flexDirection: 'row',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
            }}
        >
            {/* LEFT SECTION: Inspire London College Name, Logo, Brand Palette & Real High Quality Learning Imagery */}
            <Box
                visibleFrom="md"
                style={{
                    flex: '1.15',
                    minHeight: '100vh',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '48px 56px',
                    background: `linear-gradient(145deg, rgba(15, 23, 42, 0.90) 0%, rgba(2, 132, 199, 0.80) 50%, rgba(229, 22, 144, 0.70) 100%), url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1920&auto=format&fit=crop') center/cover no-repeat`,
                    color: '#ffffff',
                    overflow: 'hidden',
                }}
            >
                {/* Brand Header: Logo + College Name */}
                <Group gap="md" align="center">
                    <Box
                        style={{
                            backgroundColor: '#ffffff',
                            padding: '8px 12px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                        }}
                    >
                        <img
                            src="/assets/logo.png"
                            alt="Inspire London College"
                            style={{ height: 42, width: 'auto', display: 'block' }}
                        />
                    </Box>
                    <Box>
                        <Text fw={900} size="lg" c="#ffffff" style={{ letterSpacing: '-0.3px', lineHeight: 1.15 }}>
                            Inspire London College
                        </Text>
                        <Text size="xs" fw={700} c="#38BDF8" tt="uppercase" style={{ letterSpacing: '0.9px' }}>
                            Learning & CPD Portal
                        </Text>
                    </Box>
                </Group>

                {/* Hero Content */}
                <Box my="auto" py="xl" style={{ maxWidth: 540 }}>
                    <Badge
                        size="md"
                        radius="xl"
                        variant="light"
                        color="cyan"
                        mb="lg"
                        styles={{
                            root: {
                                background: 'rgba(255, 255, 255, 0.16)',
                                backdropFilter: 'blur(12px)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                fontWeight: 800,
                                letterSpacing: '0.6px',
                                padding: '6px 14px',
                            }
                        }}
                    >
                        CONTINUOUS PROFESSIONAL DEVELOPMENT
                    </Badge>

                    <Title
                        order={1}
                        size={38}
                        fw={900}
                        c="#ffffff"
                        style={{
                            lineHeight: 1.2,
                            letterSpacing: '-0.8px',
                            textShadow: '0 2px 16px rgba(0, 0, 0, 0.25)'
                        }}
                    >
                        Empowering Healthcare & Care Training Excellence
                    </Title>

                    <Text
                        size="md"
                        c="rgba(255, 255, 255, 0.90)"
                        mt="md"
                        mb="xl"
                        style={{ lineHeight: 1.65, fontWeight: 500 }}
                    >
                        Access verified certifications, monitor ongoing CPD progress, and manage mandatory learning modules across Inspire London College.
                    </Text>

                    {/* Feature Highlights with Brand Colors */}
                    <Stack gap="sm">
                        <Group gap="sm" align="center">
                            <ThemeIcon
                                size={34}
                                radius="md"
                                style={{
                                    background: 'rgba(30, 186, 242, 0.25)',
                                    border: '1px solid rgba(30, 186, 242, 0.45)',
                                }}
                            >
                                <Award size={18} color="#ffffff" />
                            </ThemeIcon>
                            <Text size="sm" c="#ffffff" fw={600}>
                                Accredited Qualifications & Real-Time Certificate Generation
                            </Text>
                        </Group>
                        <Group gap="sm" align="center">
                            <ThemeIcon
                                size={34}
                                radius="md"
                                style={{
                                    background: 'rgba(229, 22, 144, 0.25)',
                                    border: '1px solid rgba(229, 22, 144, 0.45)',
                                }}
                            >
                                <ShieldCheck size={18} color="#ffffff" />
                            </ThemeIcon>
                            <Text size="sm" c="#ffffff" fw={600}>
                                Certified Compliance & Continuing Professional Standards
                            </Text>
                        </Group>
                        <Group gap="sm" align="center">
                            <ThemeIcon
                                size={34}
                                radius="md"
                                style={{
                                    background: 'rgba(16, 185, 129, 0.25)',
                                    border: '1px solid rgba(16, 185, 129, 0.45)',
                                }}
                            >
                                <BookOpen size={18} color="#ffffff" />
                            </ThemeIcon>
                            <Text size="sm" c="#ffffff" fw={600}>
                                Comprehensive Course Directories & Secure Record Management
                            </Text>
                        </Group>
                    </Stack>
                </Box>

                {/* Footer Copyright */}
                <Text size="xs" c="rgba(255, 255, 255, 0.72)" fw={500}>
                    © {new Date().getFullYear()} Inspire London College. All rights reserved.
                </Text>
            </Box>

            {/* RIGHT SECTION: Clean, Full-Right Login Form */}
            <Box
                style={{
                    flex: '0.85',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '40px 24px',
                    backgroundColor: '#FFFFFF',
                }}
            >
                <Box w="100%" style={{ maxWidth: 410 }}>
                    {/* Mobile-Only Brand Header */}
                    <Box hiddenFrom="md" ta="center" mb="xl">
                        <Box
                            style={{
                                display: 'inline-flex',
                                padding: '8px 12px',
                                borderRadius: '16px',
                                backgroundColor: '#ffffff',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                border: '1px solid rgba(0,0,0,0.06)',
                                marginBottom: 8,
                            }}
                        >
                            <img src="/assets/logo.png" alt="Inspire London College" style={{ height: 48, width: 'auto' }} />
                        </Box>
                        <Title order={3} fw={900} c="#0f172a" style={{ letterSpacing: '-0.3px' }}>
                            Inspire London College
                        </Title>
                        <Text size="xs" fw={700} c="#0284c7" tt="uppercase" style={{ letterSpacing: '0.8px' }}>
                            Learning & CPD Portal
                        </Text>
                    </Box>

                    {/* Login Card Header */}
                    <Title order={2} size={30} fw={900} c="#0f172a" style={{ letterSpacing: '-0.6px', lineHeight: 1.15 }}>
                        Welcome Back
                    </Title>
                    <Text size="sm" c="#64748b" fw={500} mt={6} mb="xl">
                        Please enter your email and password to log in.
                    </Text>

                    {/* Clean Login Form (No Staff/Admin Toggles) */}
                    <form onSubmit={handleLogin}>
                        <Stack gap="lg">
                            <TextInput
                                label="Email Address"
                                placeholder="name@inspirelondoncollege.co.uk"
                                required
                                size="md"
                                radius="md"
                                leftSection={<Mail size={18} color="#0284c7" />}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                styles={{
                                    input: {
                                        backgroundColor: '#F8FAFC',
                                        borderColor: '#E2E8F0',
                                        fontWeight: 500,
                                        fontSize: '14px',
                                        height: '46px',
                                        transition: 'all 180ms ease',
                                        '&:focus': {
                                            borderColor: '#1EBAF2',
                                            backgroundColor: '#FFFFFF',
                                            boxShadow: '0 0 0 3px rgba(30, 186, 242, 0.15)',
                                        }
                                    },
                                    label: {
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        color: '#1E293B',
                                        marginBottom: 6,
                                    }
                                }}
                            />

                            <Box>
                                <PasswordInput
                                    label="Password"
                                    placeholder="Enter your password"
                                    required
                                    size="md"
                                    radius="md"
                                    leftSection={<Lock size={18} color="#0284c7" />}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    styles={{
                                        input: {
                                            backgroundColor: '#F8FAFC',
                                            borderColor: '#E2E8F0',
                                            fontWeight: 500,
                                            fontSize: '14px',
                                            height: '46px',
                                            transition: 'all 180ms ease',
                                            '&:focus': {
                                                borderColor: '#1EBAF2',
                                                backgroundColor: '#FFFFFF',
                                                boxShadow: '0 0 0 3px rgba(30, 186, 242, 0.15)',
                                            }
                                        },
                                        label: {
                                            fontWeight: 700,
                                            fontSize: '13px',
                                            color: '#1E293B',
                                            marginBottom: 6,
                                        }
                                    }}
                                />
                                <Group justify="flex-end" mt={8}>
                                    <Anchor
                                        component={Link}
                                        to="/forgot-password"
                                        size="xs"
                                        c="#0284c7"
                                        fw={700}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        Forgot Password?
                                    </Anchor>
                                </Group>
                            </Box>

                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                radius="md"
                                loading={loading}
                                styles={{
                                    root: {
                                        height: '48px',
                                        background: 'linear-gradient(135deg, #1EBAF2 0%, #0284c7 100%) !important',
                                        boxShadow: '0 4px 18px rgba(30, 186, 242, 0.35)',
                                        fontWeight: 800,
                                        fontSize: '15px',
                                        letterSpacing: '0.2px',
                                        transition: 'all 200ms ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 8px 24px rgba(30, 186, 242, 0.45)',
                                        }
                                    }
                                }}
                            >
                                Login
                            </Button>

                            <Group justify="center" gap={6} mt="md">
                                <ShieldCheck size={14} color="#94a3b8" />
                                <Text size="xs" c="dimmed" fw={600}>
                                    Secure 256-bit SSL Encrypted Access
                                </Text>
                            </Group>
                        </Stack>
                    </form>
                </Box>
            </Box>
        </Box>
    );
};
