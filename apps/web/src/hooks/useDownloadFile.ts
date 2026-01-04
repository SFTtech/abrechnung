import * as React from "react";

type DownloadFileArgs = {
    content: string;
    filename: string;
    mimetype: string;
};

export const useDownloadFile = () => {
    return React.useCallback(({ content, mimetype, filename }: DownloadFileArgs) => {
        const blob = new Blob([content], { type: `${mimetype};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);
};
