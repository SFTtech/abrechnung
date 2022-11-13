import React, { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import ListItemLink from "./ListItemLink";
import SidebarGroupList from "./SidebarGroupList";
import {
    AppBar,
    Box,
    Button,
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
    AccountCircle as AccountCircleIcon,
    AdminPanelSettings,
    BarChart,
    BugReport,
    GitHub,
    Logout,
    Mail,
    Menu as MenuIcon,
    Message,
    Paid,
    People,
} from "@mui/icons-material";
import { config } from "../../state/config";
import { useTheme } from "@mui/material/styles";
import { Banner } from "./Banner";
import { selectIsAuthenticated } from "@abrechnung/redux";
import { useAppSelector, selectAuthSlice } from "../../store";

const drawerWidth = 240;

interface Props {
    groupId?: number;
    children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ groupId, children }) => {
    const authenticated = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const [anchorEl, setAnchorEl] = useState(null);
    const theme: Theme = useTheme();
    const dotsMenuOpen = Boolean(anchorEl);
    const cfg = useRecoilValue(config);
    const location = useLocation();
    const isLargeScreen = useMediaQuery(theme.breakpoints.up("sm"));

    const [mobileOpen, setMobileOpen] = useState(true);

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDotsMenuClose = (event) => {
        setAnchorEl(null);
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <div style={{ height: "100%" }}>
            <Toolbar />
            <Divider />
            {groupId !== undefined && (
                <List sx={{ pb: 0 }}>
                    <ListItemLink
                        to={`/groups/${groupId}/`}
                        selected={
                            location.pathname === `/groups/${groupId}/` || location.pathname === `/groups/${groupId}`
                        }
                    >
                        <ListItemIcon>
                            <Paid />
                        </ListItemIcon>
                        <ListItemText primary="Transactions" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/balances`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/balances`)}
                    >
                        <ListItemIcon>
                            <BarChart />
                        </ListItemIcon>
                        <ListItemText primary="Balances" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/accounts`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/accounts`)}
                    >
                        <ListItemIcon>
                            <AccountBalance />
                        </ListItemIcon>
                        <ListItemText primary="Accounts" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/detail`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/detail`)}
                    >
                        <ListItemIcon>
                            <AdminPanelSettings />
                        </ListItemIcon>
                        <ListItemText primary="Group Settings" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/members`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/members`)}
                    >
                        <ListItemIcon>
                            <People />
                        </ListItemIcon>
                        <ListItemText primary="Group Members" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/invites`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/invites`)}
                    >
                        <ListItemIcon>
                            <Mail />
                        </ListItemIcon>
                        <ListItemText primary="Group Invites" />
                    </ListItemLink>
                    <ListItemLink
                        to={`/groups/${groupId}/log`}
                        selected={location.pathname.startsWith(`/groups/${groupId}/log`)}
                    >
                        <ListItemIcon>
                            <Message />
                        </ListItemIcon>
                        <ListItemText primary="Group Log" />
                    </ListItemLink>
                    <Divider />
                </List>
            )}
            <SidebarGroupList activeGroupId={groupId} />

            <Box
                sx={{
                    display: "flex",
                    position: "absolute",
                    width: "100%",
                    justifyContent: "center",
                    bottom: 0,
                    padding: 1,
                    borderTop: 1,
                    borderColor: theme.palette.divider,
                }}
            >
                {cfg.imprintURL && (
                    <Link href={cfg.imprintURL} target="_blank" sx={{ mr: 2 }}>
                        imprint
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
            </Box>
        </div>
    );

    return (
        <Box sx={{ display: "flex" }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    // width: {sm: `calc(100% - ${drawerWidth}px)`},
                    // ml: {sm: `${drawerWidth}px`},
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
                        Abrechnung
                    </Typography>
                    {authenticated ? (
                        <div>
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
                                    Profile
                                </MenuItem>
                                <MenuItem component={RouterLink} to="/profile/settings">
                                    Settings
                                </MenuItem>
                                <MenuItem component={RouterLink} to="/profile/sessions">
                                    Sessions
                                </MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-email">
                                    Change E-Mail
                                </MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-password">
                                    Change Password
                                </MenuItem>
                                <Divider />
                                <MenuItem component={RouterLink} to="/logout">
                                    <ListItemIcon>
                                        <Logout fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText>Sign out</ListItemText>
                                </MenuItem>
                            </Menu>
                        </div>
                    ) : (
                        <Button component={RouterLink} color="inherit" to="/login">
                            Login
                        </Button>
                    )}
                </Toolbar>
            </AppBar>

            {authenticated ? (
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
                            },
                        }}
                    >
                        {drawer}
                    </Drawer>
                </Box>
            ) : null}
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
                    {children}
                </Container>
            </Box>
        </Box>
    );
};

export default Layout;
