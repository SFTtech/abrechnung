import clsx from "clsx";
import React, {useState} from "react";
import {Container, makeStyles, Menu, MenuItem, useTheme} from "@material-ui/core";
import {Link as RouterLink} from "react-router-dom";
import Drawer from '@material-ui/core/Drawer';
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ListItemText from '@material-ui/core/ListItemText';
import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../../recoil/auth";
import ListItemLink from "./ListItemLink";
import Button from "@material-ui/core/Button";
import {AccountCircle} from "@material-ui/icons";

const iOS = process.browser && /iPad|iPhone|iPod/.test(navigator.userAgent);

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
    },
    appBar: {
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    appBarShift: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: theme.spacing(2),
    },
    hide: {
        display: 'none',
    },
    title: {
        flexGrow: 1,
    },
    drawer: {
        width: drawerWidth,
        flexShrink: 0,
    },
    drawerPaper: {
        width: drawerWidth,
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
        justifyContent: 'flex-end',
    },
    content: {
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: -drawerWidth,
    },
    contentShift: {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
    },
}));

export default function Layout({group = null, children}) {
    const classes = useStyles();
    const theme = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const authenticated = useRecoilValue(isAuthenticated);
    const [anchorEl, setAnchorEl] = useState(null);
    const profileMenuOpen = Boolean(anchorEl);

    const handleProfileMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    }

    const handleProfileMenuClose = (event) => {
        setAnchorEl(null);
    }

    const handleSidebarOpen = () => {
        setSidebarOpen(true);
    }

    const handleSidebarClose = () => {
        setSidebarOpen(false);
    }

    return (
        <div>
            <CssBaseline/>
            <AppBar
                position="fixed"
                className={clsx(classes.appBar, {[classes.appBarShift]: sidebarOpen})}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleSidebarOpen}
                        edge="start"
                        className={clsx(classes.menuButton, sidebarOpen && classes.hide)}
                    >
                        <MenuIcon/>
                    </IconButton>
                    <Typography variant="h6" noWrap className={classes.title}>
                        Persistent drawer
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
                                <AccountCircle/>
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                open={profileMenuOpen}
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
                                onClose={handleProfileMenuClose}
                            >
                                <MenuItem component={RouterLink} to="/profile">Profile</MenuItem>
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
                <Drawer
                    className={classes.drawer}
                    variant="persistent"
                    disableBackdropTransition={!iOS}
                    disableDiscovery={iOS}
                    anchor="left"
                    open={sidebarOpen}
                    classes={{
                        paper: classes.drawerPaper,
                    }}
                >
                    <div className={classes.drawerHeader}>
                        <IconButton onClick={handleSidebarClose}>
                            {theme.direction === 'ltr' ? <ChevronLeftIcon/> : <ChevronRightIcon/>}
                        </IconButton>
                    </div>
                    {group !== null ? (
                        <>
                            <Divider/>
                            <List>
                                <ListItemLink to={`/groups/${group.group_id}/transactions`}>
                                    <ListItemText primary="Transactions"/>
                                </ListItemLink>
                                <ListItemLink to={`/groups/${group.group_id}/accounts`}>
                                    <ListItemText primary="Accounts"/>
                                </ListItemLink>
                                <ListItemLink to={`/groups/${group.group_id}/group-detail`}>
                                    <ListItemText primary="Group Detail"/>
                                </ListItemLink>
                                <ListItemLink to={`/groups/${group.group_id}/members`}>
                                    <ListItemText>Members</ListItemText>
                                </ListItemLink>
                                <ListItemLink to={`/groups/${group.group_id}/log`}>
                                    <ListItemText primary="Log"/>
                                </ListItemLink>
                                <ListItemLink to={`/groups/${group.group_id}/invite-tokens`}>
                                    <ListItemText primary="Invite Links"/>
                                </ListItemLink>
                            </List>
                        </>
                    ) : null}
                    <Divider/>
                    <List>
                        <ListItemLink to="/">
                            <ListItemText primary="Groups"/>
                        </ListItemLink>
                    </List>
                </Drawer>
            ) : null}
            <main
                className={clsx(classes.content, {
                    [classes.contentShift]: authenticated && sidebarOpen,
                })}
            >
                <div className={classes.drawerHeader}/>
                <Container maxWidth="sm">
                    {children}
                </Container>
            </main>
        </div>
    )
}
