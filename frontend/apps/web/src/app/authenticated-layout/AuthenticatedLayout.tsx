import * as React from "react";
import { selectIsAuthenticated } from "@abrechnung/redux";
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from "react-router";
import { useAppSelector } from "@/store";
import { ListItemLink } from "@/components/style/ListItemLink";
import { SidebarGroupList } from "@/app/authenticated-layout/SidebarGroupList";
import {
    AppBar,
    Box,
    Container,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    Link,
    List,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import {
    AccountBalance,
    Event as EventIcon,
    AccountCircle as AccountCircleIcon,
    BarChart,
    BugReport,
    GitHub,
    Logout,
    Menu as MenuIcon,
    Message,
    Paid,
    Settings as SettingsIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Banner } from "@/components/style/Banner";
import { Loading } from "@abrechnung/components";
import styles from "./AuthenticatedLayout.module.css";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useTranslation } from "react-i18next";
import { useConfig } from "@/core/config";

const drawerWidth = 240;
const AUTH_FALLBACK = "/login";

type DrawerContentProps = {
    groupId: number | undefined;
};

const DrawerContent: React.FC<DrawerContentProps> = ({ groupId }) => {
    const theme = useTheme();
    const cfg = useConfig();
    const { t } = useTranslation();
    const location = useLocation();

    return (
        <div className={styles["sidebarContainer"]}>
            <div className={styles["sidebarScrollContainer"]}>
                {groupId !== undefined && (
                    <List sx={{ pb: 0 }}>
                        <ListItemLink
                            to={`/groups/${groupId}/`}
                            selected={
                                location.pathname === `/groups/${groupId}/` ||
                                location.pathname === `/groups/${groupId}` ||
                                location.pathname.startsWith(`/groups/${groupId}/transactions`)
                            }
                        >
                            <ListItemIcon>
                                <Paid />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.transactions")} />
                        </ListItemLink>
                        <ListItemLink
                            to={`/groups/${groupId}/events`}
                            selected={location.pathname.startsWith(`/groups/${groupId}/events`)}
                        >
                            <ListItemIcon>
                                <EventIcon />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.events")} />
                        </ListItemLink>
                        <ListItemLink
                            to={`/groups/${groupId}/balances`}
                            selected={location.pathname.startsWith(`/groups/${groupId}/balances`)}
                        >
                            <ListItemIcon>
                                <BarChart />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.balances")} />
                        </ListItemLink>
                        <ListItemLink
                            to={`/groups/${groupId}/accounts`}
                            selected={location.pathname.startsWith(`/groups/${groupId}/accounts`)}
                        >
                            <ListItemIcon>
                                <AccountBalance />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.accounts")} />
                        </ListItemLink>
                        <ListItemLink
                            to={`/groups/${groupId}/detail`}
                            selected={location.pathname.startsWith(`/groups/${groupId}/detail`)}
                        >
                            <ListItemIcon>
                                <SettingsIcon />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.groupSettings")} />
                        </ListItemLink>
                        <ListItemLink
                            to={`/groups/${groupId}/log`}
                            selected={location.pathname.startsWith(`/groups/${groupId}/log`)}
                        >
                            <ListItemIcon>
                                <Message />
                            </ListItemIcon>
                            <ListItemText primary={t("navbar.activity")} />
                        </ListItemLink>
                        <Divider />
                    </List>
                )}
                <SidebarGroupList activeGroupId={groupId} />
            </div>

            <div
                className={styles["footer"]}
                style={{
                    borderTop: `1px solid ${theme.palette.divider}`,
                }}
            >
                {cfg.imprintURL && (
                    <Link href={cfg.imprintURL} target="_blank" sx={{ mr: 2 }}>
                        {t("navbar.imprint")}
                    </Link>
                )}
                <Tooltip title="Source Code">
                    <Link sx={{ ml: 1 }} target="_blank" href={cfg.sourceCodeURL}>
                        <GitHub />
                    </Link>
                </Tooltip>
                {cfg.issueTrackerURL && (
                    <Tooltip title="Bug reports">
                        <Link sx={{ ml: 1 }} target="_blank" href={cfg.issueTrackerURL}>
                            <BugReport />
                        </Link>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

export const AuthenticatedLayout: React.FC = () => {
    const { t } = useTranslation();
    const authenticated = useAppSelector(selectIsAuthenticated);
    const location = useLocation();
    const params = useParams();
    const groupId = params["groupId"] ? Number(params["groupId"]) : undefined;
    const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
    const theme: Theme = useTheme();
    const dotsMenuOpen = Boolean(anchorEl);
    const isLargeScreen = useMediaQuery(theme.breakpoints.up("sm"));

    const [mobileOpen, setMobileOpen] = React.useState(true);
    if (!authenticated) {
        return <Navigate to={`${AUTH_FALLBACK}?next=${location.pathname}`} />;
    }

    const handleProfileMenuOpen = (event: React.MouseEvent) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDotsMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerToggle}
                        edge="start"
                        sx={{ mr: 2, display: { sm: "none" } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <RouterLink to="/" style={{ textDecoration: "none", color: "inherit" }}>
                            {t("app.name")}
                        </RouterLink>
                    </Typography>
                    <div>
                        <LanguageSelect />
                        <IconButton
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleProfileMenuOpen}
                            color="inherit"
                        >
                            <AccountCircleIcon />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            open={dotsMenuOpen}
                            anchorOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            keepMounted
                            anchorEl={anchorEl}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
                            onClose={handleDotsMenuClose}
                        >
                            <MenuItem component={RouterLink} to="/profile">
                                {t("navbar.profile")}
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/profile/settings">
                                {t("navbar.settings")}
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/profile/sessions">
                                {t("navbar.sessions")}
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/profile/change-email">
                                {t("navbar.changeEmail")}
                            </MenuItem>
                            <MenuItem component={RouterLink} to="/profile/change-password">
                                {t("navbar.changePassword")}
                            </MenuItem>
                            <Divider />
                            <MenuItem component={RouterLink} to="/logout">
                                <ListItemIcon>
                                    <Logout fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>{t("navbar.signOut")}</ListItemText>
                            </MenuItem>
                        </Menu>
                    </div>
                </Toolbar>
            </AppBar>

            <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
                <Drawer
                    variant={isLargeScreen ? "permanent" : "temporary"}
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        "& .MuiDrawer-paper": {
                            boxSizing: "border-box",
                            width: drawerWidth,
                            overflowY: "hidden",
                        },
                        overflowY: "hidden",
                    }}
                >
                    <DrawerContent groupId={groupId} />
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >
                <Toolbar />
                <Banner />
                <Container maxWidth="lg" sx={{ padding: { xs: 0, md: 1, lg: 3 } }}>
                    <React.Suspense fallback={<Loading />}>
                        <Outlet />
                    </React.Suspense>
                </Container>
            </Box>
        </Box>
    );
};
