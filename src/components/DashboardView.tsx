import {
    Box,
    Title,
    Text,
    SimpleGrid,
    Paper,
    Avatar,
    Group,
    Badge,
    Stack,
    ThemeIcon,
    Tabs,
    Button,
    TextInput,
    CloseButton,
    Modal,
    ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Users, UserCheck, UserMinus, Search, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export const DashboardView = ({ searchQuery = '' }: { searchQuery?: string }) => {
    const [activeTab, setActiveTab] = useState<string | null>('active');
    const [internalSearch, setInternalSearch] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; fullName: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [data, setData] = useState({
        totalStaff: 0,
        activeStaff: 0,
        leftStaff: 0,
        users: [] as any[]
    });
    const [loading, setLoading] = useState(true);
    const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string>>({});
    const token = localStorage.getItem('token');

    // Ensure the page and document body scroll smoothly and naturally
    useEffect(() => {
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        return () => {
            document.body.style.overflowY = 'auto';
            document.documentElement.style.overflowY = 'auto';
        };
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/v1/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const payload = response.data;
                setData({
                    totalStaff: payload.totalStaff ?? payload.totalUsers ?? 0,
                    activeStaff: payload.activeStaff ?? payload.activeUsers ?? 0,
                    leftStaff: payload.leftStaff ?? payload.inactiveUsers ?? 0,
                    users: payload.users || [],
                });
                
                // Fetch protected profile pictures as blobs (need auth header)
                const urls: Record<string, string> = {};
                await Promise.all(
                    (payload.users || []).map(async (user: any) => {
                        if (!user.profilePicture) return;
                        try {
                            const imgRes = await axios.get(user.profilePicture, {
                                headers: { Authorization: `Bearer ${token}` },
                                responseType: 'blob'
                            });
                            const blobUrl = URL.createObjectURL(imgRes.data);
                            urls[user.id] = blobUrl;
                        } catch (e) {
                            // ignore fetch error for individual images
                        }
                    })
                );
                setProfilePictureUrls(urls);
            } catch (error: any) {
                console.error('Failed to fetch dashboard stats', error);
                setData({
                    totalStaff: 0,
                    activeStaff: 0,
                    leftStaff: 0,
                    users: []
                });
                if (error.response?.status === 401) {
                    // Token expired - handled by auth system
                } else if (error.response?.status === 403) {
                    // Not admin - this shouldn't happen if route is protected
                } else {
                    console.error('Dashboard error details:', error.response?.data || error.message);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);
    
    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            Object.values(profilePictureUrls).forEach(url => URL.revokeObjectURL(url));
        };
    }, [profilePictureUrls]);

    const parseIlccsNumeric = (ilccsNumber: string | null | undefined): number => {
        if (!ilccsNumber) return -1;
        const digits = String(ilccsNumber).replace(/\D/g, '');
        if (!digits) return -1;
        const value = parseInt(digits, 10);
        return Number.isNaN(value) ? -1 : value;
    };

    const effectiveSearch = (internalSearch || searchQuery).trim();

    const filteredStaff = data.users
        .filter(user => {
            const query = effectiveSearch.toLowerCase();
            const matchesSearch = !query ||
                (user.fullName || '').toLowerCase().includes(query) ||
                (user.role || '').toLowerCase().includes(query) ||
                (user.ilccsNumber || '').toLowerCase().includes(query) ||
                (user.employmentBadge || '').toLowerCase().includes(query) ||
                (user.status || '').toLowerCase().includes(query);

            if (activeTab === 'all') return matchesSearch;
            if (activeTab === 'active') return matchesSearch && user.status === 'ACTIVE';
            if (activeTab === 'left') return matchesSearch && user.status === 'LEFT';
            return matchesSearch;
        })
        .sort((a, b) => parseIlccsNumeric(b.ilccsNumber) - parseIlccsNumeric(a.ilccsNumber));

    const filterStatusLabel =
        activeTab === 'active'
            ? `Showing Active Staff (${filteredStaff.length})`
            : activeTab === 'left'
                ? `Showing Left Staff (${filteredStaff.length})`
                : `Showing All Staff (${filteredStaff.length})`;

    const filterTabStyle = (tab: 'all' | 'active' | 'left') => {
        const selected = activeTab === tab;
        const palettes = {
            all: {
                fill: 'linear-gradient(145deg, #1EBAF2 0%, #0F7296 100%)',
                shadow: '0 6px 18px rgba(30, 186, 242, 0.45)',
                ring: 'rgba(30, 186, 242, 0.55)',
            },
            active: {
                fill: 'linear-gradient(145deg, #E51690 0%, #E51690 100%)',
                shadow: '0 6px 18px rgba(229, 22, 144, 0.45)',
                ring: 'rgba(229, 22, 144, 0.55)',
            },
            left: {
                fill: 'linear-gradient(145deg, #6A1B9A 0%, #8E24AA 100%)',
                shadow: '0 6px 18px rgba(106, 27, 154, 0.45)',
                ring: 'rgba(106, 27, 154, 0.55)',
            },
        } as const;
        const p = palettes[tab];
        if (selected) {
            return {
                background: p.fill,
                color: 'white',
                opacity: 1,
                fontWeight: 800,
                transform: 'scale(1.06)',
                boxShadow: p.shadow,
                border: `2px solid rgba(255,255,255,0.85)`,
                outline: `2px solid ${p.ring}`,
                outlineOffset: 1,
                transition: 'all 200ms ease',
            };
        }
        return {
            background: 'rgba(255,255,255,0.55)',
            color: '#495057',
            opacity: 0.85,
            fontWeight: 600,
            transform: 'scale(1)',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            outline: 'none',
            transition: 'all 200ms ease',
        };
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/staff/${deleteTarget.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData((prev) => {
                const removed = prev.users.find((u: any) => u.id === deleteTarget.id);
                const remaining = prev.users.filter((u: any) => u.id !== deleteTarget.id);
                return {
                    ...prev,
                    users: remaining,
                    totalStaff: Math.max(0, prev.totalStaff - 1),
                    activeStaff: Math.max(0, prev.activeStaff - (removed?.status === 'ACTIVE' ? 1 : 0)),
                    leftStaff: Math.max(0, prev.leftStaff - (removed?.status === 'LEFT' ? 1 : 0)),
                };
            });
            notifications.show({
                title: 'Staff Deleted',
                message: `${deleteTarget.fullName} has been removed.`,
                color: 'teal',
            });
            setDeleteTarget(null);
        } catch (err: any) {
            console.error('Failed to delete user', err?.response?.data || err?.message);
            notifications.show({
                title: 'Delete Failed',
                message: err?.response?.data?.message || 'Could not delete staff member.',
                color: 'red',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Box
            px={{ base: 'xs', sm: 'md', md: 'lg' }}
            pt={2}
            pb="xl"
            w="100%"
            style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100%',
                boxSizing: 'border-box',
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .cpd-locked-dashboard-bar {
                    position: fixed !important;
                    top: 76px !important;
                    left: var(--app-shell-navbar-offset, 0px) !important;
                    right: 0 !important;
                    z-index: 99 !important;
                    background-color: #F5F5F5 !important;
                }

                /* Apple iOS Liquid Glass (Frosted Glass Translucency & Specular Highlights) */
                .cpd-liquid-glass {
                    position: relative;
                    border-radius: 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(255, 255, 255, 0.44) 100%) !important;
                    backdrop-filter: blur(28px) saturate(190%) !important;
                    -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
                    border: 1.5px solid rgba(255, 255, 255, 0.9) !important;
                    box-shadow: 
                        0 8px 24px -4px rgba(15, 23, 42, 0.05),
                        0 2px 6px -1px rgba(15, 23, 42, 0.02),
                        inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.95),
                        inset 0 -1px 2px 0 rgba(0, 0, 0, 0.02);
                    transition: transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.32s ease, border-color 0.32s ease, background 0.32s ease;
                    will-change: transform, box-shadow;
                    cursor: pointer;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justifyContent: space-between;
                }

                /* Disable all unwanted pseudo-element arrows or badges */
                .cpd-liquid-glass::before,
                .cpd-liquid-glass::after {
                    content: none !important;
                    display: none !important;
                }

                /* 3D Liquid Hover on Cards */
                .cpd-liquid-glass:hover {
                    transform: translateY(-8px) scale(1.02);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(255, 255, 255, 0.62) 100%) !important;
                    box-shadow: 
                        0 22px 42px -8px rgba(30, 186, 242, 0.20),
                        0 10px 20px -4px rgba(15, 23, 42, 0.08),
                        inset 0 2px 5px 0 rgba(255, 255, 255, 1),
                        inset 0 -2px 4px 0 rgba(30, 186, 242, 0.08);
                    border-color: rgba(30, 186, 242, 0.5) !important;
                }

                /* Executive Solid Stat Cards (Rich, Matte, Not Too Bright) */
                .cpd-stat-card-solid {
                    position: relative;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.22) !important;
                    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease;
                    will-change: transform, box-shadow;
                    cursor: pointer;
                    overflow: hidden;
                }

                .cpd-stat-card-solid::before,
                .cpd-stat-card-solid::after {
                    content: none !important;
                    display: none !important;
                }

                .cpd-stat-card-solid:hover {
                    transform: translateY(-6px) scale(1.02);
                }

                .cpd-stat-blue {
                    background: #0284c7 !important;
                    box-shadow: 0 10px 24px -4px rgba(2, 132, 199, 0.38), 0 4px 10px -2px rgba(2, 132, 199, 0.2);
                }
                .cpd-stat-blue:hover {
                    box-shadow: 0 18px 36px -4px rgba(2, 132, 199, 0.48);
                }

                .cpd-stat-pink {
                    background: #db2777 !important;
                    box-shadow: 0 10px 24px -4px rgba(219, 39, 119, 0.38), 0 4px 10px -2px rgba(219, 39, 119, 0.2);
                }
                .cpd-stat-pink:hover {
                    box-shadow: 0 18px 36px -4px rgba(219, 39, 119, 0.48);
                }

                .cpd-stat-purple {
                    background: #7c3aed !important;
                    box-shadow: 0 10px 24px -4px rgba(124, 58, 237, 0.38), 0 4px 10px -2px rgba(124, 58, 237, 0.2);
                }
                .cpd-stat-purple:hover {
                    box-shadow: 0 18px 36px -4px rgba(124, 58, 237, 0.48);
                }

                .cpd-liquid-glass .cpd-view-action {
                    opacity: 0.85;
                    transition: all 0.22s ease;
                }

                .cpd-liquid-glass:hover .cpd-view-action {
                    opacity: 1;
                    color: #0284c7;
                }

                .cpd-red-arrow {
                    transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
                    color: #ef4444;
                }

                .cpd-liquid-glass:hover .cpd-red-arrow {
                    transform: translateX(5px);
                    color: #dc2626;
                }

                .cpd-staff-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(15, 23, 42, 0.18) transparent;
                }

                .cpd-staff-scroll::-webkit-scrollbar {
                    width: 6px;
                }

                .cpd-staff-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }

                .cpd-staff-scroll::-webkit-scrollbar-thumb {
                    background: rgba(15, 23, 42, 0.18);
                    border-radius: 999px;
                }

                .cpd-staff-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(15, 23, 42, 0.32);
                }
            `}</style>

            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                }}
            >
                {/* Fixed Locked Header: Dashboard Title & Search Bar Remain Permanently Locked Directly Below Header */}
                <Box
                    className="cpd-locked-dashboard-bar"
                    style={{
                        position: 'fixed',
                        top: 76,
                        left: 'var(--app-shell-navbar-offset, 0px)',
                        right: 0,
                        zIndex: 99,
                        backgroundColor: '#F5F5F5',
                        paddingLeft: 'var(--mantine-spacing-lg, 24px)',
                        paddingRight: 'var(--mantine-spacing-lg, 24px)',
                        paddingTop: 10,
                        paddingBottom: 10,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                        transition: 'left 200ms ease',
                    }}
                >
                    <Group justify="space-between" align="center" wrap="wrap" gap="md">
                        <Group align="center" gap="md" wrap="wrap">
                            <Title order={1} size={28} fw={900} c="#0f172a" style={{ letterSpacing: '-0.6px', lineHeight: 1.15 }}>
                                Dashboard
                            </Title>
                        </Group>

                        <TextInput
                            placeholder="Search staff by name, role, ILCCS..."
                            leftSection={<Search size={16} color="#0284c7" />}
                            value={internalSearch}
                            onChange={(e) => setInternalSearch(e.currentTarget.value)}
                            rightSection={
                                internalSearch ? (
                                    <CloseButton
                                        size="sm"
                                        onClick={() => setInternalSearch('')}
                                        aria-label="Clear search"
                                    />
                                ) : null
                            }
                            size="sm"
                            radius="xl"
                            w={{ base: '100%', sm: 300, md: 360 }}
                            styles={{
                                input: {
                                    backgroundColor: '#ffffff',
                                    border: '1.5px solid rgba(30, 186, 242, 0.35)',
                                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                                    fontWeight: 500,
                                    fontSize: 13,
                                    transition: 'all 180ms ease',
                                    '&:focus': {
                                        borderColor: '#1EBAF2',
                                        boxShadow: '0 0 0 3px rgba(30, 186, 242, 0.2)',
                                    }
                                }
                            }}
                        />
                    </Group>
                </Box>

                {/* Spacer to push content down cleanly below the fixed header */}
                <Box style={{ height: 60, flexShrink: 0 }} />

                {/* Top Content: 3 Stat Cards + Staff Directory Toolbar */}
                <Box style={{ flexShrink: 0 }}>
                    {/* Stats Grid - Solid Executive Colors (Not Too Bright) */}
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm" mb={12}>
                        {/* Total Staff Card - Solid Ocean Blue */}
                        <Paper p="md" className="cpd-stat-card-solid cpd-stat-blue">
                            <Group justify="space-between" align="flex-start" mb={4}>
                                <Stack gap={2}>
                                    <Text size="xs" fw={800} c="rgba(255, 255, 255, 0.9)" tt="uppercase" style={{ letterSpacing: '0.8px' }}>
                                        Total Staff
                                    </Text>
                                    <Title order={2} size={30} fw={900} c="#ffffff" style={{ letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                                        {data.totalStaff}
                                    </Title>
                                </Stack>
                                <Box
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <Users size={22} strokeWidth={2.4} color="#ffffff" />
                                </Box>
                            </Group>
                            <Box
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    padding: '2px 10px',
                                    borderRadius: 999,
                                    background: 'rgba(255, 255, 255, 0.22)',
                                    border: '1px solid rgba(255, 255, 255, 0.35)',
                                    marginTop: 2,
                                }}
                            >
                                <Text size="xs" fw={700} c="#ffffff">Active + Left</Text>
                            </Box>
                        </Paper>

                        {/* Active Staff Card - Solid Deep Rose / Raspberry */}
                        <Paper p="md" className="cpd-stat-card-solid cpd-stat-pink">
                            <Group justify="space-between" align="flex-start" mb={4}>
                                <Stack gap={2}>
                                    <Text size="xs" fw={800} c="rgba(255, 255, 255, 0.9)" tt="uppercase" style={{ letterSpacing: '0.8px' }}>
                                        Active Staff
                                    </Text>
                                    <Title order={2} size={30} fw={900} c="#ffffff" style={{ letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                                        {data.activeStaff}
                                    </Title>
                                </Stack>
                                <Box
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <UserCheck size={22} strokeWidth={2.4} color="#ffffff" />
                                </Box>
                            </Group>
                            <Text size="xs" c="rgba(255, 255, 255, 0.9)" fw={500} mt={2}>Employment status marked Active.</Text>
                        </Paper>

                        {/* Left Staff Card - Solid Regal Purple */}
                        <Paper p="md" className="cpd-stat-card-solid cpd-stat-purple">
                            <Group justify="space-between" align="flex-start" mb={4}>
                                <Stack gap={2}>
                                    <Text size="xs" fw={800} c="rgba(255, 255, 255, 0.9)" tt="uppercase" style={{ letterSpacing: '0.8px' }}>
                                        Left Staff
                                    </Text>
                                    <Title order={2} size={30} fw={900} c="#ffffff" style={{ letterSpacing: '-0.8px', lineHeight: 1.15 }}>
                                        {data.leftStaff}
                                    </Title>
                                </Stack>
                                <Box
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                    }}
                                >
                                    <UserMinus size={22} strokeWidth={2.4} color="#ffffff" />
                                </Box>
                            </Group>
                            <Text size="xs" c="rgba(255, 255, 255, 0.9)" fw={500} mt={2}>Staff members marked as Left.</Text>
                        </Paper>
                    </SimpleGrid>

                    {/* Staff Directory Toolbar: Staff Directory + Tabs on Left, Total Badge on Full Right */}
                    <Group justify="space-between" align="center" mb={12} wrap="wrap" gap="sm">
                        <Group gap="md" align="center" wrap="wrap">
                            <Title order={3} size={19} fw={800} c="#0f172a" style={{ letterSpacing: '-0.3px' }}>
                                Staff Directory
                            </Title>

                            <Tabs
                                value={activeTab}
                                onChange={setActiveTab}
                                variant="pills"
                                radius="xl"
                                styles={{
                                    root: { display: 'flex' },
                                    list: {
                                        backgroundColor: 'rgba(248, 249, 250, 0.95)',
                                        border: '1px solid rgba(0, 0, 0, 0.06)',
                                        padding: '4px',
                                        borderRadius: '50px',
                                        gap: '6px'
                                    },
                                    tab: {
                                        fontSize: '12.5px',
                                        height: '34px',
                                        borderRadius: '50px',
                                        paddingLeft: '14px',
                                        paddingRight: '14px',
                                        '&:hover': {
                                            opacity: 1
                                        }
                                    }
                                }}
                            >
                                <Tabs.List style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                    <Tabs.Tab value="active" style={filterTabStyle('active')}>
                                        Active
                                    </Tabs.Tab>
                                    <Tabs.Tab value="all" style={filterTabStyle('all')}>
                                        All Staff
                                    </Tabs.Tab>
                                    <Tabs.Tab value="left" style={filterTabStyle('left')}>
                                        Left
                                    </Tabs.Tab>
                                </Tabs.List>
                            </Tabs>
                        </Group>

                        <Badge
                            size="lg"
                            radius="xl"
                            variant="light"
                            color={
                                activeTab === 'active' ? 'pink'
                                    : activeTab === 'left' ? 'grape'
                                        : 'cyan'
                            }
                            styles={{
                                root: {
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    paddingLeft: '14px',
                                    paddingRight: '14px',
                                    height: '32px',
                                    fontSize: '12.5px',
                                    transition: 'all 200ms ease',
                                }
                            }}
                        >
                            {filterStatusLabel}
                        </Badge>
                    </Group>
                </Box>

                {/* Full-Page Staff Directory: Natural Smooth Scrolling */}
                <Box
                    style={{
                        width: '100%',
                        paddingBottom: 36,
                    }}
                    className="cpd-staff-grid-wrapper"
                >
                    {effectiveSearch && (
                        <Text size="xs" mb="xs" c="dimmed">
                            Searching for: <b>{effectiveSearch}</b>
                        </Text>
                    )}

                    {filteredStaff.length > 0 ? (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                            {filteredStaff.map((staff, index) => {
                                return (
                                    <Paper
                                        key={staff.id}
                                        p={0}
                                        className="cpd-liquid-glass"
                                        style={{
                                            animation: `fadeIn 0.4s ease-out ${index * 0.03}s forwards`,
                                            opacity: 0,
                                        }}
                                    >
                                        <Box p="md" style={{ position: 'relative', zIndex: 1 }}>
                                            <Group justify="space-between" align="flex-start" mb="sm">
                                                <Avatar
                                                    size={48}
                                                    radius="md"
                                                    variant="filled"
                                                    src={
                                                        profilePictureUrls[staff.id]
                                                        || (staff.profilePicture && token
                                                            ? `${staff.profilePicture}?token=${encodeURIComponent(token)}`
                                                            : null)
                                                    }
                                                    styles={{
                                                        root: {
                                                            background: staff.profilePicture ? 'transparent' : 'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)',
                                                            border: '1.5px solid rgba(255, 255, 255, 0.8)',
                                                            boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                                                            objectFit: 'cover'
                                                        },
                                                        placeholder: {
                                                            color: 'white',
                                                            fontWeight: 900,
                                                            fontSize: '16px',
                                                        },
                                                        image: {
                                                            objectFit: 'cover'
                                                        }
                                                    }}
                                                >
                                                    {!profilePictureUrls[staff.id] && staff.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                                </Avatar>
                                                {staff.employmentBadge && (
                                                    <Badge
                                                        size="sm"
                                                        variant="light"
                                                        color={staff.employmentBadge.toLowerCase() === 'active' ? 'teal' : 'gray'}
                                                        radius="sm"
                                                        style={{
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {staff.employmentBadge}
                                                    </Badge>
                                                )}
                                            </Group>

                                            <Text size="md" fw={900} c="#0f172a" mb={2} lineClamp={1}>{staff.fullName}</Text>
                                            <Text size="xs" c="#64748b" fw={600} mb="xs">{staff.role}</Text>

                                            <Group gap={4} mt="xs">
                                                <Users size={12} color="#64748b" />
                                                <Text size="xs" c="#64748b" fw={500}>ILCCS: {staff.ilccsNumber || 'N/A'}</Text>
                                            </Group>
                                        </Box>

                                        {/* Premium Action Footer: Seamless, borderless, red arrow on hover, Lucide delete icon */}
                                        <Box
                                            px="md"
                                            py="xs"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: 'transparent',
                                                border: 'none',
                                            }}
                                        >
                                            {/* View Profile with Red Arrow on hover */}
                                            <Box
                                                component={Link}
                                                to={`/dashboard/staff/${staff.id}`}
                                                className="cpd-view-action"
                                                style={{
                                                    textDecoration: 'none',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    color: '#0f172a',
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <span>View Profile</span>
                                                <ArrowRight size={15} strokeWidth={2.4} className="cpd-red-arrow" />
                                            </Box>

                                            {/* Lucide Delete Icon Button */}
                                            <ActionIcon
                                                variant="subtle"
                                                color="red"
                                                size="md"
                                                radius="md"
                                                aria-label={`Delete ${staff.fullName}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteTarget({ id: staff.id, fullName: staff.fullName });
                                                }}
                                                styles={{
                                                    root: {
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#ef4444',
                                                        transition: 'all 180ms ease',
                                                        '&:hover': {
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#dc2626',
                                                            transform: 'scale(1.12)',
                                                        }
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} strokeWidth={2} />
                                            </ActionIcon>
                                        </Box>
                                    </Paper>
                                );
                            })}
                        </SimpleGrid>
                    ) : (
                        <Paper p={60} radius="xl" withBorder style={{ textAlign: 'center', backgroundColor: '#F8F9FA' }}>
                            <ThemeIcon size={64} radius="xl" color="gray" variant="light" mb="md">
                                <Search size={32} />
                            </ThemeIcon>
                            <Title order={4} c="dimmed">No staff members found</Title>
                            <Text c="dimmed" mt={4}>Try adjusting your search or filters.</Text>
                        </Paper>
                    )}
                </Box>
            </Box>

            {/* In-App Confirmation Modal (First Layer Outside DOM) */}
            <Modal
                opened={!!deleteTarget}
                onClose={() => !isDeleting && setDeleteTarget(null)}
                title={
                    <Group gap="xs">
                        <ThemeIcon color="red" variant="light" size="md" radius="xl">
                            <AlertTriangle size={18} />
                        </ThemeIcon>
                        <Text fw={800} size="md" c="#0f172a">Confirm Staff Deletion</Text>
                    </Group>
                }
                centered
                radius="lg"
                overlayProps={{
                    backgroundOpacity: 0.45,
                    blur: 4,
                }}
                styles={{
                    header: {
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        paddingBottom: '12px',
                    },
                    body: {
                        paddingTop: '16px',
                    }
                }}
            >
                <Stack gap="md">
                    <Text size="sm" c="#475569">
                        Are you sure you want to delete <b style={{ color: '#0f172a' }}>{deleteTarget?.fullName}</b>? All associated compliance data and certificates will be permanently removed. This action cannot be undone.
                    </Text>
                    <Group justify="flex-end" gap="sm" mt="xs">
                        <Button
                            variant="subtle"
                            color="gray"
                            radius="md"
                            disabled={isDeleting}
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            radius="md"
                            loading={isDeleting}
                            leftSection={<Trash2 size={15} />}
                            onClick={handleConfirmDelete}
                            style={{
                                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                            }}
                        >
                            Delete Staff
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
};
