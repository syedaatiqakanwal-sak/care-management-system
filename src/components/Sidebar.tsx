import { Stack, UnstyledButton, Group, Text, rem, Box, Badge, ActionIcon, Tooltip, Anchor } from '@mantine/core';
import { Users, Phone, LogOut, BookOpen, Settings, UserPlus, FileText, PanelLeftClose, PanelLeft, User, ClipboardCheck, X, Award, Linkedin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { Check } from 'lucide-react';
import { logout } from '../utils/auth';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSidebar } from '../contexts/SidebarContext';

const sidebarStyles = `
  .cpd-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
    background: #ffffff;
  }

  .cpd-sidebar-nav {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .cpd-sidebar-nav::-webkit-scrollbar {
    display: none;
  }

  .cpd-nav-item {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border-radius: 10px;
    box-sizing: border-box;
    border: none;
    background: transparent;
    color: #495057;
    font-weight: 600;
    font-size: 13.5px;
    letter-spacing: 0.01em;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .cpd-nav-item:hover:not(.cpd-nav-item--active) {
    background: rgba(30, 186, 242, 0.08);
    color: #212529;
  }

  .cpd-nav-item:focus-visible {
    outline: 2px solid rgba(30, 186, 242, 0.65);
    outline-offset: 2px;
  }

  .cpd-nav-item--active {
    color: #ffffff;
    font-weight: 700;
    background: linear-gradient(135deg, #1EBAF2 0%, #E51690 100%);
    box-shadow: 0 4px 14px rgba(30, 186, 242, 0.28);
  }

  .cpd-nav-item--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.45);
  }

  .cpd-nav-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
  }

  .cpd-nav-icon svg {
    width: 18px;
    height: 18px;
  }

  .cpd-sidebar-close {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.08);
    background: #f8f9fa;
    color: #495057;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    transition: background 160ms ease, border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease, color 160ms ease;
  }

  .cpd-sidebar-close:hover {
    background: #ffffff;
    border-color: rgba(30, 186, 242, 0.35);
    color: #1EBAF2;
    box-shadow: 0 2px 8px rgba(30, 186, 242, 0.18);
    transform: scale(1.04);
  }

  .cpd-sidebar-close:focus-visible {
    outline: 2px solid rgba(30, 186, 242, 0.65);
    outline-offset: 2px;
  }

  .cpd-sidebar-footer {
    flex-shrink: 0;
    padding-top: 12px;
    margin-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }

  .cpd-signout {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: rgba(248, 249, 250, 0.95);
    color: #c92a2a;
    cursor: pointer;
    transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .cpd-signout:hover {
    background: rgba(250, 82, 82, 0.08);
    border-color: rgba(250, 82, 82, 0.18);
    box-shadow: 0 2px 8px rgba(250, 82, 82, 0.1);
    transform: translateY(-1px);
  }

  .cpd-signout:focus-visible {
    outline: 2px solid rgba(250, 82, 82, 0.55);
    outline-offset: 2px;
  }

  .cpd-signout-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(250, 82, 82, 0.1);
    flex-shrink: 0;
  }
`;

const data = [
    { link: '/dashboard', label: 'Staff', icon: Users },
    { link: '/dashboard/certificates', label: 'Certificates', icon: Award },
    { link: '/register', label: 'Add Staff', icon: UserPlus },
    { link: '/dashboard/me', label: 'View Profile', icon: User },
    { link: '/courses', label: 'Courses', icon: BookOpen },
    { link: '/dashboard/policies', label: 'Policies', icon: FileText },
    { link: '/dashboard/references/analytics', label: 'Reference', icon: ClipboardCheck },
    { link: 'https://wa.me/447999378090', label: 'Contact', icon: Phone },
    { link: '/settings', label: 'Settings', icon: Settings },
];

