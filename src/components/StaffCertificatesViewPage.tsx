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
    Button,
    Loader,
    Center,
    TextInput,
    Tabs,
    Modal,
    ActionIcon,
    Tooltip,
    Alert,
    SegmentedControl,
} from '@mantine/core';
import {
    ArrowLeft,
    Search,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    FileCheck,
    Sparkles,
    RefreshCw,
    Award,
    Building2,
    Calendar,
    Mail,
    BookOpen,
    GraduationCap,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

interface CertificateItem {
    id: string;
    courseName: string;
    subModule: string | null;
    displayName: string;
    provider: string;
    monthNumber: number;
    status: string;
    isCompleted: boolean;
    displayDate: string;
    isEstimatedDate: boolean;
    offsetDays: number;
    enrollmentDate: string | null;
    registrationNo: string | null;
}

interface StaffDetails {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    ilccsNumber: string;
    lcaNumber: string;
    profilePicture: string | null;
}

export function StaffCertificatesViewPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [staff, setStaff] = useState<StaffDetails | null>(null);
    const [certificates, setCertificates] = useState<CertificateItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'not_completed'>('all');
    const [lastSynced, setLastSynced] = useState<Date>(new Date());

    // Viewer modal state
    const [viewerModalOpen, setViewerModalOpen] = useState(false);
    const [activeViewerUrl, setActiveViewerUrl] = useState<string | null>(null);
    const [viewingCourseName, setViewingCourseName] = useState<string>('');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const fetchCertificates = useCallback(async (isManual = false) => {
        if (!id) return;
        try {
            if (isManual) setRefreshing(true);
            else setLoading(true);

            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/v1/isolated-certificates/staff/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStaff(res.data.staff);
            setCertificates(res.data.certificates || []);
            setLastSynced(new Date());

            if (isManual) {
                notifications.show({
                    title: 'Refreshed',
                    message: 'Staff certificates up to date.',
                    color: 'teal',
                });
            }
        } catch (err: any) {
            console.error('Failed to load certificates for staff:', err);
            notifications.show({
                title: 'Error',
                message: 'Could not load staff certificates directory.',
                color: 'red',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchCertificates();
    }, [fetchCertificates]);

    const closeViewer = () => {
        setViewerModalOpen(false);
        if (activeViewerUrl) {
            URL.revokeObjectURL(activeViewerUrl);
            setActiveViewerUrl(null);
        }
    };

    const handleView = async (cert: CertificateItem) => {
        try {
            setActionLoadingId(cert.id);
            const token = localStorage.getItem('token');

            // Two attempts in case stream view token expires during network transit
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const tokenRes = await axios.post(
                        `/api/v1/isolated-certificates/${cert.id}/view-token`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const streamToken = tokenRes.data.token;

                    const streamRes = await axios.get(
                        `/api/v1/isolated-certificates/${cert.id}/stream?token=${streamToken}`,
                        { responseType: 'blob' }
                    );

                    const blobUrl = URL.createObjectURL(new Blob([streamRes.data], { type: 'application/pdf' }));
                    setActiveViewerUrl(blobUrl);
                    setViewingCourseName(cert.displayName);
                    setViewerModalOpen(true);
                    return;
                } catch (streamErr: any) {
                    if (streamErr?.response?.status === 401 && attempt === 0) {
                        continue;
                    }
                    throw streamErr;
                }
            }
        } catch (err: any) {
            console.error('View failed:', err);
            notifications.show({
                title: 'Viewing Error',
                message: err.response?.data?.message || 'Could not generate certificate preview.',
                color: 'red',
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDownload = async (cert: CertificateItem) => {
        try {
            setActionLoadingId(cert.id);
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `/api/v1/isolated-certificates/${cert.id}/download`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = blobUrl;
            const safeName = (cert.displayName || 'Certificate').replace(/[^a-zA-Z0-9_\-]/g, '_');
            link.setAttribute('download', `${safeName}_Certificate.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            URL.revokeObjectURL(blobUrl);

            notifications.show({
                title: 'Download Started',
                message: `Certificate for "${cert.displayName}" downloaded successfully.`,
                color: 'teal',
            });
        } catch (err: any) {
            console.error('Download failed:', err);
            notifications.show({
                title: 'Download Failed',
                message: err.response?.data?.message || 'Failed to download certificate PDF.',
                color: 'red',
            });
        } finally {
            setActionLoadingId(null);
        }
    };

    // Filter certificates by search, month, and completion status (with client-side dedup safeguard)
    const filteredCertificates = useMemo(() => {
        const query = search.trim().toLowerCase();
        const seen = new Set<string>();

        return certificates.filter((c) => {
            const matchesSearch =
                !query ||
                c.displayName.toLowerCase().includes(query) ||
                c.provider.toLowerCase().includes(query);

            const matchesMonth =
                selectedMonth === 'all' ||
                c.monthNumber === parseInt(selectedMonth, 10);

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'completed' && c.isCompleted) ||
                (statusFilter === 'not_completed' && !c.isCompleted);

            if (!matchesSearch || !matchesMonth || !matchesStatus) return false;

            // Extra client-side dedup safeguard
            const normName = c.displayName
                .trim()
                .toLowerCase()
                .replace(/^certificate\s+in\s+/i, '')
                .replace(/\s+/g, ' ');
            const sub = (c.subModule || '').trim().toLowerCase();
            const dedupKey = `${normName}::${sub}`;
            if (seen.has(dedupKey)) return false;
            seen.add(dedupKey);

            return true;
        });
    }, [certificates, search, selectedMonth, statusFilter]);

    if (loading) {
        return (
            <Center h="60vh">
                <Stack align="center" gap="sm">
                    <Loader size="lg" color="blue" />
                    <Text size="sm" c="dimmed">Loading staff certificates...</Text>
                </Stack>
            </Center>
        );
    }

    if (!staff) {
        return (
            <Container size="md" py="xl">
                <Alert color="red" title="Staff Not Found">
                    Could not find the requested staff member.
                </Alert>
                <Button mt="md" variant="light" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/certificates')}>
                    Back to Staff List
                </Button>
            </Container>
        );
    }

    const completedCount = certificates.filter((c) => c.isCompleted).length;
    const previewCount = Math.max(0, certificates.length - completedCount);

    return (
        <Box w="100%" px={{ base: 'xs', sm: 'md', md: 'lg' }} py="md" style={{ boxSizing: 'border-box' }}>
            <style>{`
                .cpd-course-card {
                    position: relative;
                    border-radius: 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.72) 100%) !important;
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

                .cpd-course-card:hover {
                    transform: translateY(-6px) scale(1.015);
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.84) 100%) !important;
                    box-shadow: 0 20px 38px -8px rgba(30, 186, 242, 0.22), 0 8px 16px -4px rgba(15, 23, 42, 0.06);
                    border-color: rgba(30, 186, 242, 0.5) !important;
                }
            `}</style>

            {/* Top Navigation */}
            <Group justify="space-between" mb="md">
                <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    leftSection={<ArrowLeft size={16} />}
                    onClick={() => navigate('/dashboard/certificates')}
                >
                    Back to Staff List
                </Button>

                <Tooltip label={`Synced: ${lastSynced.toLocaleTimeString()}`}>
                    <Button
                        variant="light"
                        color="blue"
                        size="xs"
                        leftSection={<RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />}
                        loading={refreshing}
                        onClick={() => fetchCertificates(true)}
                    >
                        Sync Latest
                    </Button>
                </Tooltip>
            </Group>

            {/* Staff Profile Header Card */}
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
                    <Group gap="md">
                        <Avatar
                            src={staff.profilePicture}
                            size={56}
                            radius="md"
                            color="blue"
                            styles={{
                                root: {
                                    border: '2px solid rgba(30, 186, 242, 0.5)',
                                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                                }
                            }}
                        >
                            {staff.firstName?.charAt(0) || staff.email?.charAt(0) || 'S'}
                        </Avatar>
                        <Box>
                            <Group gap="xs" align="center">
                                <Title order={3} style={{ color: '#ffffff', fontWeight: 800 }}>
                                    {staff.fullName}
                                </Title>
                                {staff.ilccsNumber && (
                                    <Badge variant="filled" color="blue" size="sm" radius="sm" fw={800}>
                                        {staff.ilccsNumber}
                                    </Badge>
                                )}
                            </Group>
                            <Group gap={6} mt={2}>
                                <Mail size={13} color="#94A3B8" />
                                <Text size="xs" c="dimmed" fw={500}>
                                    {staff.email}
                                </Text>
                            </Group>
                        </Box>
                    </Group>

                    {/* Stats with icons */}
                    <Group gap="sm">
                        <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 110, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Group gap={6} mb={2}>
                                <BookOpen size={14} color="#38BDF8" />
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Enrolled</Text>
                            </Group>
                            <Text size="xl" fw={800} c="white">{certificates.length}</Text>
                        </Paper>
                        <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 110, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Group gap={6} mb={2}>
                                <CheckCircle2 size={14} color="#34D399" />
                                <Text size="xs" c="dimmed" fw={600} tt="uppercase">Completed</Text>
                            </Group>
                            <Text size="xl" fw={800} style={{ color: '#10B981' }}>{completedCount}</Text>
                        </Paper>
                        {previewCount > 0 && (
                            <Paper p="xs" px="md" radius="md" style={{ background: 'rgba(255,255,255,0.06)', minWidth: 110, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Group gap={6} mb={2}>
                                    <Clock size={14} color="#FB923C" />
                                    <Text size="xs" c="dimmed" fw={600} tt="uppercase">Pending</Text>
                                </Group>
                                <Text size="xl" fw={800} style={{ color: '#FB923C' }}>{previewCount}</Text>
                            </Paper>
                        )}
                    </Group>
                </Group>
            </Paper>

            {/* Read-Only Notice */}
            <Alert
                icon={<Sparkles size={16} />}
                color="blue"
                variant="light"
                radius="md"
                mb="md"
            >
                <Text size="xs">
                    <strong>Isolated Certificate Access:</strong> All courses are viewable and downloadable. Unverified courses render with a preview completion date (15–20 days ahead of enrolment). This date is strictly temporary and <strong>never written to original staff records</strong>.
                </Text>
            </Alert>

            {/* Search, Status, and Month Filter */}
            <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
                <Group gap="sm" style={{ flex: 1, minWidth: 280 }} wrap="wrap">
                    <TextInput
                        placeholder="Search certificate title or provider..."
                        leftSection={<Search size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        radius="md"
                        style={{ flex: 1, minWidth: 200, maxWidth: 320 }}
                    />

                    <SegmentedControl
                        value={statusFilter}
                        onChange={(val: any) => setStatusFilter(val)}
                        data={[
                            { label: `All (${certificates.length})`, value: 'all' },
                            { label: `Completed (${completedCount})`, value: 'completed' },
                            { label: `Not Completed (${previewCount})`, value: 'not_completed' },
                        ]}
                        size="xs"
                        radius="md"
                    />
                </Group>

                <Tabs value={selectedMonth} onChange={(val) => setSelectedMonth(val || 'all')}>
                    <Tabs.List>
                        <Tabs.Tab value="all">All Months</Tabs.Tab>
                        <Tabs.Tab value="0">Specialist</Tabs.Tab>
                        <Tabs.Tab value="1">M1</Tabs.Tab>
                        <Tabs.Tab value="2">M2</Tabs.Tab>
                        <Tabs.Tab value="3">M3</Tabs.Tab>
                        <Tabs.Tab value="4">M4</Tabs.Tab>
                        <Tabs.Tab value="5">M5</Tabs.Tab>
                        <Tabs.Tab value="6">M6</Tabs.Tab>
                    </Tabs.List>
                </Tabs>
            </Group>

            {/* Certificates Grid: Responsive 4 columns to utilize space properly */}
            {filteredCertificates.length === 0 ? (
                <Paper p="xl" radius="md" withBorder ta="center" mt="md">
                    <FileCheck size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                    <Title order={4} c="dimmed">No certificates found</Title>
                    <Text size="sm" c="dimmed">No certificates match your search query.</Text>
                </Paper>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                    {filteredCertificates.map((cert) => {
                        const formattedDate = new Date(cert.displayDate).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        });
                        const isLoading = actionLoadingId === cert.id;

                        return (
                            <Paper
                                key={cert.id}
                                p="md"
                                className="cpd-course-card"
                            >
                                <Box>
                                    <Group justify="space-between" align="flex-start" mb="xs">
                                        <Badge
                                            variant="light"
                                            color={cert.monthNumber === 0 ? 'violet' : 'indigo'}
                                            size="xs"
                                            radius="sm"
                                            leftSection={cert.monthNumber === 0 ? <Sparkles size={11} /> : <BookOpen size={11} />}
                                            fw={700}
                                        >
                                            {cert.monthNumber === 0 ? 'Specialist' : `Month ${cert.monthNumber}`}
                                        </Badge>

                                        {cert.isCompleted ? (
                                            <Badge
                                                variant="filled"
                                                color="teal"
                                                size="xs"
                                                radius="sm"
                                                leftSection={<CheckCircle2 size={12} strokeWidth={2.4} />}
                                                fw={700}
                                            >
                                                Completed
                                            </Badge>
                                        ) : (
                                            <Tooltip label="Course is not completed in live records. Clicking View or Download generates a temporary certificate (+15-20 days from enrolment) without saving to database.">
                                                <Badge
                                                    variant="light"
                                                    color="orange"
                                                    size="xs"
                                                    radius="sm"
                                                    leftSection={<Clock size={12} strokeWidth={2.2} />}
                                                    fw={700}
                                                >
                                                    Not Completed
                                                </Badge>
                                            </Tooltip>
                                        )}
                                    </Group>

                                    {/* Title with Course Icon */}
                                    <Group gap="xs" align="flex-start" wrap="nowrap" mt={6} mb={4}>
                                        <ThemeIcon
                                            size={32}
                                            radius="md"
                                            variant="light"
                                            color={cert.isCompleted ? 'teal' : 'blue'}
                                            style={{ flexShrink: 0, marginTop: 2 }}
                                        >
                                            <Award size={16} />
                                        </ThemeIcon>
                                        <Title order={5} fw={800} size={13.5} c="#0f172a" lineClamp={2} style={{ lineHeight: 1.35, minWidth: 0, flex: 1 }}>
                                            {cert.displayName}
                                        </Title>
                                    </Group>

                                    {/* Provider Info with Icon */}
                                    <Group gap={6} align="center" mt={6} mb="xs">
                                        <Building2 size={13} color="#64748b" />
                                        <Text size="xs" c="#64748b" fw={600}>
                                            Provider: <Text component="span" fw={700} c="#1e293b">{cert.provider || 'ILC'}</Text>
                                        </Text>
                                    </Group>

                                    {/* Date Display Pill Box with Calendar Icon */}
                                    <Box
                                        p="xs"
                                        mb="sm"
                                        style={{
                                            background: 'rgba(241, 245, 249, 0.75)',
                                            borderRadius: 12,
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                        }}
                                    >
                                        <Group justify="space-between" align="center">
                                            <Group gap={5}>
                                                <Calendar size={13} color={cert.isCompleted ? '#10B981' : '#0284c7'} />
                                                <Text size="xs" fw={700} c="#475569">
                                                    {cert.isCompleted ? 'Completion Date:' : 'Estimated Date:'}
                                                </Text>
                                            </Group>
                                            <Text size="xs" fw={800} c={cert.isCompleted ? '#059669' : '#0284c7'}>
                                                {formattedDate}
                                            </Text>
                                        </Group>
                                        {cert.isEstimatedDate && (
                                            <Text size="10px" c="#94a3b8" fw={600} mt={2}>
                                                (+{cert.offsetDays} days from enrolment)
                                            </Text>
                                        )}
                                    </Box>
                                </Box>

                                {/* Action Buttons */}
                                <Group gap="xs" mt="xs">
                                    <Button
                                        variant="filled"
                                        color="blue"
                                        size="xs"
                                        radius="md"
                                        style={{ flex: 1, fontWeight: 700, boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)' }}
                                        leftSection={<Eye size={14} />}
                                        loading={isLoading}
                                        onClick={() => handleView(cert)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        variant="outline"
                                        color="blue"
                                        size="xs"
                                        radius="md"
                                        style={{ flex: 1, fontWeight: 700 }}
                                        leftSection={<Download size={14} />}
                                        loading={isLoading}
                                        onClick={() => handleDownload(cert)}
                                    >
                                        Download
                                    </Button>
                                </Group>
                            </Paper>
                        );
                    })}
                </SimpleGrid>
            )}

            {/* In-App Certificate Viewer Modal */}
            <Modal
                opened={viewerModalOpen}
                onClose={closeViewer}
                title={
                    <Group gap="xs">
                        <FileCheck size={20} color="#1EBAF2" />
                        <Text fw={700} size="md">
                            Certificate Preview: {viewingCourseName}
                        </Text>
                    </Group>
                }
                size="85%"
                radius="md"
                styles={{
                    body: { height: '80vh', padding: 0, display: 'flex', flexDirection: 'column' },
                    header: { borderBottom: '1px solid #E2E8F0', padding: '12px 20px' },
                }}
            >
                {activeViewerUrl ? (
                    <Box style={{ flex: 1, height: '100%', width: '100%', position: 'relative' }}>
                        <iframe
                            src={activeViewerUrl}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="Certificate Viewer"
                        />
                    </Box>
                ) : (
                    <Center h="100%">
                        <Loader size="lg" />
                    </Center>
                )}
            </Modal>
        </Box>
    );
}
