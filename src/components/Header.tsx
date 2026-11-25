import { Group, ActionIcon, Indicator, Avatar, Box, Text, Divider, Menu, UnstyledButton, Burger, Tooltip } from '@mantine/core';
import { Bell, Settings, User, LogOut, ShieldCheck, Mail, Clock, Menu as MenuIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { notifications as mantineNotifications } from '@mantine/notifications';
import { useSidebar } from '../contexts/SidebarContext';

export const DigitalClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });

    const dateString = time.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

    return (
        <Group
            gap={12}
            px={18}
            py={7}
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                borderRadius: 999,
                border: '1px solid rgba(0, 0, 0, 0.15)',
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08)',
                flexShrink: 0,
            }}
            visibleFrom="md"
        >
            <Clock size={15} color="#111827" style={{ opacity: 0.9 }} />
            <Text
                fw={900}
                size="xs"
                c="#111827"
                style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    letterSpacing: '0.8px',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                }}
            >
                {timeString}
            </Text>
            <Divider orientation="vertical" h={14} color="rgba(0, 0, 0, 0.2)" />
            <Text
                fw={700}
                size="11.5px"
                c="#1f2937"
                style={{ lineHeight: 1 }}
            >
                {dateString}
            </Text>
        </Group>
    );
};

export const TopHeader = ({
    searchQuery,
    onSearch,
    mobileOpened,
    onToggleMobile,
}: {
    searchQuery?: string;
    onSearch?: (val: string) => void;
    mobileOpened?: boolean;
    onToggleMobile?: () => void;
}) => {
    const navigate = useNavigate();
    const { collapsed, toggle } = useSidebar();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const knownIdsRef = useRef<Set<string>>(new Set());

    const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || 'User');
    const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string | null>(null);
    const avatarBlobRef = useRef<string | null>(null);

    const fetchMyAvatar = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get(`/api/v1/staff/me/profile-picture?t=${Date.now()}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            if (avatarBlobRef.current) {
                URL.revokeObjectURL(avatarBlobRef.current);
            }
            const blobUrl = URL.createObjectURL(res.data);
            avatarBlobRef.current = blobUrl;
            setHeaderAvatarUrl(blobUrl);
        } catch {
            // ignore if no custom photo uploaded yet
        }
    };

    const syncUserProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/v1/staff/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const p = res.data;
            const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            if (fullName) {
                setUserName(fullName);
                localStorage.setItem('userName', fullName);
            }
            if (p.profilePicture) {
                fetchMyAvatar();
            } else {
                if (avatarBlobRef.current) {
                    URL.revokeObjectURL(avatarBlobRef.current);
                    avatarBlobRef.current = null;
                }
                setHeaderAvatarUrl(null);
            }
        } catch {
            fetchMyAvatar();
        }
    };

    useEffect(() => {
        syncUserProfile();

        const onUserUpdated = () => {
            syncUserProfile();
        };

        window.addEventListener('userProfileUpdated', onUserUpdated);
        return () => {
            window.removeEventListener('userProfileUpdated', onUserUpdated);
            if (avatarBlobRef.current) {
                URL.revokeObjectURL(avatarBlobRef.current);
            }
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get('/api/v1/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fetched = res.data;
            setNotifications(fetched);
            setUnreadCount(fetched.filter((n: any) => !n.isRead).length);

            // Check for new unread notifications to popup
            const newUnread = fetched.filter((n: any) => !n.isRead && !knownIdsRef.current.has(n.id));
            const certNotifications = newUnread.filter((n: any) => n.metadata?.certificateId);
            const otherNotifications = newUnread.filter((n: any) => !n.metadata?.certificateId);

            // 1. Handle Certificate Notifications
            if (certNotifications.length > 1) {
                mantineNotifications.show({
                    title: 'Certificates Ready',
                    message: (
                        <Box
                            onClick={() => navigate('/dashboard/me?tab=certificates')}
                            style={{ cursor: 'pointer' }}
                        >
                            {`${certNotifications.length} certificates are ready to download. Click here to view them.`}
                        </Box>
                    ),
                    color: 'brandBlue',
                    icon: <ShieldCheck size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                certNotifications.forEach((n: any) => knownIdsRef.current.add(n.id));
            } else if (certNotifications.length === 1) {
                const n = certNotifications[0];
                mantineNotifications.show({
                    title: n.title,
                    message: (
                        <Box
                            onClick={() => navigate('/dashboard/me?tab=certificates')}
                            style={{ cursor: 'pointer' }}
                        >
                            {n.message}
                        </Box>
                    ),
                    color: 'brandBlue',
                    icon: <ShieldCheck size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                knownIdsRef.current.add(n.id);
            }

            // 2. Handle Other Notifications
            otherNotifications.forEach((n: any) => {
                mantineNotifications.show({
                    title: n.title,
                    message: n.message,
                    color: 'brandBlue',
                    icon: <Mail size={18} />,
                    autoClose: 5000,
                    withCloseButton: true,
                });
                knownIdsRef.current.add(n.id);
            });

            // 3. Mark existing read ones as known
            fetched.forEach((n: any) => {
                if (n.isRead) knownIdsRef.current.add(n.id);
            });

        } catch (error) {
            console.error('Failed to fetch notifications');
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 300000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkRead = async (id: string, metadata?: any) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/v1/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));

            if (metadata?.certificateId) {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('Failed to mark read');
        }
    };

    return (
        <Group
            justify="space-between"
            px={{ base: 'md', sm: 'xl' }}
            h="100%"
            style={{
                background: 'transparent',
                width: '100%',
                gap: 16,
                flexWrap: 'nowrap',
            }}
        >
            {/* Left Side: Mobile Burger / Desktop Toggle + Title (Bigger Black and Bold) */}
            <Group gap={14} wrap="nowrap" style={{ flex: '1 1 auto', maxWidth: '55%', minWidth: 0 }}>
                {/* Mobile Drawer Burger */}
                {onToggleMobile && (
                    <Burger
                        opened={Boolean(mobileOpened)}
                        onClick={onToggleMobile}
                        hiddenFrom="sm"
                        size="sm"
                        color="#111827"
                        aria-label={mobileOpened ? 'Close navigation menu' : 'Open navigation menu'}
                    />
                )}

                {/* Desktop Sidebar Toggle */}
                <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="bottom" openDelay={200}>
                    <ActionIcon
                        variant="filled"
                        color="rgba(0, 0, 0, 0.1)"
                        size="lg"
                        radius="md"
                        onClick={toggle}
                        visibleFrom="sm"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        style={{ border: '1px solid rgba(0, 0, 0, 0.15)', flexShrink: 0 }}
                    >
                        <MenuIcon size={18} color="#111827" />
                    </ActionIcon>
                </Tooltip>

                <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text
                        fw={900}
                        size="24px"
                        style={{
                            color: '#082f49',
                            textShadow: '0 1px 1px rgba(255, 255, 255, 0.45), 0 -1px 1px rgba(0, 0, 0, 0.55)',
                            lineHeight: 1.15,
                            letterSpacing: '-0.4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        Learning Management Portal
                    </Text>
                </Box>
            </Group>

            {/* Center: Digital Clock with generous space/gap */}
            <Box style={{ display: 'flex', justifyContent: 'center', margin: '0 auto' }}>
                <DigitalClock />
            </Box>

            {/* Right Side - Bell and Profile */}
            <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                <Menu shadow="md" width={320} position="bottom-end" radius="md">
                    <Menu.Target>
                        <ActionIcon variant="filled" color="rgba(0, 0, 0, 0.1)" size="lg" radius="xl" style={{ border: '1px solid rgba(0, 0, 0, 0.15)' }}>
                            <Indicator disabled={unreadCount === 0} color="#E51690" size={8} offset={2} withBorder processing>
                                <Bell size={18} color="#111827" />
                            </Indicator>
                        </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown p="xs">
                        <Menu.Label>Recent Notifications</Menu.Label>
                        {notifications.length === 0 ? (
                            <Text size="sm" c="dimmed" p="md" ta="center">No new notifications</Text>
                        ) : (
                            notifications.map((notif) => (
                                <Menu.Item
                                    key={notif.id}
                                    leftSection={
                                        notif.metadata?.certificateId ? <ShieldCheck size={16} color="#1EBAF2" /> : <Mail size={16} />
                                    }
                                    style={{ backgroundColor: notif.isRead ? 'transparent' : 'rgba(30, 186, 242, 0.1)' }}
                                    onClick={() => handleMarkRead(notif.id, notif.metadata)}
                                >
                                    <Text size="sm" fw={700} c={notif.isRead ? 'dimmed' : 'dark'}>{notif.title}</Text>
                                    <Text size="xs" c="dimmed" lineClamp={2}>{notif.message}</Text>
                                </Menu.Item>
                            ))
                        )}
                    </Menu.Dropdown>
                </Menu>

                <Divider orientation="vertical" h={30} my="auto" color="rgba(0, 0, 0, 0.18)" visibleFrom="sm" />

                <Menu shadow="md" width={220} position="bottom-end" radius="md">
                    <Menu.Target>
                        <UnstyledButton>
                            <Group gap="xs" style={{ cursor: 'pointer' }}>
                                <Box visibleFrom="md" ta="right">
                                    <Text fw={800} size="13px" c="#111827" lh={1}>
                                        {userName || 'User'}
                                    </Text>
                                    <Text size="10px" c="#374151" fw={700} mt={2}>
                                        {(localStorage.getItem('role') || '').toLowerCase() === 'admin' ? 'Admin Portal' : 'Staff Portal'}
                                    </Text>
                                </Box>
                                <Avatar
                                    src={headerAvatarUrl}
                                    color="blue"
                                    radius="xl"
                                    size="md"
                                    imageProps={{ loading: 'lazy' }}
                                    styles={{
                                        placeholder: {
                                            backgroundColor: '#ffffff',
                                            color: '#111827',
                                            fontWeight: 900,
                                            border: '1px solid rgba(0, 0, 0, 0.15)',
                                        }
                                    }}
                                >
                                    {userName?.charAt(0)?.toUpperCase() || 'U'}
                                </Avatar>
                            </Group>
                        </UnstyledButton>
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Label>Account Management</Menu.Label>
                        <Menu.Item
                            component={Link}
                            to="/dashboard/profile"
                            leftSection={<User size={14} color="#0284c7" />}
                        >
                            View Profile
                        </Menu.Item>
                        <Menu.Item
                            component={Link}
                            to="/settings"
                            leftSection={<Settings size={14} />}
                        >
                            Settings
                        </Menu.Item>

                        <Menu.Divider />

                        <Menu.Item
                            color="red"
                            leftSection={<LogOut size={14} />}
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('userName');
                                localStorage.removeItem('role');
                                localStorage.removeItem('userId');
                                localStorage.removeItem('userEmail');
                                navigate('/');
                            }}
                        >
                            Sign Out
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Group>
    );
};

