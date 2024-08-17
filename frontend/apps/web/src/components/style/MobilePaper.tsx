import { Paper } from "@mui/material";
import { styled } from "@mui/system";

export const MobilePaper = styled(Paper)(({ theme }) =>
    theme.unstable_sx({
        padding: { xs: 1, lg: 2 },
        boxShadow: { xs: 0, lg: 1 },
    })
) as typeof Paper;
