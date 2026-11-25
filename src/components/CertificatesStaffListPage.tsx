import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box,
    Container,
    Title,
    Text,
    SimpleGrid,
    Paper,
    Avatar,
    Group,
    Badge,
    Stack,
    ThemeIcon,
    TextInput,
    Button,
    Loader,
    Center,
    Progress,
    Card,
    Pagination,
    Select,
    ActionIcon,
    Tooltip,
    SegmentedControl,
} from '@mantine/core';
import {
    Award,
    Search,
    Users,
    CheckCircle2,
    Clock,
    RefreshCw,
    Filter,
    ArrowRight,
    GraduationCap,
    BookOpen,
    Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

interface StaffCertSummary {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    ilccsNumber: string;
    lcaNumber: string;
    profilePicture: string | null;
    employmentStatus: string;
    totalCertificates: number;
    completedCertificates: number;
    pendingCertificates: number;
}

export function CertificatesStaffListPage() {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<StaffCertSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<string>('50');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [profilePictureUrls, setProfilePictureUrls] = useState<Record<string, string>>({});

    const fetchStaff = useCallback(async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setRefreshing(true);
            else setLoading(true);

            const token = localStorage.getItem('token');
            const res = await axios.get('/api/v1/isolated-certificates/staff', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: StaffCertSummary[] = res.data || [];
            setStaffList(data);
            setLastUpdated(new Date());

            if (isManualRefresh) {
                notifications.show({
                    title: 'Data Refreshed',
                    message: `Loaded latest certificates status for ${data.length} staff members.`,
                    color: 'teal',
                });
            }

            // Fetch profile pictures as blobs if available
            const urls: Record<string, string> = {};
            await Promise.all(
                data.map(async (s) => {
                    if (!s.profilePicture) return;
                    try {
                        const imgRes = await axios.get(s.profilePicture, {
                            headers: { Authorization: `Bearer ${token}` },
                            responseType: 'blob',
                        });
                        urls[s.id] = URL.createObjectURL(imgRes.data);
                    } catch {
                        // ignore image error
                    }
                })
            );
            setProfilePictureUrls(urls);
        } catch (err: any) {
            console.error('Failed to load certificates staff list:', err);
            notifications.show({
                title: 'Error',
                message: 'Could not fetch certificates directory.',
                color: 'red',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    // Reset pagination to page 1 on search or filter change
    useEffect(() => {
        setPage(1);
    }, [search, filterCategory, pageSize]);

    // Helper: Parse numeric digits from ILCCS (e.g. ILCCS01284 -> 1284) to sort highest first
    const parseIlccsNumeric = (ilccsNumber: string | null | undefined): number => {
        if (!ilccsNumber) return -1;
        const digits = String(ilccsNumber).replace(/\D/g, '');
        if (!digits) return -1;
        const parsed = parseInt(digits, 10);
        return isNaN(parsed) ? -1 : parsed;
    };

    // Global Search, Filter, and ILCCS Descending Sort logic
    const filteredStaff = useMemo(() => {
        const query = search.trim().toLowerCase();

        return staffList
            .filter((s) => {
                // Search matches: name, email, ilccs, lca
                const matchesSearch =
                    !query ||
                    (s.fullName || '').toLowerCase().includes(query) ||
                    (s.email || '').toLowerCase().includes(query) ||
                    (s.ilccsNumber || '').toLowerCase().includes(query) ||
                    (s.lcaNumber || '').toLowerCase().includes(query);

                if (!matchesSearch) return false;

                // Category filter
                if (filterCategory === 'active') {
                    return (s.employmentStatus || 'active').toLowerCase() === 'active';
                }
                if (filterCategory === 'has_pending') {
                    return s.pendingCertificates > 0;
                }
                if (filterCategory === 'all_completed') {
                    return s.totalCertificates > 0 && s.pendingCertificates === 0;
                }

                return true;
            })
            // Descending sequence: bigger ILCCS numbers first (e.g. ILCCS01284, ILCCS01283, ILCCS01282...)
            .sort((a, b) => parseIlccsNumeric(b.ilccsNumber) - parseIlccsNumeric(a.ilccsNumber));
    }, [staffList, search, filterCategory]);

    // Pagination calculations (50-pager default)
    const limit = parseInt(pageSize, 10) || 50;
    const totalPages = Math.max(1, Math.ceil(filteredStaff.length / limit));
    const paginatedStaff = useMemo(() => {
        const startIndex = (page - 1) * limit;
        return filteredStaff.slice(startIndex, startIndex + limit);
    }, [filteredStaff, page, limit]);

    const totalCertificatesAll = useMemo(
        () => staffList.reduce((acc, s) => acc + s.totalCertificates, 0),
        [staffList]
    );
    const totalCompletedAll = useMemo(
        () => staffList.reduce((acc, s) => acc + s.completedCertificates, 0),
        [staffList]
    );

    if (loading) {
        return (
            <Center h="60vh">
                <Stack align="center" gap="sm">
                    <Loader size="lg" color="blue" />
                    <Text size="sm" c="dimmed">Loading staff certificate directories...</Text>
                </Stack>
            </Center>
        );
    }

    return (
        <Box w="100%" px={{ base: 'xs', sm: 'md', md: 'lg' }} py="md" style={{ boxSizing: 'border-box' }}>
            <style>{`
                .cpd-locked-cert-bar {
                    position: fixed !important;
                    top: 76px !important;
                    left: var(--app-shell-navbar-offset, 0px) !important;
                    right: 0 !important;
                    z-index: 99 !important;
                    background-color: #F5F5F5 !important;
                }

                .cpd-cert-staff-card {
                    position: relative;
                    border-radius: 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.62) 100%) !important;
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border: 1.5px solid rgba(255, 255, 255, 0.95) !important;
                    box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02);
                    transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease, border-color 0.28s ease, background 0.28s ease;
                    cursor: pointer;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justifyContent: space-between;
                }

                .cpd-cert-staff-card:hover {
                    transform: translateY(-6px) scale(1.015);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.78) 100%) !important;
                    box-shadow: 0 20px 38px -8px rgba(30, 186, 242, 0.22), 0 8px 16px -4px rgba(15, 23, 42, 0.06);
                    border-color: rgba(30, 186, 242, 0.5) !important;
                }

                .cpd-cert-staff-card .cpd-view-action {
                    opacity: 0.85;
                    transition: all 0.2s ease;
                }

                .cpd-cert-staff-card:hover .cpd-view-action {
                    opacity: 1;
                    color: #0284c7;
                }

                .cpd-cert-staff-card .cpd-action-arrow {
                    transition: transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
                    color: #ef4444;
                }

                .cpd-cert-staff-card:hover .cpd-action-arrow {
                    transform: translateX(4px);
                    color: #dc2626;
                }
            `}</style>

            {/* Fixed Locked Search & Filter Bar: Permanently locked directly below 76px blue header */}
            <Box
                className="cpd-locked-cert-bar"
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
                    <TextInput
                        placeholder="Search name, ILCCS number, email..."
                        leftSection={<Search size={16} color="#0284c7" />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        radius="md"
                        size="sm"
                        style={{ flex: 1, minWidth: 260 }}
                        styles={{
                            input: {
                                backgroundColor: '#ffffff',
                                border: '1.5px solid rgba(30, 186, 242, 0.35)',
                                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                                fontWeight: 500,
                            }
                        }}
                    />

                    {/* Filter Segment */}
                    <SegmentedControl
                        value={filterCategory}
                        onChange={setFilterCategory}
                        data={[
                            { label: `All (${staffList.length})`, value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Has Preview', value: 'has_pending' },
                            { label: '100% Verified', value: 'all_completed' },
                        ]}
                        size="xs"
                        radius="md"
                    />

                    {/* Page Size Selector */}
                    <Group gap="xs" align="center">
                        <Text size="xs" c="dimmed" fw={600}>Per Page:</Text>
                        <Select
                            value={pageSize}
                            onChange={(val) => setPageSize(val || '50')}
                            data={[
                                { label: '25', value: '25' },
                                { label: '50 (Default)', value: '50' },
                                { label: '100', value: '100' },
                            ]}
                            size="xs"
                            w={110}
                            radius="md"
                        />
                    </Group>
                </Group>
            </Box>

            {/* Spacer to push content down cleanly below the fixed header */}
            <Box style={{ height: 60, flexShrink: 0 }} />

            {/* Page Header */}
            <Paper
                p="lg"
                radius={20}
                mb="lg"
                style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    color: '#ffffff',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Group justify="space-between" align="center" wrap="wrap" gap="md">
                    <Box>
                        <Group gap="sm" mb={6}>
                            <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: '#1EBAF2', to: '#E51690', deg: 135 }}>
                                <Award size={22} color="white" />
                            </ThemeIcon>
                            <Title order={2} style={{ color: '#ffffff', fontWeight: 800 }}>
                                Staff Certificates
                            </Title>
                        </Group>
                        <Text size="sm" c="dimmed" style={{ maxWidth: 640 }}>
                            Isolated certificate directory. Unlocks on-demand preview view & download for all courses. Read-only and strictly decoupled from live records.
                        </Text>
                    </Box>

                    {/* Summary Metrics & Real-time Refresh */}
                    <Group gap="sm" align="center">
                        <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 105, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Group gap={6} mb={2}>
                                <Users size={14} color="#38BDF8" />
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Staff</Text>
                            </Group>
                            <Text size="xl" fw={800} c="white">{staffList.length}</Text>
                        </Paper>
                        <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 110, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Group gap={6} mb={2}>
                                <Award size={14} color="#38BDF8" />
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Total Certs</Text>
                            </Group>
                            <Text size="xl" fw={800} style={{ color: '#1EBAF2' }}>{totalCertificatesAll}</Text>
                        </Paper>
                        <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 105, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Group gap={6} mb={2}>
                                <CheckCircle2 size={14} color="#34D399" />
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Verified</Text>
                            </Group>
                            <Text size="xl" fw={800} style={{ color: '#10B981' }}>{totalCompletedAll}</Text>
                        </Paper>

                        <Tooltip label={`Last synced: ${lastUpdated.toLocaleTimeString()}`}>
                            <ActionIcon
                                size="lg"
                                radius="md"
                                variant="light"
                                color="blue"
                                loading={refreshing}
                                onClick={() => fetchStaff(true)}
                                aria-label="Refresh data"
                            >
                                <RefreshCw size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Paper>

            {/* Results Counter */}
            <Group justify="space-between" align="center" mb="md">
                <Text size="sm" c="dimmed">
                    Showing <Text component="span" fw={700} c="dark">{Math.min(filteredStaff.length, (page - 1) * limit + 1)}–{Math.min(filteredStaff.length, page * limit)}</Text> of <Text component="span" fw={700} c="dark">{filteredStaff.length}</Text> staff
                    {filterCategory !== 'all' && ` (${filterCategory.replace('_', ' ')})`}
                </Text>

                {totalPages > 1 && (
                    <Pagination
                        value={page}
                        onChange={setPage}
                        total={totalPages}
                        size="sm"
                        radius="md"
                        color="blue"
                    />
                )}
            </Group>

            {/* Staff Cards Grid */}
            {paginatedStaff.length === 0 ? (
                <Paper p="xl" radius="md" withBorder ta="center">
                    <Users size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <Title order={4} c="dimmed">No staff members match the criteria</Title>
                    <Text size="sm" c="dimmed">Try clearing search filters</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                    {paginatedStaff.map((staff) => {
                        const avatarUrl = profilePictureUrls[staff.id] || staff.profilePicture;
                        const completionRate = staff.totalCertificates > 0
                            ? Math.round((staff.completedCertificates / staff.totalCertificates) * 100)
                            : 0;

                        return (
                            <Paper
                                key={staff.id}
                                p="md"
                                className="cpd-cert-staff-card"
                                onClick={() => navigate(`/dashboard/certificates/staff/${staff.id}`)}
                            >
                                <Box>
                                    <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                                            <Avatar
                                                src={avatarUrl}
                                                size={46}
                                                radius="md"
                                                styles={{
                                                    root: {
                                                        background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)',
                                                        border: '1.5px solid rgba(255, 255, 255, 0.85)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                        flexShrink: 0,
                                                    },
                                                    placeholder: {
                                                        color: 'white',
                                                        fontWeight: 900,
                                                        fontSize: '15px',
                                                    }
                                                }}
                                            >
                                                {staff.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </Avatar>
                                            <Box style={{ minWidth: 0, flex: 1 }}>
                                                <Text fw={900} size="sm" c="#0f172a" lineClamp={1}>
                                                    {staff.fullName}
                                                </Text>
                                                <Text size="xs" c="#64748b" fw={600} lineClamp={1}>
                                                    {staff.email}
                                                </Text>
                                            </Box>
                                        </Group>

                                        {staff.ilccsNumber && (
                                            <Badge
                                                variant="light"
                                                color="blue"
                                                size="xs"
                                                radius="sm"
                                                fw={800}
                                                style={{ flexShrink: 0 }}
                                            >
                                                {staff.ilccsNumber}
                                            </Badge>
                                        )}
                                    </Group>

                                    {/* Stats & Progress */}
                                    <Box
                                        my="xs"
                                        p="xs"
                                        style={{
                                            background: 'rgba(241, 245, 249, 0.72)',
                                            borderRadius: 12,
                                            border: '1px solid rgba(226, 232, 240, 0.7)',
                                        }}
                                    >
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={5}>
                                                <GraduationCap size={14} color="#0284c7" />
                                                <Text size="xs" fw={700} c="#475569">Enrolled Courses</Text>
                                            </Group>
                                            <Text size="xs" fw={900} c="#0f172a">{staff.totalCertificates}</Text>
                                        </Group>
                                        <Progress
                                            value={completionRate}
                                            size="sm"
                                            radius="xl"
                                            color={completionRate === 100 ? 'teal' : 'blue'}
                                        />
                                        <Group justify="space-between" mt={6}>
                                            <Group gap={4}>
                                                <CheckCircle2 size={12} color="#10B981" />
                                                <Text size="xs" c="#475569" fw={600}>{staff.completedCertificates} completed</Text>
                                            </Group>
                                            {staff.pendingCertificates > 0 && (
                                                <Group gap={4}>
                                                    <Clock size={12} color="#F59E0B" />
                                                    <Text size="xs" c="#ea580c" fw={600}>{staff.pendingCertificates} pending</Text>
                                                </Group>
                                            )}
                                        </Group>
                                    </Box>
                                </Box>

                                {/* Clean Action Footer: Seamless, borderless, red arrow on hover */}
                                <Box
                                    pt="xs"
                                    mt="xs"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderTop: '1px solid rgba(226, 232, 240, 0.7)',
                                        background: 'transparent',
                                    }}
                                >
                                    <Box
                                        className="cpd-view-action"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: '#0f172a',
                                            fontSize: '12.5px',
                                            fontWeight: 700,
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <span>View Certificates</span>
                                        <ArrowRight size={14} strokeWidth={2.4} className="cpd-action-arrow" />
                                    </Box>

                                    <Badge
                                        size="xs"
                                        variant="light"
                                        color={staff.employmentStatus?.toLowerCase() === 'active' ? 'teal' : 'gray'}
                                        radius="sm"
                                        fw={700}
                                    >
                                        {staff.employmentStatus || 'Active'}
                                    </Badge>
                                </Box>
                            </Paper>
                        );
                    })}
                </SimpleGrid>
            )}

            {/* Bottom 50-Pager Pagination Bar */}
            {totalPages > 1 && (
                <Center mt="xl">
                    <Pagination
                        value={page}
                        onChange={setPage}
                        total={totalPages}
                        size="md"
                        radius="md"
                        color="blue"
                    />
                </Center>
            )}
        </Box>
    );
}
