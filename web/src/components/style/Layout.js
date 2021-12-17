import React, {useState} from "react";
import {Link as RouterLink} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../../recoil/auth";
import ListItemLink from "./ListItemLink";
import {
    AppBar,
    Box,
    Button,
    Container,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItemText,
    Menu,
    MenuItem,
    Toolbar,
    Typography
} from "@mui/material";
import {AccountCircle as AccountCircleIcon, Menu as MenuIcon} from "@mui/icons-material";

const drawerWidth = 240;

export default function Layout({group = null, children, ...props}) {
    const authenticated = useRecoilValue(isAuthenticated);
    const [anchorEl, setAnchorEl] = useState(null);
    const dotsMenuOpen = Boolean(anchorEl);

    const [mobileOpen, setMobileOpen] = useState(true);

    const {window} = props;

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleDotsMenuClose = (event) => {
        setAnchorEl(null);
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    }

    const drawer = (
        <div>
            <Toolbar/>
            <Divider/>
            <List>
                {group != null && (
                    <>
                        <ListItemLink to={`/groups/${group.id}/`}>
                            <ListItemText primary="Transactions"/>
                        </ListItemLink>
                        <ListItemLink to={`/groups/${group.id}/accounts`}>
                            <ListItemText primary="Accounts"/>
                        </ListItemLink>
                        <ListItemLink to={`/groups/${group.id}/detail`}>
                            <ListItemText primary="Group detail"/>
                        </ListItemLink>
                        <ListItemLink to={`/groups/${group.id}/members`}>
                            <ListItemText primary="Group Members"/>
                        </ListItemLink>
                        <ListItemLink to={`/groups/${group.id}/invites`}>
                            <ListItemText primary="Group Invites"/>
                        </ListItemLink>
                        <ListItemLink to={`/groups/${group.id}/log`}>
                            <ListItemText primary="Group Log"/>
                        </ListItemLink>
                        <Divider/>
                    </>
                )}
                <ListItemLink to="/">
                    <ListItemText primary="Groups"/>
                </ListItemLink>
                <Divider/>
                <ListItemLink to="/logout">
                    <ListItemText primary="Sign out"/>
                </ListItemLink>
            </List>
        </div>
    )

    const container = window !== undefined ? () => window().document.body : undefined;

    return (
        <Box sx={{display: "flex"}}>
            <CssBaseline/>
            <AppBar
                position="fixed"
                sx={{
                    // width: {sm: `calc(100% - ${drawerWidth}px)`},
                    // ml: {sm: `${drawerWidth}px`},
                    zIndex: (theme) => theme.zIndex.drawer + 1
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerToggle}
                        edge="start"
                        sx={{mr: 2, display: {sm: 'none'}}}
                    >
                        <MenuIcon/>
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
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
                                <AccountCircleIcon/>
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                open={dotsMenuOpen}
                                anchorOrigin={{
                                    vertical: "top",
                                    horizontal: "right"
                                }}
                                keepMounted
                                anchorEl={anchorEl}
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "right"
                                }}
                                onClose={handleDotsMenuClose}
                            >
                                <MenuItem component={RouterLink} to="/profile">Profile</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/settings">Settings</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/sessions">Sessions</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-email">Change E-Mail</MenuItem>
                                <MenuItem component={RouterLink} to="/profile/change-password">Change
                                    Password</MenuItem>
                                <MenuItem component={RouterLink} to="/logout">Sign out</MenuItem>
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
                <Box
                    component="nav"
                    sx={{width: {sm: drawerWidth}, flexShrink: {sm: 0}}}
                >
                    <Drawer
                        container={container}
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{
                            keepMounted: true, // Better open performance on mobile.
                        }}
                        sx={{
                            display: {xs: 'block', sm: 'none'},
                            '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                        }}
                    >
                        {drawer}
                    </Drawer>
                    <Drawer
                        variant="permanent"
                        sx={{
                            flexShrink: 0,
                            display: {xs: 'none', sm: 'block'},
                            '& .MuiDrawer-paper': {boxSizing: 'border-box', width: drawerWidth},
                        }}
                        open
                    >
                        {drawer}
                    </Drawer>
                </Box>
            ) : null}
            <Box
                component="main"
                sx={{flexGrow: 1, p: 3, width: {sm: `calc(100% - ${drawerWidth}px)`}}}
            >
                <Container maxWidth="lg">
                    <Toolbar/>
                    {children}
                </Container>
            </Box>
        </Box>
    );
}
