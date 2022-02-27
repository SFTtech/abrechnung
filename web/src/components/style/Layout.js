import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { isAuthenticated } from "../../recoil/auth";
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
    Toolbar,
    Tooltip,
    Typography,
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
import { config } from "../../recoil/config";
import { useTheme } from "@mui/styles";
import { Banner } from "./Banner";

const drawerWidth = 240;

export default function Layout({ group = null, children, ...props }) {
    const authenticated = useRecoilValue(isAuthenticated);
    const [anchorEl, setAnchorEl] = useState(null);
    const theme = useTheme();
    const dotsMenuOpen = Boolean(anchorEl);
    const cfg = useRecoilValue(config);

    const [mobileOpen, setMobileOpen] = useState(true);

    const { window } = props;

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
            {group != null && (
                <List sx={{ pb: 0 }}>
                    <ListItemLink to={`/groups/${group.id}/`}>
                        <ListItemIcon>
                            <Paid />
                        </ListItemIcon>
                        <ListItemText primary="Transactions" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/balances`}>
                        <ListItemIcon>
                            <BarChart />
                        </ListItemIcon>
                        <ListItemText primary="Balances" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/accounts`}>
                        <ListItemIcon>
                            <AccountBalance />
                        </ListItemIcon>
                        <ListItemText primary="Accounts" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/detail`}>
                        <ListItemIcon>
                            <AdminPanelSettings />
                        </ListItemIcon>
                        <ListItemText primary="Group Settings" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/members`}>
                        <ListItemIcon>
                            <People />
                        </ListItemIcon>
                        <ListItemText primary="Group Members" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/invites`}>
                        <ListItemIcon>
                            <Mail />
                        </ListItemIcon>
                        <ListItemText primary="Group Invites" />
                    </ListItemLink>
                    <ListItemLink to={`/groups/${group.id}/log`}>
                        <ListItemIcon>
                            <Message />
                        </ListItemIcon>
                        <ListItemText primary="Group Log" />
                    </ListItemLink>
                    <Divider />
                </List>
            )}
            <SidebarGroupList group={group} />

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

    const container = window !== undefined ? () => window().document.body : undefined;

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
                        container={container}
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                        sx={{
                            display: { xs: "block", sm: "none" },
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                            },
                        }}
                    >
                        {drawer}
                    </Drawer>
                    <Drawer
                        variant="permanent"
                        sx={{
                            flexShrink: 0,
                            display: { xs: "none", sm: "block" },
                            "& .MuiDrawer-paper": {
                                boxSizing: "border-box",
                                width: drawerWidth,
                            },
                        }}
                        open
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
}
