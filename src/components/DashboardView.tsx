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
    Container,
    ThemeIcon,
    Tabs,
    Button,
} from '@mantine/core';
import { Users, UserCheck, UserMinus, ChevronRight, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export const DashboardView = ({ searchQuery = '' }: { searchQuery?: string }) => {
    const [activeTab, setActiveTab] = useState<string | null>('all');
    const [data, setData] = useState({
        totalStaff: 0,
        activeStaff: 0,
        leftStaff: 0,
        users: [] as any[]
    });
    const [loading, setLoading] = useState(true);
    const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string>>({});
    const token = localStorage.getItem('token');

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

    const filteredStaff = data.users
        .filter(user => {
            const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.employmentBadge || user.status || '').toLowerCase().includes(searchQuery.toLowerCase());

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

    const handleDelete = async (userId: string, fullName: string) => {
        const confirmed = window.confirm(`Delete ${fullName}? This cannot be undone.`);
        if (!confirmed) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/v1/staff/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData((prev) => {
                const removed = prev.users.find((u: any) => u.id === userId);
                const remaining = prev.users.filter((u: any) => u.id !== userId);
                return {
                    ...prev,
                    users: remaining,
                    totalStaff: Math.max(0, prev.totalStaff - 1),
                    activeStaff: Math.max(0, prev.activeStaff - (removed?.status === 'ACTIVE' ? 1 : 0)),
                    leftStaff: Math.max(0, prev.leftStaff - (removed?.status === 'LEFT' ? 1 : 0)),
                };
            });
        } catch (err: any) {
            console.error('Failed to delete user', err?.response?.data || err?.message);
            alert(err?.response?.data?.message || 'Failed to delete user');
        }
    };

    return (
        <Box p="md" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <Container size="xl" p={0}>

                {/* Header Section */}
                <Group justify="space-between" align="flex-end" mb={24}>
                    <Box>
                        <Group align="center" gap="xs" mb={2}>
                            <ThemeIcon variant="light" size="md" radius="md" color="brandBlue.6">
                                <Users size={16} />
                            </ThemeIcon>
                            <Text fw={700} c="brandBlue.6" tt="uppercase" size="xs" style={{ letterSpacing: '0.5px' }}>
                                Admin Portal 🚀
                            </Text>
                        </Group>
                        <Title order={1} size={32} fw={900} c="dark.4" style={{ letterSpacing: '-0.5px' }}>
                            Dashboard
                        </Title>
                        <Text c="dimmed" mt={2} size="sm" maw={600}>
                            Welcome back. Here is an overview of your staff's compliance and activity.
                        </Text>
                    </Box>
                </Group>

                {/* Stats Grid */}
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing={{ base: 'sm', md: 'md' }} mb={{ base: 20, md: 32 }}>
                    {/* Total Staff Card */}
                    <Paper p={{ base: 'sm', md: 'md' }} radius="xl" style={{
                        background: 'linear-gradient(145deg, #1EBAF2 0%, #0F7296 100%)',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(30, 186, 242, 0.3)'
                    }}>
                        <Box style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        <Box style={{ position: 'absolute', bottom: -30, left: -15, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

                        <Group justify="space-between" align="flex-start" mb="sm">
                            <Stack gap={0}>
                                <Text size="xs" fw={700} tt="uppercase" opacity={0.8} style={{ letterSpacing: '0.5px' }}>Total Staff</Text>
                                <Title order={2} size={36} fw={900}>{data.totalStaff}</Title>
                            </Stack>
                            <ThemeIcon size={36} radius="md" color="white" variant="white" style={{ opacity: 0.9, color: '#1EBAF2' }}>
                                <Users size={18} />
                            </ThemeIcon>
                        </Group>
                        <Group gap={6} bg="rgba(0,0,0,0.2)" style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '8px' }}>
                            <Text size="xs" fw={700}>Active + Left</Text>
                        </Group>
                    </Paper>

                    {/* Active Staff Card */}
                    <Paper p={{ base: 'sm', md: 'md' }} radius="xl" style={{
                        background: 'linear-gradient(145deg, #E51690 0%, #E51690 100%)',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(229, 22, 144, 0.3)'
                    }}>
                        <Box style={{ position: 'absolute', top: -25, right: -25, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        <Group justify="space-between" align="flex-start" mb="sm">
                            <Stack gap={0}>
                                <Text size="xs" fw={700} tt="uppercase" opacity={0.8} style={{ letterSpacing: '0.5px' }}>Active Staff</Text>
                                <Title order={2} size={36} fw={900}>{data.activeStaff}</Title>
                            </Stack>
                            <ThemeIcon size={36} radius="md" color="white" variant="white" style={{ opacity: 0.9, color: '#E51690' }}>
                                <UserCheck size={18} />
                            </ThemeIcon>
                        </Group>
                        <Text size="xs" opacity={0.9}>Employment status marked Active.</Text>
                    </Paper>

                    {/* Left Staff Card */}
                    <Paper p={{ base: 'sm', md: 'md' }} radius="xl" style={{
                        background: 'linear-gradient(145deg, #6A1B9A 0%, #8E24AA 100%)',
                        color: 'white',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 40px rgba(106, 27, 154, 0.3)'
                    }}>
                        <Box style={{ position: 'absolute', top: -25, right: -25, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                        <Group justify="space-between" align="flex-start" mb="sm">
                            <Stack gap={0}>
                                <Text size="xs" fw={700} tt="uppercase" opacity={0.8} style={{ letterSpacing: '0.5px' }}>Left Staff</Text>
                                <Title order={2} size={36} fw={900}>{data.leftStaff}</Title>
                            </Stack>
                            <ThemeIcon size={36} radius="md" color="white" variant="white" style={{ opacity: 0.9, color: '#6A1B9A' }}>
                                <UserMinus size={18} />
                            </ThemeIcon>
                        </Group>
                        <Text size="xs" opacity={0.9}>Staff members marked as Left.</Text>
                    </Paper>
                </SimpleGrid>

                {/* Staff List Section */}
                <Box>
                    <Group justify="space-between" mb="md" align="center">
                        <Title order={3} size={20} fw={800} c="dark.4">Staff Directory</Title>

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
                                    padding: '5px',
                                    borderRadius: '50px',
                                    gap: '8px'
                                },
                                tab: {
                                    fontSize: '13px',
                                    height: '38px',
                                    borderRadius: '50px',
                                    paddingLeft: '16px',
                                    paddingRight: '16px',
                                    '&:hover': {
                                        opacity: 1
                                    }
                                }
                            }}
                        >
                            <Tabs.List style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                                <Tabs.Tab value="all" style={filterTabStyle('all')}>
                                    All Staff
                                </Tabs.Tab>
                                <Tabs.Tab value="active" style={filterTabStyle('active')}>
                                    Active
                                </Tabs.Tab>
                                <Tabs.Tab value="left" style={filterTabStyle('left')}>
                                    Left
                                </Tabs.Tab>
                            </Tabs.List>
                        </Tabs>
                    </Group>

                    <Group gap="xs" mb="md" align="center">
                        <Badge
                            size="lg"
                            radius="md"
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
                                    transition: 'all 200ms ease',
                                }
                            }}
                        >
                            {filterStatusLabel}
                        </Badge>
                    </Group>

                    {searchQuery && (
                        <Text size="sm" mb="md" c="dimmed">Searching for: <b>{searchQuery}</b></Text>
                    )}

                    {filteredStaff.length > 0 ? (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
                            {filteredStaff.map((staff, index) => {
                                // Match exactly with Top Stats Cards
                                const cardStyles = [
                                    {
                                        bg: 'linear-gradient(145deg, #1EBAF2 0%, #0F7296 100%)', // Match Total Staff
                                        shadow: 'rgba(30, 186, 242, 0.3)'
                                    },
                                    {
                                        bg: 'linear-gradient(145deg, #E51690 0%, #E51690 100%)', // Match Active Staff
                                        shadow: 'rgba(229, 22, 144, 0.3)'
                                    },
                                    {
                                        bg: 'linear-gradient(145deg, #6A1B9A 0%, #8E24AA 100%)', // Match Left Staff
                                        shadow: 'rgba(106, 27, 154, 0.3)'
                                    }
                                ];
                                const style = cardStyles[index % cardStyles.length];

                                return (
                                    <Paper
                                        key={staff.id}
                                        p={0}
                                        radius="24" // Match Top Cards radius
                                        withBorder={false}
                                        style={{
                                            overflow: 'hidden',
                                            transition: 'all 0.2s ease',
                                            background: style.bg,
                                            boxShadow: `0 10px 40px ${style.shadow}`, // Match Top Cards shadow
                                            animation: `fadeIn 0.5s ease-out ${index * 0.1}s forwards`,
                                            opacity: 0,
                                            position: 'relative'
                                        }}
                                        className="staff-card-hover"
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-6px)';
                                            e.currentTarget.style.boxShadow = `0 20px 50px ${style.shadow}`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = `0 10px 40px ${style.shadow}`;
                                        }}
                                    >
                                        {/* Decorative Circles - Exactly like Top Cards */}
                                        <Box style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                                        <Box style={{ position: 'absolute', bottom: -40, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                                        <Box p="md" style={{ position: 'relative', zIndex: 1 }}>
                                            <Group justify="space-between" align="flex-start" mb="sm">
                                                <Avatar
                                                    size={56}
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
                                                            background: staff.profilePicture ? 'transparent' : 'rgba(0, 0, 0, 0.25)', // Dark glass for pop
                                                            backdropFilter: 'blur(4px)',
                                                            border: '1px solid rgba(255, 255, 255, 0.25)',
                                                            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.15)',
                                                            objectFit: 'cover'
                                                        },
                                                        placeholder: {
                                                            color: 'white',
                                                            fontWeight: 800,
                                                            fontSize: '20px',
                                                            textShadow: '0 2px 10px rgba(0,0,0,0.3)'
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
                                                        variant="filled"
                                                        radius="sm"
                                                        style={{
                                                            backgroundColor: 'rgba(0, 0, 0, 0.15)', // Dark glass for contrast
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            backdropFilter: 'blur(4px)',
                                                            border: '1px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                        {staff.employmentBadge}
                                                    </Badge>
                                                )}
                                            </Group>

                                            <Text size="md" fw={800} c="white" mb={2} lineClamp={1}>{staff.fullName}</Text>
                                            <Text size="xs" c="white" opacity={0.8} fw={600} mb="sm">{staff.role}</Text>

                                            <Group gap="apart" mt="xs">
                                                <Group gap={4}>
                                                    <Users size={12} color="rgba(255,255,255,0.7)" />
                                                    <Text size="xs" c="white" opacity={0.7}>ILCCS: {staff.ilccsNumber || 'N/A'}</Text>
                                                </Group>
                                            </Group>
                                        </Box>

                                        <Box
                                            p="sm"
                                            bg="rgba(0,0,0,0.1)"
                                            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <Group gap="xs" grow wrap="wrap">
                                                <Button
                                                    component={Link}
                                                    to={`/dashboard/staff/${staff.id}`}
                                                    variant="filled"
                                                    size="xs"
                                                    rightSection={<ChevronRight size={12} />}
                                                    style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                        borderRadius: '12px',
                                                        backdropFilter: 'blur(4px)'
                                                    }}
                                                    w={{ base: '100%', sm: 'auto' }}
                                                    styles={{
                                                        root: {
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.3) !important'
                                                            }
                                                        }
                                                    }}
                                                >
                                                    View Profile
                                                </Button>
                                                <Button
                                                    color="red"
                                                    variant="filled"
                                                    size="xs"
                                                    onClick={() => handleDelete(staff.id, staff.fullName)}
                                                    w={{ base: '100%', sm: 'auto' }}
                                                    styles={{
                                                        root: {
                                                            backgroundColor: 'rgba(255, 0, 0, 0.25)',
                                                            border: '1px solid rgba(255, 255, 255, 0.3)',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            borderRadius: '12px',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 0, 0, 0.35) !important'
                                                            }
                                                        }
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </Group>
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
            </Container>
        </Box>
    );
};