function isNavItemActive(link: string, pathname: string): boolean {
    if (link.startsWith('http')) return false;
    if (link === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/dashboard/';
    }
    if (link === '/dashboard/certificates') {
        return pathname.startsWith('/dashboard/certificates');
    }
    if (link === '/dashboard/me' && pathname.startsWith('/dashboard/me')) {
        return true;
    }
    return pathname === link;
}

export function Sidebar({
    onLinkClick,
    hideHeader = false,
    onClose,
}: {
    onLinkClick?: () => void;
    hideHeader?: boolean;
    onClose?: () => void;
} = {}) {
    const navigate = useNavigate();
    const location = useLocation();
    const { collapsed, toggle, resetAutoCloseTimer } = useSidebar();

    const role = (localStorage.getItem('role') || '').toLowerCase();
    const token = localStorage.getItem('token');
    const isAdmin = role === 'admin';
    const portalTitle = isAdmin ? 'Admin Portal' : 'Staff Portal';
    const portalSubtitle = isAdmin ? 'Administrator' : 'Staff Member';
    // Mobile drawer always shows expanded labels
    const isCompact = onClose ? false : collapsed;

    const [unreadPolicyCount, setUnreadPolicyCount] = useState(0);

    useEffect(() => {
        if (role !== 'staff' || !token) return;

        const fetchPolicyNotifs = async () => {
            try {
                const res = await axios.get('/api/v1/policy-notifications/my', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const unread = (res.data || []).filter((n: any) => !n.isRead).length;
                setUnreadPolicyCount(unread);
            } catch {
                // ignore
            }
        };

        fetchPolicyNotifs();
        const interval = setInterval(fetchPolicyNotifs, 60000);

        const onPolicyNotifsUpdated = () => fetchPolicyNotifs();
        window.addEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('policyNotifsUpdated', onPolicyNotifsUpdated);
        };
    }, [role, token]);

    // Filter links based on role
    const filteredLinks = data.filter((item) => {
        if ((item.label === 'Staff' || item.label === 'Certificates' || item.label === 'Add Staff' || item.label === 'Settings' || item.label === 'Reference') && role !== 'admin') return false;
        if (item.label === 'View Profile' && role !== 'staff') return false;
        if (item.label === 'Courses' && role !== 'admin') return false;
        return true;
    });

    const handleNavClick = (link: string) => {
        if (link.startsWith('http')) {
            window.open(link, '_blank');
        } else if (link !== '#') {
            navigate(link);
        }
        if (onLinkClick) {
            onLinkClick();
        }
    };

    const handleSignOut = () => {
        logout();
        notifications.show({
            title: 'Signed Out',
            message: 'You have been successfully logged out.',
            color: 'blue',
            icon: <Check size={16} />,
        });
        navigate('/');
        if (onLinkClick) {
            onLinkClick();
        }
    };

    const links = filteredLinks.map((item) => {
        const isActive = isNavItemActive(item.link, location.pathname);
        return (
            <Tooltip key={item.label} label={item.label} position="right" disabled={!isCompact} openDelay={200}>
                <UnstyledButton
                    className={`cpd-nav-item${isActive ? ' cpd-nav-item--active' : ''}`}
                    onClick={() => handleNavClick(item.link)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                        justifyContent: isCompact ? 'center' : 'flex-start',
                        gap: isCompact ? 0 : 10,
                        paddingLeft: isCompact ? 0 : 12,
                        paddingRight: isCompact ? 0 : 12,
                    }}
                >
                    <span className="cpd-nav-icon" aria-hidden>
                        <item.icon />
                    </span>
                    {!isCompact && (
                        <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <Text
                                component="span"
                                size="sm"
                                fw={isActive ? 700 : 600}
                                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                                {item.label}
                            </Text>
                            {item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                                <Badge size="sm" color="red" variant="filled" style={{ flexShrink: 0 }}>
                                    {unreadPolicyCount}
                                </Badge>
                            )}
                        </Group>
                    )}
                    {isCompact && item.label === 'Policies' && role === 'staff' && unreadPolicyCount > 0 && (
                        <Box
                            aria-hidden
                            style={{
                                position: 'absolute',
                                top: 6,
                                right: 6,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: 'var(--mantine-color-red-6)',
                            }}
                        />
                    )}
                </UnstyledButton>
            </Tooltip>
        );
    });

    return (
        <>
            <style>{sidebarStyles}</style>
            <nav
                className="cpd-sidebar"
                aria-label="Main navigation"
                style={{ padding: 0 }}
                onMouseEnter={resetAutoCloseTimer}
                onMouseMove={resetAutoCloseTimer}
                onClick={resetAutoCloseTimer}
            >
                {/* Brand Header: Logo + College Name (only logo when compact) */}
                <Box
                    className="cpd-sidebar-brand"
                    style={{
                        flexShrink: 0,
                        height: 76,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCompact ? 'center' : 'flex-start',
                        padding: isCompact ? '0 10px' : '0 16px',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        backgroundColor: '#ffffff',
                    }}
                >
                    {!isCompact ? (
                        <Group
                            gap={12}
                            wrap="nowrap"
                            style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
                            onClick={() => {
                                navigate('/dashboard');
                                if (onClose) onClose();
                            }}
                        >
                            <Box
                                style={{
                                    backgroundColor: '#ffffff',
                                    padding: 4,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                                    border: '1.5px solid rgba(30, 186, 242, 0.3)',
                                    flexShrink: 0,
                                }}
                            >
                                <img src="/assets/logo.png" alt="Inspire London College Logo" style={{ height: 42, width: 'auto' }} />
                            </Box>
                            <Box style={{ minWidth: 0, flex: 1 }}>
                                <Text
                                    fw={900}
                                    size="20px"
                                    c="#111827"
                                    style={{ lineHeight: 1.15, letterSpacing: '-0.4px', whiteSpace: 'nowrap' }}
                                >
                                    Inspire London
                                </Text>
                                <Text
                                    fw={900}
                                    size="20px"
                                    c="#1EBAF2"
                                    style={{ lineHeight: 1.15, letterSpacing: '-0.4px', whiteSpace: 'nowrap' }}
                                >
                                    College
                                </Text>
                            </Box>
                        </Group>
                    ) : (
                        <Tooltip label="Inspire London College" position="right" openDelay={200}>
                            <UnstyledButton
                                onClick={() => {
                                    navigate('/dashboard');
                                    if (onClose) onClose();
                                }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                aria-label="Inspire London College"
                            >
                                <Box
                                    style={{
                                        backgroundColor: '#ffffff',
                                        padding: 4,
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                                        border: '1.5px solid rgba(30, 186, 242, 0.3)',
                                    }}
                                >
                                    <img src="/assets/logo.png" alt="Inspire London College Logo" style={{ height: 38, width: 'auto' }} />
                                </Box>
                            </UnstyledButton>
                        </Tooltip>
                    )}

                    {onClose && (
                        <Tooltip label="Close menu" position="bottom" openDelay={200}>
                            <ActionIcon
                                className="cpd-sidebar-close"
                                variant="subtle"
                                onClick={onClose}
                                aria-label="Close menu"
                            >
                                <X size={15} strokeWidth={2} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Box>

                {/* Subtitle / Portal role section */}
                {!isCompact && (
                    <Box px={14} pt={12} pb={6} style={{ flexShrink: 0 }}>
                        <Text
                            fw={800}
                            size="xs"
                            style={{
                                color: '#1EBAF2',
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                                lineHeight: 1.2,
                            }}
                        >
                            {portalTitle}
                        </Text>
                        <Text size="11px" c="dimmed" fw={500} style={{ lineHeight: 1.3, marginTop: 2 }}>
                            {portalSubtitle}
                        </Text>
                    </Box>
                )}

                <Stack className="cpd-sidebar-nav" gap={4} role="list" style={{ padding: isCompact ? '6px 8px' : '6px 12px' }}>
                    {links}
                </Stack>

                <Box className="cpd-sidebar-footer" style={{ padding: isCompact ? '8px 6px 12px' : '10px 12px 14px' }}>
                    <Tooltip label="Sign Out" position="right" disabled={!isCompact} openDelay={200}>
                        <UnstyledButton
                            onClick={handleSignOut}
                            aria-label="Sign out"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                width: '100%',
                                padding: isCompact ? '8px 0' : '8px 12px',
                                justifyContent: isCompact ? 'center' : 'flex-start',
                                borderRadius: 8,
                                color: '#e03131',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'background 160ms ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <LogOut size={16} strokeWidth={2.2} />
                            {!isCompact && <span>Sign Out</span>}
                        </UnstyledButton>
                    </Tooltip>

                    {/* Integrated Footer: Lets Care All Ltd & Developer Link */}
                    {!isCompact ? (
                        <Box
                            mt={12}
                            pt={12}
                            style={{
                                borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
                                <Box
                                    aria-hidden
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        flexShrink: 0,
                                        background: 'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(30, 186, 242, 0.28)',
                                    }}
                                >
                                    <Text size="xs" fw={900} c="white" style={{ fontSize: 11, letterSpacing: '-0.02em' }}>
                                        LC
                                    </Text>
                                </Box>
                                <Box style={{ minWidth: 0 }}>
                                    <Text
                                        size="xs"
                                        fw={700}
                                        c="#1f2937"
                                        style={{ lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                    >
                                        Lets Care All Ltd
                                    </Text>
                                    <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1.2, fontSize: 11 }}>
                                        © {new Date().getFullYear()} All rights reserved
                                    </Text>
                                </Box>
                            </Group>

                            <Anchor
                                href="https://pk.linkedin.com/in/syeda-atiqa-kanwal-838490390?trk=people-guest_people_search-card"
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="never"
                                aria-label="Developer LinkedIn profile"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 10px',
                                    borderRadius: 999,
                                    background: 'rgba(30, 186, 242, 0.08)',
                                    border: '1px solid rgba(30, 186, 242, 0.18)',
                                    transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
                                    textDecoration: 'none',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 186, 242, 0.14)';
                                    e.currentTarget.style.borderColor = 'rgba(30, 186, 242, 0.35)';
                                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(30, 186, 242, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(30, 186, 242, 0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(30, 186, 242, 0.18)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <Text size="xs" fw={600} c="#0F7296" style={{ lineHeight: 1 }}>
                                    Developer
                                </Text>
                                <Box
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 6,
                                        backgroundColor: '#0A66C2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Linkedin size={12} color="white" strokeWidth={2.25} />
                                </Box>
                            </Anchor>
                        </Box>
                    ) : (
                        <Box
                            mt={10}
                            pt={10}
                            style={{
                                borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <Tooltip label={`Lets Care All Ltd - © ${new Date().getFullYear()}`} position="right" openDelay={200}>
                                <Box
                                    aria-hidden
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        background: 'linear-gradient(135deg, #1EBAF2 0%, #0F7296 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(30, 186, 242, 0.28)',
                                        cursor: 'default',
                                    }}
                                >
                                    <Text size="xs" fw={900} c="white" style={{ fontSize: 11, letterSpacing: '-0.02em' }}>
                                        LC
                                    </Text>
                                </Box>
                            </Tooltip>

                            <Tooltip label="Developer Profile" position="right" openDelay={200}>
                                <Anchor
                                    href="https://pk.linkedin.com/in/syeda-atiqa-kanwal-838490390?trk=people-guest_people_search-card"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="never"
                                    aria-label="Developer LinkedIn profile"
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        backgroundColor: '#0A66C2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(10, 102, 194, 0.3)',
                                        transition: 'transform 160ms ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'none';
                                    }}
                                >
                                    <Linkedin size={14} color="white" strokeWidth={2.25} />
                                </Anchor>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
            </nav>
        </>
    );
}
