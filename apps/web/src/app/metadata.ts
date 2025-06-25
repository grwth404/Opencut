import { Metadata } from "next";

export const baseMetaData: Metadata = {
    title: "OpenCut",
    description:
        "A simple but powerful video editor that gets the job done. In your browser.",
    openGraph: {
        title: "OpenCut",
        description:
            "A simple but powerful video editor that gets the job done. In your browser.",
        url: "https://opencut.app",
        siteName: "OpenCut",
        locale: "en_US",
        type: "website",
        images: [
            {
                url: "https://opencut.app/opengraph-image.jpg",
                width: 1200,
                height: 630,
                alt: "OpenCut",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "OpenCut",
        description:
            "A simple but powerful video editor that gets the job done. In your browser.",
        creator: "@opencutapp",
        images: ["/opengraph-image.jpg"],
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
            { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        ],
        apple: [
            { url: "/icons/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
            { url: "/icons/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
            { url: "/icons/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
            { url: "/icons/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
            { url: "/icons/apple-icon-114x114.png", sizes: "114x114", type: "image/png" },
            { url: "/icons/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
            { url: "/icons/apple-icon-144x144.png", sizes: "144x144", type: "image/png" },
            { url: "/icons/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
            { url: "/icons/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
        ],
        shortcut: ["/favicon.ico"]
    },
    appleWebApp: {
        capable: true,
        title: "OpenCut",
    },
    manifest: "/manifest.json",
    other: {
        "msapplication-config": "/browserconfig.xml"
    }
};